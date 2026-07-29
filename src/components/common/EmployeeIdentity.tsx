import Avatar, { type AvatarSize } from "./Avatar";

export interface EmployeeIdentityProps {
  src?: string | null;
  name?: string | null;
  /** Secondary line 1 — e.g. employee id or email. */
  employeeId?: string | null;
  department?: string | null;
  designation?: string | null;
  size?: AvatarSize;
  className?: string;
}

/**
 * Avatar + Name + (Employee ID / Department / Designation) — the reusable table-row/list-item
 * identity block for "wherever employee information appears" (Task 2's employee-photo
 * requirement). Callers that don't have department/designation resolved yet can simply omit
 * those props; only Name is required to render something meaningful.
 */
export default function EmployeeIdentity({
  src, name, employeeId, department, designation, size = "md", className = "",
}: EmployeeIdentityProps) {
  const metaParts = [employeeId, department, designation].filter(Boolean);

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <Avatar src={src} name={name} size={size} />
      <div className="min-w-0">
        <div className="text-sm font-medium text-gray-900 dark:text-white truncate">{name || "—"}</div>
        {metaParts.length > 0 && (
          <div className="text-xs text-gray-500 dark:text-gray-400 truncate">{metaParts.join(" · ")}</div>
        )}
      </div>
    </div>
  );
}
