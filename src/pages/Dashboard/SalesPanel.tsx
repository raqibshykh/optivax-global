import React, { useState, useMemo, useEffect } from "react";
import PageMeta from "../../components/common/PageMeta";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import { RequirePermission } from "../../components/auth/RequirePermission";
import Placeholder from "../../components/common/Placeholder";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { getCampaigns, getTargets, getSalesTasks } from "../../mock/salesData";
import { safeParse } from "../../lib/storage";
import { StoredClient } from "../../types";
import { UserService } from "../../services/userService";
import { ClientService } from "../../services/clientService";
import { notifyClientCreated } from "../../services/notificationHelpers";
import { storeMockPassword } from "../../lib/client";

const CLIENTS_KEY = "optivax_clients";

// Local types for leads/deals/commissions (not shared with global types)
interface SalesLead { id: string; name: string; email: string; company: string; status: "New" | "Contacted" | "Qualified" | "Lost"; estimated_value: number; }
interface SalesDeal { id: string; title: string; client: string; amount: number; stage: "Proposal" | "Negotiation" | "Won" | "Lost"; }
interface SalesCommission { id: string; amount: number; deal_id: string; status: "Pending" | "Paid"; date: string; }

interface ClientForm {
  companyName: string; contactName: string; email: string;
  phone: string; password: string;
}

export default function SalesPanel() {
  const { user, checkPermission } = useAuth();
  const { showToast } = useToast();

  const isAdmin = checkPermission("sales", "APPROVE") || user?.role === "management";

  const [activeTab, setActiveTab] = useState("leads");

  // ── Stored clients ────────────────────────────────────────────────────────
  const [storedClients, setStoredClients] = useState<StoredClient[]>(() =>
    safeParse<StoredClient[]>(localStorage.getItem(CLIENTS_KEY), [])
  );

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === CLIENTS_KEY) setStoredClients(safeParse<StoredClient[]>(e.newValue, []));
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  // ── Client creation form ──────────────────────────────────────────────────
  const [clientForm, setClientForm] = useState<ClientForm>({
    companyName: "", contactName: "", email: "", phone: "", password: "",
  });
  const [clientFormLoading, setClientFormLoading] = useState(false);
  const [clientFormError, setClientFormError]     = useState("");
  const [clientFormSuccess, setClientFormSuccess] = useState("");
  const [editingClientStatus, setEditingClientStatus] = useState<string | null>(null);

  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    setClientFormError(""); setClientFormSuccess("");
    const { companyName, contactName, email, phone, password } = clientForm;
    if (!companyName || !contactName || !email || !phone || !password) {
      setClientFormError("All fields are required.");
      return;
    }
    setClientFormLoading(true);
    try {
      // Create login profile first (server will match email to use same id for client record)
      const newProfile = await UserService.create({
        full_name: contactName,
        email,
        avatar_url: "",
        company: companyName,
        role: "client",
        created_at: new Date().toISOString(),
      });
      storeMockPassword(email, password);

      // Create unified client record via mock server (writes to optivax_clients with all fields)
      await ClientService.create({
        name: contactName,
        company: companyName,
        email,
        phone,
        address: "",
        city: "",
        status: "active",
        joinDate: new Date().toISOString(),
        totalProjects: 0,
        totalBilled: 0,
        createdBy: user?.id ?? "",
        createdByName: user?.name ?? "",
      });

      if (user) {
        notifyClientCreated(user.id, user.name, user.role, contactName, newProfile.id);
      }

      // Re-read from localStorage (mock server wrote the unified record there)
      setStoredClients(safeParse<StoredClient[]>(localStorage.getItem(CLIENTS_KEY), []));
      setClientFormSuccess(`Client "${contactName}" created successfully!`);
      setClientForm({ companyName: "", contactName: "", email: "", phone: "", password: "" });
    } catch {
      setClientFormError("Failed to create client. Email may already be in use.");
    } finally {
      setClientFormLoading(false);
    }
  };

  const toggleClientStatus = async (id: string) => {
    const current = storedClients.find((c) => c.id === id);
    if (!current) return;
    const newStatus: "active" | "inactive" = current.status === "active" ? "inactive" : "active";
    try {
      await ClientService.update(id, { status: newStatus });
      setStoredClients(safeParse<StoredClient[]>(localStorage.getItem(CLIENTS_KEY), []));
    } catch {
      showToast("Failed to update client status", "error");
    }
    setEditingClientStatus(null);
  };

  // ── Real sales data KPIs ──────────────────────────────────────────────────
  const targets   = useMemo(() => getTargets(), []);
  const campaigns = useMemo(() => getCampaigns(), []);
  const tasks     = useMemo(() => getSalesTasks(), []);

  const teamRevenue  = targets.reduce((s, t) => s + t.achievedAmount, 0);
  const teamTarget   = targets.reduce((s, t) => s + t.monthlyTarget, 0);
  const teamPct      = teamTarget > 0 ? Math.round((teamRevenue / teamTarget) * 100) : 0;
  const totalBudget  = campaigns.reduce((s, c) => s + c.totalBudget, 0);
  const totalSpent   = campaigns.reduce((s, c) => s + c.budgetSpent, 0);
  const budgetPct    = totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0;

  const myTasks = isAdmin
    ? tasks
    : tasks.filter(t => t.assignedTo === user?.id);
  const activeTasks = myTasks.filter(t => t.status === "in-progress" || t.status === "todo").length;
  const doneTasks   = myTasks.filter(t => t.status === "done").length;

  const DEFAULT_LEADS: SalesLead[] = [
    { id: "l1", name: "Mike Ross",       email: "mike@pearson.com",    company: "Pearson Specter", status: "Qualified", estimated_value: 50000 },
    { id: "l2", name: "Harvey Specter",  email: "harvey@pearson.com",  company: "Pearson Specter", status: "New",       estimated_value: 120000 },
    { id: "l3", name: "Rachel Zane",     email: "rachel@pearson.com",  company: "Pearson Specter", status: "Contacted", estimated_value: 30000 },
  ];
  const DEFAULT_DEALS: SalesDeal[] = [
    { id: "d1", title: "Enterprise Software License", client: "Acme Corp",  amount: 75000,  stage: "Negotiation" },
    { id: "d2", title: "Cloud Migration Service",     client: "Globex",     amount: 150000, stage: "Proposal" },
    { id: "d3", title: "Security Audit",              client: "Stark Ind",  amount: 45000,  stage: "Won" },
  ];
  const DEFAULT_COMMISSIONS: SalesCommission[] = [
    { id: "cm1", amount: 4500, deal_id: "d3", status: "Paid",    date: "2026-05-20" },
    { id: "cm2", amount: 7500, deal_id: "d1", status: "Pending", date: "2026-06-10" },
  ];

  // ── Local state — persisted to localStorage so data survives navigation ───
  const [leads, setLeads] = useState<SalesLead[]>(() =>
    safeParse<SalesLead[]>(localStorage.getItem("sales_leads"), DEFAULT_LEADS)
  );
  const [deals] = useState<SalesDeal[]>(() =>
    safeParse<SalesDeal[]>(localStorage.getItem("sales_deals"), DEFAULT_DEALS)
  );
  const [commissions] = useState<SalesCommission[]>(() =>
    safeParse<SalesCommission[]>(localStorage.getItem("sales_commissions"), DEFAULT_COMMISSIONS)
  );

  useEffect(() => {
    localStorage.setItem("sales_leads", JSON.stringify(leads));
  }, [leads]);

  const [newLead, setNewLead] = useState({ name: "", company: "", estimated_value: 0 });

  const handleAddLead = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLead.name || !newLead.company) return;
    setLeads(prev => [...prev, {
      id: `l${Date.now()}`,
      name: newLead.name,
      email: `${newLead.name.split(" ")[0].toLowerCase()}@example.com`,
      company: newLead.company,
      status: "New",
      estimated_value: newLead.estimated_value,
    }]);
    setNewLead({ name: "", company: "", estimated_value: 0 });
    showToast("Lead added successfully!", "success");
  };

  const totalPipeline   = deals.reduce((sum, d) => d.stage !== "Lost" ? sum + d.amount : sum, 0);
  const totalCommissions = commissions.reduce((sum, c) => sum + c.amount, 0);
  const wonDeals        = deals.filter(d => d.stage === "Won");

  return (
    <>
      <PageMeta title="Sales Dashboard | Optivax CRM" description="Sales admin dashboard" />
      <PageBreadcrumb pageTitle="Sales Dashboard" />

      {/* ── Real Sales KPIs ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          {
            label: isAdmin ? "Team Revenue (MTD)" : "My Revenue (MTD)",
            value: `$${teamRevenue.toLocaleString()}`,
            sub:   `${teamPct}% of target`,
            color: teamPct >= 100 ? "text-green-600 dark:text-green-400" : teamPct >= 75 ? "text-brand-600 dark:text-brand-400" : "text-yellow-600 dark:text-yellow-400",
          },
          {
            label: isAdmin ? "Active Campaigns" : "Active Tasks",
            value: isAdmin ? String(campaigns.filter(c => c.status === "active").length) : String(activeTasks),
            sub:   isAdmin ? `$${totalBudget.toLocaleString()} total budget` : `${doneTasks} completed`,
            color: "text-blue-600 dark:text-blue-400",
          },
          {
            label: "Budget Utilization",
            value: `${budgetPct}%`,
            sub:   `$${totalSpent.toLocaleString()} of $${totalBudget.toLocaleString()}`,
            color: budgetPct >= 90 ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400",
          },
          {
            label: "Pipeline Value",
            value: `$${totalPipeline.toLocaleString()}`,
            sub:   `${wonDeals.length} deals won`,
            color: "text-purple-600 dark:text-purple-400",
          },
        ].map(card => (
          <div key={card.label} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400">{card.label}</p>
            <p className={`mt-2 text-2xl font-bold ${card.color}`}>{card.value}</p>
            <p className="text-xs text-gray-400 mt-1">{card.sub}</p>
          </div>
        ))}
      </div>

      {/* ── Quick stats row (admin only) ─────────────────────────────────── */}
      {isAdmin && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {targets.map(t => {
            const pct = t.monthlyTarget > 0 ? Math.round((t.achievedAmount / t.monthlyTarget) * 100) : 0;
            return (
              <div key={t.id} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
                <div className="flex items-center gap-2 mb-2">
                  <div className="h-8 w-8 rounded-full bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center text-xs font-bold text-brand-600 dark:text-brand-400">
                    {t.memberName.split(" ").map(n => n[0]).join("")}
                  </div>
                  <div className="text-xs font-semibold text-gray-700 dark:text-gray-300 truncate">{t.memberName}</div>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 mb-1">
                  <div className={`h-1.5 rounded-full ${pct >= 100 ? "bg-green-500" : pct >= 75 ? "bg-brand-500" : pct >= 50 ? "bg-yellow-500" : "bg-red-500"}`}
                    style={{ width: `${Math.min(pct, 100)}%` }} />
                </div>
                <p className="text-xs text-gray-400">{pct}% — ${t.achievedAmount.toLocaleString()} / ${t.monthlyTarget.toLocaleString()}</p>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Tabs ────────────────────────────────────────────────────────── */}
      <div className="mb-6 border-b border-gray-200 dark:border-gray-800">
        <nav className="-mb-px flex gap-4 overflow-x-auto pb-px">
          {["leads", "deals", "commissions", "clients"].map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab
                  ? "border-brand-500 text-brand-600 dark:text-brand-400"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300"
              }`}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </nav>
      </div>

      {/* ── Leads Tab ───────────────────────────────────────────────────── */}
      {activeTab === "leads" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900 lg:col-span-2">
            <h3 className="mb-4 text-lg font-bold text-gray-800 dark:text-white">Lead Pipeline</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-800/50">
                    {["Lead Name", "Company", "Est. Value", "Status"].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                  {leads.map(lead => (
                    <tr key={lead.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">{lead.name}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">{lead.company}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">${lead.estimated_value.toLocaleString()}</td>
                      <td className="px-4 py-3 text-sm">
                        <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${
                          lead.status === "Qualified" ? "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400"
                          : lead.status === "New"     ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
                          : lead.status === "Lost"    ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
                          : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300"
                        }`}>
                          {lead.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <RequirePermission domain="sales" action="CREATE"
            fallback={
              <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
                <h3 className="mb-4 text-lg font-bold text-gray-800 dark:text-white">Add New Lead</h3>
                <Placeholder message="You don't have permission to add leads." />
              </div>
            }>
            <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
              <h3 className="mb-4 text-lg font-bold text-gray-800 dark:text-white">Add New Lead</h3>
              <form onSubmit={handleAddLead} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Lead Name</label>
                  <input type="text" required className="w-full rounded-lg border border-gray-300 p-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                    value={newLead.name} onChange={e => setNewLead(f => ({ ...f, name: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Company</label>
                  <input type="text" required className="w-full rounded-lg border border-gray-300 p-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                    value={newLead.company} onChange={e => setNewLead(f => ({ ...f, company: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Estimated Value ($)</label>
                  <input type="number" className="w-full rounded-lg border border-gray-300 p-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                    value={newLead.estimated_value} onChange={e => setNewLead(f => ({ ...f, estimated_value: Number(e.target.value) || 0 }))} />
                </div>
                <button type="submit" className="w-full bg-brand-500 hover:bg-brand-600 text-white font-medium py-2 px-4 rounded-lg transition-colors text-sm">
                  Add Lead
                </button>
              </form>
            </div>
          </RequirePermission>
        </div>
      )}

      {/* ── Deals Tab ───────────────────────────────────────────────────── */}
      {activeTab === "deals" && (
        <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
          <h3 className="mb-4 text-lg font-bold text-gray-800 dark:text-white">Deal Tracking</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {(["Proposal", "Negotiation", "Won"] as const).map(stage => (
              <div key={stage} className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-xl border border-gray-100 dark:border-gray-800">
                <h4 className="font-semibold text-gray-700 dark:text-gray-300 mb-4 pb-2 border-b border-gray-200 dark:border-gray-700">
                  {stage}
                </h4>
                <div className="space-y-3">
                  {deals.filter(d => d.stage === stage).map(deal => (
                    <div key={deal.id} className="bg-white dark:bg-gray-900 p-3 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
                      <p className="font-medium text-sm text-gray-900 dark:text-white">{deal.title}</p>
                      <p className="text-xs text-gray-500 mt-1">{deal.client}</p>
                      <p className="text-sm font-bold text-brand-600 dark:text-brand-400 mt-2">${deal.amount.toLocaleString()}</p>
                    </div>
                  ))}
                  {deals.filter(d => d.stage === stage).length === 0 && (
                    <p className="text-xs text-gray-400 italic text-center py-4">No deals in this stage</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Clients Tab ─────────────────────────────────────────────────── */}
      {activeTab === "clients" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Client list */}
          <div className="lg:col-span-2 rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800">
              <h3 className="text-lg font-bold text-gray-800 dark:text-white">Clients</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                {storedClients.length} client{storedClients.length !== 1 ? "s" : ""} created · manage status here
              </p>
            </div>
            <div className="p-6">
              {storedClients.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">
                  No clients yet. Use the form to create your first client.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800 text-sm">
                    <thead>
                      <tr className="bg-gray-50 dark:bg-gray-800/50">
                        {["Contact", "Company", "Email", "Phone", "Created", "Status", ""].map((h) => (
                          <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                      {storedClients.map((c) => (
                        <tr key={c.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30">
                          <td className="px-4 py-3 font-medium text-gray-900 dark:text-white whitespace-nowrap">{c.contactName}</td>
                          <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{c.companyName}</td>
                          <td className="px-4 py-3 text-brand-500 whitespace-nowrap">{c.email}</td>
                          <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{c.phone}</td>
                          <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                            {new Date(c.createdAt).toLocaleDateString()}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${
                              c.status === "active"
                                ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                                : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                            }`}>{c.status}</span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            {isAdmin && (
                              <button
                                onClick={() => toggleClientStatus(c.id)}
                                className="text-xs text-brand-600 hover:text-brand-800 dark:text-brand-400 dark:hover:text-brand-300 font-medium"
                              >
                                {c.status === "active" ? "Deactivate" : "Activate"}
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* Create Client Form */}
          <RequirePermission domain="sales" action="CREATE"
            fallback={
              <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900 p-6">
                <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4">Add Client</h3>
                <Placeholder message="Only Sales Admins can create clients." />
              </div>
            }>
            <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900 p-6">
              <h3 className="mb-1 text-lg font-bold text-gray-800 dark:text-white">Add New Client</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">Creates a client account and login credentials.</p>

              {clientFormSuccess && (
                <div className="mb-4 text-sm text-green-700 bg-green-50 dark:bg-green-900/20 dark:text-green-400 rounded-lg px-3 py-2 border border-green-200 dark:border-green-800">
                  {clientFormSuccess}
                </div>
              )}
              {clientFormError && (
                <div className="mb-4 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400 rounded-lg px-3 py-2 border border-red-200 dark:border-red-800">
                  {clientFormError}
                </div>
              )}

              <form onSubmit={handleCreateClient} className="space-y-4">
                {[
                  { key: "companyName",  label: "Company Name",  type: "text",     placeholder: "e.g. Acme Corp" },
                  { key: "contactName",  label: "Contact Name",  type: "text",     placeholder: "e.g. John Smith" },
                  { key: "email",        label: "Email",         type: "email",    placeholder: "john@acmecorp.com" },
                  { key: "phone",        label: "Phone",         type: "tel",      placeholder: "+1-555-0100" },
                  { key: "password",     label: "Temp Password", type: "password", placeholder: "Minimum 8 characters" },
                ].map(({ key, label, type, placeholder }) => (
                  <div key={key}>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{label}</label>
                    <input type={type} required placeholder={placeholder}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                      value={(clientForm as unknown as Record<string, string>)[key]}
                      onChange={(e) => setClientForm((f) => ({ ...f, [key]: e.target.value }))} />
                  </div>
                ))}
                <button type="submit" disabled={clientFormLoading}
                  className="w-full bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white font-medium py-2 px-4 rounded-lg transition-colors text-sm">
                  {clientFormLoading ? "Creating…" : "Create Client"}
                </button>
              </form>
            </div>
          </RequirePermission>
        </div>
      )}

      {/* ── Commissions Tab ─────────────────────────────────────────────── */}
      {activeTab === "commissions" && (
        <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
          <h3 className="mb-4 text-lg font-bold text-gray-800 dark:text-white">Commission Reports</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-800/50">
                  {["Date", "Deal ID", "Amount", "Status"].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                {commissions.map(comm => (
                  <tr key={comm.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30">
                    <td className="px-4 py-3 text-sm text-gray-500">{comm.date}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{comm.deal_id}</td>
                    <td className="px-4 py-3 text-sm font-semibold text-gray-900 dark:text-white">${comm.amount.toLocaleString()}</td>
                    <td className="px-4 py-3 text-sm">
                      <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${
                        comm.status === "Paid"
                          ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                          : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"
                      }`}>
                        {comm.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-800 flex justify-end">
            <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              Total commissions: <span className="text-brand-600 dark:text-brand-400">${totalCommissions.toLocaleString()}</span>
            </span>
          </div>
        </div>
      )}
    </>
  );
}
