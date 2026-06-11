import React, { useState } from "react";
import PageMeta from "../../components/common/PageMeta";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";

// Mock Data Types
interface Lead { id: string; name: string; email: string; company: string; status: "New" | "Contacted" | "Qualified" | "Lost"; estimated_value: number; }
interface Deal { id: string; title: string; client: string; amount: number; stage: "Proposal" | "Negotiation" | "Won" | "Lost"; }
interface Commission { id: string; amount: number; deal_id: string; status: "Pending" | "Paid"; date: string; }
interface Client { id: string; name: string; company: string; industry: string; }

export default function SalesPanel() {
  const [activeTab, setActiveTab] = useState("leads");

  // Mock State
  const [leads, setLeads] = useState<Lead[]>([
    { id: "l1", name: "Mike Ross", email: "mike@pearson.com", company: "Pearson Specter", status: "Qualified", estimated_value: 50000 },
    { id: "l2", name: "Harvey Specter", email: "harvey@pearson.com", company: "Pearson Specter", status: "New", estimated_value: 120000 },
    { id: "l3", name: "Rachel Zane", email: "rachel@pearson.com", company: "Pearson Specter", status: "Contacted", estimated_value: 30000 },
  ]);

  const [deals, setDeals] = useState<Deal[]>([
    { id: "d1", title: "Enterprise Software License", client: "Acme Corp", amount: 75000, stage: "Negotiation" },
    { id: "d2", title: "Cloud Migration Service", client: "Globex", amount: 150000, stage: "Proposal" },
    { id: "d3", title: "Security Audit", client: "Stark Ind", amount: 45000, stage: "Won" },
  ]);

  const [commissions] = useState<Commission[]>([
    { id: "cm1", amount: 4500, deal_id: "d3", status: "Paid", date: "2026-05-20" },
    { id: "cm2", amount: 7500, deal_id: "d1", status: "Pending", date: "2026-06-10" },
  ]);

  const [clients, setClients] = useState<Client[]>([
    { id: "c1", name: "John Doe", company: "Acme Corp", industry: "Manufacturing" },
    { id: "c2", name: "Jane Smith", company: "Globex", industry: "Technology" },
  ]);

  const [newLead, setNewLead] = useState({ name: "", company: "", estimated_value: 0 });
  const [newClient, setNewClient] = useState({ name: "", company: "", industry: "" });

  const handleAddLead = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLead.name || !newLead.company) return;
    setLeads([...leads, {
      id: `l${leads.length + 1}`,
      name: newLead.name,
      email: `${newLead.name.split(' ')[0].toLowerCase()}@example.com`,
      company: newLead.company,
      status: "New",
      estimated_value: newLead.estimated_value
    }]);
    setNewLead({ name: "", company: "", estimated_value: 0 });
    alert("Lead added successfully!");
  };

  const handleAddClient = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClient.name || !newClient.company) return;
    setClients([...clients, {
      id: `c${clients.length + 1}`,
      name: newClient.name,
      company: newClient.company,
      industry: newClient.industry
    }]);
    setNewClient({ name: "", company: "", industry: "" });
    alert("Client added successfully!");
  };

  const totalPipeline = deals.reduce((sum, d) => d.stage !== "Lost" ? sum + d.amount : sum, 0);
  const totalCommissions = commissions.reduce((sum, c) => sum + c.amount, 0);
  const wonDeals = deals.filter(d => d.stage === "Won");

  return (
    <>
      <PageMeta title="Sales Dashboard | Optivax CRM" description="Sales admin dashboard" />
      <PageBreadcrumb pageTitle="Sales Dashboard" />
      
      {/* Top KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Pipeline Value</p>
          <h4 className="mt-2 text-2xl font-bold text-gray-800 dark:text-white">${totalPipeline.toLocaleString()}</h4>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Active Deals</p>
          <h4 className="mt-2 text-2xl font-bold text-blue-500">{deals.filter(d => d.stage === 'Proposal' || d.stage === 'Negotiation').length}</h4>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Won Deals</p>
          <h4 className="mt-2 text-2xl font-bold text-green-500">{wonDeals.length}</h4>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">My Commissions</p>
          <h4 className="mt-2 text-2xl font-bold text-purple-500">${totalCommissions.toLocaleString()}</h4>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="mb-6 border-b border-gray-200 dark:border-gray-800">
        <nav className="-mb-px flex space-x-8">
          {["leads", "deals", "clients", "commissions"].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab 
                  ? "border-brand-500 text-brand-600 dark:text-brand-400" 
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300"
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </nav>
      </div>

      <div className="space-y-6">
        
        {/* Leads Tab */}
        {activeTab === "leads" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900 lg:col-span-2">
              <h3 className="mb-4 text-lg font-bold text-gray-800 dark:text-white">Lead Pipeline</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
                  <thead>
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Lead Name</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Company</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Est. Value</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                    {leads.map(lead => (
                      <tr key={lead.id}>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">{lead.name}</td>
                        <td className="px-4 py-3 text-sm text-gray-500">{lead.company}</td>
                        <td className="px-4 py-3 text-sm text-gray-500">${lead.estimated_value.toLocaleString()}</td>
                        <td className="px-4 py-3 text-sm">
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            lead.status === 'Qualified' ? 'bg-purple-100 text-purple-800' : 
                            lead.status === 'New' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
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

            <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
              <h3 className="mb-4 text-lg font-bold text-gray-800 dark:text-white">Add New Lead</h3>
              <form onSubmit={handleAddLead} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Lead Name</label>
                  <input type="text" required className="w-full rounded-lg border border-gray-300 p-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white" value={newLead.name} onChange={e => setNewLead({...newLead, name: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Company</label>
                  <input type="text" required className="w-full rounded-lg border border-gray-300 p-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white" value={newLead.company} onChange={e => setNewLead({...newLead, company: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Estimated Value ($)</label>
                  <input type="number" required className="w-full rounded-lg border border-gray-300 p-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white" value={newLead.estimated_value} onChange={e => setNewLead({...newLead, estimated_value: parseInt(e.target.value) || 0})} />
                </div>
                <button type="submit" className="w-full bg-brand-500 hover:bg-brand-600 text-white font-medium py-2 px-4 rounded-lg transition-colors text-sm">
                  Add Lead
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Deals Tab */}
        {activeTab === "deals" && (
          <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
            <h3 className="mb-4 text-lg font-bold text-gray-800 dark:text-white">Deal Tracking</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {['Proposal', 'Negotiation', 'Won'].map(stage => (
                <div key={stage} className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-xl border border-gray-100 dark:border-gray-800">
                  <h4 className="font-semibold text-gray-700 dark:text-gray-300 mb-4 pb-2 border-b border-gray-200 dark:border-gray-700">{stage}</h4>
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

        {/* Clients Tab */}
        {activeTab === "clients" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900 lg:col-span-2">
              <h3 className="mb-4 text-lg font-bold text-gray-800 dark:text-white">Client Management</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
                  <thead>
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Client Name</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Company</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Industry</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                    {clients.map(client => (
                      <tr key={client.id}>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">{client.name}</td>
                        <td className="px-4 py-3 text-sm text-gray-500">{client.company}</td>
                        <td className="px-4 py-3 text-sm text-gray-500">{client.industry}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
              <h3 className="mb-4 text-lg font-bold text-gray-800 dark:text-white">Add New Client</h3>
              <form onSubmit={handleAddClient} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Client Name</label>
                  <input type="text" required className="w-full rounded-lg border border-gray-300 p-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white" value={newClient.name} onChange={e => setNewClient({...newClient, name: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Company</label>
                  <input type="text" required className="w-full rounded-lg border border-gray-300 p-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white" value={newClient.company} onChange={e => setNewClient({...newClient, company: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Industry</label>
                  <input type="text" required className="w-full rounded-lg border border-gray-300 p-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white" value={newClient.industry} onChange={e => setNewClient({...newClient, industry: e.target.value})} />
                </div>
                <button type="submit" className="w-full bg-brand-500 hover:bg-brand-600 text-white font-medium py-2 px-4 rounded-lg transition-colors text-sm">
                  Add Client
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Commissions Tab */}
        {activeTab === "commissions" && (
          <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
            <h3 className="mb-4 text-lg font-bold text-gray-800 dark:text-white">Commission Reports</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
                <thead>
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Deal ID</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                  {commissions.map(comm => (
                    <tr key={comm.id}>
                      <td className="px-4 py-3 text-sm text-gray-500">{comm.date}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">{comm.deal_id}</td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">${comm.amount.toLocaleString()}</td>
                      <td className="px-4 py-3 text-sm">
                        <span className={`px-2 py-1 text-xs rounded-full ${comm.status === 'Paid' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                          {comm.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>
    </>
  );
}
