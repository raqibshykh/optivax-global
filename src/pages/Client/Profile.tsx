import React, { useEffect, useMemo, useRef, useState } from "react";
import PageMeta from "../../components/common/PageMeta";
import { useAuth } from "../../context/AuthContext";
import { useClients } from "../../hooks/useClients";
import { useToast } from "../../context/ToastContext";
import { safeParse } from "../../lib/storage";
import { notifyLeaveRequestSubmitted } from "../../services/notificationHelpers";

// ── Leave Request types (shared with HRPanel) ─────────────────────────────
const LEAVE_REQUESTS_KEY = "optivax_leave_requests";
const PROD_MESSAGES_KEY = "optivax_client_messages";

interface ChatMessage {
  id: string;
  fromId: string;
  fromName: string;
  fromRole: string;
  toId: string;
  toName: string;
  message: string;
  sentAt: string;
  toClientId?: string;
  toClientName?: string;
}
const normChatMsg = (m: Record<string, unknown>): ChatMessage => {
  const r = m as Partial<ChatMessage> & { toClientId?: string; toClientName?: string };
  return {
    id: r.id ?? "",
    fromId: r.fromId ?? "",
    fromName: r.fromName ?? "",
    fromRole: r.fromRole ?? "production_member",
    toId: r.toId ?? r.toClientId ?? "",
    toName: r.toName ?? r.toClientName ?? "",
    message: r.message ?? "",
    sentAt: r.sentAt ?? "",
    toClientId: r.toClientId,
    toClientName: r.toClientName,
  };
};

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

  // ── Chat state (clients only) ──────────────────────────────────────────
  const [allChatMessages, setAllChatMessages] = useState<ChatMessage[]>([]);
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user?.role !== "client") return;
    const load = () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const all = safeParse<any[]>(localStorage.getItem(PROD_MESSAGES_KEY), []).map(normChatMsg);
      const uid = user.id;
      setAllChatMessages(
        all.filter(
          (m) =>
            m.fromId === uid ||
            m.toId === uid ||
            m.toClientId === uid
        )
      );
    };
    load();
    window.addEventListener("storage", load);
    return () => window.removeEventListener("storage", load);
  }, [user]);

  // Derive contacts: production members who have chatted with this client
  // plus anyone in the client record's assignedProductionMembers[]
  const contacts = useMemo(() => {
    if (!user || user.role !== "client") return [];
    const map = new Map<string, { id: string; name: string }>();

    // From existing messages
    allChatMessages.forEach((m) => {
      const otherId = m.fromId === user.id ? m.toId : m.fromId;
      const otherName = m.fromId === user.id ? m.toName : m.fromName;
      if (otherId && otherId !== user.id && !map.has(otherId)) {
        map.set(otherId, { id: otherId, name: otherName || otherId });
      }
    });

    // From assigned production members in client record
    const clientRecord = clients.find((c) => c.id === user.id);
    const assignedIds: string[] = clientRecord?.assignedProductionMembers ?? [];
    if (assignedIds.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const profiles = safeParse<any[]>(localStorage.getItem("mock_profiles"), []);
      assignedIds.forEach((id) => {
        if (!map.has(id)) {
          const p = profiles.find((x) => x.id === id);
          const name = p?.full_name ?? p?.name ?? id;
          map.set(id, { id, name });
        }
      });
    }

    return Array.from(map.values());
  }, [allChatMessages, clients, user]);

  // Auto-select first contact when list loads
  useEffect(() => {
    if (contacts.length > 0 && !selectedContactId) {
      setSelectedContactId(contacts[0].id);
    }
  }, [contacts, selectedContactId]);

  // Active thread: messages between this client and the selected contact
  const activeThread = useMemo(() => {
    if (!selectedContactId || !user) return [];
    return allChatMessages
      .filter(
        (m) =>
          (m.fromId === user.id && (m.toId === selectedContactId)) ||
          (m.fromId === selectedContactId && (m.toId === user.id || m.toClientId === user.id))
      )
      .sort((a, b) => new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime());
  }, [allChatMessages, selectedContactId, user]);

  // Auto-scroll when thread updates
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeThread.length]);

  const sendReply = () => {
    if (!selectedContactId || !replyText.trim() || !user) return;
    const contact = contacts.find((c) => c.id === selectedContactId);
    const newMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      fromId: user.id,
      fromName: user.name,
      fromRole: "client",
      toId: selectedContactId,
      toName: contact?.name ?? selectedContactId,
      message: replyText.trim(),
      sentAt: new Date().toISOString(),
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const existing = safeParse<any[]>(localStorage.getItem(PROD_MESSAGES_KEY), []);
    localStorage.setItem(PROD_MESSAGES_KEY, JSON.stringify([...existing, newMsg]));
    setAllChatMessages((prev) => [...prev, newMsg]);
    setReplyText("");
  };

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

          {/* Chat with Production Team */}
          <div className="rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Messages</h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Chat with your assigned production team members.</p>
              </div>
              {allChatMessages.length > 0 && (
                <span className="px-2.5 py-0.5 text-xs font-medium rounded-full bg-brand-100 text-brand-700 dark:bg-brand-900/30 dark:text-brand-400">
                  {allChatMessages.length}
                </span>
              )}
            </div>

            {contacts.length === 0 ? (
              <div className="p-8 text-center text-sm text-gray-500 dark:text-gray-400">
                No production team contacts assigned yet. Contact your account manager to get started.
              </div>
            ) : (
              <div className="flex" style={{ height: "480px" }}>
                {/* Contact list */}
                <div className="w-56 border-r border-gray-200 dark:border-gray-800 flex-shrink-0 overflow-y-auto">
                  {contacts.map((contact) => {
                    const lastMsg = allChatMessages
                      .filter(
                        (m) =>
                          (m.fromId === user?.id && m.toId === contact.id) ||
                          (m.fromId === contact.id && (m.toId === user?.id || m.toClientId === user?.id))
                      )
                      .sort((a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime())[0];
                    const isActive = selectedContactId === contact.id;
                    return (
                      <button
                        key={contact.id}
                        onClick={() => setSelectedContactId(contact.id)}
                        className={`w-full px-4 py-3 text-left flex items-center gap-3 transition-colors border-b border-gray-100 dark:border-gray-800 last:border-b-0 ${
                          isActive
                            ? "bg-brand-50 dark:bg-brand-900/20"
                            : "hover:bg-gray-50 dark:hover:bg-gray-800/50"
                        }`}
                      >
                        <div className="w-9 h-9 rounded-full bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center text-brand-600 dark:text-brand-400 font-bold text-sm flex-shrink-0">
                          {contact.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className={`text-sm font-medium truncate ${isActive ? "text-brand-700 dark:text-brand-400" : "text-gray-900 dark:text-white"}`}>
                            {contact.name}
                          </p>
                          <p className="text-xs text-gray-400 truncate">
                            {lastMsg ? lastMsg.message : "No messages yet"}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Chat thread */}
                <div className="flex-1 flex flex-col min-w-0">
                  {selectedContactId ? (
                    <>
                      {/* Thread header */}
                      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-800 flex items-center gap-3 flex-shrink-0">
                        <div className="w-8 h-8 rounded-full bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center text-brand-600 dark:text-brand-400 font-bold text-sm">
                          {contacts.find((c) => c.id === selectedContactId)?.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-900 dark:text-white">
                            {contacts.find((c) => c.id === selectedContactId)?.name}
                          </p>
                          <p className="text-xs text-gray-400">Production Team</p>
                        </div>
                      </div>

                      {/* Messages */}
                      <div className="flex-1 overflow-y-auto p-4 space-y-3">
                        {activeThread.length === 0 ? (
                          <div className="flex items-center justify-center h-full">
                            <p className="text-sm text-gray-400 dark:text-gray-500">No messages yet. Say hello!</p>
                          </div>
                        ) : (
                          activeThread.map((msg) => {
                            const isMine = msg.fromId === user?.id;
                            return (
                              <div key={msg.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                                <div
                                  className={`max-w-[78%] rounded-2xl px-4 py-2.5 ${
                                    isMine
                                      ? "bg-brand-500 text-white rounded-br-sm"
                                      : "bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-bl-sm"
                                  }`}
                                >
                                  <p className="text-sm leading-relaxed">{msg.message}</p>
                                  <p className={`text-xs mt-1 ${isMine ? "text-white/60" : "text-gray-400"}`}>
                                    {new Date(msg.sentAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                  </p>
                                </div>
                              </div>
                            );
                          })
                        )}
                        <div ref={chatEndRef} />
                      </div>

                      {/* Reply input */}
                      <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-800 flex-shrink-0">
                        <div className="flex gap-2 items-end">
                          <textarea
                            rows={2}
                            value={replyText}
                            onChange={(e) => setReplyText(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" && !e.shiftKey) {
                                e.preventDefault();
                                sendReply();
                              }
                            }}
                            placeholder="Type a message… (Enter to send)"
                            className="flex-1 rounded-xl border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white resize-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                          />
                          <button
                            onClick={sendReply}
                            disabled={!replyText.trim()}
                            className="px-4 py-2 text-sm font-semibold text-white bg-brand-500 hover:bg-brand-600 rounded-xl transition-colors disabled:opacity-40 self-end"
                          >
                            Send
                          </button>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="flex-1 flex items-center justify-center">
                      <p className="text-sm text-gray-400">Select a contact to start chatting</p>
                    </div>
                  )}
                </div>
              </div>
            )}
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
