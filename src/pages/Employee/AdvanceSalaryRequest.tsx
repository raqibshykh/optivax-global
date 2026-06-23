import { useState, useEffect, useMemo } from "react";
import PageMeta from "../../components/common/PageMeta";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import { useAuth } from "../../context/AuthContext";
import {
  getAdvanceRequests, saveAdvanceRequests,
  type AdvanceSalaryRequest, type AdvanceStatus,
} from "../../mock/payrollData";
import { useToast } from "../../context/ToastContext";

// ── Helpers ───────────────────────────────────────────────────────────────────

const fmtRs = (n: number) => `Rs. ${Math.round(n).toLocaleString()}`;

const STATUS_COLOR: Record<AdvanceStatus, string> = {
  pending:  "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  approved: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  rejected: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  paid:     "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
};

const STATUS_ICON: Record<AdvanceStatus, string> = {
  pending:  "⏳",
  approved: "✅",
  rejected: "❌",
  paid:     "💰",
};

const inputCls = "w-full rounded-lg border border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-white px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:border-transparent";

const getDeptFromRole = (role: string) => {
  if (role.startsWith("sales")) return "Sales";
  if (role.startsWith("production")) return "Production";
  if (role.startsWith("marketing")) return "Marketing";
  if (role.startsWith("hr")) return "HR";
  if (role.startsWith("it")) return "IT Support";
  if (role === "management") return "Management";
  if (role === "super_admin") return "Administration";
  return "General";
};

// ── New Request Modal ─────────────────────────────────────────────────────────

function NewRequestModal({ onClose, onSubmit }: {
  onClose: () => void;
  onSubmit: (amount: number, reason: string) => void;
}) {
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError]   = useState("");

  const handleSubmit = () => {
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) { setError("Please enter a valid amount greater than zero."); return; }
    if (!reason.trim() || reason.trim().length < 10) { setError("Please provide a reason (at least 10 characters)."); return; }
    onSubmit(amt, reason.trim());
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white dark:bg-gray-900 shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white">New Advance Salary Request</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
        </div>

        <div className="p-6 space-y-4">
          <div className="p-4 rounded-xl bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 text-sm text-yellow-800 dark:text-yellow-300">
            Advance salary requests are reviewed by HR, Management, or Super Admin. You will be notified once a decision is made.
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Requested Amount (Rs.) *</label>
            <input type="number" min="1000" step="500" className={inputCls}
              placeholder="e.g. 15000"
              value={amount} onChange={e => setAmount(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Reason for Advance *</label>
            <textarea rows={4} className={inputCls}
              placeholder="Please provide a detailed reason for your advance salary request (minimum 10 characters)…"
              value={reason} onChange={e => setReason(e.target.value)} />
            <p className="text-xs text-gray-400 mt-1">{reason.length} / 10 minimum characters</p>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>

        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-800 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors">Cancel</button>
          <button onClick={handleSubmit} className="px-4 py-2 text-sm font-semibold text-white bg-brand-500 hover:bg-brand-600 rounded-lg transition-colors">Submit Request</button>
        </div>
      </div>
    </div>
  );
}

// ── Request Detail Card ───────────────────────────────────────────────────────

function RequestCard({ req }: { req: AdvanceSalaryRequest }) {
  return (
    <div className={`rounded-2xl border p-5 ${
      req.status === "pending"  ? "border-yellow-200 bg-yellow-50/50 dark:border-yellow-800 dark:bg-yellow-900/10" :
      req.status === "approved" ? "border-green-200 bg-green-50/50 dark:border-green-800 dark:bg-green-900/10" :
      req.status === "rejected" ? "border-red-200 bg-red-50/50 dark:border-red-800 dark:bg-red-900/10" :
                                  "border-blue-200 bg-blue-50/50 dark:border-blue-800 dark:bg-blue-900/10"
    }`}>
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-lg">{STATUS_ICON[req.status]}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLOR[req.status]}`}>
              {req.status.charAt(0).toUpperCase() + req.status.slice(1)}
            </span>
          </div>
          <p className="text-xl font-bold text-gray-900 dark:text-white mt-2">{fmtRs(req.requestedAmount)}</p>
        </div>
        <p className="text-xs text-gray-400">{new Date(req.requestDate).toLocaleDateString()}</p>
      </div>

      <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">{req.reason}</p>

      {req.approvedByName && (
        <div className="pt-3 border-t border-gray-200 dark:border-gray-700 space-y-1">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {req.status === "rejected" ? "Rejected" : req.status === "paid" ? "Marked paid" : "Approved"} by {req.approvedByName}
            {req.approvedAt && ` on ${new Date(req.approvedAt).toLocaleDateString()}`}
          </p>
          {req.rejectionReason && (
            <p className="text-xs text-red-600 dark:text-red-400 italic">"{req.rejectionReason}"</p>
          )}
          {req.notes && req.status !== "rejected" && (
            <p className="text-xs text-gray-500 dark:text-gray-400 italic">Note: {req.notes}</p>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function AdvanceSalaryRequest() {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [requests, setRequests]     = useState<AdvanceSalaryRequest[]>([]);
  const [showNew, setShowNew]       = useState(false);
  const [filterStatus, setFilter]   = useState<AdvanceStatus | "all">("all");

  useEffect(() => {
    const all = getAdvanceRequests();
    setRequests(all.filter(r => r.employeeId === user?.id));
  }, [user?.id]);

  const myVisible = useMemo(() =>
    filterStatus === "all" ? requests : requests.filter(r => r.status === filterStatus),
    [requests, filterStatus]
  );

  const hasPending  = requests.some(r => r.status === "pending");
  const isITUser    = (user?.role ?? "").startsWith("it_");

  if (isITUser) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <PageMeta title="Access Denied" description="" />
        <div className="text-center p-8 rounded-2xl border border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800">
          <p className="text-lg font-semibold text-red-700 dark:text-red-400">Access Denied</p>
          <p className="text-sm text-red-600 dark:text-red-300 mt-2">IT Support does not have access to advance salary requests.</p>
        </div>
      </div>
    );
  }

  const handleSubmit = (amount: number, reason: string) => {
    const dept = getDeptFromRole(user?.role ?? "");
    const newReq: AdvanceSalaryRequest = {
      id: `adv-${Date.now()}`,
      employeeId:      user?.id ?? "",
      employeeName:    user?.name ?? "",
      employeeRole:    user?.role ?? "",
      department:      dept,
      requestedAmount: amount,
      reason,
      requestDate: new Date().toISOString(),
      status:      "pending",
    };

    const all = getAdvanceRequests();
    saveAdvanceRequests([...all, newReq]);
    setRequests(prev => [newReq, ...prev]);
    setShowNew(false);
    showToast("Advance salary request submitted. HR will review it shortly.", "success");
  };

  const pending  = requests.filter(r => r.status === "pending");
  const approved = requests.filter(r => r.status === "approved");

  return (
    <>
      <PageMeta title="Advance Salary | Optivax Global" description="Submit and track advance salary requests" />
      <PageBreadcrumb pageTitle="Advance Salary" />

      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Total Requests",  value: requests.length,  color: "text-gray-900 dark:text-white" },
          { label: "Pending",         value: pending.length,   color: "text-yellow-600" },
          { label: "Approved",        value: approved.length,  color: "text-green-600" },
          { label: "Total Requested", value: fmtRs(requests.reduce((s,r)=>s+r.requestedAmount,0)), color: "text-brand-600" },
        ].map(({ label, value, color }) => (
          <div key={label} className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900 p-4 shadow-sm">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400">{label}</p>
            <p className={`mt-1 text-xl font-bold ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Header + action */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <select value={filterStatus} onChange={e => setFilter(e.target.value as AdvanceStatus | "all")}
            className="rounded-lg border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white px-3 py-1.5 text-sm focus:ring-2 focus:ring-brand-500 focus:border-transparent">
            <option value="all">All Statuses</option>
            {(["pending","approved","rejected","paid"] as AdvanceStatus[]).map(s =>
              <option key={s} value={s}>{s.charAt(0).toUpperCase()+s.slice(1)}</option>
            )}
          </select>
        </div>
        <button
          onClick={() => {
            if (hasPending) {
              showToast("You already have a pending request. Please wait for a response before submitting another.", "error");
              return;
            }
            setShowNew(true);
          }}
          className="px-4 py-2 text-sm font-semibold text-white bg-brand-500 hover:bg-brand-600 rounded-xl transition-colors"
        >
          + New Request
        </button>
      </div>

      {hasPending && (
        <div className="mb-4 p-3 rounded-xl bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 text-sm text-yellow-800 dark:text-yellow-300">
          You have a pending advance salary request. You cannot submit a new request until the current one is resolved.
        </div>
      )}

      {/* Request list */}
      {myVisible.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
          <div className="text-4xl mb-3">💰</div>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {requests.length === 0 ? "You haven't submitted any advance salary requests yet." : "No requests match the selected filter."}
          </p>
          {requests.length === 0 && (
            <button onClick={() => setShowNew(true)}
              className="mt-4 px-4 py-2 text-sm font-semibold text-white bg-brand-500 hover:bg-brand-600 rounded-xl transition-colors">
              Submit First Request
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[...myVisible].sort((a, b) => new Date(b.requestDate).getTime() - new Date(a.requestDate).getTime()).map(req => (
            <RequestCard key={req.id} req={req} />
          ))}
        </div>
      )}

      {showNew && <NewRequestModal onClose={() => setShowNew(false)} onSubmit={handleSubmit} />}
    </>
  );
}
