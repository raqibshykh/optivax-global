import React, { useState, useEffect } from "react";
import PageMeta from "../../components/common/PageMeta";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { UserService, UserProfile } from "../../services/userService";
import { PlusIcon, PencilIcon, TrashBinIcon } from "../../icons";
import type { PermissionDomain } from "../../types";

// ── Types ─────────────────────────────────────────────────────────────────────
interface Department {
  id: string;
  name: string;
  domain: PermissionDomain;
  headUserId?: string;
  description?: string;
  createdAt: string;
}

interface DeptFormData {
  name: string;
  domain: PermissionDomain;
  headUserId: string;
  description: string;
}

const STORAGE_KEY = "mock_departments";

const DOMAIN_OPTIONS: { value: PermissionDomain; label: string }[] = [
  { value: "sales",       label: "Sales"       },
  { value: "production",  label: "Production"  },
  { value: "marketing",   label: "Marketing"   },
  { value: "hr",          label: "HR"          },
  { value: "it_support",  label: "IT Support"  },
  { value: "system",      label: "System"      },
  { value: "billing",     label: "Billing"     },
  { value: "reports",     label: "Reports"     },
];

const DOMAIN_COLORS: Record<string, string> = {
  sales:      "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  production: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
  marketing:  "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300",
  hr:         "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300",
  it_support: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300",
  system:     "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
  billing:    "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300",
  reports:    "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
};

const SEED_DEPARTMENTS: Department[] = [
  { id: "dept-sales",       name: "Sales",       domain: "sales",      description: "Revenue generation and client acquisition",       createdAt: "2026-01-01T00:00:00Z" },
  { id: "dept-production",  name: "Production",  domain: "production", description: "Project delivery and development",                createdAt: "2026-01-01T00:00:00Z" },
  { id: "dept-marketing",   name: "Marketing",   domain: "marketing",  description: "Brand, campaigns and lead generation",            createdAt: "2026-01-01T00:00:00Z" },
  { id: "dept-hr",          name: "HR",          domain: "hr",         description: "People operations and payroll",                   createdAt: "2026-01-01T00:00:00Z" },
  { id: "dept-it-support",  name: "IT Support",  domain: "it_support", description: "Biometric attendance, devices and IT ticketing",  createdAt: "2026-01-01T00:00:00Z" },
];

function loadDepts(): Department[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    if (Array.isArray(parsed) && parsed.length > 0) return parsed;
  } catch {}
  localStorage.setItem(STORAGE_KEY, JSON.stringify(SEED_DEPARTMENTS));
  return SEED_DEPARTMENTS;
}

function saveDepts(depts: Department[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(depts));
}

const EMPTY_FORM: DeptFormData = { name: "", domain: "sales", headUserId: "", description: "" };

export default function Departments() {
  const { canCreate, canEdit, canDelete } = useAuth();
  const { showToast } = useToast();

  const [depts, setDepts] = useState<Department[]>(loadDepts);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<DeptFormData>(EMPTY_FORM);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    UserService.getAll().then(setUsers).catch(() => {});
  }, []);

  const adminUsers = users.filter((u) => u.role?.endsWith("_admin") || u.role === "management");

  const memberCountByDept: Record<string, number> = users.reduce<Record<string, number>>((acc, u) => {
    if (u.departmentId) acc[u.departmentId] = (acc[u.departmentId] ?? 0) + 1;
    return acc;
  }, {});

  const openCreate = () => {
    setEditId(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  };

  const openEdit = (dept: Department) => {
    setEditId(dept.id);
    setForm({ name: dept.name, domain: dept.domain, headUserId: dept.headUserId ?? "", description: dept.description ?? "" });
    setModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { showToast("Department name is required", "error"); return; }

    if (editId) {
      const updated = depts.map((d) =>
        d.id === editId ? { ...d, name: form.name, domain: form.domain, headUserId: form.headUserId || undefined, description: form.description } : d
      );
      setDepts(updated);
      saveDepts(updated);
      showToast("Department updated", "success");
    } else {
      const id = `dept-${form.name.toLowerCase().replace(/\s+/g, "-")}-${Date.now()}`;
      const newDept: Department = {
        id, name: form.name, domain: form.domain,
        headUserId: form.headUserId || undefined,
        description: form.description,
        createdAt: new Date().toISOString(),
      };
      const updated = [...depts, newDept];
      setDepts(updated);
      saveDepts(updated);
      showToast("Department created", "success");
    }
    setModalOpen(false);
  };

  const handleDelete = () => {
    if (!deleteId) return;
    const updated = depts.filter((d) => d.id !== deleteId);
    setDepts(updated);
    saveDepts(updated);
    showToast("Department deleted", "success");
    setDeleteId(null);
  };

  const getHeadName = (headUserId?: string) => {
    if (!headUserId) return "—";
    const u = users.find((u) => u.id === headUserId);
    return u?.full_name ?? u?.email ?? "—";
  };

  return (
    <>
      <PageMeta title="Departments | Optivax CRM" description="Manage organisational departments" />
      <PageBreadcrumb pageTitle="Departments" />

      {/* ── Summary cards ─────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Total Departments", value: depts.length,               color: "border-blue-500" },
          { label: "Total Members",     value: users.filter(u => u.departmentId).length, color: "border-green-500" },
          { label: "Department Heads",  value: depts.filter(d => d.headUserId).length,   color: "border-purple-500" },
          { label: "Unassigned Users",  value: users.filter(u => !u.departmentId && u.role !== "super_admin" && u.role !== "management" && u.role !== "client").length, color: "border-amber-500" },
        ].map(({ label, value, color }) => (
          <div key={label} className={`rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 border-l-4 ${color} p-4 shadow-sm`}>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">{label}</p>
            <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
          </div>
        ))}
      </div>

      {/* ── Toolbar ───────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-500 dark:text-gray-400">{depts.length} department{depts.length !== 1 ? "s" : ""}</p>
        {canCreate("system") && (
          <button onClick={openCreate}
            className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 transition-colors">
            <PlusIcon className="w-4 h-4" />
            Add Department
          </button>
        )}
      </div>

      {/* ── Department cards ──────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 mb-8">
        {depts.map((dept) => (
          <div key={dept.id} className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm overflow-hidden">
            <div className={`h-1.5 w-full ${
              dept.domain === "sales" ? "bg-green-500" :
              dept.domain === "production" ? "bg-orange-500" :
              dept.domain === "marketing" ? "bg-pink-500" :
              dept.domain === "hr" ? "bg-indigo-500" :
              dept.domain === "it_support" ? "bg-cyan-500" : "bg-brand-500"
            }`} />
            <div className="p-5">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <h3 className="text-base font-semibold text-gray-900 dark:text-white">{dept.name}</h3>
                  {dept.description && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{dept.description}</p>
                  )}
                </div>
                <span className={`shrink-0 inline-flex px-2 py-0.5 rounded-full text-xs font-medium capitalize ${DOMAIN_COLORS[dept.domain] ?? "bg-gray-100 text-gray-600"}`}>
                  {dept.domain}
                </span>
              </div>

              <div className="space-y-2 mb-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">Head</span>
                  <span className="font-medium text-gray-900 dark:text-white">{getHeadName(dept.headUserId)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">Members</span>
                  <span className="font-medium text-gray-900 dark:text-white">{memberCountByDept[dept.id] ?? 0}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">Created</span>
                  <span className="text-gray-600 dark:text-gray-400">{new Date(dept.createdAt).toLocaleDateString("en-GB")}</span>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-gray-100 dark:border-gray-800">
                {canEdit("system") && (
                  <button onClick={() => openEdit(dept)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                    <PencilIcon className="w-3.5 h-3.5" /> Edit
                  </button>
                )}
                {canDelete("system") && (
                  <button onClick={() => setDeleteId(dept.id)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/40 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                    <TrashBinIcon className="w-3.5 h-3.5" /> Delete
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Members table ─────────────────────────────────────────── */}
      <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-800">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white">All Members by Department</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
            <thead className="bg-gray-50 dark:bg-gray-800/50">
              <tr>
                {["Name", "Email", "Role", "Department"].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
              {users
                .filter((u) => u.role !== "super_admin" && u.role !== "client")
                .sort((a, b) => (a.departmentId ?? "zzz").localeCompare(b.departmentId ?? "zzz"))
                .map((u) => {
                  const dept = depts.find((d) => d.id === u.departmentId);
                  return (
                    <tr key={u.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40">
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                        {u.full_name || u.email}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{u.email}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300">
                          {u.role}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {dept ? (
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${DOMAIN_COLORS[dept.domain] ?? "bg-gray-100 text-gray-600"}`}>
                            {dept.name}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">Unassigned</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Add/Edit modal ────────────────────────────────────────── */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-800">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{editId ? "Edit Department" : "New Department"}</h3>
              <button onClick={() => setModalOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xl">✕</button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div>
                <label className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">Name *</label>
                <input type="text" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-white px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none" />
              </div>
              <div>
                <label className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">Permission Domain *</label>
                <select value={form.domain} onChange={(e) => setForm({ ...form, domain: e.target.value as PermissionDomain })}
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-white px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none">
                  {DOMAIN_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">Department Head</label>
                <select value={form.headUserId} onChange={(e) => setForm({ ...form, headUserId: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-white px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none">
                  <option value="">— None —</option>
                  {adminUsers.map((u) => (
                    <option key={u.id} value={u.id}>{u.full_name || u.email} ({u.role})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">Description</label>
                <textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-white px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none resize-none" />
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-800">
                <button type="button" onClick={() => setModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700">
                  Cancel
                </button>
                <button type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-brand-500 rounded-lg hover:bg-brand-600">
                  {editId ? "Save Changes" : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Delete confirm ────────────────────────────────────────── */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Delete Department</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
              This will remove the department. Existing users assigned to it will become unassigned.
            </p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setDeleteId(null)}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700">
                Cancel
              </button>
              <button onClick={handleDelete}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700">
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
