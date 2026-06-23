import { useEffect, useState } from "react";
import { UserService, UserProfile } from "../../services/userService";

interface HierarchyNode {
  roleLabel: string;
  roleKey: string;
  color: string;
  users: UserProfile[];
  children?: HierarchyNode[];
}

const ROLE_META: Record<string, { label: string; color: string; dot: string }> = {
  super_admin:       { label: "Super Admin",        color: "border-purple-500 bg-purple-50 dark:bg-purple-900/20", dot: "bg-purple-500" },
  management:        { label: "Management",          color: "border-blue-500 bg-blue-50 dark:bg-blue-900/20",       dot: "bg-blue-500" },
  hr_admin:          { label: "HR Admin",            color: "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20", dot: "bg-indigo-500" },
  hr_member:         { label: "HR Members",          color: "border-indigo-300 bg-indigo-50/50 dark:bg-indigo-900/10", dot: "bg-indigo-300" },
  sales_admin:       { label: "Sales Admin",         color: "border-green-500 bg-green-50 dark:bg-green-900/20",    dot: "bg-green-500" },
  sales_member:      { label: "Sales Members",       color: "border-green-300 bg-green-50/50 dark:bg-green-900/10", dot: "bg-green-300" },
  production_admin:  { label: "Production Admin",    color: "border-orange-500 bg-orange-50 dark:bg-orange-900/20", dot: "bg-orange-500" },
  production_member: { label: "Production Members",  color: "border-orange-300 bg-orange-50/50 dark:bg-orange-900/10", dot: "bg-orange-300" },
  marketing_admin:   { label: "Marketing Admin",     color: "border-pink-500 bg-pink-50 dark:bg-pink-900/20",       dot: "bg-pink-500" },
  marketing_member:  { label: "Marketing Members",   color: "border-pink-300 bg-pink-50/50 dark:bg-pink-900/10",    dot: "bg-pink-300" },
  it_admin:          { label: "IT Admin",            color: "border-cyan-500 bg-cyan-50 dark:bg-cyan-900/20",       dot: "bg-cyan-500" },
  it_member:         { label: "IT Support Members",  color: "border-cyan-300 bg-cyan-50/50 dark:bg-cyan-900/10",    dot: "bg-cyan-300" },
};

function UserPills({ users }: { users: UserProfile[] }) {
  if (users.length === 0) return <span className="text-xs text-gray-400 italic">None</span>;
  return (
    <div className="flex flex-wrap gap-1 mt-1">
      {users.map((u) => (
        <span
          key={u.id}
          className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300"
          title={u.email}
        >
          {u.full_name}
        </span>
      ))}
    </div>
  );
}

interface NodeCardProps {
  roleKey: string;
  users: UserProfile[];
  indent?: number;
  isLast?: boolean;
}

function NodeCard({ roleKey, users, indent = 0, isLast = false }: NodeCardProps) {
  const meta = ROLE_META[roleKey];
  if (!meta) return null;
  return (
    <div className={`flex ${indent > 0 ? "ml-6" : ""}`}>
      {indent > 0 && (
        <div className="flex flex-col items-center mr-3">
          <div className="w-px bg-gray-300 dark:bg-gray-600 flex-1 min-h-[20px]" />
          <div className="w-4 h-px bg-gray-300 dark:bg-gray-600" />
          {!isLast && <div className="w-px bg-gray-300 dark:bg-gray-600 flex-1" />}
        </div>
      )}
      <div className={`flex-1 mb-3 rounded-lg border-l-4 px-4 py-3 ${meta.color}`}>
        <div className="flex items-center gap-2">
          <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${meta.dot}`} />
          <span className="text-sm font-semibold text-gray-800 dark:text-gray-100">{meta.label}</span>
          <span className="ml-auto text-xs text-gray-500 dark:text-gray-400">
            {users.length} {users.length === 1 ? "user" : "users"}
          </span>
        </div>
        <UserPills users={users} />
      </div>
    </div>
  );
}

export default function EmployeeHierarchy() {
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    UserService.getAll().then((u) => { setAllUsers(u); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  const byRole = (role: string) => allUsers.filter((u) => u.role === role);

  const hierarchy: Array<{ roleKey: string; indent: number; isLast?: boolean }> = [
    { roleKey: "super_admin",       indent: 0 },
    { roleKey: "management",        indent: 1 },
    { roleKey: "hr_admin",          indent: 2 },
    { roleKey: "hr_member",         indent: 3, isLast: true },
    { roleKey: "sales_admin",       indent: 2 },
    { roleKey: "sales_member",      indent: 3, isLast: true },
    { roleKey: "production_admin",  indent: 2 },
    { roleKey: "production_member", indent: 3, isLast: true },
    { roleKey: "marketing_admin",   indent: 2 },
    { roleKey: "marketing_member",  indent: 3, isLast: true },
    { roleKey: "it_admin",          indent: 2 },
    { roleKey: "it_member",         indent: 3, isLast: true },
  ];

  if (loading) {
    return (
      <div className="flex h-24 items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-4 border-solid border-brand-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-0">
      {hierarchy.map(({ roleKey, indent, isLast }) => (
        <NodeCard
          key={roleKey}
          roleKey={roleKey}
          users={byRole(roleKey)}
          indent={indent}
          isLast={isLast}
        />
      ))}
    </div>
  );
}
