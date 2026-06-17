import { useEffect, useState } from "react";
import { AuditLogService } from "../../services/auditLogService";
import { AuditLog } from "../../types";

const ACTION_ICONS: Record<string, string> = {
  USER_CREATED: "👤",
  CLIENT_CREATED: "🏢",
  CLIENT_ASSIGNED: "🔗",
  TASK_ASSIGNED: "📋",
  TASK_UPDATED: "✏️",
  TASK_COMPLETED: "✅",
  LEAVE_SUBMITTED: "📅",
  LEAVE_APPROVED: "✅",
  LEAVE_REJECTED: "❌",
  PAYROLL_UPDATED: "💰",
  ATTENDANCE_MODIFIED: "📊",
  CAMPAIGN_CREATED: "📢",
  BUDGET_CHANGED: "💵",
  DELIVERABLE_UPLOADED: "📦",
  DELIVERABLE_APPROVED: "✅",
  PASSWORD_RESET: "🔑",
};

function timeAgo(ts: string): string {
  const diff = Date.now() - new Date(ts).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

interface ActivityFeedProps {
  limit?: number;
  compact?: boolean;
}

export default function ActivityFeed({ limit = 20, compact = false }: ActivityFeedProps) {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [, setTick] = useState(0);

  useEffect(() => {
    setLogs(AuditLogService.getRecent(limit));
    // Refresh every 30s so new events appear without page reload
    const id = setInterval(() => {
      setLogs(AuditLogService.getRecent(limit));
      setTick((t) => t + 1);
    }, 30000);
    return () => clearInterval(id);
  }, [limit]);

  if (logs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          No activity yet. Events will appear here as actions are performed.
        </p>
      </div>
    );
  }

  return (
    <div className={`space-y-1 ${compact ? "" : "divide-y divide-gray-100 dark:divide-gray-800"}`}>
      {logs.map((log) => (
        <div
          key={log.id}
          className={`flex items-start gap-3 ${compact ? "py-2" : "py-3"} hover:bg-gray-50 dark:hover:bg-gray-800/40 rounded-lg px-2 transition`}
        >
          <span className="text-lg flex-shrink-0 mt-0.5" role="img" aria-hidden>
            {ACTION_ICONS[log.action] ?? "🔔"}
          </span>
          <div className="flex-1 min-w-0">
            <p className={`text-gray-700 dark:text-gray-200 ${compact ? "text-xs" : "text-sm"}`}>
              {log.description}
            </p>
            {!compact && (
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                {log.performedByRole.replace(/_/g, " ")}
              </p>
            )}
          </div>
          <span className="flex-shrink-0 text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap">
            {timeAgo(log.timestamp)}
          </span>
        </div>
      ))}
    </div>
  );
}
