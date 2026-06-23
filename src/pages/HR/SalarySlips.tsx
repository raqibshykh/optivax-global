import { useState, useEffect, useMemo } from "react";
import PageMeta from "../../components/common/PageMeta";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import { useAuth } from "../../context/AuthContext";
import { UserService, type UserProfile } from "../../services/userService";
import {
  getSalarySlips, saveSalarySlips, appendSalarySlip, printSalarySlip,
  computeGross, computeDeductions, computeNet,
  type SalarySlip, type PayrollItem,
} from "../../mock/payrollData";
import { useToast } from "../../context/ToastContext";

// ── Helpers ────────────────────────────────────────────────────────────────────

const fmtRs = (n: number) => `Rs. ${Math.round(n).toLocaleString()}`;

const MONTHS: { value: string; label: string }[] = (() => {
  const out: { value: string; label: string }[] = [];
  const d = new Date(2026, 0, 1); // Jan 2026
  for (let i = 0; i < 12; i++) {
    const v = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    out.push({ value: v, label: d.toLocaleString("default", { month: "long", year: "numeric" }) });
    d.setMonth(d.getMonth() + 1);
  }
  return out;
})();

const DEPT_COLOR: Record<string, string> = {
  Sales: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  Marketing: "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400",
  Production: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  HR: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400",
};

const inputCls = "w-full rounded-lg border border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-white px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:border-transparent";

// ── Item editor (used for allowances / bonuses / deductions) ──────────────────

function ItemList({ items, onChange, label }: {
  items: PayrollItem[]; onChange: (v: PayrollItem[]) => void; label: string;
}) {
  const add = () => onChange([...items, { label: "", amount: 0 }]);
  const remove = (i: number) => onChange(items.filter((_, idx) => idx !== i));
  const update = (i: number, field: "label" | "amount", val: string) => {
    const updated = items.map((item, idx) =>
      idx !== i ? item : { ...item, [field]: field === "amount" ? (parseFloat(val) || 0) : val }
    );
    onChange(updated);
  };
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-gray-600 dark:text-gray-400">{label}</span>
        <button type="button" onClick={add} className="text-xs text-brand-600 dark:text-brand-400 hover:underline">+ Add</button>
      </div>
      {items.length === 0 && <p className="text-xs text-gray-400 italic">None</p>}
      {items.map((item, i) => (
        <div key={i} className="flex gap-2">
          <input className={inputCls} placeholder="Label" value={item.label}
            onChange={e => update(i, "label", e.target.value)} />
          <input type="number" className={`${inputCls} w-28`} placeholder="Amount" value={item.amount || ""}
            onChange={e => update(i, "amount", e.target.value)} />
          <button type="button" onClick={() => remove(i)} className="text-red-400 hover:text-red-600 px-1 flex-shrink-0">×</button>
        </div>
      ))}
    </div>
  );
}

// ── View modal ────────────────────────────────────────────────────────────────

function SlipViewModal({ slip, onClose }: { slip: SalarySlip; onClose: () => void }) {
  const monthLabel = new Date(slip.salaryMonth + "-01").toLocaleString("default", { month: "long", year: "numeric" });

  const Row = ({ label, value, accent }: { label: string; value: string; accent?: string }) => (
    <div className="flex justify-between py-1.5 border-b border-gray-100 dark:border-gray-800 last:border-0">
      <span className="text-sm text-gray-600 dark:text-gray-400">{label}</span>
      <span className={`text-sm font-medium ${accent ?? "text-gray-900 dark:text-white"}`}>{value}</span>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-xl rounded-2xl bg-white dark:bg-gray-900 shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-brand-600 text-white px-6 py-4 rounded-t-2xl flex-shrink-0 flex items-start justify-between">
          <div>
            <p className="text-xs opacity-75 uppercase tracking-wide">Optivax Global — Salary Slip</p>
            <h3 className="text-lg font-bold mt-0.5">{slip.employeeName}</h3>
            <p className="text-sm opacity-80">{monthLabel}</p>
          </div>
          <button onClick={onClose} className="text-white opacity-70 hover:opacity-100 text-2xl leading-none ml-4">×</button>
        </div>

        <div className="overflow-y-auto flex-1 p-6 space-y-4">
          {/* Employee info */}
          <div className="grid grid-cols-2 gap-3 p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50 text-sm">
            <div><span className="text-xs text-gray-400 block">Employee ID</span><span className="font-medium">{slip.employeeId}</span></div>
            <div><span className="text-xs text-gray-400 block">Department</span><span className="font-medium">{slip.department}</span></div>
            <div><span className="text-xs text-gray-400 block">Designation</span><span className="font-medium">{slip.designation}</span></div>
            <div><span className="text-xs text-gray-400 block">Email</span><span className="font-medium text-xs">{slip.employeeEmail}</span></div>
          </div>

          {/* Earnings */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">Earnings</p>
            <Row label="Basic Salary" value={fmtRs(slip.basicSalary)} />
            {slip.allowances.map(a => <Row key={a.label} label={a.label} value={fmtRs(a.amount)} />)}
            {slip.bonuses.map(b => <Row key={b.label} label={b.label} value={`+${fmtRs(b.amount)}`} accent="text-green-600 dark:text-green-400" />)}
            {slip.overtime > 0 && <Row label="Overtime" value={`+${fmtRs(slip.overtime)}`} accent="text-green-600 dark:text-green-400" />}
            <div className="flex justify-between py-2 mt-1 border-t-2 border-gray-200 dark:border-gray-700">
              <span className="font-semibold text-sm text-gray-800 dark:text-gray-200">Gross Salary</span>
              <span className="font-bold text-sm text-gray-900 dark:text-white">{fmtRs(slip.grossSalary)}</span>
            </div>
          </div>

          {/* Deductions */}
          {(slip.deductions.length > 0 || slip.advanceSalaryDeduction > 0) && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">Deductions</p>
              {slip.deductions.map(d => <Row key={d.label} label={d.label} value={`−${fmtRs(d.amount)}`} accent="text-red-600 dark:text-red-400" />)}
              {slip.advanceSalaryDeduction > 0 && (
                <Row label="Advance Salary Recovery" value={`−${fmtRs(slip.advanceSalaryDeduction)}`} accent="text-red-600 dark:text-red-400" />
              )}
              <div className="flex justify-between py-2 mt-1 border-t-2 border-gray-200 dark:border-gray-700">
                <span className="font-semibold text-sm text-gray-800 dark:text-gray-200">Total Deductions</span>
                <span className="font-bold text-sm text-red-600">−{fmtRs(slip.totalDeductions)}</span>
              </div>
            </div>
          )}

          {/* Net */}
          <div className="rounded-xl bg-brand-600 text-white px-5 py-4 flex justify-between items-center">
            <span className="text-sm font-semibold">NET SALARY</span>
            <span className="text-xl font-bold">{fmtRs(slip.netSalary)}</span>
          </div>

          {slip.notes && (
            <div className="p-3 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 text-xs text-yellow-800 dark:text-yellow-300">
              <strong>Note:</strong> {slip.notes}
            </div>
          )}

          <p className="text-xs text-gray-400 text-center">Generated by {slip.generatedByName} on {new Date(slip.generatedAt).toLocaleDateString()}</p>
        </div>

        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-800 flex justify-end gap-3 flex-shrink-0">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors">Close</button>
          <button onClick={() => printSalarySlip(slip)} className="px-4 py-2 text-sm font-semibold text-white bg-brand-500 hover:bg-brand-600 rounded-lg transition-colors">Print / Download PDF</button>
        </div>
      </div>
    </div>
  );
}

// ── Generate Slip Modal ───────────────────────────────────────────────────────

function GenerateSlipModal({
  employees, onClose, onGenerate,
}: {
  employees: UserProfile[];
  onClose: () => void;
  onGenerate: (slip: SalarySlip) => void;
}) {
  const { user } = useAuth();

  const [empId, setEmpId] = useState("");
  const [month, setMonth] = useState(MONTHS[MONTHS.length - 1]?.value ?? "");
  const [basicSalary, setBasicSalary] = useState("");
  const [allowances, setAllowances] = useState<PayrollItem[]>([
    { label: "House Rent Allowance", amount: 0 },
    { label: "Transport Allowance", amount: 0 },
  ]);
  const [bonuses, setBonuses] = useState<PayrollItem[]>([]);
  const [overtime, setOvertime] = useState("0");
  const [deductions, setDeductions] = useState<PayrollItem[]>([
    { label: "Income Tax", amount: 0 },
    { label: "Provident Fund", amount: 0 },
  ]);
  const [advanceDeduction, setAdvanceDeduction] = useState("0");
  const [designation, setDesignation] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");

  const selectedEmp = employees.find(e => e.id === empId);
  const basic = parseFloat(basicSalary) || 0;
  const ot    = parseFloat(overtime) || 0;
  const adv   = parseFloat(advanceDeduction) || 0;
  const grossCalc = basic + allowances.reduce((s, i) => s + i.amount, 0) + bonuses.reduce((s, i) => s + i.amount, 0) + ot;
  const dedCalc   = deductions.reduce((s, i) => s + i.amount, 0) + adv;
  const netCalc   = grossCalc - dedCalc;

  const getDeptFromRole = (role: string) => {
    if (role.startsWith("sales")) return "Sales";
    if (role.startsWith("production")) return "Production";
    if (role.startsWith("marketing")) return "Marketing";
    if (role.startsWith("hr")) return "HR";
    if (role.startsWith("it")) return "IT Support";
    if (role === "management") return "Management";
    return "General";
  };

  const handleGenerate = () => {
    if (!empId) { setError("Select an employee."); return; }
    if (!month) { setError("Select a salary month."); return; }
    if (basic <= 0) { setError("Basic salary must be greater than zero."); return; }
    if (!selectedEmp) { setError("Employee not found."); return; }

    const dept = getDeptFromRole(selectedEmp.role ?? "");
    const slip: SalarySlip = {
      id: `slip-${Date.now()}`,
      employeeId: empId,
      employeeName: selectedEmp.full_name || selectedEmp.email,
      employeeEmail: selectedEmp.email,
      department: dept,
      designation: designation.trim() || (selectedEmp.role ?? "Employee"),
      salaryMonth: month,
      basicSalary: basic,
      allowances: allowances.filter(i => i.label && i.amount > 0),
      bonuses: bonuses.filter(i => i.label && i.amount > 0),
      overtime: ot,
      deductions: deductions.filter(i => i.label && i.amount > 0),
      advanceSalaryDeduction: adv,
      grossSalary: grossCalc,
      totalDeductions: dedCalc,
      netSalary: Math.max(0, netCalc),
      generatedAt: new Date().toISOString(),
      generatedById: user?.id ?? "",
      generatedByName: user?.name ?? "",
      generatedByRole: user?.role ?? "",
      notes: notes.trim() || undefined,
    };
    onGenerate(slip);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-2xl rounded-2xl bg-white dark:bg-gray-900 shadow-2xl flex flex-col max-h-[92vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800 flex-shrink-0">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white">Generate Salary Slip</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-2xl leading-none">×</button>
        </div>

        <div className="overflow-y-auto flex-1 p-6 space-y-5">
          {/* Employee + Month */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Employee *</label>
              <select className={inputCls} value={empId} onChange={e => setEmpId(e.target.value)}>
                <option value="">— Select —</option>
                {employees.map(e => (
                  <option key={e.id} value={e.id}>{e.full_name || e.email} ({e.role})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Salary Month *</label>
              <select className={inputCls} value={month} onChange={e => setMonth(e.target.value)}>
                {MONTHS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Basic Salary (Rs.) *</label>
              <input type="number" min="0" className={inputCls} placeholder="e.g. 45000" value={basicSalary}
                onChange={e => setBasicSalary(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Designation</label>
              <input className={inputCls} placeholder="e.g. Sales Executive" value={designation}
                onChange={e => setDesignation(e.target.value)} />
            </div>
          </div>

          {/* Allowances */}
          <ItemList items={allowances} onChange={setAllowances} label="Allowances" />

          {/* Bonuses */}
          <ItemList items={bonuses} onChange={setBonuses} label="Bonuses" />

          {/* Overtime */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Overtime Amount (Rs.)</label>
            <input type="number" min="0" className={inputCls} value={overtime}
              onChange={e => setOvertime(e.target.value)} />
          </div>

          {/* Deductions */}
          <ItemList items={deductions} onChange={setDeductions} label="Deductions" />

          {/* Advance Salary Deduction */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Advance Salary Recovery (Rs.)</label>
            <input type="number" min="0" className={inputCls} value={advanceDeduction}
              onChange={e => setAdvanceDeduction(e.target.value)} />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes (optional)</label>
            <textarea rows={2} className={inputCls} value={notes} onChange={e => setNotes(e.target.value)} />
          </div>

          {/* Live preview totals */}
          <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50 grid grid-cols-3 gap-3 text-center">
            <div><p className="text-xs text-gray-400">Gross</p><p className="text-lg font-bold text-gray-900 dark:text-white">{fmtRs(grossCalc)}</p></div>
            <div><p className="text-xs text-gray-400">Deductions</p><p className="text-lg font-bold text-red-600">−{fmtRs(dedCalc)}</p></div>
            <div><p className="text-xs text-gray-400">Net Salary</p><p className="text-lg font-bold text-brand-600 dark:text-brand-400">{fmtRs(Math.max(0, netCalc))}</p></div>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>

        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-800 flex justify-end gap-3 flex-shrink-0">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors">Cancel</button>
          <button onClick={handleGenerate} className="px-4 py-2 text-sm font-semibold text-white bg-brand-500 hover:bg-brand-600 rounded-lg transition-colors">Generate Slip</button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function SalarySlips() {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [slips, setSlips] = useState<SalarySlip[]>([]);
  const [employees, setEmployees] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch]         = useState("");
  const [filterMonth, setFilterMonth] = useState("all");
  const [filterDept, setFilterDept]   = useState("all");

  // Modals
  const [generating, setGenerating] = useState(false);
  const [viewing, setViewing]       = useState<SalarySlip | null>(null);

  // Determine if current user is an admin/approver
  const isAdminView = ["super_admin", "management", "hr_admin"].includes(user?.role ?? "");
  const isITUser    = (user?.role ?? "").startsWith("it_");

  useEffect(() => {
    const data = getSalarySlips();
    setSlips(data);
    if (isAdminView) {
      UserService.getAll()
        .then(all => setEmployees(all.filter(u => u.role !== "client")))
        .catch(() => {})
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [isAdminView]);

  const visibleSlips = useMemo(() => {
    let list = isAdminView ? slips : slips.filter(s => s.employeeId === user?.id);
    if (filterMonth !== "all") list = list.filter(s => s.salaryMonth === filterMonth);
    if (filterDept !== "all" && isAdminView) list = list.filter(s => s.department === filterDept);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(s =>
        s.employeeName.toLowerCase().includes(q) ||
        s.employeeEmail.toLowerCase().includes(q) ||
        s.department.toLowerCase().includes(q)
      );
    }
    return list.sort((a, b) => b.salaryMonth.localeCompare(a.salaryMonth));
  }, [slips, filterMonth, filterDept, search, isAdminView, user?.id]);

  const handleGenerate = (slip: SalarySlip) => {
    appendSalarySlip(slip);
    setSlips(getSalarySlips());
    setGenerating(false);
    showToast(`Salary slip generated for ${slip.employeeName}`, "success");
  };

  const handleDelete = (id: string) => {
    if (!confirm("Delete this salary slip? This cannot be undone.")) return;
    const updated = slips.filter(s => s.id !== id);
    saveSalarySlips(updated);
    setSlips(updated);
    showToast("Salary slip deleted", "info");
  };

  const departments = useMemo(() => [...new Set(slips.map(s => s.department))].sort(), [slips]);

  if (isITUser) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <PageMeta title="Access Denied" description="" />
        <div className="text-center p-8 rounded-2xl border border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800">
          <p className="text-lg font-semibold text-red-700 dark:text-red-400">Access Denied</p>
          <p className="text-sm text-red-600 dark:text-red-300 mt-2">IT Support does not have access to salary information.</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <PageMeta title="Salary Slips | Optivax Global" description="Salary slip management" />
      <PageBreadcrumb pageTitle="Salary Slips" />

      {/* ── KPI strip (admin only) ──────────────────────────────────────── */}
      {isAdminView && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[
            { label: "Total Slips",   value: slips.length,                                              color: "text-gray-900 dark:text-white" },
            { label: "This Month",    value: slips.filter(s => s.salaryMonth === new Date().toISOString().slice(0,7)).length, color: "text-blue-600" },
            { label: "Total Net (This Month)", value: fmtRs(slips.filter(s => s.salaryMonth === new Date().toISOString().slice(0,7)).reduce((a,s)=>a+s.netSalary,0)), color: "text-brand-600" },
            { label: "Employees Covered", value: new Set(slips.map(s => s.employeeId)).size,            color: "text-green-600" },
          ].map(({ label, value, color }) => (
            <div key={label} className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900 p-4 shadow-sm">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400">{label}</p>
              <p className={`mt-1 text-xl font-bold ${color}`}>{value}</p>
            </div>
          ))}
        </div>
      )}

      {/* ── Toolbar ──────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <input type="text" value={search} onChange={e => setSearch(e.target.value)}
          placeholder={isAdminView ? "Search employee…" : "Search slips…"}
          className="flex-1 min-w-[160px] rounded-lg border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white px-3 py-1.5 text-sm focus:ring-2 focus:ring-brand-500 focus:border-transparent" />
        <select value={filterMonth} onChange={e => setFilterMonth(e.target.value)}
          className="rounded-lg border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white px-3 py-1.5 text-sm focus:ring-2 focus:ring-brand-500 focus:border-transparent">
          <option value="all">All Months</option>
          {MONTHS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
        </select>
        {isAdminView && (
          <select value={filterDept} onChange={e => setFilterDept(e.target.value)}
            className="rounded-lg border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white px-3 py-1.5 text-sm focus:ring-2 focus:ring-brand-500 focus:border-transparent">
            <option value="all">All Departments</option>
            {departments.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        )}
        {isAdminView && (
          <button onClick={() => setGenerating(true)}
            className="ml-auto px-4 py-2 text-sm font-semibold text-white bg-brand-500 hover:bg-brand-600 rounded-xl transition-colors whitespace-nowrap">
            + Generate Slip
          </button>
        )}
      </div>

      {/* ── Table ────────────────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900 overflow-hidden">
        {loading ? (
          <div className="flex justify-center p-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-800/60">
                <tr>
                  {[
                    "Employee", "Department", "Month",
                    "Basic", "Gross", "Deductions", "Net Salary",
                    "Generated", "Actions",
                  ].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {visibleSlips.length === 0 ? (
                  <tr><td colSpan={9} className="px-4 py-10 text-center text-sm text-gray-400">
                    {isAdminView ? "No salary slips found." : "No salary slips have been generated for you yet."}
                  </td></tr>
                ) : visibleSlips.map(slip => (
                  <tr key={slip.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{slip.employeeName}</p>
                      <p className="text-xs text-gray-400">{slip.employeeEmail}</p>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${DEPT_COLOR[slip.department] ?? "bg-gray-100 text-gray-600"}`}>
                        {slip.department}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                      {new Date(slip.salaryMonth + "-01").toLocaleString("default", { month: "short", year: "numeric" })}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">{fmtRs(slip.basicSalary)}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-blue-600 dark:text-blue-400">{fmtRs(computeGross(slip))}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-red-600 dark:text-red-400">−{fmtRs(computeDeductions(slip))}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="text-sm font-bold text-brand-600 dark:text-brand-400">{fmtRs(computeNet(slip))}</span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-400">
                      <p>{new Date(slip.generatedAt).toLocaleDateString()}</p>
                      {isAdminView && <p>{slip.generatedByName}</p>}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex gap-2">
                        <button onClick={() => setViewing(slip)}
                          className="text-xs px-2 py-1 rounded bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors">
                          View
                        </button>
                        <button onClick={() => printSalarySlip(slip)}
                          className="text-xs px-2 py-1 rounded bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/40 transition-colors">
                          Print
                        </button>
                        {isAdminView && (
                          <button onClick={() => handleDelete(slip.id)}
                            className="text-xs px-2 py-1 rounded bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors">
                            Delete
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modals */}
      {generating && (
        <GenerateSlipModal
          employees={employees}
          onClose={() => setGenerating(false)}
          onGenerate={handleGenerate}
        />
      )}
      {viewing && <SlipViewModal slip={viewing} onClose={() => setViewing(null)} />}
    </>
  );
}
