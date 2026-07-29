import { useState, useEffect, useCallback } from "react";
import PageMeta from "../../components/common/PageMeta";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import LoadingState from "../../components/common/LoadingState";
import ErrorState from "../../components/common/ErrorState";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import {
  BiometricMappingService, DeviceService,
  type BiometricEmployeeMapping, type BiometricDevice,
} from "../../services/itSupportService";
import { UserService, type UserProfile } from "../../services/userService";

const ANY_DEVICE = "__any__";

/**
 * A biometric device's raw numeric/card user id has no relationship to our
 * internal employee ids — this page is where IT staff record that link, a
 * required step before any punch from a given id can be aggregated into
 * attendance (see BiometricAttendanceService::PHP's resolve()).
 */
export default function BiometricMapping() {
  const { user } = useAuth();
  const { showToast } = useToast();

  // 'it_support' CREATE/DELETE are it_admin-only per RbacMatrix (it_member
  // holds VIEW+EDIT) — hiding Add/Delete for it_member avoids a button that
  // would just 403; Edit stays available to both.
  const isAdmin = user?.role === "it_admin" || user?.role === "super_admin";

  const [mappings, setMappings] = useState<BiometricEmployeeMapping[]>([]);
  const [devices, setDevices] = useState<BiometricDevice[]>([]);
  const [employees, setEmployees] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<BiometricEmployeeMapping | null>(null);
  const [form, setForm] = useState({ deviceId: ANY_DEVICE, biometricUserId: "", internalUserId: "", status: "active" as "active" | "inactive" });
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const [m, d, e] = await Promise.all([
        BiometricMappingService.getAll(),
        DeviceService.getAll(),
        UserService.getAll(),
      ]);
      setMappings(m);
      setDevices(d);
      setEmployees(e);
    } catch (err: unknown) {
      setLoadError(err instanceof Error ? err.message : "Failed to load biometric mappings");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const deviceName = (id?: string) => id ? (devices.find(d => d.id === id)?.name ?? id) : "All Devices";
  const employeeName = (id: string) => employees.find(e => e.id === id)?.full_name ?? id;

  const openAdd = () => {
    setEditing(null);
    setForm({ deviceId: ANY_DEVICE, biometricUserId: "", internalUserId: "", status: "active" });
    setIsModalOpen(true);
  };

  const openEdit = (m: BiometricEmployeeMapping) => {
    setEditing(m);
    setForm({ deviceId: m.deviceId ?? ANY_DEVICE, biometricUserId: m.biometricUserId, internalUserId: m.internalUserId, status: m.status });
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.biometricUserId.trim() || !form.internalUserId) {
      showToast("Biometric ID and employee are required.", "error");
      return;
    }
    const employee = employees.find(e => e.id === form.internalUserId);
    const payload = {
      deviceId: form.deviceId === ANY_DEVICE ? undefined : form.deviceId,
      biometricUserId: form.biometricUserId.trim(),
      internalUserId: form.internalUserId,
      employeeName: employee?.full_name,
      status: form.status,
    };
    try {
      if (editing) {
        const updated = await BiometricMappingService.update(editing.id, payload);
        setMappings(prev => prev.map(m => m.id === editing.id ? updated : m));
      } else {
        const created = await BiometricMappingService.create(payload);
        setMappings(prev => [created, ...prev]);
      }
      setIsModalOpen(false);
      showToast(editing ? "Mapping updated." : "Mapping added.", "success");
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "Failed to save mapping.", "error");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await BiometricMappingService.delete(id);
      setMappings(prev => prev.filter(m => m.id !== id));
      showToast("Mapping removed.", "success");
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "Failed to remove mapping.", "error");
    } finally {
      setConfirmDeleteId(null);
    }
  };

  return (
    <>
      <PageMeta title="Biometric Employee Mapping | Optivax CRM" description="Link biometric device IDs to employees" />
      <PageBreadcrumb pageTitle="Biometric Employee Mapping" />

      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-800 dark:text-white">Biometric Employee Mapping</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Link each device's raw enrolled ID to the matching employee — required before their punches count toward attendance.
          </p>
        </div>
        {isAdmin && (
          <button onClick={openAdd}
            className="bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
            + Add Mapping
          </button>
        )}
      </div>

      {isLoading ? (
        <LoadingState label="Loading mappings..." />
      ) : loadError ? (
        <ErrorState message={loadError} onRetry={load} />
      ) : (
        <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800 text-sm">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-800/50">
                  {["Device", "Biometric ID", "Employee", "Status", "Actions"].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                {mappings.length === 0 && (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-sm text-gray-500">No mappings yet — punches from unmapped devices won't count toward attendance.</td></tr>
                )}
                {mappings.map(m => (
                  <tr key={m.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30">
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{deviceName(m.deviceId)}</td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-700 dark:text-gray-300">{m.biometricUserId}</td>
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white whitespace-nowrap">{m.employeeName ?? employeeName(m.internalUserId)}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${
                        m.status === "active"
                          ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                          : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                      }`}>{m.status}</span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <button onClick={() => openEdit(m)} className="text-xs px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-colors mr-2">
                        Edit
                      </button>
                      {isAdmin && (
                        <button onClick={() => setConfirmDeleteId(m.id)} className="text-xs px-3 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400 transition-colors">
                          Delete
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-gray-900 shadow-xl">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-800 dark:text-white">{editing ? "Edit Mapping" : "Add Mapping"}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xl leading-none">&times;</button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Device</label>
                <select className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  value={form.deviceId} onChange={e => setForm(prev => ({ ...prev, deviceId: e.target.value }))}>
                  <option value={ANY_DEVICE}>All Devices</option>
                  {devices.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Biometric Device ID</label>
                <input type="text" placeholder="e.g. 1042" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  value={form.biometricUserId} onChange={e => setForm(prev => ({ ...prev, biometricUserId: e.target.value }))} />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Employee</label>
                <select className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  value={form.internalUserId} onChange={e => setForm(prev => ({ ...prev, internalUserId: e.target.value }))}>
                  <option value="">Select an employee…</option>
                  {employees.map(e => <option key={e.id} value={e.id}>{e.full_name}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Status</label>
                <select className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  value={form.status} onChange={e => setForm(prev => ({ ...prev, status: e.target.value as "active" | "inactive" }))}>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-800 flex justify-end gap-3">
              <button onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800">
                Cancel
              </button>
              <button onClick={handleSave}
                className="px-4 py-2 text-sm rounded-lg bg-brand-500 hover:bg-brand-600 text-white font-medium">
                {editing ? "Save Changes" : "Add Mapping"}
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmDeleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-gray-900 shadow-xl p-6 text-center">
            <p className="text-gray-800 dark:text-white font-semibold mb-2">Remove this mapping?</p>
            <p className="text-sm text-gray-500 mb-6">Future punches from this device/ID will stop counting toward attendance until re-mapped.</p>
            <div className="flex gap-3 justify-center">
              <button onClick={() => setConfirmDeleteId(null)}
                className="px-4 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300">
                Cancel
              </button>
              <button onClick={() => handleDelete(confirmDeleteId)}
                className="px-4 py-2 text-sm rounded-lg bg-red-500 hover:bg-red-600 text-white font-medium">
                Remove
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
