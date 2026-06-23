import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import PageMeta from "../../components/common/PageMeta";
import { MailIcon } from "../../icons";
import { useNotifications } from "../../hooks/useNotifications";
import { useAuth } from "../../context/AuthContext";
import { getConversations, type Conversation } from "../../mock/conversationsData";

function timeAgo(dateStr: string): string {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

const TYPE_COLORS: Record<string, string> = {
  invoice: "text-yellow-600",
  project: "text-green-600",
  payment: "text-blue-600",
  system: "text-purple-600",
  profile: "text-gray-500",
};

const DEPT_COLOR: Record<string, string> = {
  Sales:      "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  Marketing:  "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400",
  Production: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  Management: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
};

export default function Notifications() {
  const { notifications, isLoading, unreadCount, markAsRead, markAllAsRead, deleteNotification } =
    useNotifications();
  const { user } = useAuth();
  const [tab, setTab] = useState<"notifications" | "messages">("notifications");
  const [myConvs, setMyConvs] = useState<Conversation[]>([]);

  useEffect(() => {
    if (!user) return;
    const all = getConversations();
    const mine = all
      .filter(c => c.clientId === user.id)
      .sort((a, b) => new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime())
      .slice(0, 5);
    setMyConvs(mine);
  }, [user]);

  const unreadMsgCount = myConvs.reduce((sum, c) => sum + c.unreadByClient, 0);

  return (
    <>
      <PageMeta
        title="Notifications | Optivax Global"
        description="View your notifications and updates."
      />
      <div className="flex flex-col gap-4 mb-6 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
            Notifications
          </h1>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Stay updated with project progress and important messages.
          </p>
        </div>
        {tab === "notifications" && unreadCount > 0 && (
          <button
            onClick={markAllAsRead}
            className="text-sm px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            Mark all as read
          </button>
        )}
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 mb-4 border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={() => setTab("notifications")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition ${
            tab === "notifications"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
          }`}
        >
          Notifications
          {unreadCount > 0 && (
            <span className="ml-2 inline-flex items-center justify-center px-2 py-0.5 text-xs font-bold rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
              {unreadCount}
            </span>
          )}
        </button>
        <button
          onClick={() => setTab("messages")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition ${
            tab === "messages"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
          }`}
        >
          Messages from Team
          {unreadMsgCount > 0 && (
            <span className="ml-2 inline-flex items-center justify-center px-2 py-0.5 text-xs font-bold rounded-full bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300">
              {unreadMsgCount}
            </span>
          )}
        </button>
      </div>

      {tab === "notifications" ? (
        <div className="rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Recent Notifications
            </h3>
          </div>
          <div className="p-6">
            {isLoading ? (
              <div className="flex h-32 items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-solid border-brand-500 border-t-transparent" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <MailIcon className="w-12 h-12 text-gray-300 dark:text-gray-600 mb-3" />
                <p className="text-sm text-gray-500 dark:text-gray-400">No notifications yet.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {notifications.map((n) => (
                  <div
                    key={n.id}
                    className={`flex items-start space-x-4 p-4 border rounded-lg cursor-pointer transition ${
                      !n.read
                        ? "border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/20"
                        : "border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
                    }`}
                    onClick={() => !n.read && markAsRead(n.id)}
                  >
                    <MailIcon
                      className={`w-5 h-5 mt-0.5 flex-shrink-0 ${TYPE_COLORS[n.type] ?? "text-gray-500"}`}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <h4
                          className={`font-medium text-sm ${
                            !n.read
                              ? "text-gray-900 dark:text-white"
                              : "text-gray-700 dark:text-gray-300"
                          }`}
                        >
                          {n.title}
                        </h4>
                        {!n.read && (
                          <span className="flex-shrink-0 w-2 h-2 rounded-full bg-blue-500 mt-1.5" />
                        )}
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
                        {n.message}
                      </p>
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                        {timeAgo(n.createdAt)}
                      </p>
                      {n.actionUrl && n.actionLabel && (
                        <a
                          href={n.actionUrl}
                          className="text-xs text-blue-600 hover:underline mt-1 inline-block"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {n.actionLabel} →
                        </a>
                      )}
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteNotification(n.id);
                      }}
                      className="text-gray-300 hover:text-red-500 dark:text-gray-600 dark:hover:text-red-400 transition text-xs px-1 flex-shrink-0"
                      title="Dismiss"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Messages from Your Team
            </h3>
            <Link
              to="/client/messages"
              className="text-sm font-medium text-brand-600 dark:text-brand-400 hover:underline"
            >
              View all messages →
            </Link>
          </div>
          <div className="p-6">
            {myConvs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <MailIcon className="w-12 h-12 text-gray-300 dark:text-gray-600 mb-3" />
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  No messages from the team yet.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {myConvs.map((conv) => {
                  const lastMsg = conv.messages[conv.messages.length - 1];
                  return (
                    <Link
                      key={conv.id}
                      to="/client/messages"
                      className="block p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition"
                    >
                      <div className="flex items-start justify-between gap-3 mb-1">
                        <p className={`text-sm truncate flex-1 ${conv.unreadByClient > 0 ? "font-semibold text-gray-900 dark:text-white" : "font-medium text-gray-700 dark:text-gray-300"}`}>
                          {conv.subject}
                        </p>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {conv.unreadByClient > 0 && (
                            <span className="w-5 h-5 rounded-full bg-brand-500 text-white text-xs flex items-center justify-center">
                              {conv.unreadByClient}
                            </span>
                          )}
                          <span className="text-xs text-gray-400">{timeAgo(conv.lastActivity)}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center text-xs font-semibold text-blue-700 dark:text-blue-300">
                          {conv.assignedUserName.charAt(0)}
                        </div>
                        <span className="text-xs text-gray-500">{conv.assignedUserName}</span>
                        <span className={`text-xs px-1.5 py-0.5 rounded-full ${DEPT_COLOR[conv.assignedDept] ?? "bg-gray-100 text-gray-600"}`}>
                          {conv.assignedDept}
                        </span>
                      </div>
                      {lastMsg && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 truncate pl-8">
                          {lastMsg.senderRole === "client" ? "You: " : `${lastMsg.senderName}: `}
                          {lastMsg.body}
                        </p>
                      )}
                    </Link>
                  );
                })}
                <div className="pt-2 text-center">
                  <Link
                    to="/client/messages"
                    className="text-sm font-medium text-brand-600 dark:text-brand-400 hover:underline"
                  >
                    Open Messages page to reply →
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
