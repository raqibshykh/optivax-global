import React, { useState, useEffect } from "react";
import PageMeta from "../../components/common/PageMeta";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";

const STORAGE_KEY = "mock_leave_requests";

type LeaveType   = "annual" | "sick" | "casual" | "maternity" | "unpaid";
type LeaveStatus = "pending" | "approved" | "rejected";

interface LeaveRequest {
  id: string;
  userId: string;
  userName: string;
  userRole: string;
  departmentId?: string;
  type: LeaveType;
  startDate: string;
  endDate: string;
  days: number;
  reason: string;
  status: LeaveStatus;
  reviewedBy?: string;
  reviewNote?: string;
  createdAt: string;
}

const SEED_REQUESTS: LeaveRequest[] = [
  { id: "lv-seed-1",  userId: "u13", userName: "Liam Park",       userRole: "production_member", departmentId: "dept-production", type: "annual",  startDate: "2026-06-02", endDate: "2026-06-04", days: 3,  reason: "Family vacation",        status: "approved", reviewedBy: "Ava Johnson",  createdAt: "2026-05-28T09:00:00Z" },
  { id: "lv-seed-2",  userId: "u24", userName: "Edgar Wright",     userRole: "production_member", departmentId: "dept-production", type: "sick",    startDate: "2026-06-09", endDate: "2026-06-10", days: 2,  reason: "Fever and rest",         status: "approved", reviewedBy: "Ava Johnson",  createdAt: "2026-06-09T08:00:00Z" },
  { id: "lv-seed-3",  userId: "u14", userName: "Noah Davis",       userRole: "marketing_member",  departmentId: "dept-marketing",  type: "casual",  startDate: "2026-06-12", endDate: "2026-06-12", days: 1,  reason: "Personal errand",        status: "approved", reviewedBy: "Ava Johnson",  createdAt: "2026-06-11T10:00:00Z" },
  { id: "lv-seed-4",  userId: "u20", userName: "Alice Martins",    userRole: "marketing_member",  departmentId: "dept-marketing",  type: "annual",  startDate: "2026-06-19", endDate: "2026-06-21", days: 3,  reason: "Holiday travel",         status: "pending",  createdAt: "2026-06-15T11:00:00Z" },
  { id: "lv-seed-5",  userId: "u21", userName: "Ben Thompson",     userRole: "marketing_member",  departmentId: "dept-marketing",  type: "sick",    startDate: "2026-06-16", endDate: "2026-06-17", days: 2,  reason: "Doctor visit",           status: "approved", reviewedBy: "Ava Johnson",  createdAt: "2026-06-16T07:30:00Z" },
  { id: "lv-seed-6",  userId: "u12", userName: "Emma Wilson",      userRole: "sales_member",      departmentId: "dept-sales",      type: "annual",  startDate: "2026-06-23", endDate: "2026-06-27", days: 5,  reason: "Annual summer leave",    status: "pending",  createdAt: "2026-06-14T09:00:00Z" },
  { id: "lv-seed-7",  userId: "u22", userName: "Chris Nolan",      userRole: "sales_member",      departmentId: "dept-sales",      type: "casual",  startDate: "2026-06-18", endDate: "2026-06-18", days: 1,  reason: "Personal appointment",   status: "rejected", reviewedBy: "Ava Johnson", reviewNote: "Team availability conflict", createdAt: "2026-06-13T14:00:00Z" },
  { id: "lv-seed-8",  userId: "u23", userName: "Diana Prince",     userRole: "sales_member",      departmentId: "dept-sales",      type: "sick",    startDate: "2026-06-10", endDate: "2026-06-11", days: 2,  reason: "Medical issue",          status: "approved", reviewedBy: "Ava Johnson",  createdAt: "2026-06-10T08:00:00Z" },
  { id: "lv-seed-9",  userId: "u15", userName: "Ethan Lee",        userRole: "hr_member",         departmentId: "dept-hr",         type: "annual",  startDate: "2026-06-25", endDate: "2026-06-26", days: 2,  reason: "Short vacation",         status: "pending",  createdAt: "2026-06-17T09:00:00Z" },
  { id: "lv-seed-10", userId: "u25", userName: "Fiona Gallagher",  userRole: "hr_member",         departmentId: "dept-hr",         type: "maternity", startDate: "2026-07-01", endDate: "2026-09-28", days: 90, reason: "Maternity leave",        status: "approved", reviewedBy: "Super Admin",  createdAt: "2026-06-10T10:00:00Z" },
  { id: "lv-seed-11", userId: "u9",  userName: "David Chen",       userRole: "production_admin",  departmentId: "dept-production", type: "annual",  startDate: "2026-07-07", endDate: "2026-07-09", days: 3,  reason: "Family time",            status: "pending",  createdAt: "2026-06-18T08:00:00Z" },
  { id: "lv-seed-12", userId: "u10", userName: "Olivia Brown",     userRole: "marketing_admin",   departmentId: "dept-marketing",  type: "casual",  startDate: "2026-06-20", endDate: "2026-06-20", days: 1,  reason: "Medical checkup",        status: "pending",  createdAt: "2026-06-19T07:00:00Z" },
];

// ── Leave policy ──────────────────────────────────────────────────────────────
const LEAVE_LIMITS: Record<LeaveType, number> = {
  annual:    14,
  sick:      10,
  casual:     5,
  maternity: 90,
  unpaid:   999, // unlimited
};

const LEAVE_TYPE_LABELS: Record<LeaveType, string> = {
  annual: "Annual", sick: "Sick", casual: "Casual", maternity: "Maternity", unpaid: "Unpaid",
};

const STATUS_COLORS: Record<string, string> = {
  pending:  "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  approved: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  rejected: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
};

const TYPE_COLORS: Record<string, string> = {
  annual:    "bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400",
  sick:      "bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400",
  casual:    "bg-purple-100 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400",
  maternity: "bg-pink-100 text-pink-700 dark:bg-pink-900/20 dark:text-pink-400",
  unpaid:    "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
};

function loadLeaves(): LeaveRequest[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(SEED_REQUESTS));
      return SEED_REQUESTS;
    }
    const parsed = JSON.parse(raw) as LeaveRequest[];
    // If only has user's own entries (no seeds), merge seeds in
    if (parsed.length === 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(SEED_REQUESTS));
      return SEED_REQUESTS;
    }
    // Ensure seed records exist (idempotent)
    const ids = new Set(parsed.map((r) => r.id));
    const missing = SEED_REQUESTS.filter((r) => !ids.has(r.id));
    if (missing.length > 0) {
      const merged = [...parsed, ...missing];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
      return merged;
    }
    return parsed;
  } catch { return SEED_REQUESTS; }
}
function saveLeaves(data: LeaveRequest[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}
function calcDays(start: string, end: string): number {
  if (!start || !end) return 0;
  return Math.max(1, Math.round((new Date(end).getTime() - new Date(start).getTime()) / 86_400_000) + 1);
}

const EMPTY_FORM = { type: "annual" as LeaveType, startDate: "", endDate: "", reason: "" };

export default function LeaveRequests() {
  const { user, canView, canApprove } = useAuth();
  const { showToast }                  = useToast();

  // RBAC derivations
  const canViewAll        = canView("hr");    // hr_admin, management, super_admin
  const canApproveLeave   = canApprove("hr"); // hr_admin, super_admin only
  const isStaffMember     = user?.role !== "client" && user?.role !== "super_admin";
  // Dept admins (non-HR) can see their own department's requests
  const isDeptAdmin       = user?.role?.endsWith("_admin") && !canViewAll;
  const viewerDeptId      = user ? ((user as any).departmentId as string | undefined) : undefined;
  const viewerDeptPrefix  = user?.role ? user.role.replace("_admin", "").replace("_member", "") : null;

  const [leaves, setLeaves]           = useState<LeaveRequest[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm]               = useState({ ...EMPTY_FORM });
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterType, setFilterType]     = useState("all");
  const [reviewModal, setReviewModal]   = useState<{ request: LeaveRequest; action: "approved" | "rejected" } | null>(null);
  const [reviewNote, setReviewNote]     = useState("");

  useEffect(() => { setLeaves(loadLeaves()); }, []);

  const myLeaves = canViewAll
    ? leaves
    : isDeptAdmin
      ? leaves.filter((l) => {
          // Show own requests + all requests from their department
          if (l.userId === user?.id) return true;
          if (l.departmentId) return l.departmentId === viewerDeptId || l.userRole.startsWith(viewerDeptPrefix ?? "___");
          return l.userRole.startsWith(viewerDeptPrefix ?? "___");
        })
      : leaves.filter((l) => l.userId === user?.id);
  const filtered = myLeaves.filter((l) => {
    const matchStatus = filterStatus === "all" || l.status === filterStatus;
    const matchType   = filterType   === "all" || l.type   === filterType;
    return matchStatus && matchType;
  });

  // ── Leave balance helpers (personal) ─────────────────────────────────────
  const myApproved = leaves.filter((l) => l.userId === user?.id && l.status === "approved");
  const usedByType  = (t: LeaveType) => myApproved.filter((l) => l.type === t).reduce((s, l) => s + l.days, 0);
  const remaining   = (t: LeaveType) => Math.max(0, LEAVE_LIMITS[t] - usedByType(t));
  const balanceTypes: LeaveType[] = ["annual", "sick", "casual"];

  // KPIs
  const pendingCount  = myLeaves.filter((l) => l.status === "pending").length;
  const approvedCount = myLeaves.filter((l) => l.status === "approved").length;
  const totalDays     = myLeaves.filter((l) => l.status === "approved").reduce((s, l) => s + l.days, 0);

  // ── Submit leave ──────────────────────────────────────────────────────────
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!form.startDate || !form.endDate) { showToast("Select start and end dates", "error"); return; }
    if (new Date(form.endDate) < new Date(form.startDate)) { showToast("End date cannot precede start date", "error"); return; }
    const days    = calcDays(form.startDate, form.endDate);
    const typeKey = form.type as LeaveType;
    if (typeKey !== "unpaid" && days > remaining(typeKey)) {
      showToast(`Insufficient ${LEAVE_TYPE_LABELS[typeKey]} leave balance (${remaining(typeKey)} days remaining)`, "error");
      return;
    }
    const req: LeaveRequest = {
      id: `lv-${Date.now()}`,
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      departmentId: (user as any).departmentId as string | undefined,
      ...form,
      days,
      status: "pending",
      createdAt: new Date().toISOString(),
    };
    const updated = [req, ...leaves];
    saveLeaves(updated);
    setLeaves(updated);
    setIsModalOpen(false);
    setForm({ ...EMPTY_FORM });
    showToast("Leave request submitted", "success");
  };

  // ── Approve / Reject ──────────────────────────────────────────────────────
  const handleReview = () => {
    if (!reviewModal || !user) return;
    const updated = leaves.map((l) =>
      l.id === reviewModal.request.id
        ? { ...l, status: reviewModal.action, reviewedBy: user.name, reviewNote }
        : l
    );
    saveLeaves(updated);
    setLeaves(updated);
    showToast(`Request ${reviewModal.action}`, "success");
    setReviewModal(null);
    setReviewNote("");
  };

  // ── Cancel own pending ────────────────────────────────────────────────────
  const handleDelete = (id: string) => {
    if (!window.confirm("Cancel this leave request?")) return;
    const updated = leaves.filter((l) => l.id !== id);
    saveLeaves(updated);
    setLeaves(updated);
    showToast("Leave request cancelled", "success");
  };

  return (
    <>
      <PageMeta title="Leave Requests | Optivax HR" description="Manage employee leave requests" />
      <PageBreadcrumb pageTitle="Leave Requests" />

      {/* ── KPI Cards ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        {[
          { label: "Pending Requests", value: pendingCount,          color: "text-yellow-600 dark:text-yellow-400" },
          { label: "Approved",          value: approvedCount,         color: "text-green-600 dark:text-green-400"  },
          { label: "Total Days Taken",  value: `${totalDays} days`,  color: "text-brand-600 dark:text-brand-400"  },
        ].map((c) => (
          <div key={c.label} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{c.label}</p>
            <p className={`mt-2 text-2xl font-bold ${c.color}`}>{c.value}</p>
          </div>
        ))}
      </div>

      {/* ── Leave Balance (shown only to staff members, not HR admin view) ──── */}
      {!canViewAll && isStaffMember && (
        <div className="mb-6 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 shadow-sm">
          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3">My Leave Balance (Current Year)</h4>
          <div className="grid grid-cols-3 gap-3">
            {balanceTypes.map((t) => {
              const used = usedByType(t);
              const left = remaining(t);
              const max  = LEAVE_LIMITS[t];
              const pct  = Math.round((used / max) * 100);
              return (
                <div key={t} className="rounded-lg bg-gray-50 dark:bg-gray-800 p-3">
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 capitalize">{LEAVE_TYPE_LABELS[t]}</p>
                  <p className="mt-1 text-lg font-bold text-gray-900 dark:text-white">{left} <span className="text-sm font-normal text-gray-400">/ {max} days</span></p>
                  <div className="mt-1.5 h-1.5 w-full rounded-full bg-gray-200 dark:bg-gray-700">
                    <div
                      className={`h-1.5 rounded-full transition-all ${pct > 80 ? "bg-red-500" : pct > 50 ? "bg-orange-400" : "bg-green-500"}`}
                      style={{ width: `${Math.min(100, pct)}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-gray-400 mt-0.5">{used} used · {left} remaining</p>
                </div>
              );
            })}
          </div>
          <p className="text-[10px] text-gray-400 mt-3">
            Maternity: {remaining("maternity")}/{LEAVE_LIMITS.maternity} days remaining · Unpaid: unlimited
          </p>
        </div>
      )}

      {/* ── Table ─────────────────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800 flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {canViewAll ? "All Leave Requests" : "My Leave Requests"}
          </h3>
          <div className="flex flex-wrap items-center gap-3">
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg dark:bg-gray-800 dark:border-gray-700 dark:text-white">
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
            <select value={filterType} onChange={(e) => setFilterType(e.target.value)}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg dark:bg-gray-800 dark:border-gray-700 dark:text-white">
              <option value="all">All Types</option>
              {(Object.keys(LEAVE_TYPE_LABELS) as LeaveType[]).map((t) => (
                <option key={t} value={t}>{LEAVE_TYPE_LABELS[t]}</option>
              ))}
            </select>
            {isStaffMember && (
              <button
                onClick={() => setIsModalOpen(true)}
                className="px-4 py-1.5 text-sm font-medium text-white bg-brand-500 rounded-lg hover:bg-brand-600 transition-colors whitespace-nowrap"
              >
                + Request Leave
              </button>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-800/50">
                {[
                  ...(canViewAll ? ["Employee"] : []),
                  "Type", "Start Date", "End Date", "Days", "Reason", "Status", "Actions",
                ].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-10 text-center text-sm text-gray-400">No leave requests found.</td>
                </tr>
              )}
              {filtered.map((l) => (
                <tr key={l.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                  {canViewAll && (
                    <td className="px-4 py-4">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">{l.userName}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">{l.userRole.replace(/_/g, " ")}</div>
                    </td>
                  )}
                  <td className="px-4 py-4">
                    <span className={`px-2 py-0.5 text-xs font-medium rounded-full capitalize ${TYPE_COLORS[l.type]}`}>{l.type}</span>
                  </td>
                  <td className="px-4 py-4 text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">{l.startDate}</td>
                  <td className="px-4 py-4 text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">{l.endDate}</td>
                  <td className="px-4 py-4 text-sm font-medium text-center text-gray-900 dark:text-white">{l.days}</td>
                  <td className="px-4 py-4 text-sm text-gray-600 dark:text-gray-400 max-w-48 truncate">{l.reason}</td>
                  <td className="px-4 py-4">
                    <span className={`px-2 py-0.5 text-xs font-medium rounded-full capitalize ${STATUS_COLORS[l.status]}`}>{l.status}</span>
                    {l.reviewedBy && <div className="text-xs text-gray-400 mt-0.5">by {l.reviewedBy}</div>}
                    {l.reviewNote && <div className="text-xs text-gray-400 italic truncate max-w-32">{l.reviewNote}</div>}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      {canApproveLeave && l.status === "pending" && (
                        <>
                          <button onClick={() => { setReviewModal({ request: l, action: "approved" }); setReviewNote(""); }}
                            className="text-green-600 hover:text-green-800 dark:text-green-400 text-xs font-medium">Approve</button>
                          <button onClick={() => { setReviewModal({ request: l, action: "rejected" }); setReviewNote(""); }}
                            className="text-red-500 hover:text-red-700 dark:text-red-400 text-xs font-medium">Reject</button>
                        </>
                      )}
                      {l.userId === user?.id && l.status === "pending" && (
                        <button onClick={() => handleDelete(l.id)}
                          className="text-gray-500 hover:text-red-500 dark:text-gray-400 text-xs font-medium">Cancel</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Request Leave Modal ────────────────────────────────────────────── */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="fixed inset-0 bg-black/50" onClick={() => setIsModalOpen(false)} />
          <div className="relative z-50 w-full max-w-md bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Request Leave</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 text-2xl leading-none">&times;</button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Leave Type *</label>
                <select value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as LeaveType }))}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white">
                  {(Object.entries(LEAVE_TYPE_LABELS) as [LeaveType, string][]).map(([v, label]) => (
                    <option key={v} value={v}>
                      {label}{v !== "unpaid" ? ` (${remaining(v)} days remaining)` : " (Unlimited)"}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Start Date *</label>
                  <input type="date" required value={form.startDate}
                    onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">End Date *</label>
                  <input type="date" required value={form.endDate}
                    onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white" />
                </div>
              </div>
              {form.startDate && form.endDate && (
                <div className="text-xs text-brand-600 dark:text-brand-400 font-medium">
                  Duration: {calcDays(form.startDate, form.endDate)} day(s)
                  {form.type !== "unpaid" && (
                    <span className={calcDays(form.startDate, form.endDate) > remaining(form.type as LeaveType) ? " text-red-500" : ""}>
                      {" "}· Balance after: {Math.max(0, remaining(form.type as LeaveType) - calcDays(form.startDate, form.endDate))} days
                    </span>
                  )}
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Reason *</label>
                <textarea required rows={3} value={form.reason}
                  onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white resize-none" />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700">Cancel</button>
                <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-brand-500 rounded-lg hover:bg-brand-600">Submit Request</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Review Modal ───────────────────────────────────────────────────── */}
      {reviewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="fixed inset-0 bg-black/50" onClick={() => setReviewModal(null)} />
          <div className="relative z-50 w-full max-w-sm bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 p-6">
            <h3 className={`text-lg font-semibold mb-1 ${reviewModal.action === "approved" ? "text-green-600" : "text-red-500"}`}>
              {reviewModal.action === "approved" ? "Approve Request" : "Reject Request"}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              <strong>{reviewModal.request.userName}</strong> — {reviewModal.request.days} day(s) of {reviewModal.request.type} leave
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Review Note (optional)</label>
              <textarea rows={3} value={reviewNote} onChange={(e) => setReviewNote(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white resize-none" />
            </div>
            <div className="flex justify-end gap-3">
              <button onClick={() => setReviewModal(null)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700">Cancel</button>
              <button onClick={handleReview}
                className={`px-4 py-2 text-sm font-medium text-white rounded-lg ${reviewModal.action === "approved" ? "bg-green-600 hover:bg-green-700" : "bg-red-500 hover:bg-red-600"}`}>
                Confirm {reviewModal.action === "approved" ? "Approval" : "Rejection"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
