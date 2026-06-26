import { useState, useEffect, useMemo, useRef } from "react";
import PageMeta from "../../components/common/PageMeta";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import { useAuth } from "../../context/AuthContext";
import {
  getConversations, saveConversations,
  type Conversation, type ConvMessage, type ConvStatus,
} from "../../mock/conversationsData";
import { notifyClientPortalMessageSent } from "../../services/notificationHelpers";

const STATUS_LABEL: Record<ConvStatus, string> = {
  open: "Open",
  awaiting_client: "Awaiting Your Reply",
  awaiting_team: "Awaiting Team",
  closed: "Closed",
};

const STATUS_COLOR: Record<ConvStatus, string> = {
  open:            "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  awaiting_client: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  awaiting_team:   "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  closed:          "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
};

const DEPT_COLOR: Record<string, string> = {
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

export default function ClientMessages() {
  const { user } = useAuth();
  const chatEndRef = useRef<HTMLDivElement>(null);

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selected, setSelected] = useState<Conversation | null>(null);
  const [replyText, setReplyText] = useState("");

  useEffect(() => {
    if (!user) return;
    const all = getConversations();
    const mine = all.filter(c => c.clientId === user.id);
    setConversations(mine.sort((a, b) =>
      new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime()
    ));
  }, [user]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [selected?.messages.length]);

  const unreadTotal = useMemo(
    () => conversations.reduce((sum, c) => sum + c.unreadByClient, 0),
    [conversations]
  );

  const openConversation = (conv: Conversation) => {
    if (!user) return;
    const all = getConversations();
    const updated = all.map(c => {
      if (c.id !== conv.id) return c;
      return {
        ...c,
        unreadByClient: 0,
        messages: c.messages.map(m => ({
          ...m,
          readBy: m.readBy.includes(user.id) ? m.readBy : [...m.readBy, user.id],
        })),
      };
    });
    saveConversations(updated);
    const mine = updated.filter(c => c.clientId === user.id).sort(
      (a, b) => new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime()
    );
    setConversations(mine);
    setSelected(updated.find(c => c.id === conv.id) ?? null);
    setReplyText("");
  };

  const sendReply = () => {
    if (!user || !selected || !replyText.trim()) return;
    const msg: ConvMessage = {
      id: `msg-${Date.now()}`,
      conversationId: selected.id,
      senderId: user.id,
      senderName: user.name,
      senderRole: "client",
      body: replyText.trim(),
      sentAt: new Date().toISOString(),
      readBy: [user.id],
    };
    const all = getConversations();
    const updated = all.map(c => {
      if (c.id !== selected.id) return c;
      return {
        ...c,
        messages: [...c.messages, msg],
        lastActivity: msg.sentAt,
        status: "awaiting_team" as ConvStatus,
        unreadByTeam: c.unreadByTeam + 1,
      };
    });
    saveConversations(updated);
    // Notify assigned team member & super_admin/management
    notifyClientPortalMessageSent(user.id, user.name, selected.assignedUserId, selected.assignedDept, selected.subject, selected.id);
    const mine = updated.filter(c => c.clientId === user.id).sort(
      (a, b) => new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime()
    );
    setConversations(mine);
    setSelected(updated.find(c => c.id === selected.id) ?? null);
    setReplyText("");
  };

  return (
    <>
      <PageMeta title="Messages | Optivax Global" description="Your conversations with the Optivax team" />
      <PageBreadcrumb pageTitle="Messages" />

      {unreadTotal > 0 && (
        <div className="mb-4 px-4 py-3 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 text-sm text-blue-700 dark:text-blue-400">
          You have <strong>{unreadTotal}</strong> unread {unreadTotal === 1 ? "message" : "messages"} from the team.
        </div>
      )}

      <div className="flex gap-4 h-[calc(100vh-260px)] min-h-[500px]">

        {/* ── Conversation List ──────────────────────────────────────────────── */}
        <div className="w-72 flex-shrink-0 flex flex-col rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-800 flex-shrink-0">
            <h3 className="text-sm font-semibold text-gray-800 dark:text-white">Your Conversations</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{conversations.length} total</p>
          </div>
          <div className="flex-1 overflow-y-auto">
            {conversations.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full px-4 py-8 text-center">
                <p className="text-sm text-gray-400 dark:text-gray-500">
                  No messages yet. Your team will reach out soon.
                </p>
              </div>
            ) : (
              conversations.map(conv => {
                const isSelected = selected?.id === conv.id;
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
                      <p className={`text-sm truncate flex-1 ${conv.unreadByClient > 0 ? "font-semibold text-gray-900 dark:text-white" : "font-medium text-gray-700 dark:text-gray-300"}`}>
                        {conv.subject}
                      </p>
                      {conv.unreadByClient > 0 && (
                        <span className="flex-shrink-0 w-5 h-5 rounded-full bg-brand-500 text-white text-xs flex items-center justify-center">
                          {conv.unreadByClient}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`text-xs px-1.5 py-0.5 rounded-full ${DEPT_COLOR[conv.assignedDept] ?? "bg-gray-100 text-gray-600"}`}>
                        {conv.assignedDept}
                      </span>
                      <span className={`text-xs px-1.5 py-0.5 rounded-full ${STATUS_COLOR[conv.status]}`}>
                        {STATUS_LABEL[conv.status]}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">{timeAgo(conv.lastActivity)}</p>
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
                Click a conversation from the list to read messages and reply to your team.
              </p>
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-800 flex-shrink-0">
                <h3 className="text-base font-semibold text-gray-900 dark:text-white truncate">
                  {selected.subject}
                </h3>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <span className="text-xs text-gray-500">Team: {selected.assignedUserName}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${DEPT_COLOR[selected.assignedDept] ?? "bg-gray-100 text-gray-600"}`}>
                    {selected.assignedDept}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLOR[selected.status]}`}>
                    {STATUS_LABEL[selected.status]}
                  </span>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                {selected.messages.map(msg => {
                  const isMine = msg.senderRole === "client";
                  return (
                    <div key={msg.id} className={`flex gap-3 ${isMine ? "flex-row-reverse" : ""}`}>
                      <div
                        className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold ${
                          isMine
                            ? "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400"
                            : "bg-brand-100 dark:bg-brand-900/30 text-brand-700 dark:text-brand-400"
                        }`}
                      >
                        {msg.senderName.charAt(0)}
                      </div>
                      <div className={`flex-1 max-w-[75%] flex flex-col ${isMine ? "items-end" : "items-start"}`}>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                            {isMine ? "You" : msg.senderName}
                          </span>
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
              {selected.status !== "closed" ? (
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
                      placeholder="Reply to your team… (Enter to send)"
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
              ) : (
                <div className="px-5 py-3 border-t border-gray-200 dark:border-gray-800 flex-shrink-0">
                  <p className="text-xs text-center text-gray-400 dark:text-gray-500">
                    This conversation has been closed. Contact your team to reopen it.
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}
