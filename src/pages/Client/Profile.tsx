import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import PageMeta from "../../components/common/PageMeta";
import { useAuth } from "../../context/AuthContext";
import { useClients } from "../../hooks/useClients";
import { useToast } from "../../context/ToastContext";
import { safeParse } from "../../lib/storage";
import { notifyLeaveRequestSubmitted, notifyClientProfileUpdated } from "../../services/notificationHelpers";
import { getConversations } from "../../mock/conversationsData";

// ── Leave Request types (shared with HRPanel) ─────────────────────────────
const LEAVE_REQUESTS_KEY = "optivax_leave_requests";

export interface LeaveRequest {
  id: string;
  employeeId: string;
  employeeName: string;
  role: string;
  department: string;
  type: "Annual" | "Sick" | "Personal" | "Emergency";
  startDate: string;
  endDate: string;
  days: number;
  reason: string;
  status: "Pending" | "Approved" | "Rejected";
  submittedAt: string;
}

const calcDays = (start: string, end: string): number => {
  if (!start || !end) return 0;
  const diff = new Date(end).getTime() - new Date(start).getTime();
  return Math.max(1, Math.round(diff / (1000 * 60 * 60 * 24)) + 1);
};

// ── Client profile type (used only when role === "client") ────────────────
type ClientProfile = {
  companyName: string;
  contactPerson: string;
  email: string;
  phone: string;
  street: string;
  city: string;
  state: string;
  zip: string;
  country: string;
};

const defaultProfile: ClientProfile = {
  companyName: "", contactPerson: "", email: "", phone: "",
  street: "", city: "", state: "", zip: "", country: "",
};

export default function Profile() {
  const { user } = useAuth();
  const { clients, updateClient } = useClients();
  const { showToast } = useToast();

  const isEmployee = !!user && user.role !== "client";

  // ── Conversation summary for client ──────────────────────────────────────
  const convSummary = useMemo(() => {
    if (!user || user.role !== "client") return { total: 0, unread: 0 };
    const all = getConversations();
    const mine = all.filter(c => c.clientId === user.id);
    return {
      total: mine.length,
      unread: mine.reduce((sum, c) => sum + c.unreadByClient, 0),
    };
  }, [user]);

  // ── Client profile state ───────────────────────────────────────────────
  const [profile, setProfile] = useState<ClientProfile>(defaultProfile);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (user && user.role === "client") {
      const clientRecord = clients.find((c) => c.id === user.id);
      if (clientRecord) {
        setProfile({
          companyName: clientRecord.company || "",
          contactPerson: clientRecord.name || "",
          email: clientRecord.email || "",
          phone: clientRecord.phone || "",
          street: clientRecord.address || "",
          city: clientRecord.city || "",
          state: "", zip: "", country: "",
        });
      } else {
        setProfile({
          ...defaultProfile,
          companyName: user.company || "",
          contactPerson: user.name || "",
          email: user.email || "",
          phone: user.phone || "",
        });
      }
    }
  }, [user, clients]);

  const saveProfile = async () => {
    if (!user) return;
    setIsSaving(true);
    try {
      await updateClient(user.id, {
        company: profile.companyName,
        name: profile.contactPerson,
        email: profile.email,
        phone: profile.phone,
        address: profile.street,
        city: profile.city,
      });
      showToast("Profile updated successfully", "success");
      if (user) notifyClientProfileUpdated(user.id, profile.contactPerson || user.name);
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "Failed to update profile", "error");
    } finally {
      setIsSaving(false);
    }
  };

  // ── Leave request state (employees only) ──────────────────────────────
  const [leaveType, setLeaveType] = useState<LeaveRequest["type"]>("Annual");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [, setRequestsVersion] = useState(0); // bump to trigger re-render after submit

  const deptLabel = user
    ? user.role
        .replace("_admin", "")
        .replace("_member", "")
        .replace(/\b\w/g, (c) => c.toUpperCase())
    : "";

  const handleSubmitLeave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !startDate || !endDate || !reason.trim()) return;
    if (new Date(endDate) < new Date(startDate)) {
      showToast("End date must be after start date", "error");
      return;
    }
    setSubmitting(true);

    const days = calcDays(startDate, endDate);
    const newRequest: LeaveRequest = {
      id: `lr-${Date.now()}`,
      employeeId: user.id,
      employeeName: user.name,
      role: user.role,
      department: deptLabel,
      type: leaveType,
      startDate,
      endDate,
      days,
      reason: reason.trim(),
      status: "Pending",
      submittedAt: new Date().toISOString(),
    };

    const existing = safeParse<LeaveRequest[]>(
      localStorage.getItem(LEAVE_REQUESTS_KEY),
      []
    );
    localStorage.setItem(
      LEAVE_REQUESTS_KEY,
      JSON.stringify([...existing, newRequest])
    );

    setLeaveType("Annual");
    setStartDate("");
    setEndDate("");
    setReason("");
    setSubmitting(false);
    setRequestsVersion((v) => v + 1);
    showToast("Leave request submitted successfully", "success");
    notifyLeaveRequestSubmitted(user.id, user.name, user.role, leaveType, newRequest.id);
  };

  // Refresh myRequests on new submission
  const liveMyRequests = safeParse<LeaveRequest[]>(
    localStorage.getItem(LEAVE_REQUESTS_KEY),
    []
  ).filter((r) => r.employeeId === user?.id);

  return (
    <>
      <PageMeta
        title="Profile | Optivax Global"
        description="Manage your account and profile information."
      />
      <div className="flex flex-col gap-4 mb-6 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
            Profile
          </h1>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            {isEmployee ? "Your account details and leave management." : "Update your account information and preferences."}
          </p>
        </div>
      </div>

      {/* ── CLIENT PROFILE ──────────────────────────────────────────────── */}
      {!isEmployee && (
        <div className="space-y-6">
          <div className="rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Account Information</h3>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {[
                  { label: "Company Name", field: "companyName" as const, type: "text" },
                  { label: "Contact Person", field: "contactPerson" as const, type: "text" },
                  { label: "Email", field: "email" as const, type: "email" },
                  { label: "Phone", field: "phone" as const, type: "tel" },
                ].map(({ label, field, type }) => (
                  <div key={field}>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{label}</label>
                    <input
                      type={type}
                      value={profile[field]}
                      onChange={(e) => setProfile((p) => ({ ...p, [field]: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                    />
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-end">
                <button onClick={saveProfile} disabled={isSaving} type="button"
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 disabled:opacity-50 transition">
                  {isSaving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Billing Address</h3>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Street Address</label>
                  <input type="text" value={profile.street}
                    onChange={(e) => setProfile((p) => ({ ...p, street: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg dark:border-gray-600 dark:bg-gray-800 dark:text-white" />
                </div>
                {[
                  { label: "City", field: "city" as const },
                  { label: "State/Province", field: "state" as const },
                  { label: "ZIP/Postal Code", field: "zip" as const },
                  { label: "Country", field: "country" as const },
                ].map(({ label, field }) => (
                  <div key={field}>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{label}</label>
                    <input type="text" value={profile[field]}
                      onChange={(e) => setProfile((p) => ({ ...p, [field]: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg dark:border-gray-600 dark:bg-gray-800 dark:text-white" />
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-end">
                <button onClick={saveProfile} disabled={isSaving} type="button"
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition">
                  {isSaving ? "Updating..." : "Update Address"}
                </button>
              </div>
            </div>
          </div>

          {/* Messages — link to unified Messages page */}
          <div className="rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Messages</h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Conversations with your assigned team.</p>
              </div>
              {convSummary.unread > 0 && (
                <span className="px-2.5 py-0.5 text-xs font-medium rounded-full bg-brand-100 text-brand-700 dark:bg-brand-900/30 dark:text-brand-400">
                  {convSummary.unread} unread
                </span>
              )}
            </div>
            <div className="p-6 flex flex-col items-center text-center gap-4">
              <div className="grid grid-cols-2 gap-4 w-full max-w-xs">
                <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50">
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{convSummary.total}</p>
                  <p className="text-xs text-gray-500 mt-0.5">Conversations</p>
                </div>
                <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50">
                  <p className="text-2xl font-bold text-brand-600">{convSummary.unread}</p>
                  <p className="text-xs text-gray-500 mt-0.5">Unread</p>
                </div>
              </div>
              <Link
                to="/client/messages"
                className="w-full max-w-xs py-2.5 text-sm font-semibold text-white bg-brand-500 hover:bg-brand-600 rounded-xl transition-colors text-center"
              >
                Open Messages
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* ── EMPLOYEE PROFILE + LEAVE REQUESTS ───────────────────────────── */}
      {isEmployee && user && (
        <div className="space-y-6">
          {/* Employee info card */}
          <div className="rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Employee Information</h3>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide dark:text-gray-400">Full Name</p>
                  <p className="mt-1 text-sm font-semibold text-gray-900 dark:text-white">{user.name}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide dark:text-gray-400">Email</p>
                  <p className="mt-1 text-sm text-gray-700 dark:text-gray-300">{user.email}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide dark:text-gray-400">Department / Role</p>
                  <p className="mt-1 text-sm font-semibold text-gray-900 dark:text-white">
                    {deptLabel}
                    <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                      {user.role.includes("_admin") ? "Admin" : "Member"}
                    </span>
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Leave request form */}
          <div className="rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Request Leave</h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Submit a leave request to HR for approval.</p>
            </div>
            <form onSubmit={handleSubmitLeave} className="p-6 space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Leave Type</label>
                  <select
                    value={leaveType}
                    onChange={(e) => setLeaveType(e.target.value as LeaveRequest["type"])}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  >
                    <option value="Annual">Annual Leave</option>
                    <option value="Sick">Sick Leave</option>
                    <option value="Personal">Personal Leave</option>
                    <option value="Emergency">Emergency Leave</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Start Date</label>
                  <input
                    type="date"
                    required
                    value={startDate}
                    min={new Date().toISOString().split("T")[0]}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">End Date</label>
                  <input
                    type="date"
                    required
                    value={endDate}
                    min={startDate || new Date().toISOString().split("T")[0]}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  />
                </div>
                <div className="flex items-end">
                  {startDate && endDate && (
                    <div className="w-full rounded-lg bg-blue-50 dark:bg-blue-900/20 px-3 py-2 text-center">
                      <p className="text-xs text-gray-500 dark:text-gray-400">Duration</p>
                      <p className="text-lg font-bold text-blue-600 dark:text-blue-400">
                        {calcDays(startDate, endDate)} day{calcDays(startDate, endDate) !== 1 ? "s" : ""}
                      </p>
                    </div>
                  )}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Reason</label>
                <textarea
                  required
                  rows={3}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Briefly describe the reason for your leave request..."
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white resize-none"
                />
              </div>
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition"
                >
                  {submitting ? "Submitting..." : "Submit Request"}
                </button>
              </div>
            </form>
          </div>

          {/* My leave history */}
          <div className="rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">My Leave History</h3>
              <span className="text-sm text-gray-500 dark:text-gray-400">{liveMyRequests.length} request{liveMyRequests.length !== 1 ? "s" : ""}</span>
            </div>
            <div className="p-6">
              {liveMyRequests.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-6">
                  No leave requests submitted yet.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
                    <thead>
                      <tr>
                        {["Type", "Dates", "Days", "Reason", "Status", "Submitted"].map((h) => (
                          <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                      {[...liveMyRequests].reverse().map((r) => (
                        <tr key={r.id}>
                          <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">{r.type}</td>
                          <td className="px-4 py-3 text-sm text-gray-500">{r.startDate} → {r.endDate}</td>
                          <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">{r.days}d</td>
                          <td className="px-4 py-3 text-sm text-gray-500 max-w-xs truncate">{r.reason}</td>
                          <td className="px-4 py-3 text-sm">
                            <span className={`px-2 py-1 text-xs rounded-full font-medium ${
                              r.status === "Approved" ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" :
                              r.status === "Rejected" ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400" :
                              "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"
                            }`}>{r.status}</span>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-500">
                            {new Date(r.submittedAt).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
