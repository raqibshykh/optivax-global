import React, { useEffect, useState } from "react";
import { api } from "../lib/client";

// Define the shape of a user profile returned from the API
interface UserProfile {
  id: string;
  email: string;
  full_name?: string;
  role?: string;
}

export default function SidebarWidget() {
  const [adminUsers, setAdminUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch users on mount – same endpoint used in SuperAdminPanel
  useEffect(() => {
    const fetchAdmins = async () => {
      try {
        const users = await api.get<UserProfile[]>("/saas/v1/profiles/list");
        const admins = (users || []).filter(
          (u) =>
            u.role &&
            u.role !== "super_admin" &&
            u.role.endsWith("_admin")
        );
        setAdminUsers(admins);
      } catch (e) {
        console.error("Failed to load admin users", e);
      } finally {
        setLoading(false);
      }
    };
    fetchAdmins();
  }, []);

  // Simple handler for assigning work – placeholder for future integration
  const handleAssign = (adminId: string) => {
    // In a full implementation this would open a modal or navigate to a task‑creation view
    alert(`Assign work to admin ID: ${adminId}`);
  };

  return (
    <div className="mx-auto mb-6 w-full max-w-60 rounded-2xl bg-gray-50 px-4 py-5 text-center dark:bg-white/[0.03]">
      <h3 className="mb-2 text-sm font-semibold text-gray-900 dark:text-white">
        Admin Users
      </h3>
      {loading ? (
        <p className="text-xs text-gray-500 dark:text-gray-400">Loading…</p>
      ) : adminUsers.length === 0 ? (
        <p className="text-xs text-gray-500 dark:text-gray-400">No admin users found.</p>
      ) : (
        <ul className="space-y-2 text-left">
          {adminUsers.map((admin) => (
            <li key={admin.id} className="flex items-center justify-between">
              <span className="text-xs font-medium text-gray-800 dark:text-gray-200">
                {admin.full_name || admin.email}
              </span>
              <button
                onClick={() => handleAssign(admin.id)}
                className="ml-2 rounded bg-brand-500 px-2 py-1 text-xs font-medium text-white hover:bg-brand-600"
              >
                Assign
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

