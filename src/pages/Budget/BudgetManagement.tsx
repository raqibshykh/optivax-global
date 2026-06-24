import React, { useState, useEffect, useMemo } from "react";
import PageMeta from "../../components/common/PageMeta";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import { useAuth } from "../../context/AuthContext";
import { canManageBudget } from "../../utils/rbac";
import {
  getBudgets, saveBudgets, getAuditLogs, appendAuditLog,
  getBudgetStats, getChangesThisMonth, computeStatus,
  type Budget, type BudgetAuditLog, type BudgetStatus,
  type BudgetCategory, type BudgetAction,
} from "../../mock/budgetData";

// ── Constants ─────────────────────────────────────────────────────────────────

const DEPARTMENTS = ["Sales", "Marketing", "Production", "HR", "IT Support", "Management", "General"];
const CATEGORIES: BudgetCategory[] = ["Operations", "Marketing", "Development", "HR", "Infrastructure", "Sales", "General"];
const FISCAL_YEARS = ["FY2025", "FY2026", "FY2027"];

const STATUS_COLOR: Record<BudgetStatus, string> = {
  active:    "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  paused:    "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  closed:    "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
  overspent: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

const ACTION_LABEL: Record<BudgetAction, string> = {
  create: "Created", increase: "Increased", reduce: "Reduced",
  transfer_out: "Transfer Out", transfer_in: "Transfer In",
  adjust: "Adjusted", reallocate: "Reallocated", edit: "Edited",
  close: "Closed", reopen: "Reopened", pause: "Paused", note: "Note Added",
};

const ACTION_COLOR: Record<BudgetAction, string> = {
  create:       "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  increase:     "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  reduce:       "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  transfer_out: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  transfer_in:  "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400",
  adjust:       "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  reallocate:   "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400",
  edit:         "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
  close:        "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  reopen:       "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  pause:        "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  note:         "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
};

const fmt = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);

const pct = (used: number, total: number) =>
  total > 0 ? Math.min(100, Math.round((used / total) * 100)) : 0;

function UtilBar({ used, total }: { used: number; total: number }) {
  const p = pct(used, total);
  const color = p >= 100 ? "bg-red-500" : p >= 85 ? "bg-orange-400" : p >= 60 ? "bg-yellow-400" : "bg-green-500";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
        <div className={`${color} h-1.5 rounded-full transition-all`} style={{ width: `${Math.min(p, 100)}%` }} />
      </div>
      <span className={`text-xs font-medium w-9 text-right ${p >= 100 ? "text-red-600" : "text-gray-600 dark:text-gray-400"}`}>{p}%</span>
    </div>
  );
}

// ── Modal helpers ─────────────────────────────────────────────────────────────

type ModalType = "create" | "edit" | "increase" | "reduce" | "transfer" | "adjust" | "history" | "note" | "status" | null;

function Modal({ title, onClose, children, wide = false }: {
  title: string; onClose: () => void; children: React.ReactNode; wide?: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className={`w-full ${wide ? "max-w-3xl" : "max-w-lg"} rounded-2xl bg-white dark:bg-gray-900 shadow-2xl flex flex-col max-h-[90vh]`}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800 flex-shrink-0">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-2xl leading-none">×</button>
        </div>
        <div className="overflow-y-auto flex-1">{children}</div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{label}</label>
      {children}
    </div>
  );
}

const inputCls = "w-full rounded-lg border border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-white px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:border-transparent";

// ── Dept visibility ───────────────────────────────────────────────────────────

const DEPT_FOR_ROLE: Record<string, string> = {
  sales_admin:      "Sales",
  production_admin: "Production",
  marketing_admin:  "Marketing",
  hr_admin:         "HR",
  it_admin:         "IT Support",
};

// ── Main Component ────────────────────────────────────────────────────────────

export default function BudgetManagement() {
  const { user } = useAuth();
  const canManage = canManageBudget(user);
  const userDept  = user ? (DEPT_FOR_ROLE[user.role] ?? null) : null;
  const isDeptAdmin = userDept !== null && user?.role !== "super_admin" && user?.role !== "management";

  const [tab, setTab] = useState<"budgets" | "audit">("budgets");
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [auditLogs, setAuditLogs] = useState<BudgetAuditLog[]>([]);

  // Filters
  const [search, setSearch] = useState("");
  const [filterDept, setFilterDept] = useState("all");
  const [filterStatus, setFilterStatus] = useState<BudgetStatus | "all">("all");
  const [filterCat, setFilterCat] = useState<BudgetCategory | "all">("all");
  const [auditSearch, setAuditSearch] = useState("");
  const [auditAction, setAuditAction] = useState<BudgetAction | "all">("all");

  // Modal
  const [modal, setModal] = useState<{ type: ModalType; budget: Budget | null }>({ type: null, budget: null });

  // Form state (shared across modals)
  const [form, setForm] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState("");

  useEffect(() => {
    setBudgets(getBudgets());
    setAuditLogs(getAuditLogs());
  }, []);

  // Dept admins see only their dept's aggregated figures — not company-wide totals
  const scopedBudgets = useMemo(
    () => isDeptAdmin && userDept ? budgets.filter(b => b.department === userDept) : budgets,
    [budgets, isDeptAdmin, userDept]
  );

  const stats = useMemo(() => getBudgetStats(scopedBudgets), [scopedBudgets]);
  const changesThisMonth = useMemo(() => getChangesThisMonth(auditLogs), [auditLogs]);

  const filteredBudgets = useMemo(() => {
    let list = [...budgets];
    // Dept admins hard-scoped to their own dept — cannot be overridden by filter
    if (isDeptAdmin && userDept) {
      list = list.filter(b => b.department === userDept);
    } else if (filterDept !== "all") {
      list = list.filter(b => b.department === filterDept);
    }
    if (filterStatus !== "all") list = list.filter(b => b.status === filterStatus);
    if (filterCat !== "all") list = list.filter(b => b.category === filterCat);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(b =>
        b.name.toLowerCase().includes(q) ||
        b.department.toLowerCase().includes(q) ||
        b.assignedToName.toLowerCase().includes(q) ||
        (b.purpose ?? "").toLowerCase().includes(q)
      );
    }
    return list.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }, [budgets, filterDept, filterStatus, filterCat, search, isDeptAdmin, userDept]);

  const filteredLogs = useMemo(() => {
    let list = [...auditLogs];
    if (auditAction !== "all") list = list.filter(l => l.action === auditAction);
    if (auditSearch.trim()) {
      const q = auditSearch.toLowerCase();
      list = list.filter(l =>
        l.budgetName.toLowerCase().includes(q) ||
        l.changedByName.toLowerCase().includes(q) ||
        l.reason.toLowerCase().includes(q)
      );
    }
    return list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [auditLogs, auditAction, auditSearch]);

  // ── Mutation helpers ─────────────────────────────────────────────────────

  const persist = (updated: Budget[]) => {
    const withStatus = updated.map(b => ({ ...b, status: computeStatus(b) }));
    setBudgets(withStatus);
    saveBudgets(withStatus);
  };

  const log = (entry: Omit<BudgetAuditLog, "id" | "timestamp" | "changedById" | "changedByName">) => {
    const newLog: BudgetAuditLog = {
      ...entry,
      id: `al-${Date.now()}`,
      timestamp: new Date().toISOString(),
      changedById: user?.id ?? "unknown",
      changedByName: user?.name ?? "Unknown",
    };
    appendAuditLog(newLog);
    setAuditLogs(getAuditLogs());
  };

  const openModal = (type: ModalType, budget: Budget | null = null) => {
    setFormError("");
    setForm({});
    setModal({ type, budget });
  };

  const closeModal = () => setModal({ type: null, budget: null });

  // ── Actions ──────────────────────────────────────────────────────────────

  const handleCreate = () => {
    const { name, department, category, assignedToName, totalBudget, fiscalYear, notes, projectName, taskName, purpose, description } = form;
    const effectiveDept = isDeptAdmin && userDept ? userDept : department;
    if (!name?.trim() || !effectiveDept || !category || !totalBudget) {
      setFormError("Name, Department, Category, and Total Budget are required."); return;
    }
    const amount = parseFloat(totalBudget);
    if (isNaN(amount) || amount <= 0) { setFormError("Total Budget must be a positive number."); return; }

    const now = new Date().toISOString();
    const newBudget: Budget = {
      id: `bud-${Date.now()}`,
      name: name.trim(),
      department: effectiveDept,
      category: category as BudgetCategory,
      projectName: projectName?.trim() || undefined,
      taskName: taskName?.trim() || undefined,
      purpose: purpose?.trim() || undefined,
      description: description?.trim() || undefined,
      assignedById: user?.id ?? "",
      assignedByName: user?.name ?? "",
      assignedToId: "",
      assignedToName: assignedToName?.trim() || effectiveDept,
      totalBudget: amount,
      usedBudget: 0,
      status: "active",
      fiscalYear: fiscalYear || "FY2026",
      allocationDate: new Date().toISOString().split("T")[0],
      notes: notes?.trim() || "",
      createdAt: now,
      updatedAt: now,
    };
    const updated = [...budgets, newBudget];
    persist(updated);
    log({ budgetId: newBudget.id, budgetName: newBudget.name, action: "create", previousValue: 0, newValue: amount, reason: form.reason?.trim() || "Budget created." });
    closeModal();
  };

  const handleEdit = () => {
    const b = modal.budget!;
    const { name, department, category, assignedToName, fiscalYear, notes, projectName, taskName, purpose, description } = form;
    if (!name?.trim()) { setFormError("Name is required."); return; }
    const now = new Date().toISOString();
    const updated = budgets.map(x =>
      x.id !== b.id ? x : {
        ...x,
        name: name.trim(),
        department: department || x.department,
        category: (category as BudgetCategory) || x.category,
        assignedToName: assignedToName?.trim() || x.assignedToName,
        fiscalYear: fiscalYear || x.fiscalYear,
        notes: notes?.trim() ?? x.notes,
        projectName: projectName?.trim() || undefined,
        taskName: taskName?.trim() || undefined,
        purpose: purpose?.trim() || undefined,
        description: description?.trim() || undefined,
        updatedAt: now,
      }
    );
    persist(updated);
    log({ budgetId: b.id, budgetName: name.trim(), action: "edit", previousValue: b.totalBudget, newValue: b.totalBudget, reason: form.reason?.trim() || "Budget details updated." });
    closeModal();
  };

  const handleIncrease = () => {
    const b = modal.budget!;
    const amount = parseFloat(form.amount ?? "0");
    if (isNaN(amount) || amount <= 0) { setFormError("Enter a valid positive amount."); return; }
    if (!form.reason?.trim()) { setFormError("Reason is required."); return; }
    const prev = b.totalBudget;
    const next = prev + amount;
    const now = new Date().toISOString();
    const updated = budgets.map(x => x.id !== b.id ? x : { ...x, totalBudget: next, updatedAt: now });
    persist(updated);
    log({ budgetId: b.id, budgetName: b.name, action: "increase", previousValue: prev, newValue: next, reason: form.reason.trim() });
    closeModal();
  };

  const handleReduce = () => {
    const b = modal.budget!;
    const amount = parseFloat(form.amount ?? "0");
    if (isNaN(amount) || amount <= 0) { setFormError("Enter a valid positive amount."); return; }
    if (!form.reason?.trim()) { setFormError("Reason is required."); return; }
    const prev = b.totalBudget;
    const next = prev - amount;
    if (next < b.usedBudget) {
      setFormError(`Cannot reduce below used amount (${fmt(b.usedBudget)}). Max reduction: ${fmt(prev - b.usedBudget)}.`);
      return;
    }
    const now = new Date().toISOString();
    const updated = budgets.map(x => x.id !== b.id ? x : { ...x, totalBudget: next, updatedAt: now });
    persist(updated);
    log({ budgetId: b.id, budgetName: b.name, action: "reduce", previousValue: prev, newValue: next, reason: form.reason.trim() });
    closeModal();
  };

  const handleTransfer = () => {
    const fromB = modal.budget!;
    const toId  = form.targetBudgetId;
    const toB   = budgets.find(x => x.id === toId);
    if (!toB) { setFormError("Select a target budget."); return; }
    const amount = parseFloat(form.amount ?? "0");
    if (isNaN(amount) || amount <= 0) { setFormError("Enter a valid positive amount."); return; }
    if (!form.reason?.trim()) { setFormError("Reason is required."); return; }
    const fromPrev = fromB.totalBudget;
    const fromNext = fromPrev - amount;
    if (fromNext < fromB.usedBudget) {
      setFormError(`Transfer would take this budget below its used amount (${fmt(fromB.usedBudget)}).`);
      return;
    }
    const toPrev = toB.totalBudget;
    const toNext = toPrev + amount;
    const now = new Date().toISOString();
    const updated = budgets.map(x => {
      if (x.id === fromB.id) return { ...x, totalBudget: fromNext, updatedAt: now };
      if (x.id === toB.id)   return { ...x, totalBudget: toNext,   updatedAt: now };
      return x;
    });
    persist(updated);
    const reason = form.reason.trim();
    log({ budgetId: fromB.id, budgetName: fromB.name, action: "transfer_out", previousValue: fromPrev, newValue: fromNext, reason, relatedBudgetId: toB.id, relatedBudgetName: toB.name });
    log({ budgetId: toB.id, budgetName: toB.name, action: "transfer_in", previousValue: toPrev, newValue: toNext, reason, relatedBudgetId: fromB.id, relatedBudgetName: fromB.name });
    closeModal();
  };

  const handleAdjust = () => {
    const b = modal.budget!;
    const newTotal = parseFloat(form.newTotal ?? "0");
    if (isNaN(newTotal) || newTotal < 0) { setFormError("Enter a valid budget total."); return; }
    if (newTotal < b.usedBudget) {
      setFormError(`New total cannot be below used amount (${fmt(b.usedBudget)}).`);
      return;
    }
    if (!form.reason?.trim()) { setFormError("Reason is required."); return; }
    const prev = b.totalBudget;
    const now  = new Date().toISOString();
    const updated = budgets.map(x => x.id !== b.id ? x : { ...x, totalBudget: newTotal, updatedAt: now });
    persist(updated);
    log({ budgetId: b.id, budgetName: b.name, action: "adjust", previousValue: prev, newValue: newTotal, reason: form.reason.trim() });
    closeModal();
  };

  const handleStatusChange = (action: "pause" | "close" | "reopen") => {
    const b = modal.budget!;
    if (!form.reason?.trim()) { setFormError("Reason is required."); return; }
    const newStatus: BudgetStatus = action === "reopen" ? "active" : action === "pause" ? "paused" : "closed";
    const now = new Date().toISOString();
    const updated = budgets.map(x => x.id !== b.id ? x : { ...x, status: newStatus, updatedAt: now });
    setBudgets(updated);
    saveBudgets(updated);
    log({ budgetId: b.id, budgetName: b.name, action, previousValue: b.totalBudget, newValue: b.totalBudget, reason: form.reason.trim() });
    closeModal();
  };

  const handleAddNote = () => {
    const b = modal.budget!;
    if (!form.note?.trim()) { setFormError("Note cannot be empty."); return; }
    const now = new Date().toISOString();
    const updated = budgets.map(x => x.id !== b.id ? x : { ...x, notes: form.note!.trim(), updatedAt: now });
    persist(updated);
    log({ budgetId: b.id, budgetName: b.name, action: "note", previousValue: b.totalBudget, newValue: b.totalBudget, reason: form.note!.trim() });
    closeModal();
  };

  const budgetLogs = useMemo(
    () => modal.type === "history" && modal.budget
      ? auditLogs.filter(l => l.budgetId === modal.budget!.id).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      : [],
    [modal, auditLogs]
  );

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <>
      <PageMeta title="Budget Management | Optivax CRM" description="Enterprise budget management and audit trail" />
      <PageBreadcrumb pageTitle="Budget Management" />

      {/* ── KPI Strip ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
        {[
          { label: "Total Budget",     value: fmt(stats.total),     color: "text-gray-900 dark:text-white" },
          { label: "Used Budget",      value: fmt(stats.used),      color: "text-blue-600" },
          { label: "Remaining",        value: fmt(stats.remaining), color: stats.remaining < 0 ? "text-red-600" : "text-green-600" },
          { label: "Utilization",      value: `${stats.utilPct}%`,  color: stats.utilPct >= 90 ? "text-red-600" : stats.utilPct >= 70 ? "text-yellow-600" : "text-green-600" },
          { label: "Changes This Month", value: changesThisMonth,   color: "text-purple-600" },
        ].map(({ label, value, color }) => (
          <div key={label} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 truncate">{label}</p>
            <p className={`mt-1 text-xl font-bold ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* ── Secondary stats ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[
          { label: "Active Budgets",   value: stats.active,    bg: "bg-green-50 dark:bg-green-900/20",  text: "text-green-700 dark:text-green-400" },
          { label: "Overspent",        value: stats.overspent, bg: "bg-red-50 dark:bg-red-900/20",      text: "text-red-700 dark:text-red-400" },
          { label: "Total Budgets",    value: stats.count,     bg: "bg-gray-50 dark:bg-gray-800/50",    text: "text-gray-700 dark:text-gray-300" },
          { label: "Paused/Closed",    value: scopedBudgets.filter(b => b.status === "paused" || b.status === "closed").length,
            bg: "bg-yellow-50 dark:bg-yellow-900/20", text: "text-yellow-700 dark:text-yellow-400" },
        ].map(({ label, value, bg, text }) => (
          <div key={label} className={`${bg} rounded-xl p-3 flex items-center justify-between`}>
            <span className="text-xs text-gray-500 dark:text-gray-400">{label}</span>
            <span className={`text-lg font-bold ${text}`}>{value}</span>
          </div>
        ))}
      </div>

      {/* ── Tabs + Action ────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-4 border-b border-gray-200 dark:border-gray-700 pb-px">
        <div className="flex gap-0">
          {(["budgets", "audit"] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-5 py-2.5 text-sm font-medium border-b-2 transition ${
                tab === t
                  ? "border-brand-500 text-brand-600 dark:text-brand-400"
                  : "border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              }`}
            >
              {t === "budgets" ? `Budgets (${scopedBudgets.length})` : `Audit Trail (${auditLogs.length})`}
            </button>
          ))}
        </div>
        {canManage && tab === "budgets" && (
          <button
            onClick={() => openModal("create")}
            className="px-4 py-2 text-sm font-semibold text-white bg-brand-500 hover:bg-brand-600 rounded-xl transition-colors"
          >
            + Create Budget
          </button>
        )}
      </div>

      {/* ── BUDGETS TAB ──────────────────────────────────────────────────────── */}
      {tab === "budgets" && (
        <>
          {/* Filters */}
          <div className="flex flex-wrap gap-3 mb-4">
            <input
              type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search budgets…"
              className="rounded-lg border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white px-3 py-1.5 text-sm flex-1 min-w-[160px] focus:ring-2 focus:ring-brand-500 focus:border-transparent"
            />
            {isDeptAdmin ? (
              <span className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400">
                {userDept} Dept
              </span>
            ) : (
              <select value={filterDept} onChange={e => setFilterDept(e.target.value)}
                className="rounded-lg border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white px-3 py-1.5 text-sm focus:ring-2 focus:ring-brand-500 focus:border-transparent">
                <option value="all">All Departments</option>
                {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            )}
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value as BudgetStatus | "all")}
              className="rounded-lg border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white px-3 py-1.5 text-sm focus:ring-2 focus:ring-brand-500 focus:border-transparent">
              <option value="all">All Statuses</option>
              {(["active", "paused", "closed", "overspent"] as BudgetStatus[]).map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <select value={filterCat} onChange={e => setFilterCat(e.target.value as BudgetCategory | "all")}
              className="rounded-lg border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white px-3 py-1.5 text-sm focus:ring-2 focus:ring-brand-500 focus:border-transparent">
              <option value="all">All Categories</option>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          {/* Budget Table */}
          <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-800/60">
                  <tr>
                    {["Budget Name", "Dept / Category", "Assigned To", "Total", "Used", "Remaining", "Utilization", "Status", "Updated", "Actions"].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredBudgets.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="px-4 py-10 text-center text-sm text-gray-400 dark:text-gray-500">No budgets match the current filters.</td>
                    </tr>
                  ) : filteredBudgets.map(b => {
                    const remaining = b.totalBudget - b.usedBudget;
                    return (
                      <tr key={b.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors">
                        <td className="px-4 py-3 max-w-[220px]">
                          <p className="text-sm font-medium text-gray-900 dark:text-white">{b.name}</p>
                          {b.purpose && <p className="text-xs text-brand-600 dark:text-brand-400 mt-0.5 truncate" title={b.purpose}>{b.purpose}</p>}
                          {b.projectName && <p className="text-xs text-gray-400 mt-0.5">{b.projectName}</p>}
                          <p className="text-xs text-gray-400">{b.fiscalYear}</p>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <p className="text-sm text-gray-700 dark:text-gray-300">{b.department}</p>
                          <p className="text-xs text-gray-400">{b.category}</p>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <p className="text-sm text-gray-700 dark:text-gray-300">{b.assignedToName}</p>
                          <p className="text-xs text-gray-400">by {b.assignedByName}</p>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{fmt(b.totalBudget)}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-blue-600 dark:text-blue-400">{fmt(b.usedBudget)}</td>
                        <td className={`px-4 py-3 whitespace-nowrap text-sm font-medium ${remaining < 0 ? "text-red-600" : "text-green-600"}`}>{fmt(remaining)}</td>
                        <td className="px-4 py-3 min-w-[120px]"><UtilBar used={b.usedBudget} total={b.totalBudget} /></td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className={`inline-block text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLOR[b.status]}`}>{b.status}</span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-400">{new Date(b.updatedAt).toLocaleDateString()}</td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-1 flex-wrap">
                            <button onClick={() => openModal("history", b)} className="text-xs px-2 py-1 rounded bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">History</button>
                            {canManage && b.status !== "closed" && (<>
                              <button onClick={() => { openModal("edit", b); setForm({ name: b.name, department: b.department, category: b.category, assignedToName: b.assignedToName, fiscalYear: b.fiscalYear, notes: b.notes, projectName: b.projectName ?? "", taskName: b.taskName ?? "", purpose: b.purpose ?? "", description: b.description ?? "" }); }} className="text-xs px-2 py-1 rounded bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors">Edit</button>
                              <button onClick={() => openModal("increase", b)} className="text-xs px-2 py-1 rounded bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/40 transition-colors">Increase</button>
                              <button onClick={() => openModal("reduce", b)} className="text-xs px-2 py-1 rounded bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400 hover:bg-orange-100 dark:hover:bg-orange-900/40 transition-colors">Reduce</button>
                              <button onClick={() => openModal("transfer", b)} className="text-xs px-2 py-1 rounded bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400 hover:bg-purple-100 dark:hover:bg-purple-900/40 transition-colors">Transfer</button>
                              <button onClick={() => openModal("adjust", b)} className="text-xs px-2 py-1 rounded bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400 hover:bg-yellow-100 dark:hover:bg-yellow-900/40 transition-colors">Adjust</button>
                              <button onClick={() => { openModal("note", b); setForm({ note: b.notes }); }} className="text-xs px-2 py-1 rounded bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">Note</button>
                              <button onClick={() => openModal("status", b)} className="text-xs px-2 py-1 rounded bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors">{b.status === "paused" ? "Reopen" : "Pause/Close"}</button>
                            </>)}
                            {canManage && b.status === "closed" && (
                              <button onClick={() => openModal("status", b)} className="text-xs px-2 py-1 rounded bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/40 transition-colors">Reopen</button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ── AUDIT TRAIL TAB ──────────────────────────────────────────────────── */}
      {tab === "audit" && (
        <>
          <div className="flex flex-wrap gap-3 mb-4">
            <input
              type="text" value={auditSearch} onChange={e => setAuditSearch(e.target.value)}
              placeholder="Search audit logs…"
              className="rounded-lg border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white px-3 py-1.5 text-sm flex-1 min-w-[180px] focus:ring-2 focus:ring-brand-500 focus:border-transparent"
            />
            <select value={auditAction} onChange={e => setAuditAction(e.target.value as BudgetAction | "all")}
              className="rounded-lg border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white px-3 py-1.5 text-sm focus:ring-2 focus:ring-brand-500 focus:border-transparent">
              <option value="all">All Actions</option>
              {(Object.keys(ACTION_LABEL) as BudgetAction[]).map(a => <option key={a} value={a}>{ACTION_LABEL[a]}</option>)}
            </select>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-800/60">
                  <tr>
                    {["Timestamp", "Budget", "Action", "Previous Value", "New Value", "Changed By", "Reason / Note"].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredLogs.length === 0 ? (
                    <tr><td colSpan={7} className="px-4 py-10 text-center text-sm text-gray-400 dark:text-gray-500">No audit logs found.</td></tr>
                  ) : filteredLogs.map(l => (
                    <tr key={l.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors">
                      <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-500 dark:text-gray-400">
                        <p>{new Date(l.timestamp).toLocaleDateString()}</p>
                        <p>{new Date(l.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{l.budgetName}</p>
                        {l.relatedBudgetName && <p className="text-xs text-gray-400">→ {l.relatedBudgetName}</p>}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`inline-block text-xs px-2 py-0.5 rounded-full font-medium ${ACTION_COLOR[l.action]}`}>{ACTION_LABEL[l.action]}</span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">{fmt(l.previousValue)}</td>
                      <td className={`px-4 py-3 whitespace-nowrap text-sm font-medium ${l.newValue > l.previousValue ? "text-green-600" : l.newValue < l.previousValue ? "text-red-600" : "text-gray-600 dark:text-gray-400"}`}>{fmt(l.newValue)}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">{l.changedByName}</td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400 max-w-xs">{l.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ═══════════════════════ MODALS ═══════════════════════════════════════ */}

      {/* Create Budget */}
      {modal.type === "create" && (
        <Modal title="Create New Budget" onClose={closeModal}>
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Budget Name *">
                <input className={inputCls} placeholder="e.g. Q3 Sales Budget" value={form.name ?? ""} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              </Field>
              <Field label="Total Budget (Rs.) *">
                <input type="number" min="0" className={inputCls} placeholder="0" value={form.totalBudget ?? ""} onChange={e => setForm(f => ({ ...f, totalBudget: e.target.value }))} />
              </Field>
              {!isDeptAdmin && (
                <Field label="Department *">
                  <select className={inputCls} value={form.department ?? ""} onChange={e => setForm(f => ({ ...f, department: e.target.value }))}>
                    <option value="">— Select —</option>
                    {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </Field>
              )}
              <Field label="Category *">
                <select className={inputCls} value={form.category ?? ""} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                  <option value="">— Select —</option>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </Field>
              <Field label="Assigned To">
                <input className={inputCls} placeholder="Person or team name" value={form.assignedToName ?? ""} onChange={e => setForm(f => ({ ...f, assignedToName: e.target.value }))} />
              </Field>
              <Field label="Fiscal Year">
                <select className={inputCls} value={form.fiscalYear ?? "FY2026"} onChange={e => setForm(f => ({ ...f, fiscalYear: e.target.value }))}>
                  {FISCAL_YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </Field>
              <Field label="Project Name (optional)">
                <input className={inputCls} placeholder="Linked project" value={form.projectName ?? ""} onChange={e => setForm(f => ({ ...f, projectName: e.target.value }))} />
              </Field>
              <Field label="Task Name (optional)">
                <input className={inputCls} placeholder="Specific task or deliverable" value={form.taskName ?? ""} onChange={e => setForm(f => ({ ...f, taskName: e.target.value }))} />
              </Field>
              <Field label="Creation Reason">
                <input className={inputCls} placeholder="Why is this budget being created?" value={form.reason ?? ""} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} />
              </Field>
            </div>
            <Field label="Purpose *">
              <input className={inputCls} placeholder="Short title — e.g. Facebook Ads Campaign - June 2026" value={form.purpose ?? ""} onChange={e => setForm(f => ({ ...f, purpose: e.target.value }))} />
            </Field>
            <Field label="Description">
              <textarea rows={2} className={inputCls} placeholder="Detailed explanation of what this budget covers…" value={form.description ?? ""} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            </Field>
            <Field label="Notes">
              <textarea rows={2} className={inputCls} placeholder="Any relevant notes…" value={form.notes ?? ""} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
            </Field>
            {formError && <p className="text-sm text-red-600">{formError}</p>}
          </div>
          <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-800 flex justify-end gap-3">
            <button onClick={closeModal} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors">Cancel</button>
            <button onClick={handleCreate} className="px-4 py-2 text-sm font-semibold text-white bg-brand-500 hover:bg-brand-600 rounded-lg transition-colors">Create Budget</button>
          </div>
        </Modal>
      )}

      {/* Edit Budget */}
      {modal.type === "edit" && modal.budget && (
        <Modal title={`Edit: ${modal.budget.name}`} onClose={closeModal}>
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Budget Name *">
                <input className={inputCls} value={form.name ?? ""} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              </Field>
              <Field label="Assigned To">
                <input className={inputCls} value={form.assignedToName ?? ""} onChange={e => setForm(f => ({ ...f, assignedToName: e.target.value }))} />
              </Field>
              <Field label="Department">
                <select className={inputCls} value={form.department ?? ""} onChange={e => setForm(f => ({ ...f, department: e.target.value }))}>
                  {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </Field>
              <Field label="Category">
                <select className={inputCls} value={form.category ?? ""} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </Field>
              <Field label="Fiscal Year">
                <select className={inputCls} value={form.fiscalYear ?? "FY2026"} onChange={e => setForm(f => ({ ...f, fiscalYear: e.target.value }))}>
                  {FISCAL_YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </Field>
              <Field label="Project Name">
                <input className={inputCls} value={form.projectName ?? ""} onChange={e => setForm(f => ({ ...f, projectName: e.target.value }))} />
              </Field>
              <Field label="Task Name">
                <input className={inputCls} placeholder="Specific task or deliverable" value={form.taskName ?? ""} onChange={e => setForm(f => ({ ...f, taskName: e.target.value }))} />
              </Field>
            </div>
            <Field label="Purpose">
              <input className={inputCls} placeholder="Short purpose title" value={form.purpose ?? ""} onChange={e => setForm(f => ({ ...f, purpose: e.target.value }))} />
            </Field>
            <Field label="Description">
              <textarea rows={2} className={inputCls} placeholder="What does this budget cover?" value={form.description ?? ""} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            </Field>
            <Field label="Notes">
              <textarea rows={2} className={inputCls} value={form.notes ?? ""} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
            </Field>
            <Field label="Reason for Edit">
              <input className={inputCls} placeholder="Why are you editing this budget?" value={form.reason ?? ""} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} />
            </Field>
            {formError && <p className="text-sm text-red-600">{formError}</p>}
          </div>
          <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-800 flex justify-end gap-3">
            <button onClick={closeModal} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors">Cancel</button>
            <button onClick={handleEdit} className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors">Save Changes</button>
          </div>
        </Modal>
      )}

      {/* Increase Budget */}
      {modal.type === "increase" && modal.budget && (
        <Modal title={`Increase Budget: ${modal.budget.name}`} onClose={closeModal}>
          <div className="p-6 space-y-4">
            <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50 grid grid-cols-3 gap-3 text-center">
              <div><p className="text-xs text-gray-500">Current Total</p><p className="text-lg font-bold text-gray-900 dark:text-white">{fmt(modal.budget.totalBudget)}</p></div>
              <div><p className="text-xs text-gray-500">Used</p><p className="text-lg font-bold text-blue-600">{fmt(modal.budget.usedBudget)}</p></div>
              <div><p className="text-xs text-gray-500">Remaining</p><p className="text-lg font-bold text-green-600">{fmt(modal.budget.totalBudget - modal.budget.usedBudget)}</p></div>
            </div>
            <Field label="Increase Amount ($) *">
              <input type="number" min="1" className={inputCls} placeholder="0" value={form.amount ?? ""} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} />
            </Field>
            {form.amount && parseFloat(form.amount) > 0 && (
              <p className="text-sm text-green-600">New total will be: {fmt(modal.budget.totalBudget + parseFloat(form.amount))}</p>
            )}
            <Field label="Reason *">
              <textarea rows={2} className={inputCls} placeholder="Why is the budget being increased?" value={form.reason ?? ""} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} />
            </Field>
            {formError && <p className="text-sm text-red-600">{formError}</p>}
          </div>
          <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-800 flex justify-end gap-3">
            <button onClick={closeModal} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors">Cancel</button>
            <button onClick={handleIncrease} className="px-4 py-2 text-sm font-semibold text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors">Increase Budget</button>
          </div>
        </Modal>
      )}

      {/* Reduce Budget */}
      {modal.type === "reduce" && modal.budget && (
        <Modal title={`Reduce Budget: ${modal.budget.name}`} onClose={closeModal}>
          <div className="p-6 space-y-4">
            <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50 grid grid-cols-3 gap-3 text-center">
              <div><p className="text-xs text-gray-500">Current Total</p><p className="text-lg font-bold text-gray-900 dark:text-white">{fmt(modal.budget.totalBudget)}</p></div>
              <div><p className="text-xs text-gray-500">Used (Floor)</p><p className="text-lg font-bold text-blue-600">{fmt(modal.budget.usedBudget)}</p></div>
              <div><p className="text-xs text-gray-500">Max Reduction</p><p className="text-lg font-bold text-orange-600">{fmt(modal.budget.totalBudget - modal.budget.usedBudget)}</p></div>
            </div>
            <Field label="Reduce By ($) *">
              <input type="number" min="1" className={inputCls} placeholder="0" value={form.amount ?? ""} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} />
            </Field>
            {form.amount && parseFloat(form.amount) > 0 && (
              <p className={`text-sm ${modal.budget.totalBudget - parseFloat(form.amount) < modal.budget.usedBudget ? "text-red-600" : "text-orange-600"}`}>
                New total will be: {fmt(modal.budget.totalBudget - parseFloat(form.amount))}
              </p>
            )}
            <Field label="Reason *">
              <textarea rows={2} className={inputCls} placeholder="Why is the budget being reduced?" value={form.reason ?? ""} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} />
            </Field>
            {formError && <p className="text-sm text-red-600">{formError}</p>}
          </div>
          <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-800 flex justify-end gap-3">
            <button onClick={closeModal} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors">Cancel</button>
            <button onClick={handleReduce} className="px-4 py-2 text-sm font-semibold text-white bg-orange-600 hover:bg-orange-700 rounded-lg transition-colors">Reduce Budget</button>
          </div>
        </Modal>
      )}

      {/* Transfer Budget */}
      {modal.type === "transfer" && modal.budget && (
        <Modal title={`Transfer From: ${modal.budget.name}`} onClose={closeModal}>
          <div className="p-6 space-y-4">
            <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50">
              <p className="text-xs text-gray-500 mb-1">Available to Transfer</p>
              <p className="text-xl font-bold text-purple-600">{fmt(modal.budget.totalBudget - modal.budget.usedBudget)}</p>
            </div>
            <Field label="Transfer To Budget *">
              <select className={inputCls} value={form.targetBudgetId ?? ""} onChange={e => setForm(f => ({ ...f, targetBudgetId: e.target.value }))}>
                <option value="">— Select target budget —</option>
                {scopedBudgets.filter(b => b.id !== modal.budget!.id && b.status !== "closed").map(b => (
                  <option key={b.id} value={b.id}>{b.name} ({b.department})</option>
                ))}
              </select>
            </Field>
            <Field label="Transfer Amount ($) *">
              <input type="number" min="1" className={inputCls} placeholder="0" value={form.amount ?? ""} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} />
            </Field>
            {form.amount && form.targetBudgetId && parseFloat(form.amount) > 0 && (
              <div className="p-3 rounded-lg bg-purple-50 dark:bg-purple-900/20 text-xs space-y-1">
                <p className="text-purple-700 dark:text-purple-400">From: {modal.budget.name} → {fmt(modal.budget.totalBudget - parseFloat(form.amount))}</p>
                <p className="text-purple-700 dark:text-purple-400">To: {budgets.find(b => b.id === form.targetBudgetId)?.name} → {fmt((budgets.find(b => b.id === form.targetBudgetId)?.totalBudget ?? 0) + parseFloat(form.amount))}</p>
              </div>
            )}
            <Field label="Reason *">
              <textarea rows={2} className={inputCls} placeholder="Why is this transfer being made?" value={form.reason ?? ""} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} />
            </Field>
            {formError && <p className="text-sm text-red-600">{formError}</p>}
          </div>
          <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-800 flex justify-end gap-3">
            <button onClick={closeModal} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors">Cancel</button>
            <button onClick={handleTransfer} className="px-4 py-2 text-sm font-semibold text-white bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors">Confirm Transfer</button>
          </div>
        </Modal>
      )}

      {/* Adjust Budget */}
      {modal.type === "adjust" && modal.budget && (
        <Modal title={`Adjust Total: ${modal.budget.name}`} onClose={closeModal}>
          <div className="p-6 space-y-4">
            <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50 grid grid-cols-2 gap-3 text-center">
              <div><p className="text-xs text-gray-500">Current Total</p><p className="text-xl font-bold text-gray-900 dark:text-white">{fmt(modal.budget.totalBudget)}</p></div>
              <div><p className="text-xs text-gray-500">Minimum (Used)</p><p className="text-xl font-bold text-blue-600">{fmt(modal.budget.usedBudget)}</p></div>
            </div>
            <Field label="New Total Budget ($) *">
              <input type="number" min={modal.budget.usedBudget} className={inputCls} placeholder={String(modal.budget.totalBudget)} value={form.newTotal ?? ""} onChange={e => setForm(f => ({ ...f, newTotal: e.target.value }))} />
            </Field>
            {form.newTotal && (
              <p className={`text-sm ${parseFloat(form.newTotal) < modal.budget.usedBudget ? "text-red-600" : parseFloat(form.newTotal) > modal.budget.totalBudget ? "text-green-600" : "text-orange-600"}`}>
                {parseFloat(form.newTotal) > modal.budget.totalBudget ? "▲ Increase" : parseFloat(form.newTotal) < modal.budget.totalBudget ? "▼ Reduction" : "No change"} from {fmt(modal.budget.totalBudget)}
              </p>
            )}
            <Field label="Reason *">
              <textarea rows={2} className={inputCls} placeholder="Why is the total being adjusted?" value={form.reason ?? ""} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} />
            </Field>
            {formError && <p className="text-sm text-red-600">{formError}</p>}
          </div>
          <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-800 flex justify-end gap-3">
            <button onClick={closeModal} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors">Cancel</button>
            <button onClick={handleAdjust} className="px-4 py-2 text-sm font-semibold text-white bg-yellow-600 hover:bg-yellow-700 rounded-lg transition-colors">Apply Adjustment</button>
          </div>
        </Modal>
      )}

      {/* Status Change */}
      {modal.type === "status" && modal.budget && (
        <Modal title={`Change Status: ${modal.budget.name}`} onClose={closeModal}>
          <div className="p-6 space-y-4">
            <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50">
              <p className="text-xs text-gray-500 mb-1">Current Status</p>
              <span className={`text-sm font-medium px-2.5 py-0.5 rounded-full ${STATUS_COLOR[modal.budget.status]}`}>{modal.budget.status}</span>
            </div>
            <div className="flex gap-2 flex-wrap">
              {modal.budget.status !== "active"   && <button onClick={() => handleStatusChange("reopen")} className="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors">Reopen (Active)</button>}
              {modal.budget.status === "active"   && <button onClick={() => handleStatusChange("pause")}  className="px-4 py-2 text-sm font-medium text-white bg-yellow-600 hover:bg-yellow-700 rounded-lg transition-colors">Pause</button>}
              {modal.budget.status !== "closed"   && <button onClick={() => handleStatusChange("close")}  className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors">Close Budget</button>}
            </div>
            <Field label="Reason *">
              <textarea rows={2} className={inputCls} placeholder="Reason for status change…" value={form.reason ?? ""} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} />
            </Field>
            {formError && <p className="text-sm text-red-600">{formError}</p>}
          </div>
          <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-800 flex justify-end">
            <button onClick={closeModal} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors">Cancel</button>
          </div>
        </Modal>
      )}

      {/* Budget Notes */}
      {modal.type === "note" && modal.budget && (
        <Modal title={`Notes: ${modal.budget.name}`} onClose={closeModal}>
          <div className="p-6 space-y-4">
            <Field label="Budget Notes">
              <textarea rows={5} className={inputCls} placeholder="Enter notes about this budget…" value={form.note ?? ""} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} />
            </Field>
            {formError && <p className="text-sm text-red-600">{formError}</p>}
          </div>
          <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-800 flex justify-end gap-3">
            <button onClick={closeModal} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors">Cancel</button>
            <button onClick={handleAddNote} className="px-4 py-2 text-sm font-semibold text-white bg-brand-500 hover:bg-brand-600 rounded-lg transition-colors">Save Note</button>
          </div>
        </Modal>
      )}

      {/* Budget History */}
      {modal.type === "history" && modal.budget && (
        <Modal title={`History: ${modal.budget.name}`} onClose={closeModal} wide>
          <div className="p-6">
            <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50 grid grid-cols-3 gap-3 text-center mb-6">
              <div><p className="text-xs text-gray-500">Total Budget</p><p className="text-lg font-bold text-gray-900 dark:text-white">{fmt(modal.budget.totalBudget)}</p></div>
              <div><p className="text-xs text-gray-500">Used</p><p className="text-lg font-bold text-blue-600">{fmt(modal.budget.usedBudget)}</p></div>
              <div><p className="text-xs text-gray-500">Status</p><span className={`text-sm font-medium px-2 py-0.5 rounded-full ${STATUS_COLOR[modal.budget.status]}`}>{modal.budget.status}</span></div>
            </div>
            {modal.budget.notes && (
              <div className="mb-4 p-3 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800">
                <p className="text-xs font-medium text-yellow-700 dark:text-yellow-400 mb-1">Notes</p>
                <p className="text-sm text-gray-700 dark:text-gray-300">{modal.budget.notes}</p>
              </div>
            )}
            {budgetLogs.length === 0 ? (
              <p className="text-sm text-center text-gray-400 py-8">No history for this budget.</p>
            ) : (
              <div className="space-y-3">
                {budgetLogs.map(l => (
                  <div key={l.id} className="flex items-start gap-3 p-3 rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/30">
                    <span className={`flex-shrink-0 text-xs px-2 py-0.5 rounded-full font-medium ${ACTION_COLOR[l.action]}`}>{ACTION_LABEL[l.action]}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <p className="text-sm text-gray-700 dark:text-gray-300">
                          {fmt(l.previousValue)} → <span className={`font-semibold ${l.newValue > l.previousValue ? "text-green-600" : l.newValue < l.previousValue ? "text-red-600" : "text-gray-600 dark:text-gray-400"}`}>{fmt(l.newValue)}</span>
                        </p>
                        <p className="text-xs text-gray-400">{l.changedByName} · {new Date(l.timestamp).toLocaleString()}</p>
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5 truncate">{l.reason}</p>
                      {l.relatedBudgetName && <p className="text-xs text-purple-500 mt-0.5">↔ {l.relatedBudgetName}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Modal>
      )}
    </>
  );
}
