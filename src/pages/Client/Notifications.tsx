import { useState } from "react";
import PageMeta from "../../components/common/PageMeta";
import { MailIcon } from "../../icons";
import { useNotifications } from "../../hooks/useNotifications";
import { useAuth } from "../../context/AuthContext";
import { safeParse } from "../../lib/storage";

const PROD_MESSAGES_KEY = "optivax_client_messages";

interface ClientMessage {
  id: string;
  fromId: string;
  fromName: string;
  toClientId: string;
  toClientName: string;
  message: string;
  sentAt: string;
}

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

export default function Notifications() {
  const { notifications, isLoading, unreadCount, markAsRead, markAllAsRead, deleteNotification } =
    useNotifications();
  const { user } = useAuth();
  const [tab, setTab] = useState<"notifications" | "messages">("notifications");

  const allMessages = safeParse<ClientMessage[]>(localStorage.getItem(PROD_MESSAGES_KEY), []);
  const myMessages = user?.id
    ? allMessages.filter((m) => m.toClientId === user.id)
    : [];
  const displayMessages = myMessages;

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
          {displayMessages.length > 0 && (
            <span className="ml-2 inline-flex items-center justify-center px-2 py-0.5 text-xs font-bold rounded-full bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300">
              {displayMessages.length}
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
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Messages from Production Team
            </h3>
          </div>
          <div className="p-6">
            {displayMessages.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <MailIcon className="w-12 h-12 text-gray-300 dark:text-gray-600 mb-3" />
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  No messages from the team yet.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {[...displayMessages].reverse().map((msg) => (
                  <div
                    key={msg.id}
                    className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center text-xs font-semibold text-blue-700 dark:text-blue-300">
                          {msg.fromName.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {msg.fromName}
                        </span>
                        <span className="text-xs text-gray-400 dark:text-gray-500">
                          &bull; Production Team
                        </span>
                      </div>
                      <span className="text-xs text-gray-400 dark:text-gray-500">
                        {timeAgo(msg.sentAt)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 dark:text-gray-300 pl-9">
                      {msg.message}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
