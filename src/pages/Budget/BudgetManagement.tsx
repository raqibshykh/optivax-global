import React, { useState, useEffect, useMemo, useRef } from "react";
import PageMeta from "../../components/common/PageMeta";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import {
  notifyBudgetAllocatedToDept, notifyBudgetAllocatedToMember, notifyCompanyBudgetAction,
  notifyBudgetReturned, notifyBudgetRequested, notifyBudgetRequestActioned,
} from "../../services/notificationHelpers";
import {
  getCompanyBudget, saveCompanyBudget, resetCompanyBudget,
  getDeptAllocations, saveDeptAllocations,
  getMemberAllocations, saveMemberAllocations,
  getBudgetAuditLog, appendBudgetAuditEntry,
  getDeptBudgetSummaries, getCompanyUnallocated,
  getMembersForDept, getAllDeptAdmins, deptFromRole,
  getBudgetReturns, appendBudgetReturn, getBudgetReturnsByDept,
  getBudgetRequests, appendBudgetRequest, updateBudgetRequest,
  getBudgetRequestsByDept, getPendingBudgetRequests,
  type CompanyBudget, type DeptAllocation, type MemberAllocation,
  type BudgetAuditEntry, type BudgetMasterAction, type DeptBudgetSummary,
  type BudgetReturn, type BudgetRequest, type BudgetRequestStatus, type BudgetRequestPriority,
} from "../../mock/budgetData";

// ── Constants ─────────────────────────────────────────────────────────────────

const fmtRs  = (n: number) => `Rs. ${Math.round(n).toLocaleString()}`;
const fmtPct = (n: number) => `${Math.min(n, 999)}%`;

const BUDGET_PURPOSES = [
  "Marketing Campaign",
  "Client Project",
  "Department Operations",
  "Equipment Purchase",
  "Employee Activities",
  "Software Subscription",
  "Training Budget",
  "Miscellaneous",
];

const DEPT_COLOR: Record<string, string> = {
  Sales:        "bg-blue-500",
  Marketing:    "bg-purple-500",
  Production:   "bg-emerald-500",
  HR:           "bg-rose-500",
  "IT Support": "bg-cyan-500",
};

const DEPT_SOFT: Record<string, string> = {
  Sales:        "bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400",
  Marketing:    "bg-purple-50 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400",
  Production:   "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400",
  HR:           "bg-rose-50 text-rose-700 dark:bg-rose-900/20 dark:text-rose-400",
  "IT Support": "bg-cyan-50 text-cyan-700 dark:bg-cyan-900/20 dark:text-cyan-400",
};

const ACTION_LABEL: Record<BudgetMasterAction, string> = {
  BUDGET_CREATED:             "Budget Created",
  BUDGET_UPDATED:             "Budget Updated",
  BUDGET_INCREASED:           "Budget Increased",
  BUDGET_REDUCED:             "Budget Reduced",
  BUDGET_RESET:               "Budget Reset",
  BUDGET_REALLOCATED:         "Budget Transferred",
  BUDGET_PURPOSE_UPDATED:     "Purpose Changed",
  BUDGET_RETURNED:            "Budget Returned",
  BUDGET_REQUEST_SUBMITTED:   "Request Submitted",
  BUDGET_REQUEST_APPROVED:    "Request Approved",
  BUDGET_REQUEST_REJECTED:    "Request Rejected",
  BUDGET_REQUEST_PARTIAL:     "Partially Approved",
  DEPT_ALLOCATED:             "Dept Assigned",
  DEPT_ALLOCATION_UPDATED:    "Dept Budget Updated",
  MEMBER_ALLOCATED:           "Member Allocated",
  MEMBER_ALLOCATION_UPDATED:  "Member Allocation Updated",
};

const ACTION_COLOR: Record<BudgetMasterAction, string> = {
  BUDGET_CREATED:             "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  BUDGET_UPDATED:             "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  BUDGET_INCREASED:           "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  BUDGET_REDUCED:             "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  BUDGET_RESET:               "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  BUDGET_REALLOCATED:         "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400",
  BUDGET_PURPOSE_UPDATED:     "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  BUDGET_RETURNED:            "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400",
  BUDGET_REQUEST_SUBMITTED:   "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400",
  BUDGET_REQUEST_APPROVED:    "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  BUDGET_REQUEST_REJECTED:    "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  BUDGET_REQUEST_PARTIAL:     "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  DEPT_ALLOCATED:             "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400",
  DEPT_ALLOCATION_UPDATED:    "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400",
  MEMBER_ALLOCATED:           "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400",
  MEMBER_ALLOCATION_UPDATED:  "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400",
};

// ── Shared UI ─────────────────────────────────────────────────────────────────

function UtilBar({ used, total, height = "h-2" }: { used: number; total: number; height?: string }) {
  const pct   = total > 0 ? Math.min(100, Math.round((used / total) * 100)) : 0;
  const color = pct >= 100 ? "bg-red-500" : pct >= 85 ? "bg-orange-400" : pct >= 60 ? "bg-yellow-400" : "bg-green-500";
  return (
    <div className="flex items-center gap-2">
      <div className={`flex-1 bg-gray-200 dark:bg-gray-700 rounded-full ${height} overflow-hidden`}>
        <div className={`${color} ${height} rounded-full transition-all`} style={{ width: `${pct}%` }} />
      </div>
      <span className={`text-xs font-medium w-10 text-right shrink-0 ${pct >= 100 ? "text-red-600" : "text-gray-500 dark:text-gray-400"}`}>{pct}%</span>
    </div>
  );
}

function ReadOnlyBadge({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
      <svg className="w-3 h-3 text-red-500 shrink-0" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
      </svg>
      <span className="text-xs text-red-700 dark:text-red-400">
        <span className="font-semibold">{label}:</span> {value} <span className="opacity-70">(read-only)</span>
      </span>
    </div>
  );
}

function Modal({ title, onClose, children, wide = false }: { title: string; onClose: () => void; children: React.ReactNode; wide?: boolean }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className={`w-full ${wide ? "max-w-2xl" : "max-w-lg"} rounded-2xl bg-white dark:bg-gray-900 shadow-2xl flex flex-col max-h-[90vh]`}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800 shrink-0">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-2xl leading-none">×</button>
        </div>
        <div className="overflow-y-auto flex-1 p-6">{children}</div>
      </div>
    </div>
  );
}

const inputCls = "w-full rounded-lg border border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-white px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:border-transparent";
const readonlyCls = "w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 text-gray-500 dark:text-gray-400 px-3 py-2 text-sm cursor-not-allowed select-none";

// ── Searchable Employee Dropdown ──────────────────────────────────────────────

function EmployeeDropdown({
  options, value, onChange, placeholder,
}: {
  options: { id: string; name: string; role: string; allocated?: number; used?: number }[];
  value: string;
  onChange: (id: string) => void;
  placeholder?: string;
}) {
  const [search, setSearch] = useState("");
  const [open, setOpen]     = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filtered = options.filter(o => o.name.toLowerCase().includes(search.toLowerCase()));
  const selected = options.find(o => o.id === value);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(p => !p)}
        className="w-full text-left rounded-lg border border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-white px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 flex items-center justify-between"
      >
        <span className={selected ? "text-gray-900 dark:text-white" : "text-gray-400"}>
          {selected ? selected.name : placeholder ?? "Select employee…"}
        </span>
        <span className="text-gray-400">▾</span>
      </button>
      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-xl">
          <div className="p-2 border-b border-gray-100 dark:border-gray-800">
            <input autoFocus type="text" placeholder="Search by name…" value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full rounded-lg border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white px-2 py-1.5 text-sm" />
          </div>
          <ul className="max-h-48 overflow-y-auto">
            {filtered.length === 0 ? (
              <li className="px-3 py-2 text-sm text-gray-400 text-center">No employees found</li>
            ) : filtered.map(o => (
              <li key={o.id}>
                <button type="button"
                  onClick={() => { onChange(o.id); setOpen(false); setSearch(""); }}
                  className={`w-full text-left px-3 py-2 text-sm hover:bg-brand-50 dark:hover:bg-brand-900/20 flex items-center justify-between ${o.id === value ? "bg-brand-50 dark:bg-brand-900/20 text-brand-600 font-medium" : "text-gray-700 dark:text-gray-300"}`}>
                  <span>{o.name}</span>
                  <span className="text-xs text-gray-400 shrink-0 ml-2">
                    {o.allocated !== undefined ? fmtRs(o.allocated) : ""}
                    {o.used !== undefined && o.used > 0 ? ` (${fmtRs(o.used)} used)` : ""}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// ── Company Budget Modal (SA only) ────────────────────────────────────────────

function CompanyBudgetModal({
  mode, budget, minAllowedTotal, onClose, onSave,
}: {
  mode: "create" | "edit" | "increase" | "reduce" | "reset";
  budget: CompanyBudget | null;
  minAllowedTotal: number; // totalAllocatedToDepts — can't go below this
  onClose: () => void;
  onSave: (action: BudgetMasterAction, amount: number, notes: string, newTotal?: number) => void;
}) {
  const [amount,  setAmount]  = useState(mode === "edit" ? String(budget?.totalAmount ?? "") : "");
  const [fiscal,  setFiscal]  = useState(budget?.fiscalYear ?? "FY2026");
  const [desc,    setDesc]    = useState(budget?.description ?? "");
  const [notes,   setNotes]   = useState("");
  const [confirm, setConfirm] = useState(false);
  const [error,   setError]   = useState("");

  const maxReducible = budget ? budget.totalAmount - minAllowedTotal : 0;

  const handleSubmit = () => {
    setError("");

    if (mode === "reset") {
      if (!confirm) { setError("Tick the confirmation checkbox to proceed."); return; }
      onSave("BUDGET_RESET", 0, notes);
      return;
    }

    const amt = parseFloat(amount);
    if (!amt || amt <= 0) { setError("Enter a valid positive amount."); return; }

    if (mode === "create" || mode === "edit") {
      if (!fiscal) { setError("Select a fiscal year."); return; }
      if (mode === "edit" && amt < minAllowedTotal) {
        setError(`Cannot set below total already allocated to departments (${fmtRs(minAllowedTotal)}).`);
        return;
      }
      onSave(mode === "create" ? "BUDGET_CREATED" : "BUDGET_UPDATED", amt, notes, amt);
      return;
    }

    if (mode === "reduce") {
      if (amt > maxReducible) {
        setError(`Maximum reducible amount is ${fmtRs(maxReducible)} (allocated to depts: ${fmtRs(minAllowedTotal)} is protected).`);
        return;
      }
    }

    onSave(
      mode === "increase" ? "BUDGET_INCREASED" : "BUDGET_REDUCED",
      amt, notes,
      mode === "increase" ? (budget?.totalAmount ?? 0) + amt : (budget?.totalAmount ?? 0) - amt
    );
  };

  const titles: Record<typeof mode, string> = {
    create:   "Create Company Budget",
    edit:     "Edit Company Budget",
    increase: "Increase Company Budget",
    reduce:   "Reduce Company Budget",
    reset:    "Reset Company Budget",
  };

  return (
    <Modal title={titles[mode]} onClose={onClose}>
      {budget && mode !== "create" && (
        <div className="mb-4 grid grid-cols-2 gap-3">
          <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800 text-sm">
            <p className="text-xs text-gray-400 mb-1">Current Total</p>
            <p className="font-bold text-gray-900 dark:text-white">{fmtRs(budget.totalAmount)}</p>
          </div>
          {mode !== "reset" && (
            <div className="p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 text-sm">
              <p className="text-xs text-red-400 mb-1">Protected (Dept Allocated)</p>
              <p className="font-bold text-red-700 dark:text-red-400">{fmtRs(minAllowedTotal)}</p>
            </div>
          )}
        </div>
      )}

      {mode === "reset" ? (
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-sm text-red-800 dark:text-red-300">
            This will reset the company budget AND all department allocations and member allocations. This action cannot be undone.
          </div>
          <textarea rows={3} className={inputCls} placeholder="Reason for reset (optional)" value={notes} onChange={e => setNotes(e.target.value)} />
          <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-700 dark:text-gray-300">
            <input type="checkbox" checked={confirm} onChange={e => setConfirm(e.target.checked)} className="rounded" />
            I understand this will delete all budget data
          </label>
        </div>
      ) : (
        <div className="space-y-4">
          {(mode === "create" || mode === "edit") && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Total Budget Amount (Rs.) *
                  {mode === "edit" && minAllowedTotal > 0 && (
                    <span className="text-red-500 font-normal ml-1">— min {fmtRs(minAllowedTotal)}</span>
                  )}
                </label>
                <input type="number" min={mode === "edit" ? minAllowedTotal : 1} className={inputCls}
                  placeholder="e.g. 5000000" value={amount} onChange={e => setAmount(e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Fiscal Year *</label>
                <select className={inputCls} value={fiscal} onChange={e => setFiscal(e.target.value)}>
                  {["FY2025","FY2026","FY2027"].map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
                <textarea rows={3} className={inputCls} placeholder="Brief description of budget purpose…"
                  value={desc} onChange={e => setDesc(e.target.value)} />
              </div>
            </>
          )}
          {(mode === "increase" || mode === "reduce") && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {mode === "increase" ? "Increase Amount (Rs.) *" : `Reduce Amount (Rs.) * — max ${fmtRs(maxReducible)}`}
              </label>
              <input type="number" min="1" max={mode === "reduce" ? maxReducible : undefined} className={inputCls}
                placeholder={mode === "increase" ? "Amount to add…" : `Max: ${fmtRs(maxReducible)}`}
                value={amount} onChange={e => setAmount(e.target.value)} />
              {amount && budget && (
                <p className={`text-xs mt-1 font-medium ${
                  mode === "reduce" && parseFloat(amount) > maxReducible
                    ? "text-red-600"
                    : "text-gray-400"
                }`}>
                  New total: {fmtRs(mode === "increase"
                    ? budget.totalAmount + parseFloat(amount || "0")
                    : budget.totalAmount - parseFloat(amount || "0"))}
                </p>
              )}
              {mode === "reduce" && maxReducible <= 0 && (
                <p className="text-xs text-orange-600 mt-1">
                  No reducible amount — entire budget is allocated to departments.
                </p>
              )}
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes / Reason</label>
            <textarea rows={2} className={inputCls} placeholder="Optional notes…" value={notes} onChange={e => setNotes(e.target.value)} />
          </div>
        </div>
      )}

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      <div className="mt-6 flex justify-end gap-3">
        <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg">Cancel</button>
        <button onClick={handleSubmit}
          className={`px-4 py-2 text-sm font-semibold text-white rounded-lg ${mode === "reset" ? "bg-red-500 hover:bg-red-600" : "bg-brand-500 hover:bg-brand-600"}`}>
          {mode === "create" ? "Create Budget" : mode === "edit" ? "Save Changes" : mode === "increase" ? "Increase" : mode === "reduce" ? "Reduce" : "Reset"}
        </button>
      </div>
    </Modal>
  );
}

// ── Assign Budget Modal (SA → Dept Admin) ─────────────────────────────────────
// Creates new OR edits existing dept allocation.
// Minimum allowed budget for existing dept = dept's usedTotal (spent), NOT member-allocated.
// Used budget is always shown as read-only.

function AssignBudgetModal({
  preselectedDept,
  companyTotal,
  deptSummaries,
  allDeptAllocs,
  onClose,
  onSave,
}: {
  preselectedDept: string | null;
  companyTotal: number;
  deptSummaries: DeptBudgetSummary[];
  allDeptAllocs: DeptAllocation[];
  onClose: () => void;
  onSave: (
    dept: string, adminId: string, adminName: string,
    amount: number, purpose: string, effectiveDate: string, notes: string,
    prevPurpose: string | undefined
  ) => void;
}) {
  const deptAdmins = useMemo(() => getAllDeptAdmins(), []);
  const DEPTS = useMemo(() => [...new Set(deptAdmins.map(a => a.dept))].sort(), [deptAdmins]);

  const [selectedDept, setSelectedDept] = useState(preselectedDept ?? "");
  const [amount,        setAmount]       = useState("");
  const [purpose,       setPurpose]      = useState(BUDGET_PURPOSES[0]);
  const [effectiveDate, setEffectiveDate] = useState(new Date().toISOString().slice(0, 10));
  const [notes,         setNotes]        = useState("");
  const [error,         setError]        = useState("");

  const deptAdmin       = deptAdmins.find(a => a.dept === selectedDept);
  const existingAlloc   = allDeptAllocs.find(d => d.department === selectedDept);
  const existingSummary = deptSummaries.find(d => d.department === selectedDept);

  // Company pool available for this dept (excluding other depts' allocations)
  const totalAllocatedOthers = deptSummaries
    .filter(d => d.department !== selectedDept)
    .reduce((s, d) => s + d.allocatedAmount, 0);
  const maxAllowable = companyTotal - totalAllocatedOthers;

  // PROTECTED: floor = max(already spent, already assigned to members)
  // Cannot reduce dept below member allocation total, even if some is unspent.
  const usedFloor = Math.max(
    existingSummary?.usedTotal ?? 0,
    existingSummary?.memberAllocatedTotal ?? 0,
  );

  useEffect(() => {
    if (existingAlloc) {
      setAmount(String(existingAlloc.allocatedAmount));
      setPurpose(existingAlloc.purpose ?? BUDGET_PURPOSES[0]);
      if (existingAlloc.effectiveDate) setEffectiveDate(existingAlloc.effectiveDate);
    } else {
      setAmount("");
      setPurpose(BUDGET_PURPOSES[0]);
    }
  }, [selectedDept, existingAlloc]);

  const handleSave = () => {
    setError("");
    if (!selectedDept) { setError("Select a department."); return; }
    if (!deptAdmin) { setError("No admin found for this department."); return; }
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) { setError("Enter a valid positive amount."); return; }
    if (amt < usedFloor) {
      const memberAllocTotal = existingSummary?.memberAllocatedTotal ?? 0;
      const spentTotal       = existingSummary?.usedTotal ?? 0;
      if (memberAllocTotal > spentTotal && amt < memberAllocTotal) {
        setError(`Cannot reduce below total already assigned to members (${fmtRs(memberAllocTotal)}). Reduce individual member allocations first.`);
      } else {
        setError(`Cannot set below already spent amount (${fmtRs(spentTotal)}). Spent budget is protected.`);
      }
      return;
    }
    if (amt > maxAllowable) {
      setError(`Cannot exceed company budget available for this dept (${fmtRs(maxAllowable)}).`);
      return;
    }
    if (!purpose) { setError("Select a purpose for this budget."); return; }
    onSave(selectedDept, deptAdmin.id, deptAdmin.name, amt, purpose, effectiveDate, notes, existingAlloc?.purpose);
  };

  const isEditing  = !!existingAlloc;
  const newAmount  = parseFloat(amount) || 0;
  const prevAmount = existingAlloc?.allocatedAmount ?? 0;
  const delta      = newAmount - prevAmount;

  return (
    <Modal title={isEditing ? `Update Budget — ${selectedDept}` : "Assign Budget to Department"} onClose={onClose} wide>
      <div className="space-y-5">
        {/* Dept + Admin row */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Department *</label>
            {preselectedDept ? (
              <div className="flex items-center gap-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-3 py-2 text-sm">
                <span className={`w-2.5 h-2.5 rounded-full ${DEPT_COLOR[preselectedDept] ?? "bg-gray-400"}`} />
                <span className="font-medium text-gray-900 dark:text-white">{preselectedDept}</span>
                <span className="text-gray-400 text-xs ml-auto">(locked)</span>
              </div>
            ) : (
              <select className={inputCls} value={selectedDept} onChange={e => setSelectedDept(e.target.value)}>
                <option value="">— Select Department —</option>
                {DEPTS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Department Admin</label>
            <div className={readonlyCls}>
              {deptAdmin ? (
                <>
                  <p className="font-medium text-gray-700 dark:text-gray-300">{deptAdmin.name}</p>
                  <p className="text-xs text-gray-400">{deptAdmin.role}</p>
                </>
              ) : <span className="text-gray-400">Auto-filled on dept selection</span>}
            </div>
          </div>
        </div>

        {/* Budget breakdown info (read-only) */}
        {selectedDept && existingSummary && (
          <>
            <div className="grid grid-cols-4 gap-2">
              <div className="rounded-xl bg-gray-50 dark:bg-gray-800 p-3 text-center">
                <p className="text-[10px] text-gray-400 mb-1">Current Allocated</p>
                <p className="text-sm font-bold text-gray-900 dark:text-white">{fmtRs(existingSummary.allocatedAmount)}</p>
              </div>
              <div className="rounded-xl bg-orange-50 dark:bg-orange-900/20 border border-orange-100 dark:border-orange-900/30 p-3 text-center">
                <p className="text-[10px] text-orange-400 mb-1">Used / Spent</p>
                <p className="text-sm font-bold text-orange-600">{fmtRs(existingSummary.usedTotal)}</p>
                <p className="text-[9px] text-orange-400 mt-0.5">read-only</p>
              </div>
              <div className="rounded-xl bg-blue-50 dark:bg-blue-900/20 p-3 text-center">
                <p className="text-[10px] text-gray-400 mb-1">Member Assigned</p>
                <p className="text-sm font-bold text-blue-600">{fmtRs(existingSummary.memberAllocatedTotal)}</p>
              </div>
              <div className="rounded-xl bg-green-50 dark:bg-green-900/20 p-3 text-center">
                <p className="text-[10px] text-gray-400 mb-1">Company Pool</p>
                <p className="text-sm font-bold text-green-600">{fmtRs(maxAllowable)}</p>
              </div>
            </div>
            {usedFloor > 0 && (
              <ReadOnlyBadge
                label={usedFloor === (existingSummary?.memberAllocatedTotal ?? 0) && usedFloor > (existingSummary?.usedTotal ?? 0) ? "Member Allocated (Protected)" : "Spent Budget (Protected)"}
                value={`${fmtRs(usedFloor)} — cannot set allocation below this`}
              />
            )}
          </>
        )}

        {selectedDept && !existingSummary && (
          <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-900/30 text-xs text-blue-700 dark:text-blue-400">
            No existing allocation for <strong>{selectedDept}</strong>. This will create a new budget assignment.
            Available company pool: <strong>{fmtRs(maxAllowable)}</strong>
          </div>
        )}

        {/* Budget Amount */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Budget Amount (Rs.) *
            {usedFloor > 0 && (
              <span className="text-red-500 font-normal ml-1">
                — min {fmtRs(usedFloor)}{" "}
                {usedFloor === (existingSummary?.memberAllocatedTotal ?? 0) && usedFloor > (existingSummary?.usedTotal ?? 0) ? "(member allocated)" : "(spent)"}
              </span>
            )}
            <span className="text-gray-400 font-normal ml-1">— max {fmtRs(maxAllowable)}</span>
          </label>
          <input type="number"
            min={usedFloor > 0 ? usedFloor : 1}
            max={maxAllowable}
            className={inputCls}
            placeholder="e.g. 500000"
            value={amount} onChange={e => setAmount(e.target.value)} />
          {isEditing && newAmount > 0 && (
            <p className={`text-xs mt-1 font-medium ${delta > 0 ? "text-green-600" : delta < 0 ? "text-orange-600" : "text-gray-400"}`}>
              {delta > 0
                ? `+${fmtRs(delta)} increase from current`
                : delta < 0
                ? `−${fmtRs(Math.abs(delta))} reduction from current`
                : "No change from current amount"}
            </p>
          )}
        </div>

        {/* Purpose */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Purpose *</label>
          <select className={inputCls} value={purpose} onChange={e => setPurpose(e.target.value)}>
            {BUDGET_PURPOSES.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
          {isEditing && existingAlloc?.purpose && purpose !== existingAlloc.purpose && (
            <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">
              Purpose will change: <span className="line-through">{existingAlloc.purpose}</span> → <span className="font-semibold">{purpose}</span>
            </p>
          )}
        </div>

        {/* Effective Date + Notes */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Effective Date</label>
            <input type="date" className={inputCls} value={effectiveDate} onChange={e => setEffectiveDate(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes (optional)</label>
            <input type="text" className={inputCls} placeholder="Additional details…" value={notes} onChange={e => setNotes(e.target.value)} />
          </div>
        </div>

        {/* Summary */}
        {selectedDept && deptAdmin && newAmount > 0 && (
          <div className="rounded-xl bg-brand-50 dark:bg-brand-900/20 border border-brand-100 dark:border-brand-900/30 p-4 text-sm">
            <p className="font-semibold text-brand-700 dark:text-brand-400 mb-2">Assignment Summary</p>
            <div className="grid grid-cols-2 gap-y-1 text-xs text-gray-600 dark:text-gray-400">
              <span>Department:</span><span className="font-medium text-gray-900 dark:text-white">{selectedDept}</span>
              <span>Admin:</span><span className="font-medium text-gray-900 dark:text-white">{deptAdmin.name}</span>
              <span>New Amount:</span><span className="font-medium text-brand-700 dark:text-brand-400">{fmtRs(newAmount)}</span>
              <span>Purpose:</span><span className="font-medium text-gray-900 dark:text-white">{purpose}</span>
              <span>Effective:</span><span className="font-medium text-gray-900 dark:text-white">{effectiveDate || "—"}</span>
              {usedFloor > 0 && (
                <>
                  <span className="text-orange-600">Spent (protected):</span>
                  <span className="font-medium text-orange-600">{fmtRs(usedFloor)}</span>
                </>
              )}
            </div>
          </div>
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>

      <div className="mt-6 flex justify-end gap-3">
        <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg">Cancel</button>
        <button onClick={handleSave} className="px-5 py-2 text-sm font-semibold text-white bg-brand-500 hover:bg-brand-600 rounded-lg">
          {isEditing ? "Update Budget" : "Assign Budget"}
        </button>
      </div>
    </Modal>
  );
}

// ── Transfer Budget Modal (SA only) ──────────────────────────────────────────
// Transfers REMAINING (unspent) budget from one dept to another.
// Spent budget is never touched. Only remaining = (allocated - usedTotal) can be transferred.

function TransferBudgetModal({
  deptSummaries,
  allDeptAllocs,
  onClose,
  onTransfer,
}: {
  deptSummaries: DeptBudgetSummary[];
  allDeptAllocs: DeptAllocation[];
  onClose: () => void;
  onTransfer: (fromDept: string, toDept: string, amount: number, notes: string) => void;
}) {
  const [fromDept, setFromDept] = useState("");
  const [toDept,   setToDept]   = useState("");
  const [amount,   setAmount]   = useState("");
  const [notes,    setNotes]    = useState("");
  const [error,    setError]    = useState("");

  const fromSummary = deptSummaries.find(d => d.department === fromDept);
  const toSummary   = deptSummaries.find(d => d.department === toDept);

  // Only REMAINING (unspent) budget can be transferred
  const fromRemaining = fromSummary
    ? fromSummary.allocatedAmount - fromSummary.usedTotal
    : 0;

  const transferAmount = parseFloat(amount) || 0;

  const validDepts = deptSummaries.map(d => d.department);

  const handleTransfer = () => {
    setError("");
    if (!fromDept) { setError("Select the source department."); return; }
    if (!toDept)   { setError("Select the target department."); return; }
    if (fromDept === toDept) { setError("Source and target departments must be different."); return; }
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) { setError("Enter a valid transfer amount."); return; }
    if (!allDeptAllocs.find(d => d.department === fromDept)) {
      setError("Source department has no allocation to transfer from.");
      return;
    }
    if (!allDeptAllocs.find(d => d.department === toDept)) {
      setError("Target department has no existing allocation. Assign a budget first via 'Assign Budget'.");
      return;
    }
    if (amt > fromRemaining) {
      setError(`Cannot transfer more than remaining (unspent) budget of ${fmtRs(fromRemaining)}. Spent budget (${fmtRs(fromSummary?.usedTotal ?? 0)}) is protected.`);
      return;
    }
    onTransfer(fromDept, toDept, amt, notes);
  };

  return (
    <Modal title="Transfer Budget Between Departments" onClose={onClose} wide>
      <div className="space-y-5">
        {/* Policy note */}
        <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-xs text-amber-700 dark:text-amber-400">
          Only <strong>remaining (unspent) budget</strong> can be transferred. Spent budget is permanently protected and cannot be moved or modified.
        </div>

        {/* From / To */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">From Department *</label>
            <select className={inputCls} value={fromDept} onChange={e => setFromDept(e.target.value)}>
              <option value="">— Select Source —</option>
              {validDepts.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">To Department *</label>
            <select className={inputCls} value={toDept} onChange={e => setToDept(e.target.value)}>
              <option value="">— Select Target —</option>
              {validDepts.filter(d => d !== fromDept).map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
        </div>

        {/* Source budget breakdown */}
        {fromSummary && (
          <div className="rounded-xl border border-gray-200 dark:border-gray-800 p-4 space-y-2">
            <p className="text-xs font-semibold text-gray-500 uppercase dark:text-gray-400">{fromDept} Budget Breakdown</p>
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center">
                <p className="text-[10px] text-gray-400 mb-1">Total Allocated</p>
                <p className="text-sm font-bold text-gray-900 dark:text-white">{fmtRs(fromSummary.allocatedAmount)}</p>
              </div>
              <div className="text-center">
                <p className="text-[10px] text-orange-400 mb-1">Spent (Protected)</p>
                <p className="text-sm font-bold text-orange-600">{fmtRs(fromSummary.usedTotal)}</p>
              </div>
              <div className="text-center">
                <p className="text-[10px] text-green-500 mb-1">Remaining (Transferable)</p>
                <p className={`text-sm font-bold ${fromRemaining <= 0 ? "text-red-600" : "text-green-600"}`}>
                  {fmtRs(Math.max(0, fromRemaining))}
                </p>
              </div>
            </div>
            <UtilBar used={fromSummary.usedTotal} total={fromSummary.allocatedAmount} />
          </div>
        )}

        {/* Target info */}
        {toSummary && (
          <div className="rounded-xl border border-gray-200 dark:border-gray-800 p-4">
            <p className="text-xs font-semibold text-gray-500 uppercase dark:text-gray-400 mb-2">{toDept} Current Budget</p>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">Current Allocation:</span>
              <span className="text-sm font-bold text-gray-900 dark:text-white">{fmtRs(toSummary.allocatedAmount)}</span>
            </div>
            {transferAmount > 0 && (
              <div className="flex items-center justify-between mt-1">
                <span className="text-sm text-brand-600">After Transfer:</span>
                <span className="text-sm font-bold text-brand-600">{fmtRs(toSummary.allocatedAmount + transferAmount)}</span>
              </div>
            )}
          </div>
        )}

        {/* Amount */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Transfer Amount (Rs.) *
            {fromRemaining > 0 && (
              <span className="text-gray-400 font-normal ml-1">— max {fmtRs(fromRemaining)}</span>
            )}
          </label>
          <input type="number" min="1" max={fromRemaining} className={inputCls}
            placeholder={fromRemaining > 0 ? `Max: ${fmtRs(fromRemaining)}` : "No transferable budget available"}
            disabled={fromRemaining <= 0}
            value={amount} onChange={e => setAmount(e.target.value)} />
          {fromRemaining <= 0 && fromDept && (
            <p className="text-xs text-red-600 mt-1">
              All budget in {fromDept} has been spent. Nothing can be transferred.
            </p>
          )}
        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Reason / Notes *</label>
          <textarea rows={2} className={inputCls} placeholder="Reason for this budget transfer…" value={notes} onChange={e => setNotes(e.target.value)} />
        </div>

        {/* Preview */}
        {fromDept && toDept && transferAmount > 0 && fromRemaining >= transferAmount && (
          <div className="rounded-xl bg-violet-50 dark:bg-violet-900/20 border border-violet-100 dark:border-violet-900/30 p-4 text-sm">
            <p className="font-semibold text-violet-700 dark:text-violet-400 mb-2">Transfer Summary</p>
            <div className="grid grid-cols-2 gap-y-1 text-xs text-gray-600 dark:text-gray-400">
              <span>From:</span><span className="font-medium text-gray-900 dark:text-white">{fromDept}</span>
              <span>To:</span><span className="font-medium text-gray-900 dark:text-white">{toDept}</span>
              <span>Transfer Amount:</span><span className="font-medium text-violet-700 dark:text-violet-400">{fmtRs(transferAmount)}</span>
              <span>{fromDept} New Balance:</span><span className="font-medium text-orange-600">{fmtRs((fromSummary?.allocatedAmount ?? 0) - transferAmount)}</span>
              <span>{toDept} New Balance:</span><span className="font-medium text-green-600">{fmtRs((toSummary?.allocatedAmount ?? 0) + transferAmount)}</span>
            </div>
          </div>
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>

      <div className="mt-6 flex justify-end gap-3">
        <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg">Cancel</button>
        <button onClick={handleTransfer} className="px-5 py-2 text-sm font-semibold text-white bg-violet-600 hover:bg-violet-700 rounded-lg">
          Transfer Budget
        </button>
      </div>
    </Modal>
  );
}

// ── Dept Admin: Member Allocation Modal ───────────────────────────────────────

function MemberAllocModal({
  dept, deptAllocated, deptMemberAllocated, existing, members, onClose, onSave,
}: {
  dept: string;
  deptAllocated: number;
  deptMemberAllocated: number;
  existing: MemberAllocation[];
  members: { id: string; name: string; role: string }[];
  onClose: () => void;
  onSave: (employeeId: string, amount: number, notes: string) => void;
}) {
  const [selectedId, setSelectedId] = useState("");
  const [amount,     setAmount]     = useState("");
  const [notes,      setNotes]      = useState("");
  const [error,      setError]      = useState("");

  const availableForDept = deptAllocated - deptMemberAllocated;

  const options = members.map(m => {
    const alloc = existing.find(e => e.employeeId === m.id);
    return { id: m.id, name: m.name, role: m.role, allocated: alloc?.allocatedAmount, used: alloc?.usedAmount };
  });

  const selectedExisting = existing.find(e => e.employeeId === selectedId);

  // PROTECTED: minimum = what member has already SPENT (not just allocated to them)
  const spentFloor = selectedExisting?.usedAmount ?? 0;
  const maxAllowable = selectedExisting
    ? availableForDept + selectedExisting.allocatedAmount
    : availableForDept;

  useEffect(() => {
    if (selectedExisting) {
      setAmount(String(selectedExisting.allocatedAmount));
    } else {
      setAmount("");
    }
  }, [selectedId, selectedExisting]);

  const handleSave = () => {
    if (!selectedId) { setError("Select an employee."); return; }
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) { setError("Enter a valid positive amount."); return; }
    if (amt < spentFloor) {
      setError(`Cannot set below already spent amount (${fmtRs(spentFloor)}). Spent budget is protected.`);
      return;
    }
    if (amt > maxAllowable) {
      setError(`Cannot exceed available dept budget (${fmtRs(Math.max(0, maxAllowable))}).`);
      return;
    }
    onSave(selectedId, amt, notes);
  };

  return (
    <Modal title={`Allocate Budget — ${dept}`} onClose={onClose}>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-gray-50 dark:bg-gray-800 p-3 text-center">
            <p className="text-xs text-gray-400 mb-1">Dept Budget</p>
            <p className="text-sm font-bold text-gray-900 dark:text-white">{fmtRs(deptAllocated)}</p>
          </div>
          <div className="rounded-xl bg-green-50 dark:bg-green-900/20 p-3 text-center">
            <p className="text-xs text-gray-400 mb-1">Remaining to Assign</p>
            <p className={`text-sm font-bold ${availableForDept < 0 ? "text-red-600" : "text-green-600"}`}>
              {fmtRs(Math.max(0, availableForDept))}
            </p>
          </div>
        </div>

        <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-900/30 text-xs text-blue-700 dark:text-blue-400">
          Only employees from <strong>{dept}</strong> are shown. Cross-department allocation is not permitted.
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Select Employee *</label>
          <EmployeeDropdown options={options} value={selectedId} onChange={setSelectedId} placeholder="Search and select an employee…" />
        </div>

        {selectedExisting && (
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-lg bg-gray-50 dark:bg-gray-800 p-2 text-center">
              <p className="text-[10px] text-gray-400 mb-0.5">Current Allocated</p>
              <p className="text-xs font-bold text-gray-900 dark:text-white">{fmtRs(selectedExisting.allocatedAmount)}</p>
            </div>
            <div className="rounded-lg bg-orange-50 dark:bg-orange-900/20 border border-orange-100 dark:border-orange-900/30 p-2 text-center">
              <p className="text-[10px] text-orange-400 mb-0.5">Spent (Protected)</p>
              <p className="text-xs font-bold text-orange-600">{fmtRs(spentFloor)}</p>
            </div>
            <div className="rounded-lg bg-green-50 dark:bg-green-900/20 p-2 text-center">
              <p className="text-[10px] text-gray-400 mb-0.5">Remaining</p>
              <p className="text-xs font-bold text-green-600">{fmtRs(selectedExisting.allocatedAmount - spentFloor)}</p>
            </div>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Amount (Rs.) *
            {spentFloor > 0 && (
              <span className="text-red-500 font-normal ml-1">— min {fmtRs(spentFloor)} (spent)</span>
            )}
          </label>
          <input type="number"
            min={spentFloor > 0 ? spentFloor : 1}
            max={Math.max(0, maxAllowable)}
            className={inputCls}
            placeholder={`Max: ${fmtRs(Math.max(0, maxAllowable))}`}
            value={amount} onChange={e => setAmount(e.target.value)} />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes (optional)</label>
          <textarea rows={2} className={inputCls} placeholder="Optional notes…" value={notes} onChange={e => setNotes(e.target.value)} />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>
      <div className="mt-6 flex justify-end gap-3">
        <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 rounded-lg">Cancel</button>
        <button onClick={handleSave} className="px-4 py-2 text-sm font-semibold text-white bg-brand-500 hover:bg-brand-600 rounded-lg">
          {selectedExisting ? "Update Allocation" : "Allocate"}
        </button>
      </div>
    </Modal>
  );
}

// ── Return Budget Modal (DeptAdmin → Company Pool) ────────────────────────────

function ReturnBudgetModal({
  dept, allocatedAmount, usedTotal, onClose, onReturn,
}: {
  dept: string;
  allocatedAmount: number;
  usedTotal: number;
  onClose: () => void;
  onReturn: (amount: number, reason: string, notes: string) => void;
}) {
  const remaining    = allocatedAmount - usedTotal;
  const [amount,  setAmount]  = useState("");
  const [reason,  setReason]  = useState("");
  const [notes,   setNotes]   = useState("");
  const [error,   setError]   = useState("");

  const handleSubmit = () => {
    setError("");
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) { setError("Enter a valid positive amount."); return; }
    if (amt > remaining) {
      setError(`Cannot return more than remaining budget (${fmtRs(remaining)}). Spent budget is protected.`);
      return;
    }
    if (!reason.trim()) { setError("Return reason is required."); return; }
    onReturn(amt, reason.trim(), notes.trim());
  };

  return (
    <Modal title={`Return Budget — ${dept}`} onClose={onClose}>
      <div className="space-y-4">
        <div className="p-3 rounded-xl bg-pink-50 dark:bg-pink-900/20 border border-pink-200 dark:border-pink-800 text-xs text-pink-700 dark:text-pink-400">
          Returned budget goes back to the company unallocated pool. Only <strong>remaining (unspent)</strong> budget can be returned.
          Spent budget is permanently protected.
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-xl bg-gray-50 dark:bg-gray-800 p-3 text-center">
            <p className="text-[10px] text-gray-400 mb-1">Total Allocated</p>
            <p className="text-sm font-bold text-gray-900 dark:text-white">{fmtRs(allocatedAmount)}</p>
          </div>
          <div className="rounded-xl bg-orange-50 dark:bg-orange-900/20 border border-orange-100 dark:border-orange-900/30 p-3 text-center">
            <p className="text-[10px] text-orange-400 mb-1">Spent (Protected)</p>
            <p className="text-sm font-bold text-orange-600">{fmtRs(usedTotal)}</p>
          </div>
          <div className="rounded-xl bg-green-50 dark:bg-green-900/20 p-3 text-center">
            <p className="text-[10px] text-green-500 mb-1">Returnable</p>
            <p className={`text-sm font-bold ${remaining <= 0 ? "text-red-600" : "text-green-600"}`}>{fmtRs(Math.max(0, remaining))}</p>
          </div>
        </div>

        {remaining <= 0 && (
          <div className="p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-xs text-red-700 dark:text-red-400">
            All budget has been spent. There is nothing available to return.
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Return Amount (Rs.) * <span className="text-gray-400 font-normal">— max {fmtRs(Math.max(0, remaining))}</span>
          </label>
          <input type="number" min="1" max={Math.max(0, remaining)} className={inputCls}
            placeholder={remaining > 0 ? `Up to ${fmtRs(remaining)}` : "Nothing to return"}
            disabled={remaining <= 0}
            value={amount} onChange={e => setAmount(e.target.value)} />
          {parseFloat(amount) > 0 && parseFloat(amount) <= remaining && (
            <p className="text-xs mt-1 text-pink-600">Your allocation after return: <strong>{fmtRs(allocatedAmount - parseFloat(amount))}</strong></p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Return Reason *</label>
          <textarea rows={2} className={inputCls} placeholder="Why are you returning this budget?" value={reason} onChange={e => setReason(e.target.value)} />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Additional Notes (optional)</label>
          <textarea rows={2} className={inputCls} placeholder="Any additional context…" value={notes} onChange={e => setNotes(e.target.value)} />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>
      <div className="mt-6 flex justify-end gap-3">
        <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg">Cancel</button>
        <button onClick={handleSubmit} disabled={remaining <= 0}
          className="px-5 py-2 text-sm font-semibold text-white bg-pink-600 hover:bg-pink-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed">
          Return Budget
        </button>
      </div>
    </Modal>
  );
}

// ── Request Budget Modal (DeptAdmin → SA for approval) ────────────────────────

function RequestBudgetModal({
  dept, currentAllocated, onClose, onRequest,
}: {
  dept: string;
  currentAllocated: number;
  onClose: () => void;
  onRequest: (amount: number, justification: string, priority: BudgetRequestPriority, notes: string) => void;
}) {
  const [amount,        setAmount]        = useState("");
  const [justification, setJustification] = useState("");
  const [priority,      setPriority]      = useState<BudgetRequestPriority>("Medium");
  const [notes,         setNotes]         = useState("");
  const [error,         setError]         = useState("");

  const handleSubmit = () => {
    setError("");
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) { setError("Enter a valid positive amount."); return; }
    if (!justification.trim()) { setError("Business justification is required."); return; }
    onRequest(amt, justification.trim(), priority, notes.trim());
  };

  const PRIORITY_COLORS: Record<BudgetRequestPriority, string> = {
    Low:      "bg-gray-100 text-gray-600",
    Medium:   "bg-blue-100 text-blue-700",
    High:     "bg-orange-100 text-orange-700",
    Critical: "bg-red-100 text-red-700",
  };

  return (
    <Modal title={`Request Additional Budget — ${dept}`} onClose={onClose}>
      <div className="space-y-4">
        <div className="p-3 rounded-xl bg-sky-50 dark:bg-sky-900/20 border border-sky-200 dark:border-sky-800 text-xs text-sky-700 dark:text-sky-400">
          Your request will be sent to the Super Admin for review. No budget is added until the request is approved.
          Current allocation: <strong>{fmtRs(currentAllocated)}</strong>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Additional Amount Requested (Rs.) *</label>
          <input type="number" min="1" className={inputCls} placeholder="e.g. 100000"
            value={amount} onChange={e => setAmount(e.target.value)} />
          {parseFloat(amount) > 0 && (
            <p className="text-xs mt-1 text-sky-600">
              Total if approved: <strong>{fmtRs(currentAllocated + parseFloat(amount))}</strong>
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Priority *</label>
          <div className="flex gap-2">
            {(["Low","Medium","High","Critical"] as BudgetRequestPriority[]).map(p => (
              <button key={p} type="button" onClick={() => setPriority(p)}
                className={`flex-1 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                  priority === p
                    ? `${PRIORITY_COLORS[p]} border-current`
                    : "border-gray-200 dark:border-gray-700 text-gray-400 hover:text-gray-600"
                }`}>
                {p}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Business Justification *</label>
          <textarea rows={3} className={inputCls} placeholder="Explain why additional budget is needed and how it will be used…"
            value={justification} onChange={e => setJustification(e.target.value)} />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Additional Notes (optional)</label>
          <textarea rows={2} className={inputCls} placeholder="Any supporting context…"
            value={notes} onChange={e => setNotes(e.target.value)} />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>
      <div className="mt-6 flex justify-end gap-3">
        <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg">Cancel</button>
        <button onClick={handleSubmit} className="px-5 py-2 text-sm font-semibold text-white bg-sky-600 hover:bg-sky-700 rounded-lg">Submit Request</button>
      </div>
    </Modal>
  );
}

// ── Request Action Modal (SA: Approve / Reject / Partially Approve) ────────────

function RequestActionModal({
  request, onClose, onAction,
}: {
  request: BudgetRequest;
  onClose: () => void;
  onAction: (id: string, status: "Approved" | "Rejected" | "Partially Approved", approvedAmount: number, actionNotes: string) => void;
}) {
  const [mode,          setMode]          = useState<"Approved" | "Rejected" | "Partially Approved">("Approved");
  const [approvedAmt,   setApprovedAmt]   = useState(String(request.requestedAmount));
  const [actionNotes,   setActionNotes]   = useState("");
  const [error,         setError]         = useState("");

  const handleSubmit = () => {
    setError("");
    if (mode === "Approved") {
      onAction(request.id, "Approved", request.requestedAmount, actionNotes);
    } else if (mode === "Rejected") {
      if (!actionNotes.trim()) { setError("Please provide a reason for rejection."); return; }
      onAction(request.id, "Rejected", 0, actionNotes);
    } else {
      const amt = parseFloat(approvedAmt);
      if (!amt || amt <= 0) { setError("Enter a valid approved amount."); return; }
      if (amt >= request.requestedAmount) { setError("For partial approval, enter an amount less than the requested amount."); return; }
      if (!actionNotes.trim()) { setError("Please add notes explaining the partial approval."); return; }
      onAction(request.id, "Partially Approved", amt, actionNotes);
    }
  };

  const PRIORITY_COLORS: Record<BudgetRequestPriority, string> = {
    Low: "bg-gray-100 text-gray-600", Medium: "bg-blue-100 text-blue-700",
    High: "bg-orange-100 text-orange-700", Critical: "bg-red-100 text-red-700",
  };

  return (
    <Modal title="Review Budget Request" onClose={onClose} wide>
      <div className="space-y-4">
        {/* Request summary */}
        <div className="rounded-xl border border-gray-200 dark:border-gray-800 p-4 space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-gray-900 dark:text-white">{request.department} Department</p>
              <p className="text-xs text-gray-400">{request.adminName} · {new Date(request.submittedAt).toLocaleString()}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${PRIORITY_COLORS[request.priority]}`}>{request.priority}</span>
              <span className="text-lg font-bold text-sky-600">{fmtRs(request.requestedAmount)}</span>
            </div>
          </div>
          <div className="mt-2 p-3 rounded-lg bg-gray-50 dark:bg-gray-800 text-xs text-gray-700 dark:text-gray-300">
            <p className="font-semibold text-gray-500 dark:text-gray-400 mb-1">Justification:</p>
            {request.justification}
          </div>
          {request.notes && (
            <p className="text-xs text-gray-400 italic">{request.notes}</p>
          )}
        </div>

        {/* Action selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Decision *</label>
          <div className="flex gap-2">
            {(["Approved","Partially Approved","Rejected"] as const).map(m => (
              <button key={m} type="button" onClick={() => setMode(m)}
                className={`flex-1 py-2 rounded-lg text-xs font-semibold border transition-colors ${
                  mode === m
                    ? m === "Approved" ? "bg-emerald-100 text-emerald-700 border-emerald-300"
                      : m === "Rejected" ? "bg-red-100 text-red-700 border-red-300"
                      : "bg-amber-100 text-amber-700 border-amber-300"
                    : "border-gray-200 dark:border-gray-700 text-gray-400 hover:text-gray-600"
                }`}>
                {m}
              </button>
            ))}
          </div>
        </div>

        {mode === "Partially Approved" && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Approved Amount (Rs.) * <span className="text-gray-400 font-normal">— must be less than {fmtRs(request.requestedAmount)}</span>
            </label>
            <input type="number" min="1" max={request.requestedAmount - 1} className={inputCls}
              value={approvedAmt} onChange={e => setApprovedAmt(e.target.value)} />
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {mode === "Rejected" ? "Rejection Reason *" : "Decision Notes"}
            {mode === "Approved" && <span className="text-gray-400 font-normal ml-1">(optional)</span>}
          </label>
          <textarea rows={2} className={inputCls}
            placeholder={mode === "Rejected" ? "Explain why the request is being rejected…" : "Notes for the department admin…"}
            value={actionNotes} onChange={e => setActionNotes(e.target.value)} />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>
      <div className="mt-6 flex justify-end gap-3">
        <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg">Cancel</button>
        <button onClick={handleSubmit}
          className={`px-5 py-2 text-sm font-semibold text-white rounded-lg ${
            mode === "Approved" ? "bg-emerald-600 hover:bg-emerald-700"
            : mode === "Rejected" ? "bg-red-600 hover:bg-red-700"
            : "bg-amber-600 hover:bg-amber-700"
          }`}>
          {mode === "Approved" ? "Approve" : mode === "Rejected" ? "Reject" : "Partially Approve"}
        </button>
      </div>
    </Modal>
  );
}

// ── Audit Log Table ───────────────────────────────────────────────────────────

function AuditLogTable({ entries }: { entries: BudgetAuditEntry[] }) {
  const [search, setSearch] = useState("");
  const filtered = useMemo(() =>
    [...entries]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .filter(e => !search || JSON.stringify(e).toLowerCase().includes(search.toLowerCase())),
    [entries, search]
  );

  return (
    <div>
      <div className="mb-3">
        <input type="text" placeholder="Search audit log…" value={search}
          onChange={e => setSearch(e.target.value)}
          className="rounded-lg border border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-white px-3 py-1.5 text-sm w-64 focus:ring-2 focus:ring-brand-500" />
      </div>
      <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
          <thead className="bg-gray-50 dark:bg-gray-800/50">
            <tr>
              {["Timestamp", "Action", "Performed By", "Dept / Target", "Purpose / Change", "Previous", "New Amount", "Notes"].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase dark:text-gray-400 whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {filtered.length === 0 ? (
              <tr><td colSpan={8} className="py-10 text-center text-sm text-gray-400">No audit entries.</td></tr>
            ) : filtered.map(e => (
              <tr key={e.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors">
                <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{new Date(e.timestamp).toLocaleString()}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap ${ACTION_COLOR[e.action]}`}>
                    {ACTION_LABEL[e.action]}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <p className="text-sm text-gray-900 dark:text-white">{e.performedByName}</p>
                  <p className="text-xs text-gray-400">{e.performedByRole}</p>
                </td>
                <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                  {e.action === "BUDGET_REALLOCATED" && e.fromDepartment && e.toDepartment ? (
                    <span className="text-xs">
                      <span className="text-orange-600">{e.fromDepartment}</span>
                      <span className="text-gray-400 mx-1">→</span>
                      <span className="text-green-600">{e.toDepartment}</span>
                    </span>
                  ) : (
                    <>
                      {e.targetName && <p>{e.targetName}</p>}
                      {e.department && <p className="text-xs text-gray-400">{e.department}</p>}
                    </>
                  )}
                </td>
                <td className="px-4 py-3 text-xs text-gray-600 dark:text-gray-400 max-w-[150px]">
                  {e.action === "BUDGET_PURPOSE_UPDATED" && e.previousPurpose ? (
                    <span>
                      <span className="line-through text-gray-400">{e.previousPurpose}</span>
                      <span className="text-gray-400 mx-1">→</span>
                      <span className="font-medium text-yellow-700 dark:text-yellow-400">{e.purpose}</span>
                    </span>
                  ) : e.purpose ? (
                    <span className="inline-block px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
                      {e.purpose}
                    </span>
                  ) : (
                    <span className="text-gray-300 dark:text-gray-600">—</span>
                  )}
                </td>
                <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">
                  {e.previousAmount > 0 ? fmtRs(e.previousAmount) : "—"}
                </td>
                <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white whitespace-nowrap">
                  {e.newAmount > 0 ? fmtRs(e.newAmount) : <span className="text-gray-400">—</span>}
                </td>
                <td className="px-4 py-3 text-xs text-gray-400 max-w-xs truncate" title={e.notes}>{e.notes ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Super Admin / Management View ─────────────────────────────────────────────

function SuperAdminView({ isSA }: { isSA: boolean }) {
  const { user }      = useAuth();
  const { showToast } = useToast();

  const [tab,           setTab]           = useState<"overview" | "departments" | "members" | "requests" | "audit">("overview");
  const [budget,        setBudget]        = useState<CompanyBudget | null>(null);
  const [deptSummaries, setDeptSummaries] = useState<DeptBudgetSummary[]>([]);
  const [allDeptAllocs, setAllDeptAllocs] = useState<DeptAllocation[]>([]);
  const [members,       setMembers]       = useState<MemberAllocation[]>([]);
  const [auditLog,      setAuditLog]      = useState<BudgetAuditEntry[]>([]);
  const [budgetModal,     setBudgetModal]     = useState<"create" | "edit" | "increase" | "reduce" | "reset" | null>(null);
  const [assignTarget,    setAssignTarget]    = useState<string | null>(null);  // null=closed, ""=new, "Dept"=edit
  const [showTransfer,    setShowTransfer]    = useState(false);
  const [pendingRequests, setPendingRequests] = useState<BudgetRequest[]>([]);
  const [allRequests,     setAllRequests]     = useState<BudgetRequest[]>([]);
  const [actioningRequest, setActioningRequest] = useState<BudgetRequest | null>(null);

  const reload = () => {
    setBudget(getCompanyBudget());
    setDeptSummaries(getDeptBudgetSummaries());
    setAllDeptAllocs(getDeptAllocations());
    setMembers(getMemberAllocations());
    setAuditLog(getBudgetAuditLog());
    setPendingRequests(getPendingBudgetRequests());
    setAllRequests(getBudgetRequests());
  };

  useEffect(() => { reload(); }, []);

  const stats = useMemo(() => {
    if (!budget) return null;
    const totalAllocated = deptSummaries.reduce((s, d) => s + d.allocatedAmount, 0);
    const totalUsed      = deptSummaries.reduce((s, d) => s + d.usedTotal, 0);
    return {
      total:          budget.totalAmount,
      allocated:      totalAllocated,
      unallocated:    budget.totalAmount - totalAllocated,
      used:           totalUsed,
      utilizationPct: budget.totalAmount > 0 ? Math.round((totalUsed / budget.totalAmount) * 100) : 0,
    };
  }, [budget, deptSummaries]);

  const totalAllocatedToDepts = stats?.allocated ?? 0;

  // ── Company Budget CRUD ────────────────────────────────────────────────────
  const handleBudgetSave = (action: BudgetMasterAction, _amount: number, notes: string, newTotal?: number) => {
    if (action === "BUDGET_RESET") {
      const prev = budget?.totalAmount ?? 0;
      resetCompanyBudget();
      appendBudgetAuditEntry({
        action: "BUDGET_RESET", previousAmount: prev, newAmount: 0,
        performedById: user?.id ?? "", performedByName: user?.name ?? "", performedByRole: user?.role ?? "",
        notes,
      });
      reload();
      setBudgetModal(null);
      showToast("Company budget has been reset.", "success");
      return;
    }
    const prev = budget?.totalAmount ?? 0;
    const now  = new Date().toISOString();
    const updated: CompanyBudget = {
      id:            "master",
      totalAmount:   newTotal ?? _amount,
      fiscalYear:    budget?.fiscalYear ?? "FY2026",
      description:   budget?.description ?? "",
      createdAt:     budget?.createdAt ?? now,
      updatedAt:     now,
      createdById:   budget?.createdById ?? (user?.id ?? ""),
      createdByName: budget?.createdByName ?? (user?.name ?? ""),
    };
    saveCompanyBudget(updated);
    appendBudgetAuditEntry({
      action, previousAmount: prev, newAmount: updated.totalAmount,
      performedById: user?.id ?? "", performedByName: user?.name ?? "", performedByRole: user?.role ?? "",
      notes,
    });
    notifyCompanyBudgetAction(
      user?.id ?? "", user?.name ?? "",
      action === "BUDGET_CREATED" ? "created" : action === "BUDGET_INCREASED" ? "increased" : action === "BUDGET_REDUCED" ? "reduced" : "updated",
      updated.totalAmount, prev
    );
    reload();
    setBudgetModal(null);
    showToast("Company budget updated.", "success");
  };

  // ── Dept Budget Assignment ─────────────────────────────────────────────────
  const handleAssignBudget = (
    dept: string, adminId: string, adminName: string,
    amount: number, purpose: string, effectiveDate: string, notes: string,
    prevPurpose: string | undefined,
  ) => {
    const allocs = getDeptAllocations();
    const idx    = allocs.findIndex(d => d.department === dept);
    const prev   = idx >= 0 ? allocs[idx].allocatedAmount : 0;
    const isNew  = idx < 0;
    const now    = new Date().toISOString();

    if (isNew) {
      allocs.push({
        id: `da-${dept.toLowerCase().replace(/\s/g, "-")}-${Date.now()}`,
        department: dept, adminId, adminName,
        allocatedAmount: amount, purpose, effectiveDate,
        allocatedAt: now, updatedAt: now,
        allocatedById: user?.id ?? "", allocatedByName: user?.name ?? "",
      });
    } else {
      allocs[idx] = { ...allocs[idx], adminId, adminName, allocatedAmount: amount, purpose, effectiveDate, updatedAt: now };
    }
    saveDeptAllocations(allocs);

    // Determine the correct audit action
    const amountChanged  = !isNew && amount !== prev;
    const purposeChanged = !isNew && purpose !== prevPurpose;

    if (!isNew && purposeChanged && !amountChanged) {
      // Purpose-only change
      appendBudgetAuditEntry({
        action: "BUDGET_PURPOSE_UPDATED",
        previousAmount: prev, newAmount: amount,
        performedById: user?.id ?? "", performedByName: user?.name ?? "", performedByRole: user?.role ?? "",
        targetName: adminName, department: dept,
        purpose, previousPurpose: prevPurpose,
        notes,
      });
    } else {
      appendBudgetAuditEntry({
        action: isNew ? "DEPT_ALLOCATED" : "DEPT_ALLOCATION_UPDATED",
        previousAmount: prev, newAmount: amount,
        performedById: user?.id ?? "", performedByName: user?.name ?? "", performedByRole: user?.role ?? "",
        targetName: adminName, department: dept,
        purpose, previousPurpose: purposeChanged ? prevPurpose : undefined,
        notes,
      });
    }

    notifyBudgetAllocatedToDept(user?.id ?? "", user?.name ?? "", adminId, adminName, dept, amount, !isNew);
    reload();
    setAssignTarget(null);
    showToast(`Budget ${isNew ? "assigned to" : "updated for"} ${dept} (${adminName}).`, "success");
  };

  // ── Budget Transfer ────────────────────────────────────────────────────────
  const handleTransfer = (fromDept: string, toDept: string, amount: number, notes: string) => {
    const allocs   = getDeptAllocations();
    const fromIdx  = allocs.findIndex(d => d.department === fromDept);
    const toIdx    = allocs.findIndex(d => d.department === toDept);
    if (fromIdx < 0 || toIdx < 0) return;

    const fromPrev = allocs[fromIdx].allocatedAmount;
    const toPrev   = allocs[toIdx].allocatedAmount;
    const now      = new Date().toISOString();

    allocs[fromIdx] = { ...allocs[fromIdx], allocatedAmount: fromPrev - amount, updatedAt: now };
    allocs[toIdx]   = { ...allocs[toIdx],   allocatedAmount: toPrev  + amount, updatedAt: now };
    saveDeptAllocations(allocs);

    appendBudgetAuditEntry({
      action: "BUDGET_REALLOCATED",
      previousAmount: fromPrev, newAmount: fromPrev - amount,
      performedById: user?.id ?? "", performedByName: user?.name ?? "", performedByRole: user?.role ?? "",
      fromDepartment: fromDept, toDepartment: toDept,
      notes: `${notes ? notes + " | " : ""}Transfer of ${fmtRs(amount)} from ${fromDept} to ${toDept}`,
    });

    notifyBudgetAllocatedToDept(user?.id ?? "", user?.name ?? "", allocs[toIdx].adminId, allocs[toIdx].adminName, toDept, allocs[toIdx].allocatedAmount, true);
    reload();
    setShowTransfer(false);
    showToast(`${fmtRs(amount)} transferred from ${fromDept} to ${toDept}.`, "success");
  };

  // ── Budget Request Action (SA approves/rejects) ───────────────────────────
  const handleRequestAction = (
    id: string, status: "Approved" | "Rejected" | "Partially Approved", approvedAmount: number, actionNotes: string
  ) => {
    const req = allRequests.find(r => r.id === id);
    if (!req) return;

    // L9: Idempotency guard — prevent re-actioning an already-decided request
    if (req.status !== "Pending") {
      showToast(`This request is already ${req.status}. No changes were made.`, "warning");
      setActioningRequest(null);
      return;
    }

    // L7: Cap approval against the company's unallocated pool
    if (status === "Approved" || status === "Partially Approved") {
      const companyPool = getCompanyUnallocated();
      if (approvedAmount > companyPool) {
        showToast(
          `Cannot approve ${fmtRs(approvedAmount)} — only ${fmtRs(companyPool)} remains in the company unallocated pool. Reduce the approved amount or increase the company budget first.`,
          "error"
        );
        return;
      }
    }

    updateBudgetRequest(id, {
      status,
      approvedAmount,
      actionedById:   user?.id ?? "",
      actionedByName: user?.name ?? "",
      actionNotes,
      actionedAt:     new Date().toISOString(),
    });

    if (status === "Approved" || status === "Partially Approved") {
      const amt   = approvedAmount;
      const allocs = getDeptAllocations();
      const idx    = allocs.findIndex(d => d.department === req.department);
      if (idx >= 0) {
        const prev = allocs[idx].allocatedAmount;
        allocs[idx] = { ...allocs[idx], allocatedAmount: prev + amt, updatedAt: new Date().toISOString() };
        saveDeptAllocations(allocs);
        appendBudgetAuditEntry({
          action: status === "Approved" ? "BUDGET_REQUEST_APPROVED" : "BUDGET_REQUEST_PARTIAL",
          previousAmount: prev, newAmount: prev + amt,
          performedById: user?.id ?? "", performedByName: user?.name ?? "", performedByRole: user?.role ?? "",
          targetName: req.adminName, department: req.department,
          notes: `Request ${id}${actionNotes ? " — " + actionNotes : ""}`,
        });
      }
    } else {
      appendBudgetAuditEntry({
        action: "BUDGET_REQUEST_REJECTED",
        previousAmount: 0, newAmount: 0,
        performedById: user?.id ?? "", performedByName: user?.name ?? "", performedByRole: user?.role ?? "",
        targetName: req.adminName, department: req.department,
        notes: `Request ${id}${actionNotes ? " — " + actionNotes : ""}`,
      });
    }

    notifyBudgetRequestActioned(
      user?.id ?? "", user?.name ?? "",
      req.adminId, req.department, status,
      req.requestedAmount, approvedAmount, id
    );

    reload();
    setActioningRequest(null);
    showToast(
      status === "Approved"  ? `Budget request approved — ${fmtRs(approvedAmount)} added to ${req.department}.`
      : status === "Rejected" ? `Budget request for ${req.department} has been rejected.`
      : `Budget request partially approved — ${fmtRs(approvedAmount)} added to ${req.department}.`,
      status === "Rejected" ? "warning" : "success"
    );
  };

  const TABS = [
    { id: "overview",    label: "Overview" },
    { id: "departments", label: "Dept Allocations" },
    { id: "members",     label: "Member View" },
    { id: "requests",    label: `Budget Requests${pendingRequests.length > 0 ? ` (${pendingRequests.length})` : ""}` },
    { id: "audit",       label: "Audit Log" },
  ] as const;

  return (
    <div>
      {/* Tab bar + action buttons */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div className="flex gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-xl">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${tab === t.id ? "bg-white dark:bg-gray-900 text-brand-600 shadow-sm" : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"}`}>
              {t.label}
            </button>
          ))}
        </div>
        {isSA && budget && (
          <div className="flex gap-2">
            <button
              onClick={() => setShowTransfer(true)}
              className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold rounded-xl shadow-sm transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
              </svg>
              Transfer Budget
            </button>
            <button
              onClick={() => setAssignTarget("")}
              className="flex items-center gap-2 px-5 py-2 bg-brand-500 hover:bg-brand-600 text-white text-sm font-semibold rounded-xl shadow-sm transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/></svg>
              Assign Budget
            </button>
          </div>
        )}
      </div>

      {/* ── OVERVIEW TAB ──────────────────────────────────────────── */}
      {tab === "overview" && (
        <div className="space-y-6">
          {/* Company Budget Card */}
          {budget ? (
            <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-gradient-to-br from-brand-600 to-brand-400 p-6 text-white shadow-sm">
              <div className="flex items-start justify-between mb-4 flex-wrap gap-4">
                <div>
                  <p className="text-sm font-medium opacity-80 mb-1">Company Master Budget — {budget.fiscalYear}</p>
                  <p className="text-4xl font-bold">{fmtRs(budget.totalAmount)}</p>
                  {budget.description && <p className="text-sm opacity-80 mt-2 max-w-xl">{budget.description}</p>}
                  {totalAllocatedToDepts > 0 && (
                    <p className="text-xs opacity-60 mt-1">
                      {fmtRs(totalAllocatedToDepts)} allocated to depts · {fmtRs(budget.totalAmount - totalAllocatedToDepts)} unallocated
                    </p>
                  )}
                </div>
                {isSA && (
                  <div className="flex flex-wrap gap-2">
                    <button onClick={() => setBudgetModal("edit")}     className="px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-lg text-xs font-semibold">Edit</button>
                    <button onClick={() => setBudgetModal("increase")} className="px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-lg text-xs font-semibold">+ Increase</button>
                    <button onClick={() => setBudgetModal("reduce")}   className="px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-lg text-xs font-semibold">− Reduce</button>
                    <button onClick={() => setBudgetModal("reset")}    className="px-3 py-1.5 bg-red-500/80 hover:bg-red-600/80 rounded-lg text-xs font-semibold">Reset</button>
                  </div>
                )}
              </div>
              <p className="text-xs opacity-60">Created by {budget.createdByName} · Last updated {new Date(budget.updatedAt).toLocaleDateString()}</p>
            </div>
          ) : isSA ? (
            <div className="rounded-2xl border-2 border-dashed border-gray-300 dark:border-gray-700 p-10 text-center">
              <p className="text-gray-400 mb-4">No company budget has been created yet.</p>
              <button onClick={() => setBudgetModal("create")} className="px-5 py-2.5 bg-brand-500 hover:bg-brand-600 text-white text-sm font-semibold rounded-xl">Create Company Budget</button>
            </div>
          ) : (
            <div className="rounded-2xl border border-yellow-200 bg-yellow-50 dark:bg-yellow-900/20 p-6 text-yellow-800 dark:text-yellow-300 text-sm">
              No company budget has been set up yet. Contact the Super Admin.
            </div>
          )}

          {/* KPI strip */}
          {stats && (
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
              {[
                { label: "Total Budget",       value: fmtRs(stats.total),       color: "text-gray-900 dark:text-white" },
                { label: "Allocated to Depts", value: fmtRs(stats.allocated),   color: "text-brand-600" },
                { label: "Unallocated",        value: fmtRs(stats.unallocated), color: stats.unallocated < 0 ? "text-red-600" : "text-green-600" },
                { label: "Used / Spent",       value: fmtRs(stats.used),        color: "text-orange-600", note: "read-only" },
                { label: "Utilization",        value: fmtPct(stats.utilizationPct), color: stats.utilizationPct >= 90 ? "text-red-600" : stats.utilizationPct >= 70 ? "text-yellow-600" : "text-green-600" },
              ].map(({ label, value, color, note }) => (
                <div key={label} className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 shadow-sm">
                  <div className="flex items-center gap-1 mb-1">
                    <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
                    {note && (
                      <svg className="w-3 h-3 text-red-400 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                  <p className={`mt-1 text-xl font-bold ${color}`}>{value}</p>
                </div>
              ))}
            </div>
          )}

          {stats && (
            <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 shadow-sm">
              <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Overall Budget Utilization</p>
              <UtilBar used={stats.used} total={stats.total} height="h-4" />
            </div>
          )}

          {/* Dept breakdown */}
          {deptSummaries.length > 0 && (
            <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 shadow-sm">
              <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Department-Wise Budget Breakdown</p>
              <div className="space-y-5">
                {deptSummaries.map(d => {
                  const alloc    = allDeptAllocs.find(a => a.department === d.department);
                  const remaining = d.allocatedAmount - d.usedTotal;
                  return (
                    <div key={d.department}>
                      <div className="flex items-center justify-between mb-1 flex-wrap gap-1">
                        <div className="flex items-center gap-2">
                          <span className={`w-2.5 h-2.5 rounded-full ${DEPT_COLOR[d.department] ?? "bg-gray-400"}`} />
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{d.department}</span>
                          <span className="text-xs text-gray-400">({d.adminName})</span>
                          {alloc?.purpose && (
                            <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${DEPT_SOFT[d.department] ?? "bg-gray-100 text-gray-600"}`}>
                              {alloc.purpose}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-right">
                          <span className="text-xs text-orange-600">{fmtRs(d.usedTotal)} spent</span>
                          <span className="text-xs text-green-600">{fmtRs(remaining)} remaining</span>
                          <span className="text-sm font-semibold text-gray-900 dark:text-white">of {fmtRs(d.allocatedAmount)}</span>
                        </div>
                      </div>
                      <UtilBar used={d.usedTotal} total={d.allocatedAmount} />
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── DEPARTMENTS TAB ──────────────────────────────────────── */}
      {tab === "departments" && (
        <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between flex-wrap gap-3">
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Department Allocations</h3>
              <p className="text-xs text-gray-400 mt-0.5">Used/Spent budget is always read-only. SA can edit all other values.</p>
            </div>
            {isSA ? (
              <div className="flex gap-2">
                <button onClick={() => setShowTransfer(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-600 hover:bg-violet-700 text-white text-xs font-semibold rounded-lg">
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"/></svg>
                  Transfer
                </button>
                <button onClick={() => setAssignTarget("")}
                  className="flex items-center gap-1.5 px-4 py-1.5 bg-brand-500 hover:bg-brand-600 text-white text-xs font-semibold rounded-lg">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/></svg>
                  Assign Budget
                </button>
              </div>
            ) : (
              <span className="text-xs text-gray-400 italic">View-only — Super Admin can edit</span>
            )}
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
              <thead className="bg-gray-50 dark:bg-gray-800/50">
                <tr>
                  {["Department", "Admin", "Purpose", "Effective", "Allocated", "Used (R/O)", "Member Assigned", "Remaining", "Utilization", ...(isSA ? ["Edit"] : [])].map(h => (
                    <th key={h} className={`px-4 py-3 text-left text-xs font-semibold uppercase dark:text-gray-400 whitespace-nowrap ${h === "Used (R/O)" ? "text-orange-500" : "text-gray-500"}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {deptSummaries.length === 0 ? (
                  <tr><td colSpan={10} className="py-12 text-center text-sm text-gray-400">No department allocations yet.</td></tr>
                ) : deptSummaries.map(d => {
                  const alloc = allDeptAllocs.find(a => a.department === d.department);
                  return (
                    <tr key={d.department} className="hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className={`w-2.5 h-2.5 rounded-full ${DEPT_COLOR[d.department] ?? "bg-gray-400"}`} />
                          <span className="text-sm font-medium text-gray-900 dark:text-white">{d.department}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{d.adminName}</td>
                      <td className="px-4 py-3">
                        {alloc?.purpose
                          ? <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${DEPT_SOFT[d.department] ?? "bg-gray-100 text-gray-600"}`}>{alloc.purpose}</span>
                          : <span className="text-gray-300 dark:text-gray-600 text-xs">—</span>}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{alloc?.effectiveDate ?? "—"}</td>
                      <td className="px-4 py-3 text-sm font-semibold text-gray-900 dark:text-white whitespace-nowrap">{fmtRs(d.allocatedAmount)}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          <svg className="w-3 h-3 text-red-400 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                          </svg>
                          <span className="text-sm font-semibold text-orange-600">{fmtRs(d.usedTotal)}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-blue-600 whitespace-nowrap">{fmtRs(d.memberAllocatedTotal)}</td>
                      <td className="px-4 py-3 text-sm text-green-600 whitespace-nowrap">{fmtRs(d.remainingForAllocation)}</td>
                      <td className="px-4 py-3 w-36"><UtilBar used={d.usedTotal} total={d.allocatedAmount} /></td>
                      {isSA && (
                        <td className="px-4 py-3">
                          <button onClick={() => setAssignTarget(d.department)} className="text-xs text-brand-600 hover:text-brand-800 dark:text-brand-400 font-medium whitespace-nowrap">Edit</button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── MEMBERS TAB ──────────────────────────────────────────── */}
      {tab === "members" && (
        <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-800">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">All Member Allocations</h3>
            <p className="text-xs text-gray-400 mt-0.5">Assigned by Department Admins · Used/Spent values are read-only</p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
              <thead className="bg-gray-50 dark:bg-gray-800/50">
                <tr>
                  {["Employee", "Department", "Allocated", "Used (R/O)", "Remaining", "Utilization", "Allocated By"].map(h => (
                    <th key={h} className={`px-4 py-3 text-left text-xs font-semibold uppercase dark:text-gray-400 ${h === "Used (R/O)" ? "text-orange-500" : "text-gray-500"}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {members.length === 0 ? (
                  <tr><td colSpan={7} className="py-10 text-center text-sm text-gray-400">No member allocations yet.</td></tr>
                ) : members.map(m => (
                  <tr key={m.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors">
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{m.employeeName}</p>
                      <p className="text-xs text-gray-400">{m.employeeRole}</p>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <span className={`w-2 h-2 rounded-full ${DEPT_COLOR[m.department] ?? "bg-gray-400"}`} />
                        <span className="text-sm text-gray-600 dark:text-gray-400">{m.department}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold text-gray-900 dark:text-white">{fmtRs(m.allocatedAmount)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <svg className="w-3 h-3 text-red-400 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                        </svg>
                        <span className="text-sm font-semibold text-orange-600">{fmtRs(m.usedAmount)}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-green-600">{fmtRs(m.allocatedAmount - m.usedAmount)}</td>
                    <td className="px-4 py-3 w-36"><UtilBar used={m.usedAmount} total={m.allocatedAmount} /></td>
                    <td className="px-4 py-3 text-sm text-gray-500">{m.allocatedByName}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── BUDGET REQUESTS TAB ──────────────────────────────── */}
      {tab === "requests" && (
        <div className="space-y-5">
          {pendingRequests.length > 0 && (
            <div className="rounded-2xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/10 p-4">
              <p className="text-sm font-semibold text-amber-800 dark:text-amber-300 mb-3">
                Pending Requests ({pendingRequests.length})
              </p>
              <div className="space-y-3">
                {pendingRequests.map(req => {
                  const PRIORITY_COLORS: Record<BudgetRequestPriority, string> = {
                    Low: "bg-gray-100 text-gray-600", Medium: "bg-blue-100 text-blue-700",
                    High: "bg-orange-100 text-orange-700", Critical: "bg-red-100 text-red-700 font-bold",
                  };
                  return (
                    <div key={req.id} className="rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-4">
                      <div className="flex items-start justify-between gap-3 flex-wrap">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`w-2 h-2 rounded-full ${DEPT_COLOR[req.department] ?? "bg-gray-400"}`} />
                            <span className="text-sm font-semibold text-gray-900 dark:text-white">{req.department}</span>
                            <span className="text-xs text-gray-400">— {req.adminName}</span>
                            <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${PRIORITY_COLORS[req.priority]}`}>{req.priority}</span>
                          </div>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{req.justification}</p>
                          {req.notes && <p className="text-xs text-gray-400 italic mt-0.5">{req.notes}</p>}
                          <p className="text-[10px] text-gray-400 mt-1">Submitted {new Date(req.submittedAt).toLocaleString()}</p>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <span className="text-lg font-bold text-sky-600">{fmtRs(req.requestedAmount)}</span>
                          {isSA && (
                            <button onClick={() => setActioningRequest(req)}
                              className="px-3 py-1.5 text-xs font-semibold text-white bg-brand-500 hover:bg-brand-600 rounded-lg">
                              Review
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* All requests history */}
          <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-800">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">All Budget Requests</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
                <thead className="bg-gray-50 dark:bg-gray-800/50">
                  <tr>
                    {["Department", "Admin", "Requested", "Approved", "Priority", "Status", "Submitted", "Actioned By"].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase dark:text-gray-400 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {allRequests.length === 0 ? (
                    <tr><td colSpan={8} className="py-10 text-center text-sm text-gray-400">No budget requests yet.</td></tr>
                  ) : [...allRequests].sort((a,b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()).map(req => {
                    const STATUS_COLORS: Record<BudgetRequestStatus, string> = {
                      Pending:            "bg-amber-100 text-amber-700",
                      Approved:           "bg-emerald-100 text-emerald-700",
                      Rejected:           "bg-red-100 text-red-700",
                      "Partially Approved": "bg-yellow-100 text-yellow-700",
                    };
                    return (
                      <tr key={req.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            <span className={`w-2 h-2 rounded-full ${DEPT_COLOR[req.department] ?? "bg-gray-400"}`} />
                            <span className="text-sm text-gray-900 dark:text-white">{req.department}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{req.adminName}</td>
                        <td className="px-4 py-3 text-sm font-semibold text-sky-600 whitespace-nowrap">{fmtRs(req.requestedAmount)}</td>
                        <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300 whitespace-nowrap">
                          {req.approvedAmount > 0 ? fmtRs(req.approvedAmount) : "—"}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                            req.priority === "Critical" ? "bg-red-100 text-red-700"
                            : req.priority === "High" ? "bg-orange-100 text-orange-700"
                            : req.priority === "Medium" ? "bg-blue-100 text-blue-700"
                            : "bg-gray-100 text-gray-600"
                          }`}>{req.priority}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[req.status]}`}>{req.status}</span>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">{new Date(req.submittedAt).toLocaleDateString()}</td>
                        <td className="px-4 py-3 text-xs text-gray-500">{req.actionedByName ?? "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── AUDIT LOG TAB ──────────────────────────────────────── */}
      {tab === "audit" && <AuditLogTable entries={auditLog} />}

      {/* Modals */}
      {budgetModal && (
        <CompanyBudgetModal
          mode={budgetModal}
          budget={budget}
          minAllowedTotal={totalAllocatedToDepts}
          onClose={() => setBudgetModal(null)}
          onSave={handleBudgetSave}
        />
      )}
      {assignTarget !== null && budget && (
        <AssignBudgetModal
          preselectedDept={assignTarget === "" ? null : assignTarget}
          companyTotal={budget.totalAmount}
          deptSummaries={deptSummaries}
          allDeptAllocs={allDeptAllocs}
          onClose={() => setAssignTarget(null)}
          onSave={handleAssignBudget}
        />
      )}
      {showTransfer && (
        <TransferBudgetModal
          deptSummaries={deptSummaries}
          allDeptAllocs={allDeptAllocs}
          onClose={() => setShowTransfer(false)}
          onTransfer={handleTransfer}
        />
      )}
      {actioningRequest && (
        <RequestActionModal
          request={actioningRequest}
          onClose={() => setActioningRequest(null)}
          onAction={handleRequestAction}
        />
      )}
    </div>
  );
}

// ── Department Admin View ─────────────────────────────────────────────────────

function DeptAdminView() {
  const { user }      = useAuth();
  const { showToast } = useToast();

  const dept = deptFromRole(user?.role ?? "");
  const [deptAlloc,    setDeptAlloc]    = useState<DeptAllocation | null>(null);
  const [myMembers,    setMyMembers]    = useState<MemberAllocation[]>([]);
  const [auditLog,     setAuditLog]     = useState<BudgetAuditEntry[]>([]);
  const [myReturns,    setMyReturns]    = useState<BudgetReturn[]>([]);
  const [myRequests,   setMyRequests]   = useState<BudgetRequest[]>([]);
  const [showModal,    setShowModal]    = useState(false);
  const [showReturn,   setShowReturn]   = useState(false);
  const [showRequest,  setShowRequest]  = useState(false);
  const [tab,          setTab]          = useState<"overview" | "members" | "returns" | "requests" | "audit">("overview");

  const availableMembers = getMembersForDept(dept);

  const reload = () => {
    const allocs = getDeptAllocations();
    setDeptAlloc(allocs.find(d => d.department === dept) ?? null);
    setMyMembers(getMemberAllocations().filter(m => m.department === dept));
    setAuditLog(getBudgetAuditLog().filter(e => e.department === dept || e.fromDepartment === dept || e.toDepartment === dept));
    setMyReturns(getBudgetReturnsByDept(dept));
    setMyRequests(getBudgetRequestsByDept(dept));
  };

  useEffect(() => { reload(); }, [dept]);

  const memberAllocTotal  = myMembers.reduce((s, m) => s + m.allocatedAmount, 0);
  const usedTotal         = myMembers.reduce((s, m) => s + m.usedAmount, 0);
  const availableForAlloc = (deptAlloc?.allocatedAmount ?? 0) - memberAllocTotal;

  const handleAllocate = (employeeId: string, amount: number, notes: string) => {
    const memberInfo = availableMembers.find(m => m.id === employeeId);
    if (!memberInfo) return;

    const all  = getMemberAllocations();
    const idx  = all.findIndex(m => m.employeeId === employeeId);
    const prev = idx >= 0 ? all[idx].allocatedAmount : 0;
    const now  = new Date().toISOString();

    const entry: MemberAllocation = {
      id:              `ma-${employeeId}`,
      employeeId,
      employeeName:    memberInfo.name,
      employeeRole:    memberInfo.role,
      department:      dept,
      allocatedAmount: amount,
      usedAmount:      idx >= 0 ? all[idx].usedAmount : 0,  // NEVER reset usedAmount
      allocatedById:   user?.id ?? "",
      allocatedByName: user?.name ?? "",
      allocatedAt:     idx >= 0 ? all[idx].allocatedAt : now,
      updatedAt:       now,
    };

    if (idx >= 0) { all[idx] = entry; } else { all.push(entry); }
    saveMemberAllocations(all);

    appendBudgetAuditEntry({
      action: idx >= 0 ? "MEMBER_ALLOCATION_UPDATED" : "MEMBER_ALLOCATED",
      previousAmount: prev, newAmount: amount,
      performedById: user?.id ?? "", performedByName: user?.name ?? "", performedByRole: user?.role ?? "",
      targetName: memberInfo.name, department: dept,
      purpose: deptAlloc?.purpose,
      notes,
    });

    notifyBudgetAllocatedToMember(user?.id ?? "", user?.name ?? "", user?.role ?? "", employeeId, memberInfo.name, dept, amount, idx >= 0);
    reload();
    setShowModal(false);
    showToast(`Budget allocated to ${memberInfo.name}.`, "success");
  };

  const handleReturn = (amount: number, reason: string, notes: string) => {
    const alloc = getDeptAllocations().find(d => d.department === dept);
    if (!alloc) return;

    const prev     = alloc.allocatedAmount;
    const newAlloc = prev - amount;
    const allocs   = getDeptAllocations();
    const idx      = allocs.findIndex(d => d.department === dept);
    if (idx < 0) return;

    allocs[idx] = { ...allocs[idx], allocatedAmount: newAlloc, updatedAt: new Date().toISOString() };
    saveDeptAllocations(allocs);

    appendBudgetReturn({
      department:        dept,
      adminId:           user?.id ?? "",
      adminName:         user?.name ?? "",
      adminRole:         user?.role ?? "",
      previousAllocated: prev,
      returnedAmount:    amount,
      newAllocated:      newAlloc,
      reason,
      notes: notes || undefined,
    });

    appendBudgetAuditEntry({
      action:           "BUDGET_RETURNED",
      previousAmount:   prev,
      newAmount:        newAlloc,
      performedById:    user?.id ?? "",
      performedByName:  user?.name ?? "",
      performedByRole:  user?.role ?? "",
      department:       dept,
      notes:            `Returned ${fmtRs(amount)}. Reason: ${reason}${notes ? " | " + notes : ""}`,
    });

    notifyBudgetReturned(
      user?.id ?? "", user?.name ?? "", user?.role ?? "",
      dept, amount, newAlloc
    );

    reload();
    setShowReturn(false);
    showToast(`${fmtRs(amount)} returned to company pool. New dept allocation: ${fmtRs(newAlloc)}.`, "success");
  };

  const handleRequest = (amount: number, justification: string, priority: BudgetRequestPriority, notes: string) => {
    const req = appendBudgetRequest({
      department:      dept,
      adminId:         user?.id ?? "",
      adminName:       user?.name ?? "",
      adminRole:       user?.role ?? "",
      requestedAmount: amount,
      approvedAmount:  0,
      status:          "Pending",
      priority,
      justification,
      notes: notes || undefined,
    });

    appendBudgetAuditEntry({
      action:           "BUDGET_REQUEST_SUBMITTED",
      previousAmount:   deptAlloc?.allocatedAmount ?? 0,
      newAmount:        (deptAlloc?.allocatedAmount ?? 0) + amount,
      performedById:    user?.id ?? "",
      performedByName:  user?.name ?? "",
      performedByRole:  user?.role ?? "",
      department:       dept,
      notes:            `Requested ${fmtRs(amount)} — ${justification}`,
    });

    notifyBudgetRequested(
      user?.id ?? "", user?.name ?? "", user?.role ?? "",
      dept, amount, priority, req.id
    );

    reload();
    setShowRequest(false);
    showToast("Budget request submitted. The Super Admin will review it shortly.", "success");
  };

  const TABS = [
    { id: "overview",  label: "My Budget" },
    { id: "members",   label: "Team Members" },
    { id: "returns",   label: "Returns" },
    { id: "requests",  label: `Requests${myRequests.filter(r => r.status === "Pending").length > 0 ? ` (${myRequests.filter(r => r.status === "Pending").length})` : ""}` },
    { id: "audit",     label: "Activity Log" },
  ] as const;

  return (
    <div>
      <div className="flex gap-1 mb-6 p-1 bg-gray-100 dark:bg-gray-800 rounded-xl w-fit">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${tab === t.id ? "bg-white dark:bg-gray-900 text-brand-600 shadow-sm" : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── MY BUDGET TAB ──────────────────────────────────────── */}
      {tab === "overview" && (
        <div className="space-y-5">
          {deptAlloc ? (
            <>
              <div className="rounded-2xl bg-gradient-to-br from-brand-600 to-brand-400 p-6 text-white shadow-sm">
                <p className="text-sm opacity-80 mb-0.5">{dept} Department Budget</p>
                <p className="text-4xl font-bold">{fmtRs(deptAlloc.allocatedAmount)}</p>
                <p className="text-xs opacity-60 mt-2">Allocated by {deptAlloc.allocatedByName} · {new Date(deptAlloc.allocatedAt).toLocaleDateString()}</p>
              </div>

              {deptAlloc.purpose && (
                <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 shadow-sm">
                  <div className="flex items-start gap-4 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1">Budget Purpose</p>
                      <p className="text-base font-semibold text-gray-900 dark:text-white">{deptAlloc.purpose}</p>
                    </div>
                    {deptAlloc.effectiveDate && (
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1">Effective Date</p>
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{deptAlloc.effectiveDate}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-4 gap-3">
                {[
                  { label: "Assigned Budget",     value: fmtRs(deptAlloc.allocatedAmount),        color: "text-gray-900 dark:text-white",   lock: false },
                  { label: "Used / Spent",         value: fmtRs(usedTotal),                        color: "text-orange-600",                  lock: true  },
                  { label: "Distributed to Team",  value: fmtRs(memberAllocTotal),                 color: "text-brand-600",                   lock: false },
                  { label: "Remaining to Assign",  value: fmtRs(Math.max(0, availableForAlloc)),   color: availableForAlloc < 0 ? "text-red-600" : "text-green-600", lock: false },
                ].map(({ label, value, color, lock }) => (
                  <div key={label} className={`rounded-2xl border p-4 shadow-sm ${lock ? "border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-900/10" : "border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900"}`}>
                    <div className="flex items-center gap-1 mb-1">
                      <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
                      {lock && (
                        <svg className="w-3 h-3 text-red-400 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                    <p className={`mt-1 text-xl font-bold ${color}`}>{value}</p>
                  </div>
                ))}
              </div>

              <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Budget Utilization</p>
                  <span className="text-xs text-gray-400">{fmtRs(usedTotal)} spent of {fmtRs(deptAlloc.allocatedAmount)}</span>
                </div>
                <UtilBar used={usedTotal} total={deptAlloc.allocatedAmount} height="h-3" />
                <div className="grid grid-cols-3 gap-3 mt-4">
                  <div className="rounded-lg bg-orange-50 dark:bg-orange-900/20 p-3 text-center">
                    <p className="text-xs text-gray-400 mb-1">Spent (Read-Only)</p>
                    <p className="text-sm font-bold text-orange-600">{fmtRs(usedTotal)}</p>
                  </div>
                  <div className="rounded-lg bg-brand-50 dark:bg-brand-900/20 p-3 text-center">
                    <p className="text-xs text-gray-400 mb-1">In Member Hands</p>
                    <p className="text-sm font-bold text-brand-600">{fmtRs(memberAllocTotal)}</p>
                  </div>
                  <div className="rounded-lg bg-green-50 dark:bg-green-900/20 p-3 text-center">
                    <p className="text-xs text-gray-400 mb-1">Unassigned</p>
                    <p className="text-sm font-bold text-green-600">{fmtRs(Math.max(0, availableForAlloc))}</p>
                  </div>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-xs text-amber-700 dark:text-amber-300">
                You can distribute your department budget to team members. Budget amounts and purposes can only be changed by the Super Admin. Spent amounts are permanently read-only.
              </div>

              {/* Return / Request buttons */}
              <div className="flex gap-3 flex-wrap">
                <button onClick={() => setShowReturn(true)}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-pink-600 hover:bg-pink-700 rounded-xl transition-colors">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                  </svg>
                  Return Unused Budget
                </button>
                <button onClick={() => setShowRequest(true)}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-sky-600 hover:bg-sky-700 rounded-xl transition-colors">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                  Request Additional Budget
                </button>
              </div>
            </>
          ) : (
            <div className="rounded-2xl border border-yellow-200 bg-yellow-50 dark:bg-yellow-900/20 p-6 text-yellow-800 dark:text-yellow-300 text-sm">
              No budget has been allocated to your department yet. Contact the Super Admin.
            </div>
          )}
        </div>
      )}

      {/* ── TEAM MEMBERS TAB ─────────────────────────────────────── */}
      {tab === "members" && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Team Member Allocations</h3>
              <p className="text-xs text-gray-400">Minimum allowed per member = their spent amount (protected)</p>
            </div>
            {deptAlloc && (
              <button onClick={() => setShowModal(true)}
                className="px-4 py-2 text-sm font-semibold text-white bg-brand-500 hover:bg-brand-600 rounded-xl transition-colors">
                + Allocate Budget
              </button>
            )}
          </div>

          {deptAlloc && (
            <div className="grid grid-cols-4 gap-3 mb-4">
              {[
                { label: "Dept Budget",  value: fmtRs(deptAlloc.allocatedAmount),           color: "text-gray-900 dark:text-white" },
                { label: "Spent (R/O)", value: fmtRs(usedTotal),                            color: "text-orange-600" },
                { label: "Assigned",    value: fmtRs(memberAllocTotal),                      color: "text-brand-600" },
                { label: "Available",   value: fmtRs(Math.max(0, availableForAlloc)),        color: availableForAlloc < 0 ? "text-red-600" : "text-green-600" },
              ].map(({ label, value, color }) => (
                <div key={label} className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-3 shadow-sm text-center">
                  <p className="text-xs text-gray-400">{label}</p>
                  <p className={`text-base font-bold mt-0.5 ${color}`}>{value}</p>
                </div>
              ))}
            </div>
          )}

          <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
                <thead className="bg-gray-50 dark:bg-gray-800/50">
                  <tr>
                    {["Employee", "Allocated", "Used (R/O)", "Remaining", "Utilization", "Action"].map(h => (
                      <th key={h} className={`px-4 py-3 text-left text-xs font-semibold uppercase dark:text-gray-400 ${h === "Used (R/O)" ? "text-orange-500" : "text-gray-500"}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {myMembers.length === 0 ? (
                    <tr><td colSpan={6} className="py-10 text-center text-sm text-gray-400">
                      No allocations yet. Use "Allocate Budget" to assign budget to team members.
                    </td></tr>
                  ) : myMembers.map(m => (
                    <tr key={m.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors">
                      <td className="px-4 py-3">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{m.employeeName}</p>
                        <p className="text-xs text-gray-400">{m.employeeRole}</p>
                      </td>
                      <td className="px-4 py-3 text-sm font-semibold text-gray-900 dark:text-white">{fmtRs(m.allocatedAmount)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <svg className="w-3 h-3 text-red-400 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                          </svg>
                          <span className="text-sm font-semibold text-orange-600">{fmtRs(m.usedAmount)}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-green-600">{fmtRs(m.allocatedAmount - m.usedAmount)}</td>
                      <td className="px-4 py-3 w-36"><UtilBar used={m.usedAmount} total={m.allocatedAmount} /></td>
                      <td className="px-4 py-3">
                        <button onClick={() => setShowModal(true)} className="text-xs text-brand-600 hover:text-brand-800 dark:text-brand-400 font-medium">Edit</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── RETURNS TAB ────────────────────────────────────────── */}
      {tab === "returns" && (
        <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-800">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Budget Return History</h3>
            <p className="text-xs text-gray-400 mt-0.5">All budget returned to the company pool by your department.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
              <thead className="bg-gray-50 dark:bg-gray-800/50">
                <tr>
                  {["Date", "Previous Allocated", "Returned", "New Allocated", "Reason", "Notes"].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase dark:text-gray-400 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {myReturns.length === 0 ? (
                  <tr><td colSpan={6} className="py-10 text-center text-sm text-gray-400">No budget returns yet.</td></tr>
                ) : [...myReturns].sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).map(r => (
                  <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors">
                    <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{new Date(r.timestamp).toLocaleString()}</td>
                    <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300 whitespace-nowrap">{fmtRs(r.previousAllocated)}</td>
                    <td className="px-4 py-3 text-sm font-semibold text-pink-600 whitespace-nowrap">−{fmtRs(r.returnedAmount)}</td>
                    <td className="px-4 py-3 text-sm font-semibold text-gray-900 dark:text-white whitespace-nowrap">{fmtRs(r.newAllocated)}</td>
                    <td className="px-4 py-3 text-xs text-gray-600 dark:text-gray-400 max-w-xs">{r.reason}</td>
                    <td className="px-4 py-3 text-xs text-gray-400 max-w-xs truncate" title={r.notes}>{r.notes ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── REQUESTS TAB ───────────────────────────────────────── */}
      {tab === "requests" && (
        <div className="space-y-4">
          {deptAlloc && (
            <div className="flex justify-end">
              <button onClick={() => setShowRequest(true)}
                className="px-4 py-2 text-sm font-semibold text-white bg-sky-600 hover:bg-sky-700 rounded-xl">
                + New Request
              </button>
            </div>
          )}
          <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-800">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Budget Request History</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
                <thead className="bg-gray-50 dark:bg-gray-800/50">
                  <tr>
                    {["Date", "Requested", "Approved", "Priority", "Status", "Justification", "Action Notes"].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase dark:text-gray-400 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {myRequests.length === 0 ? (
                    <tr><td colSpan={7} className="py-10 text-center text-sm text-gray-400">No budget requests yet.</td></tr>
                  ) : [...myRequests].sort((a,b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()).map(req => {
                    const STATUS_COLORS: Record<BudgetRequestStatus, string> = {
                      Pending:              "bg-amber-100 text-amber-700",
                      Approved:             "bg-emerald-100 text-emerald-700",
                      Rejected:             "bg-red-100 text-red-700",
                      "Partially Approved": "bg-yellow-100 text-yellow-700",
                    };
                    return (
                      <tr key={req.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors">
                        <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{new Date(req.submittedAt).toLocaleDateString()}</td>
                        <td className="px-4 py-3 text-sm font-semibold text-sky-600 whitespace-nowrap">{fmtRs(req.requestedAmount)}</td>
                        <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300 whitespace-nowrap">
                          {req.approvedAmount > 0 ? fmtRs(req.approvedAmount) : "—"}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                            req.priority === "Critical" ? "bg-red-100 text-red-700"
                            : req.priority === "High" ? "bg-orange-100 text-orange-700"
                            : req.priority === "Medium" ? "bg-blue-100 text-blue-700"
                            : "bg-gray-100 text-gray-600"
                          }`}>{req.priority}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[req.status]}`}>{req.status}</span>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-600 dark:text-gray-400 max-w-xs truncate" title={req.justification}>{req.justification}</td>
                        <td className="px-4 py-3 text-xs text-gray-400 max-w-xs truncate" title={req.actionNotes}>{req.actionNotes ?? "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── ACTIVITY LOG TAB ────────────────────────────────────── */}
      {tab === "audit" && (
        <div>
          <p className="text-xs text-gray-400 mb-3">Showing budget activity for the <strong>{dept}</strong> department.</p>
          <AuditLogTable entries={auditLog} />
        </div>
      )}

      {showModal && deptAlloc && (
        <MemberAllocModal
          dept={dept}
          deptAllocated={deptAlloc.allocatedAmount}
          deptMemberAllocated={memberAllocTotal}
          existing={myMembers}
          members={availableMembers}
          onClose={() => setShowModal(false)}
          onSave={handleAllocate}
        />
      )}
      {showReturn && deptAlloc && (
        <ReturnBudgetModal
          dept={dept}
          allocatedAmount={deptAlloc.allocatedAmount}
          usedTotal={usedTotal}
          onClose={() => setShowReturn(false)}
          onReturn={handleReturn}
        />
      )}
      {showRequest && deptAlloc && (
        <RequestBudgetModal
          dept={dept}
          currentAllocated={deptAlloc.allocatedAmount}
          onClose={() => setShowRequest(false)}
          onRequest={handleRequest}
        />
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function BudgetManagement() {
  const { user } = useAuth();
  const role = user?.role ?? "";

  const isSA        = role === "super_admin";
  const isMgmt      = role === "management";
  const isDeptAdmin = role.endsWith("_admin") && !isSA && !isMgmt;

  return (
    <>
      <PageMeta title="Budget Management | Optivax Global" description="Company Budget Management System" />
      <PageBreadcrumb pageTitle="Budget Management" />

      {isSA || isMgmt ? (
        <SuperAdminView isSA={isSA} />
      ) : isDeptAdmin ? (
        <DeptAdminView />
      ) : (
        <div className="flex flex-col items-center justify-center py-24 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
          <div className="text-4xl mb-3">🔒</div>
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Access Restricted</p>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Contact your department admin or Super Admin for budget information.</p>
        </div>
      )}
    </>
  );
}
