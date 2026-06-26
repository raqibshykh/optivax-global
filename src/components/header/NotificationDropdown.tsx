import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { useNotifications } from "../../hooks/useNotifications";
import { useAuth } from "../../context/AuthContext";
import type { Notification, NotificationModule } from "../../types";

// ── Helpers ───────────────────────────────────────────────────────────────────

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60)  return "just now";
  const m = Math.floor(s / 60);
  if (m < 60)  return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24)  return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7)   return `${d}d ago`;
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

const MODULE_ICON: Record<NotificationModule | "default", string> = {
  attendance: "📋",
  leave:      "📅",
  payroll:    "💰",
  advance:    "💵",
  budget:     "💼",
  employee:   "👤",
  project:    "📁",
  task:       "✅",
  campaign:   "📢",
  security:   "🔐",
  login:      "🔑",
  production: "⚙️",
  client:     "🤝",
  general:    "🔔",
  sales:      "📈",
  message:    "💬",
  ticket:     "🎫",
  default:    "🔔",
};

const TYPE_COLOR: Record<string, string> = {
  invoice: "bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400",
  project: "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400",
  payment: "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400",
  system:  "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
  profile: "bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400",
};

function getIcon(n: Notification): string {
  if (n.module) return MODULE_ICON[n.module] ?? MODULE_ICON.default;
  return MODULE_ICON.default;
}

function getViewAllPath(role: string): string {
  if (role === "super_admin")  return "/admin/notifications";
  if (role === "client")       return "/client/notifications";
  if (role === "management")   return "/management/notifications";
  if (role.startsWith("hr"))   return "/hr/notifications";
  if (role.startsWith("sales"))      return "/sales/notifications";
  if (role.startsWith("marketing"))  return "/marketing/notifications";
  if (role.startsWith("production")) return "/production/notifications";
  if (role.startsWith("it"))         return "/it/notifications";
  return "/notifications";
}

// ── Notification Item ─────────────────────────────────────────────────────────

function NotifItem({ notif, onRead, onDelete }: {
  notif: Notification;
  onRead: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <li
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={`relative flex gap-3 rounded-xl px-3 py-3 transition-colors cursor-pointer ${
        notif.read
          ? "hover:bg-gray-50 dark:hover:bg-white/5"
          : "bg-blue-50/60 dark:bg-blue-950/20 hover:bg-blue-50 dark:hover:bg-blue-950/30"
      }`}
      onClick={() => { if (!notif.read) onRead(notif.id); }}
    >
      {/* Module icon */}
      <span className="shrink-0 flex items-center justify-center w-9 h-9 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-lg shadow-sm">
        {getIcon(notif)}
      </span>

      {/* Content */}
      <span className="flex-1 min-w-0 block">
        <span className={`block text-sm leading-tight mb-0.5 truncate ${notif.read ? "text-gray-700 dark:text-gray-300" : "text-gray-900 dark:text-white font-semibold"}`}>
          {notif.title}
        </span>
        <span className="block text-xs text-gray-500 dark:text-gray-400 leading-relaxed line-clamp-2">
          {notif.message}
        </span>
        <span className="flex items-center gap-1.5 mt-1">
          <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${TYPE_COLOR[notif.type] ?? TYPE_COLOR.system}`}>
            {notif.module ?? notif.type}
          </span>
          <span className="text-[10px] text-gray-400">·</span>
          <span className="text-[10px] text-gray-400">{timeAgo(notif.createdAt)}</span>
        </span>
      </span>

      {/* Unread dot */}
      {!notif.read && (
        <span className="shrink-0 mt-1.5 w-2 h-2 rounded-full bg-brand-500" />
      )}

      {/* Delete button (visible on hover) */}
      {hovered && (
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(notif.id); }}
          className="absolute top-2 right-2 text-gray-300 hover:text-red-500 dark:text-gray-600 dark:hover:text-red-400 text-sm leading-none"
          title="Dismiss"
        >
          ×
        </button>
      )}
    </li>
  );
}

// ── Main Dropdown ─────────────────────────────────────────────────────────────

export default function NotificationDropdown() {
  const { user } = useAuth();
  const { notifications, unreadCount, isLoading, markAsRead, markAllAsRead, deleteNotification } = useNotifications();

  const [isOpen,  setIsOpen]  = useState(false);
  const [filter,  setFilter]  = useState<"all" | "unread">("all");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setIsOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const displayed = [...notifications]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .filter(n => filter === "all" || !n.read)
    .slice(0, 8);

  const viewAllPath = getViewAllPath(user?.role ?? "");

  return (
    <div ref={ref} className="relative">
      {/* Bell button */}
      <button
        onClick={() => setIsOpen(p => !p)}
        className="relative flex items-center justify-center text-gray-500 transition-colors bg-white border border-gray-200 rounded-full hover:text-gray-700 h-11 w-11 hover:bg-gray-100 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
      >
        {/* Unread badge */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 z-10 flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold leading-none">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}

        <svg className="fill-current" width="20" height="20" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
          <path fillRule="evenodd" clipRule="evenodd" d="M10.75 2.29248C10.75 1.87827 10.4143 1.54248 10 1.54248C9.58583 1.54248 9.25004 1.87827 9.25004 2.29248V2.83613C6.08266 3.20733 3.62504 5.9004 3.62504 9.16748V14.4591H3.33337C2.91916 14.4591 2.58337 14.7949 2.58337 15.2091C2.58337 15.6234 2.91916 15.9591 3.33337 15.9591H4.37504H15.625H16.6667C17.0809 15.9591 17.4167 15.6234 17.4167 15.2091C17.4167 14.7949 17.0809 14.4591 16.6667 14.4591H16.375V9.16748C16.375 5.9004 13.9174 3.20733 10.75 2.83613V2.29248ZM14.875 14.4591V9.16748C14.875 6.47509 12.6924 4.29248 10 4.29248C7.30765 4.29248 5.12504 6.47509 5.12504 9.16748V14.4591H14.875ZM8.00004 17.7085C8.00004 18.1228 8.33583 18.4585 8.75004 18.4585H11.25C11.6643 18.4585 12 18.1228 12 17.7085C12 17.2943 11.6643 16.9585 11.25 16.9585H8.75004C8.33583 16.9585 8.00004 17.2943 8.00004 17.7085Z" fill="currentColor" />
        </svg>
      </button>

      {/* Dropdown panel */}
      {isOpen && (
        <div className="absolute right-0 mt-3 w-[calc(100vw-2rem)] max-w-[380px] rounded-2xl border border-gray-200 bg-white shadow-xl dark:border-gray-800 dark:bg-gray-dark z-50 flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-700">
            <div className="flex items-center gap-2">
              <h5 className="text-sm font-semibold text-gray-900 dark:text-white">Notifications</h5>
              {unreadCount > 0 && (
                <span className="flex items-center justify-center px-1.5 py-0.5 rounded-full bg-red-500 text-white text-[10px] font-bold">
                  {unreadCount}
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={() => markAllAsRead().catch(() => {})}
                className="text-xs text-brand-600 hover:text-brand-800 dark:text-brand-400 dark:hover:text-brand-300 font-medium"
              >
                Mark all read
              </button>
            )}
          </div>

          {/* Filter tabs */}
          <div className="flex gap-1 px-3 pt-2">
            {(["all", "unread"] as const).map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                  filter === f
                    ? "bg-brand-500 text-white"
                    : "text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                }`}>
                {f === "all" ? "All" : `Unread${unreadCount > 0 ? ` (${unreadCount})` : ""}`}
              </button>
            ))}
          </div>

          {/* List */}
          <ul className="flex flex-col overflow-y-auto max-h-[360px] px-2 py-2 gap-0.5 custom-scrollbar">
            {isLoading ? (
              <li className="py-8 text-center text-sm text-gray-400">Loading…</li>
            ) : displayed.length === 0 ? (
              <li className="py-10 flex flex-col items-center gap-2">
                <span className="text-3xl">🔔</span>
                <p className="text-sm text-gray-400 dark:text-gray-500">
                  {filter === "unread" ? "No unread notifications" : "No notifications yet"}
                </p>
              </li>
            ) : (
              displayed.map(n => (
                <NotifItem
                  key={n.id}
                  notif={n}
                  onRead={id => markAsRead(id).catch(() => {})}
                  onDelete={id => deleteNotification(id).catch(() => {})}
                />
              ))
            )}
          </ul>

          {/* Footer */}
          <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-700">
            <Link
              to={viewAllPath}
              onClick={() => setIsOpen(false)}
              className="block w-full py-2 text-xs font-medium text-center text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              View all notifications
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
