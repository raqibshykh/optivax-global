import { useState, useEffect, useMemo } from "react";
import PageMeta from "../../components/common/PageMeta";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import { useAuth } from "../../context/AuthContext";
import { getSalarySlips, printSalarySlip, computeGross, computeDeductions, computeNet, type SalarySlip } from "../../mock/payrollData";

const fmtRs = (n: number) => `Rs. ${Math.round(n).toLocaleString()}`;

const MONTHS: { value: string; label: string }[] = (() => {
  const out: { value: string; label: string }[] = [];
  const d = new Date(2026, 0, 1);
  for (let i = 0; i < 12; i++) {
    const v = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    out.push({ value: v, label: d.toLocaleString("default", { month: "long", year: "numeric" }) });
    d.setMonth(d.getMonth() + 1);
  }
  return out;
})();

function SlipCard({ slip, onPrint, onView }: {
  slip: SalarySlip;
  onPrint: () => void;
  onView: () => void;
}) {
  const monthLabel = new Date(slip.salaryMonth + "-01").toLocaleString("default", { month: "long", year: "numeric" });
  return (
    <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900 p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-sm font-semibold text-gray-900 dark:text-white">{monthLabel}</p>
          <p className="text-xs text-gray-400 mt-0.5">{slip.department} · {slip.designation}</p>
        </div>
        <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 font-medium">Issued</span>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="text-center p-2 rounded-lg bg-gray-50 dark:bg-gray-800/50">
          <p className="text-xs text-gray-400">Basic</p>
          <p className="text-sm font-semibold text-gray-900 dark:text-white">{fmtRs(slip.basicSalary)}</p>
        </div>
        <div className="text-center p-2 rounded-lg bg-red-50 dark:bg-red-900/20">
          <p className="text-xs text-gray-400">Deductions</p>
          <p className="text-sm font-semibold text-red-600 dark:text-red-400">−{fmtRs(computeDeductions(slip))}</p>
        </div>
        <div className="text-center p-2 rounded-lg bg-brand-50 dark:bg-brand-900/20">
          <p className="text-xs text-gray-400">Net</p>
          <p className="text-sm font-bold text-brand-600 dark:text-brand-400">{fmtRs(computeNet(slip))}</p>
        </div>
      </div>

      <p className="text-xs text-gray-400 mb-3">
        Generated on {new Date(slip.generatedAt).toLocaleDateString()} by {slip.generatedByName}
      </p>

      <div className="flex gap-2">
        <button onClick={onView}
          className="flex-1 text-sm font-medium py-1.5 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors">
          View Details
        </button>
        <button onClick={onPrint}
          className="flex-1 text-sm font-medium py-1.5 rounded-lg bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/40 transition-colors">
          Print / PDF
        </button>
      </div>
    </div>
  );
}

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
        <div className="bg-brand-600 text-white px-6 py-4 rounded-t-2xl flex-shrink-0 flex items-start justify-between">
          <div>
            <p className="text-xs opacity-75 uppercase tracking-wide">Optivax Global — Salary Slip</p>
            <h3 className="text-lg font-bold mt-0.5">{slip.employeeName}</h3>
            <p className="text-sm opacity-80">{monthLabel} · {slip.department}</p>
          </div>
          <button onClick={onClose} className="text-white opacity-70 hover:opacity-100 text-2xl leading-none ml-4">×</button>
        </div>

        <div className="overflow-y-auto flex-1 p-6 space-y-4">
          <div className="grid grid-cols-2 gap-3 p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50 text-sm">
            <div><span className="text-xs text-gray-400 block">Employee ID</span><span className="font-medium">{slip.employeeId}</span></div>
            <div><span className="text-xs text-gray-400 block">Designation</span><span className="font-medium">{slip.designation}</span></div>
            <div><span className="text-xs text-gray-400 block">Department</span><span className="font-medium">{slip.department}</span></div>
            <div><span className="text-xs text-gray-400 block">Salary Month</span><span className="font-medium">{monthLabel}</span></div>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">Earnings</p>
            <Row label="Basic Salary" value={fmtRs(slip.basicSalary)} />
            {slip.allowances.map(a => <Row key={a.label} label={a.label} value={fmtRs(a.amount)} />)}
            {slip.bonuses.map(b => <Row key={b.label} label={b.label} value={`+${fmtRs(b.amount)}`} accent="text-green-600 dark:text-green-400" />)}
            {slip.overtime > 0 && <Row label="Overtime" value={`+${fmtRs(slip.overtime)}`} accent="text-green-600 dark:text-green-400" />}
            <div className="flex justify-between py-2 mt-1 border-t-2 border-gray-200 dark:border-gray-700">
              <span className="font-semibold text-sm">Gross Salary</span>
              <span className="font-bold text-sm text-gray-900 dark:text-white">{fmtRs(computeGross(slip))}</span>
            </div>
          </div>

          {(slip.deductions.length > 0 || slip.advanceSalaryDeduction > 0) && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">Deductions</p>
              {slip.deductions.map(d => <Row key={d.label} label={d.label} value={`−${fmtRs(d.amount)}`} accent="text-red-600 dark:text-red-400" />)}
              {slip.advanceSalaryDeduction > 0 && (
                <Row label="Advance Salary Recovery" value={`−${fmtRs(slip.advanceSalaryDeduction)}`} accent="text-red-600 dark:text-red-400" />
              )}
              <div className="flex justify-between py-2 mt-1 border-t-2 border-gray-200 dark:border-gray-700">
                <span className="font-semibold text-sm">Total Deductions</span>
                <span className="font-bold text-sm text-red-600">−{fmtRs(computeDeductions(slip))}</span>
              </div>
            </div>
          )}

          <div className="rounded-xl bg-brand-600 text-white px-5 py-4 flex justify-between items-center">
            <span className="text-sm font-semibold">NET SALARY</span>
            <span className="text-xl font-bold">{fmtRs(computeNet(slip))}</span>
          </div>

          {slip.notes && (
            <div className="p-3 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 text-xs text-yellow-800 dark:text-yellow-300">
              <strong>Note:</strong> {slip.notes}
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-800 flex justify-end gap-3 flex-shrink-0">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors">Close</button>
          <button onClick={() => printSalarySlip(slip)} className="px-4 py-2 text-sm font-semibold text-white bg-brand-500 hover:bg-brand-600 rounded-lg transition-colors">Print / Download PDF</button>
        </div>
      </div>
    </div>
  );
}

export default function MySalarySlips() {
  const { user } = useAuth();
  const isITUser = (user?.role ?? "").startsWith("it_");

  const [slips, setSlips]       = useState<SalarySlip[]>([]);
  const [filterMonth, setFilter] = useState("all");
  const [viewing, setViewing]    = useState<SalarySlip | null>(null);

  useEffect(() => {
    const all = getSalarySlips();
    setSlips(all.filter(s => s.employeeId === user?.id));
  }, [user?.id]);

  const filtered = useMemo(() =>
    filterMonth === "all" ? slips : slips.filter(s => s.salaryMonth === filterMonth),
    [slips, filterMonth]
  );

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
      <PageMeta title="My Salary Slips | Optivax Global" description="View and download your salary slips" />
      <PageBreadcrumb pageTitle="My Salary Slips" />

      {/* Summary */}
      {slips.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          {[
            { label: "Total Slips",      value: slips.length,                                               color: "text-gray-900 dark:text-white" },
            { label: "Latest Net Salary", value: fmtRs(slips.sort((a,b) => b.salaryMonth.localeCompare(a.salaryMonth))[0]?.netSalary ?? 0), color: "text-brand-600 dark:text-brand-400" },
            { label: "YTD Net Paid",     value: fmtRs(slips.reduce((s, sl) => s + sl.netSalary, 0)),        color: "text-green-600" },
          ].map(({ label, value, color }) => (
            <div key={label} className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900 p-4 shadow-sm">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400">{label}</p>
              <p className={`mt-1 text-xl font-bold ${color}`}>{value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Filter */}
      <div className="flex items-center gap-3 mb-4">
        <select value={filterMonth} onChange={e => setFilter(e.target.value)}
          className="rounded-lg border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white px-3 py-1.5 text-sm focus:ring-2 focus:ring-brand-500 focus:border-transparent">
          <option value="all">All Months</option>
          {MONTHS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
        </select>
        <span className="text-sm text-gray-500 dark:text-gray-400">{filtered.length} slip{filtered.length !== 1 ? "s" : ""}</span>
      </div>

      {/* Slips */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
          <div className="text-4xl mb-3">📄</div>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {slips.length === 0 ? "No salary slips have been issued for you yet." : "No slips match the selected month."}
          </p>
          <p className="text-xs text-gray-400 mt-1">Salary slips are generated by HR after payroll processing.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...filtered].sort((a, b) => b.salaryMonth.localeCompare(a.salaryMonth)).map(slip => (
            <SlipCard
              key={slip.id}
              slip={slip}
              onPrint={() => printSalarySlip(slip)}
              onView={() => setViewing(slip)}
            />
          ))}
        </div>
      )}

      {viewing && <SlipViewModal slip={viewing} onClose={() => setViewing(null)} />}
    </>
  );
}
