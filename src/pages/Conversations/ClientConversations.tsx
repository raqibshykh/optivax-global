import React, { useState, useEffect, useMemo, useRef } from "react";
import PageMeta from "../../components/common/PageMeta";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import { useAuth } from "../../context/AuthContext";
import { safeParse } from "../../lib/storage";
import type { StoredClient, UserRole } from "../../types";
import {
  getConversations, saveConversations, getVisibleConversations,
  getConvStats, CAN_INITIATE_ROLES, DEPT_FOR_ROLE,
  type Conversation, type ConvMessage, type ConvStatus, type ConvDept,
} from "../../mock/conversationsData";

const CLIENTS_KEY = "optivax_clients";

const STATUS_LABEL: Record<ConvStatus, string> = {
  open: "Open",
  awaiting_client: "Awaiting Client",
  awaiting_team: "Awaiting Team",
  closed: "Closed",
};

const STATUS_COLOR: Record<ConvStatus, string> = {
  open:            "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  awaiting_client: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  awaiting_team:   "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  closed:          "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
};

const DEPT_COLOR: Record<ConvDept, string> = {
  Sales:      "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  Marketing:  "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400",
  Production: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  Management: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
};

function timeAgo(dateStr: string): string {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

export default function ClientConversations() {
  const { user } = useAuth();
  const chatEndRef = useRef<HTMLDivElement>(null);

  const [allConvs, setAllConvs] = useState<Conversation[]>([]);
  const [selected, setSelected] = useState<Conversation | null>(null);
  const [replyText, setReplyText] = useState("");
  const [statusFilter, setStatusFilter] = useState<ConvStatus | "all">("all");
  const [search, setSearch] = useState("");
  const [showNewModal, setShowNewModal] = useState(false);
  const [clients, setClients] = useState<StoredClient[]>([]);

  // New conversation form
  const [newSubject, setNewSubject] = useState("");
  const [newClientId, setNewClientId] = useState("");
  const [newBody, setNewBody] = useState("");
  const [newDept, setNewDept] = useState<ConvDept>("Sales");

  useEffect(() => {
    if (!user) return;
    const all = getConversations();
    const visible = getVisibleConversations(all, user.role, user.id);
    setAllConvs(visible);
    setClients(safeParse<StoredClient[]>(localStorage.getItem(CLIENTS_KEY), []));
  }, [user]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [selected?.messages.length]);

  const stats = useMemo(() => getConvStats(allConvs), [allConvs]);

  const filtered = useMemo(() => {
    let list = [...allConvs];
    if (statusFilter !== "all") list = list.filter(c => c.status === statusFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(c =>
        c.subject.toLowerCase().includes(q) ||
        c.clientName.toLowerCase().includes(q)
      );
    }
    return list.sort(
      (a, b) => new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime()
    );
  }, [allConvs, statusFilter, search]);

  const refreshState = (updated: Conversation[]) => {
    const raw = getConversations();
    // Replace the visible ones in the full list
    const visibleIds = new Set(updated.map(c => c.id));
    const merged = raw.map(c => (visibleIds.has(c.id) ? updated.find(u => u.id === c.id)! : c));
    // Add any new ones (id not in raw)
    const rawIds = new Set(raw.map(c => c.id));
    updated.forEach(c => { if (!rawIds.has(c.id)) merged.push(c); });
    saveConversations(merged);
    if (!user) return;
    const visible = getVisibleConversations(merged, user.role, user.id);
    setAllConvs(visible);
  };

  const openConversation = (conv: Conversation) => {
    if (!user) return;
    const isClient = user.role === "client";
    const updated = allConvs.map(c => {
      if (c.id !== conv.id) return c;
      return {
        ...c,
        unreadByTeam: isClient ? c.unreadByTeam : 0,
        unreadByClient: isClient ? 0 : c.unreadByClient,
        messages: c.messages.map(m => ({
          ...m,
          readBy: m.readBy.includes(user.id) ? m.readBy : [...m.readBy, user.id],
        })),
      };
    });
    refreshState(updated);
    setSelected(updated.find(c => c.id === conv.id) ?? null);
    setReplyText("");
  };

  const sendReply = () => {
    if (!user || !selected || !replyText.trim()) return;
    const isClient = user.role === "client";
    const msg: ConvMessage = {
      id: `msg-${Date.now()}`,
      conversationId: selected.id,
      senderId: user.id,
      senderName: user.name,
      senderRole: user.role,
      body: replyText.trim(),
      sentAt: new Date().toISOString(),
      readBy: [user.id],
    };
    const updated = allConvs.map(c => {
      if (c.id !== selected.id) return c;
      return {
        ...c,
        messages: [...c.messages, msg],
        lastActivity: msg.sentAt,
        status: (isClient ? "awaiting_team" : "awaiting_client") as ConvStatus,
        unreadByTeam: isClient ? c.unreadByTeam + 1 : c.unreadByTeam,
        unreadByClient: isClient ? c.unreadByClient : c.unreadByClient + 1,
      };
    });
    refreshState(updated);
    setSelected(updated.find(c => c.id === selected.id) ?? null);
    setReplyText("");
  };

  const changeStatus = (status: ConvStatus) => {
    if (!selected || !user) return;
    const updated = allConvs.map(c =>
      c.id === selected.id ? { ...c, status } : c
    );
    refreshState(updated);
    setSelected(updated.find(c => c.id === selected.id) ?? null);
  };

  const createConversation = () => {
    if (!user || !newSubject.trim() || !newClientId || !newBody.trim()) return;
    const client = clients.find(c => c.id === newClientId);
    if (!client) return;
    const dept: ConvDept =
      user.role === "management" || user.role === "super_admin"
        ? newDept
        : (DEPT_FOR_ROLE[user.role as UserRole] ?? newDept);
    const convId = `conv-${Date.now()}`;
    const conv: Conversation = {
      id: convId,
      subject: newSubject.trim(),
      clientId: newClientId,
      clientName: client.contactName,
      clientEmail: client.email,
      assignedDept: dept,
      assignedUserId: user.id,
      assignedUserName: user.name,
      status: "awaiting_client",
      createdAt: new Date().toISOString(),
      lastActivity: new Date().toISOString(),
      unreadByClient: 1,
      unreadByTeam: 0,
      messages: [
        {
          id: `msg-${Date.now()}`,
          conversationId: convId,
          senderId: user.id,
          senderName: user.name,
          senderRole: user.role,
          body: newBody.trim(),
          sentAt: new Date().toISOString(),
          readBy: [user.id],
        },
      ],
    };
    const all = getConversations();
    const merged = [...all, conv];
    saveConversations(merged);
    const visible = getVisibleConversations(merged, user.role, user.id);
    setAllConvs(visible);
    setSelected(conv);
    setShowNewModal(false);
    setNewSubject(""); setNewClientId(""); setNewBody(""); setNewDept("Sales");
  };

  const canInitiate = user ? CAN_INITIATE_ROLES.includes(user.role as UserRole) : false;
  const canAdmin = user?.role === "super_admin" || user?.role === "management" ||
    user?.role?.endsWith("_admin");
  const showDeptSelector = user?.role === "super_admin" || user?.role === "management";

  return (
    <>
      <PageMeta title="Client Messages | Optivax CRM" description="Unified client communication hub" />
      <PageBreadcrumb pageTitle="Client Messages" />

      {/* ── KPI Strip ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        {[
          { label: "Open", value: stats.open, color: "text-green-600" },
          { label: "Awaiting Client", value: stats.awaitingClient, color: "text-blue-600" },
          { label: "Awaiting Team", value: stats.awaitingTeam, color: "text-yellow-600" },
          { label: "Unread", value: stats.unreadByTeam, color: "text-red-600" },
          { label: "Closed", value: stats.closed, color: "text-gray-500" },
        ].map(({ label, value, color }) => (
          <div key={label} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900 text-center">
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* ── Main Layout ────────────────────────────────────────────────────── */}
      <div className="flex gap-4 h-[calc(100vh-280px)] min-h-[500px]">

        {/* ── Conversation List Panel ──────────────────────────────────────── */}
        <div className="w-80 flex-shrink-0 flex flex-col rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900 overflow-hidden">
          {/* Header */}
          <div className="p-3 border-b border-gray-200 dark:border-gray-800 flex-shrink-0">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-gray-800 dark:text-white">Conversations</h3>
              {canInitiate && (
                <button
                  onClick={() => setShowNewModal(true)}
                  className="text-xs font-medium text-white bg-brand-500 hover:bg-brand-600 px-3 py-1.5 rounded-lg transition-colors"
                >
                  + New
                </button>
              )}
            </div>
            {/* Search */}
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search…"
              className="w-full rounded-lg border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white text-sm px-3 py-1.5 focus:ring-2 focus:ring-brand-500 focus:border-transparent mb-2"
            />
            {/* Status filter */}
            <div className="flex gap-1 flex-wrap">
              {(["all", "open", "awaiting_team", "awaiting_client", "closed"] as const).map(s => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={`text-xs px-2 py-0.5 rounded-full transition-colors ${
                    statusFilter === s
                      ? "bg-brand-500 text-white"
                      : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
                  }`}
                >
                  {s === "all" ? "All" : STATUS_LABEL[s]}
                </button>
              ))}
            </div>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full py-8 text-center px-4">
                <p className="text-sm text-gray-400 dark:text-gray-500">No conversations found</p>
              </div>
            ) : (
              filtered.map(conv => {
                const isSelected = selected?.id === conv.id;
                const unread = conv.unreadByTeam;
                return (
                  <button
                    key={conv.id}
                    onClick={() => openConversation(conv)}
                    className={`w-full text-left p-3 border-b border-gray-100 dark:border-gray-800 transition-colors ${
                      isSelected
                        ? "bg-brand-50 dark:bg-brand-900/20"
                        : "hover:bg-gray-50 dark:hover:bg-gray-800/50"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-0.5">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate flex-1">
                        {conv.subject}
                      </p>
                      {unread > 0 && (
                        <span className="flex-shrink-0 w-5 h-5 rounded-full bg-brand-500 text-white text-xs flex items-center justify-center">
                          {unread}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate mb-1">
                      {conv.clientName}
                    </p>
                    <div className="flex items-center justify-between gap-1">
                      <span className={`inline-block text-xs px-1.5 py-0.5 rounded-full ${STATUS_COLOR[conv.status]}`}>
                        {STATUS_LABEL[conv.status]}
                      </span>
                      <span className="text-xs text-gray-400">{timeAgo(conv.lastActivity)}</span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* ── Thread Panel ──────────────────────────────────────────────────── */}
        <div className="flex-1 flex flex-col rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900 overflow-hidden">
          {!selected ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-8">
              <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <h4 className="text-base font-semibold text-gray-900 dark:text-white mb-1">Select a conversation</h4>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Choose a conversation from the list to view the thread and reply.
              </p>
              {canInitiate && filtered.length === 0 && (
                <button
                  onClick={() => setShowNewModal(true)}
                  className="mt-4 text-sm font-medium text-white bg-brand-500 hover:bg-brand-600 px-4 py-2 rounded-lg transition-colors"
                >
                  Start a new conversation
                </button>
              )}
            </div>
          ) : (
            <>
              {/* Thread Header */}
              <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-800 flex-shrink-0">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base font-semibold text-gray-900 dark:text-white truncate">
                      {selected.subject}
                    </h3>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span className="text-xs text-gray-500">
                        {selected.clientName} · {selected.clientEmail}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${DEPT_COLOR[selected.assignedDept]}`}>
                        {selected.assignedDept}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLOR[selected.status]}`}>
                        {STATUS_LABEL[selected.status]}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Assigned to {selected.assignedUserName} · {selected.messages.length} messages
                    </p>
                  </div>
                  {/* Status controls (admin only) */}
                  {canAdmin && selected.status !== "closed" && (
                    <div className="flex gap-2 flex-shrink-0">
                      {selected.status !== "open" && (
                        <button
                          onClick={() => changeStatus("open")}
                          className="text-xs font-medium px-3 py-1.5 rounded-lg bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/40 transition-colors"
                        >
                          Mark Open
                        </button>
                      )}
                      <button
                        onClick={() => changeStatus("closed")}
                        className="text-xs font-medium px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                      >
                        Close
                      </button>
                    </div>
                  )}
                  {canAdmin && selected.status === "closed" && (
                    <button
                      onClick={() => changeStatus("open")}
                      className="text-xs font-medium px-3 py-1.5 rounded-lg bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/40 transition-colors flex-shrink-0"
                    >
                      Reopen
                    </button>
                  )}
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                {selected.messages.map(msg => {
                  const isMine = msg.senderId === user?.id;
                  const isClientMsg = msg.senderRole === "client";
                  return (
                    <div key={msg.id} className={`flex gap-3 ${isMine ? "flex-row-reverse" : ""}`}>
                      <div
                        className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold ${
                          isClientMsg
                            ? "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400"
                            : "bg-brand-100 dark:bg-brand-900/30 text-brand-700 dark:text-brand-400"
                        }`}
                      >
                        {msg.senderName.charAt(0)}
                      </div>
                      <div className={`flex-1 max-w-[75%] ${isMine ? "items-end" : "items-start"} flex flex-col`}>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                            {isMine ? "You" : msg.senderName}
                          </span>
                          {isClientMsg && (
                            <span className="text-xs px-1.5 py-0.5 rounded bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400">
                              Client
                            </span>
                          )}
                          <span className="text-xs text-gray-400">{timeAgo(msg.sentAt)}</span>
                        </div>
                        <div
                          className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                            isMine
                              ? "bg-brand-500 text-white rounded-tr-sm"
                              : "bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-tl-sm"
                          }`}
                        >
                          {msg.body}
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={chatEndRef} />
              </div>

              {/* Reply box */}
              {selected.status !== "closed" && (
                <div className="px-5 py-4 border-t border-gray-200 dark:border-gray-800 flex-shrink-0">
                  <div className="flex gap-3 items-end">
                    <textarea
                      rows={2}
                      value={replyText}
                      onChange={e => setReplyText(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          sendReply();
                        }
                      }}
                      placeholder="Type a reply… (Enter to send)"
                      className="flex-1 rounded-xl border border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-white px-3 py-2 text-sm resize-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                    />
                    <button
                      onClick={sendReply}
                      disabled={!replyText.trim()}
                      className="px-4 py-2.5 text-sm font-semibold text-white bg-brand-500 hover:bg-brand-600 rounded-xl transition-colors disabled:opacity-40 self-end"
                    >
                      Send
                    </button>
                  </div>
                </div>
              )}
              {selected.status === "closed" && (
                <div className="px-5 py-3 border-t border-gray-200 dark:border-gray-800 flex-shrink-0">
                  <p className="text-xs text-center text-gray-400 dark:text-gray-500">
                    This conversation is closed.
                    {canAdmin && (
                      <button onClick={() => changeStatus("open")} className="ml-1 text-brand-500 hover:underline">
                        Reopen to reply.
                      </button>
                    )}
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* ── New Conversation Modal ─────────────────────────────────────────── */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-gray-900 shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800">
              <h3 className="text-base font-semibold text-gray-900 dark:text-white">New Conversation</h3>
              <button
                onClick={() => setShowNewModal(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-2xl leading-none"
              >
                ×
              </button>
            </div>
            <div className="p-6 space-y-4">
              {/* Client select */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Client
                </label>
                {clients.length === 0 ? (
                  <p className="text-sm text-gray-400">No clients found. Sales Admin must create clients first.</p>
                ) : (
                  <select
                    value={newClientId}
                    onChange={e => setNewClientId(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-white px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                  >
                    <option value="">— Select client —</option>
                    {clients.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.contactName} ({c.companyName})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Department (only management/super_admin choose) */}
              {showDeptSelector && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Department
                  </label>
                  <select
                    value={newDept}
                    onChange={e => setNewDept(e.target.value as ConvDept)}
                    className="w-full rounded-lg border border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-white px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                  >
                    {(["Sales", "Marketing", "Production", "Management"] as ConvDept[]).map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Subject */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Subject
                </label>
                <input
                  type="text"
                  value={newSubject}
                  onChange={e => setNewSubject(e.target.value)}
                  placeholder="e.g. Project kickoff update"
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-white px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                />
              </div>

              {/* Initial message */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Message
                </label>
                <textarea
                  rows={4}
                  value={newBody}
                  onChange={e => setNewBody(e.target.value)}
                  placeholder="Type your opening message…"
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-white px-3 py-2 text-sm resize-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-800 flex justify-end gap-3">
              <button
                onClick={() => setShowNewModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={createConversation}
                disabled={!newSubject.trim() || !newClientId || !newBody.trim()}
                className="px-4 py-2 text-sm font-semibold text-white bg-brand-500 hover:bg-brand-600 rounded-lg transition-colors disabled:opacity-40"
              >
                Send Message
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
