import { useState, useEffect, useMemo } from "react";
import PageMeta from "../../components/common/PageMeta";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import { useAuth } from "../../context/AuthContext";
import {
  getAdvanceRequests, saveAdvanceRequests, canViewRequest, canApproveRequest,
  type AdvanceSalaryRequest, type AdvanceStatus,
} from "../../mock/payrollData";
import { useToast } from "../../context/ToastContext";

// ── Constants ─────────────────────────────────────────────────────────────────

const fmtRs = (n: number) => `Rs. ${Math.round(n).toLocaleString()}`;

const STATUS_COLOR: Record<AdvanceStatus, string> = {
  pending:  "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  approved: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  rejected: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  paid:     "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
};

const inputCls = "w-full rounded-lg border border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-white px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:border-transparent";

// ── Detail Modal ──────────────────────────────────────────────────────────────

function DetailModal({ req, canApprove, onClose, onAction }: {
  req: AdvanceSalaryRequest;
  canApprove: boolean;
  onClose: () => void;
  onAction: (id: string, action: "approved" | "rejected" | "paid", note: string) => void;
}) {
  const [action, setAction] = useState<"approved" | "rejected" | "paid" | null>(null);
  const [note, setNote]     = useState("");
  const [err, setErr]       = useState("");

  const handleConfirm = () => {
    if (!action) return;
    if (action === "rejected" && !note.trim()) { setErr("Rejection reason is required."); return; }
    onAction(req.id, action, note.trim());
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-gray-900 shadow-2xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white">Advance Salary Request</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
        </div>

        <div className="overflow-y-auto flex-1 p-6 space-y-4">
          {/* Summary */}
          <div className="grid grid-cols-2 gap-3 p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50 text-sm">
            <div><span className="text-xs text-gray-400 block">Employee</span><span className="font-semibold text-gray-900 dark:text-white">{req.employeeName}</span></div>
            <div><span className="text-xs text-gray-400 block">Department</span><span className="font-medium">{req.department}</span></div>
            <div><span className="text-xs text-gray-400 block">Role</span><span className="font-medium text-xs text-brand-600 dark:text-brand-400">{req.employeeRole}</span></div>
            <div><span className="text-xs text-gray-400 block">Request Date</span><span className="font-medium">{new Date(req.requestDate).toLocaleDateString()}</span></div>
            <div className="col-span-2">
              <span className="text-xs text-gray-400 block">Requested Amount</span>
              <span className="text-xl font-bold text-brand-600 dark:text-brand-400">{fmtRs(req.requestedAmount)}</span>
            </div>
            <div className="col-span-2">
              <span className="text-xs text-gray-400 block mb-1">Reason</span>
              <p className="text-sm text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 p-3 rounded-lg border border-gray-200 dark:border-gray-700">{req.reason}</p>
            </div>
            <div>
              <span className="text-xs text-gray-400 block">Status</span>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium mt-0.5 inline-block ${STATUS_COLOR[req.status]}`}>{req.status}</span>
            </div>
          </div>

          {/* Previous action details */}
          {req.approvedByName && (
            <div className="p-3 rounded-lg border border-gray-200 dark:border-gray-700 text-sm">
              <p className="text-xs text-gray-400 mb-1">Action by {req.approvedByName} on {new Date(req.approvedAt!).toLocaleDateString()}</p>
              {req.rejectionReason && <p className="text-red-600 dark:text-red-400 text-xs">Rejection reason: {req.rejectionReason}</p>}
              {req.notes && <p className="text-gray-600 dark:text-gray-400 text-xs">Notes: {req.notes}</p>}
            </div>
          )}

          {/* Action buttons (approvers only, for pending/approved) */}
          {canApprove && req.status !== "rejected" && (
            <div className="space-y-3">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Take Action:</p>
              <div className="flex gap-2 flex-wrap">
                {req.status === "pending" && (
                  <>
                    <button onClick={() => { setAction("approved"); setErr(""); }}
                      className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${action === "approved" ? "bg-green-600 text-white" : "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/40"}`}>
                      Approve
                    </button>
                    <button onClick={() => { setAction("rejected"); setErr(""); }}
                      className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${action === "rejected" ? "bg-red-600 text-white" : "bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40"}`}>
                      Reject
                    </button>
                  </>
                )}
                {req.status === "approved" && (
                  <button onClick={() => { setAction("paid"); setErr(""); }}
                    className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${action === "paid" ? "bg-blue-600 text-white" : "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/40"}`}>
                    Mark as Paid
                  </button>
                )}
              </div>
              {action && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {action === "rejected" ? "Rejection Reason *" : action === "approved" ? "Approval Note (optional)" : "Payment Note (optional)"}
                  </label>
                  <textarea rows={3} className={inputCls} value={note} onChange={e => setNote(e.target.value)}
                    placeholder={action === "rejected" ? "State the reason for rejection…" : "Any notes about this action…"} />
                  {err && <p className="text-xs text-red-600 mt-1">{err}</p>}
                  <button onClick={handleConfirm}
                    className={`mt-2 px-4 py-2 text-sm font-semibold text-white rounded-lg transition-colors ${
                      action === "rejected" ? "bg-red-600 hover:bg-red-700" :
                      action === "paid"     ? "bg-blue-600 hover:bg-blue-700" :
                                             "bg-green-600 hover:bg-green-700"
                    }`}>
                    Confirm {action.charAt(0).toUpperCase() + action.slice(1)}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-800 flex justify-end">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors">Close</button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function AdvanceSalary() {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [requests, setRequests] = useState<AdvanceSalaryRequest[]>([]);
  const [selected, setSelected] = useState<AdvanceSalaryRequest | null>(null);
  const [filterStatus, setFilterStatus] = useState<AdvanceStatus | "all">("all");
  const [filterDept, setFilterDept]     = useState("all");
  const [search, setSearch]             = useState("");

  const viewerRole = user?.role ?? "";
  const viewerId   = user?.id ?? "";
  const isApprover = ["super_admin", "management", "hr_admin"].includes(viewerRole);

  useEffect(() => { setRequests(getAdvanceRequests()); }, []);

  const visible = useMemo(() => {
    let list = requests.filter(r => canViewRequest(viewerRole, viewerId, r));
    if (filterStatus !== "all") list = list.filter(r => r.status === filterStatus);
    if (filterDept !== "all")   list = list.filter(r => r.department === filterDept);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(r =>
        r.employeeName.toLowerCase().includes(q) ||
        r.department.toLowerCase().includes(q) ||
        r.reason.toLowerCase().includes(q)
      );
    }
    return list.sort((a, b) => new Date(b.requestDate).getTime() - new Date(a.requestDate).getTime());
  }, [requests, filterStatus, filterDept, search, viewerRole, viewerId]);

  const depts = useMemo(() => [...new Set(requests.map(r => r.department))].sort(), [requests]);

  // Stats for approvers
  const pending  = requests.filter(r => canViewRequest(viewerRole, viewerId, r) && r.status === "pending");
  const approved = requests.filter(r => canViewRequest(viewerRole, viewerId, r) && r.status === "approved");

  const handleAction = (id: string, action: "approved" | "rejected" | "paid", note: string) => {
    const now = new Date().toISOString();
    const updated = requests.map(r => {
      if (r.id !== id) return r;
      return {
        ...r,
        status: action as AdvanceStatus,
        approvedById: user?.id,
        approvedByName: user?.name,
        approvedAt: now,
        ...(action === "rejected" ? { rejectionReason: note } : { notes: note }),
      };
    });
    saveAdvanceRequests(updated);
    setRequests(updated);
    setSelected(null);
    const labels: Record<string, string> = { approved: "Approved", rejected: "Rejected", paid: "Marked as Paid" };
    showToast(`Request ${labels[action]}`, action === "rejected" ? "error" : "success");
  };

  return (
    <>
      <PageMeta title="Advance Salary | Optivax Global" description="Advance salary request management" />
      <PageBreadcrumb pageTitle="Advance Salary" />

      {/* ── KPI strip (approvers) ────────────────────────────────────────── */}
      {isApprover && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[
            { label: "Pending Requests",     value: pending.length,                                                color: "text-yellow-600" },
            { label: "Pending Amount",        value: fmtRs(pending.reduce((s,r) => s+r.requestedAmount, 0)),       color: "text-orange-600" },
            { label: "Approved (Unpaid)",     value: approved.length,                                              color: "text-green-600" },
            { label: "Approved Amount",       value: fmtRs(approved.reduce((s,r) => s+r.requestedAmount, 0)),      color: "text-blue-600" },
          ].map(({ label, value, color }) => (
            <div key={label} className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900 p-4 shadow-sm">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400">{label}</p>
              <p className={`mt-1 text-xl font-bold ${color}`}>{value}</p>
            </div>
          ))}
        </div>
      )}

      {/* ── Filters ──────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-3 mb-4">
        <input type="text" value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search employee, reason…"
          className="flex-1 min-w-[160px] rounded-lg border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white px-3 py-1.5 text-sm focus:ring-2 focus:ring-brand-500 focus:border-transparent" />
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value as AdvanceStatus | "all")}
          className="rounded-lg border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white px-3 py-1.5 text-sm focus:ring-2 focus:ring-brand-500 focus:border-transparent">
          <option value="all">All Statuses</option>
          {(["pending","approved","rejected","paid"] as AdvanceStatus[]).map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        {isApprover && (
          <select value={filterDept} onChange={e => setFilterDept(e.target.value)}
            className="rounded-lg border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white px-3 py-1.5 text-sm focus:ring-2 focus:ring-brand-500 focus:border-transparent">
            <option value="all">All Departments</option>
            {depts.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        )}
      </div>

      {/* ── Table ────────────────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-800/60">
              <tr>
                {["Employee", "Department", "Amount", "Reason", "Date", "Status", "Actioned By", "Actions"].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {visible.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-10 text-center text-sm text-gray-400 dark:text-gray-500">No advance salary requests found.</td></tr>
              ) : visible.map(req => (
                <tr key={req.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors">
                  <td className="px-4 py-3 whitespace-nowrap">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{req.employeeName}</p>
                    <p className="text-xs text-gray-400">{req.employeeRole}</p>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">{req.department}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className="text-sm font-semibold text-brand-600 dark:text-brand-400">{fmtRs(req.requestedAmount)}</span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400 max-w-[200px] truncate">{req.reason}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-400">{new Date(req.requestDate).toLocaleDateString()}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLOR[req.status]}`}>{req.status}</span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {req.approvedByName ? (
                      <div>
                        <p className="text-xs text-gray-700 dark:text-gray-300">{req.approvedByName}</p>
                        {req.approvedAt && <p className="text-xs text-gray-400">{new Date(req.approvedAt).toLocaleDateString()}</p>}
                      </div>
                    ) : <span className="text-xs text-gray-400">—</span>}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <button onClick={() => setSelected(req)}
                      className="text-xs px-2 py-1 rounded bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors">
                      {isApprover && canApproveRequest(viewerRole, viewerId, req) && req.status === "pending" ? "Review" :
                       isApprover && canApproveRequest(viewerRole, viewerId, req) && req.status === "approved" ? "Mark Paid" : "View"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {selected && (
        <DetailModal
          req={selected}
          canApprove={canApproveRequest(viewerRole, viewerId, selected)}
          onClose={() => setSelected(null)}
          onAction={handleAction}
        />
      )}
    </>
  );
}
