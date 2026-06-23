import { useState } from "react";
import PageMeta from "../../components/common/PageMeta";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import {
  getDevices, saveDevices, getDeviceSyncLogs, saveDeviceSyncLogs,
  type BiometricDevice, type DeviceStatus, type SyncFrequency,
} from "../../mock/itSupportData";

const STATUS_COLORS: Record<DeviceStatus, string> = {
  online:  "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  offline: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  error:   "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
  syncing: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
};

const SYNC_FREQ_LABELS: Record<SyncFrequency, string> = {
  "every-hour": "Every Hour",
  "every-6h":   "Every 6 Hours",
  "every-12h":  "Every 12 Hours",
  "daily":      "Daily",
};

const BRANCHES = ["Head Office", "Branch B", "Warehouse", "Data Centre", "Remote Site"];

type DeviceForm = Omit<BiometricDevice, "id" | "lastSync" | "totalUsers">;

const EMPTY_FORM: DeviceForm = {
  name: "",
  deviceType: "ZKTeco",
  serialNumber: "",
  ipAddress: "",
  port: 4370,
  branch: "Head Office",
  status: "offline",
  syncFrequency: "every-hour",
  firmwareVersion: "",
};

export default function Devices() {
  const { user } = useAuth();
  const { showToast } = useToast();

  const isAdmin = user?.role === "it_admin" || user?.role === "super_admin";

  const [devices, setDevices] = useState(() => getDevices());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDevice, setEditingDevice] = useState<BiometricDevice | null>(null);
  const [form, setForm] = useState<DeviceForm>(EMPTY_FORM);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const openAdd = () => {
    setEditingDevice(null);
    setForm(EMPTY_FORM);
    setIsModalOpen(true);
  };

  const openEdit = (d: BiometricDevice) => {
    setEditingDevice(d);
    setForm({
      name: d.name, deviceType: d.deviceType, serialNumber: d.serialNumber,
      ipAddress: d.ipAddress, port: d.port, branch: d.branch,
      status: d.status, syncFrequency: d.syncFrequency, firmwareVersion: d.firmwareVersion,
    });
    setIsModalOpen(true);
  };

  const handleSave = () => {
    if (!form.name || !form.serialNumber || !form.ipAddress) {
      showToast("Name, serial number and IP address are required.", "error");
      return;
    }
    const updated = editingDevice
      ? devices.map(d => d.id === editingDevice.id ? { ...d, ...form } : d)
      : [...devices, { ...form, id: `dev-${Date.now()}`, lastSync: new Date().toISOString(), totalUsers: 0 }];
    setDevices(updated);
    saveDevices(updated);
    setIsModalOpen(false);
    showToast(editingDevice ? "Device updated." : "Device added.", "success");
  };

  const handleDelete = (id: string) => {
    const updated = devices.filter(d => d.id !== id);
    setDevices(updated);
    saveDevices(updated);
    setConfirmDeleteId(null);
    showToast("Device removed.", "success");
  };

  const handleTestConnection = (d: BiometricDevice) => {
    const result = d.status === "online";
    showToast(
      result
        ? `Connected to ${d.name} (${d.ipAddress}:${d.port}) — ${d.totalUsers} users enrolled.`
        : `Cannot reach ${d.name} at ${d.ipAddress}:${d.port}. Check network connectivity.`,
      result ? "success" : "error",
    );
  };

  const handleSyncNow = (d: BiometricDevice) => {
    if (d.status !== "online") {
      showToast(`${d.name} is ${d.status}. Cannot sync.`, "error");
      return;
    }
    const now = new Date().toISOString();
    const newLog = {
      id: `log-${Date.now()}`,
      deviceId: d.id,
      deviceName: d.name,
      startedAt: now,
      completedAt: now,
      result: "success" as const,
      recordsSynced: Math.floor(Math.random() * 50) + 10,
      triggeredBy: "manual" as const,
      triggeredByName: user?.name ?? "IT Admin",
    };
    const updatedLogs = [newLog, ...getDeviceSyncLogs()];
    saveDeviceSyncLogs(updatedLogs);

    const updatedDevices = devices.map(dev => dev.id === d.id ? { ...dev, lastSync: now } : dev);
    setDevices(updatedDevices);
    saveDevices(updatedDevices);
    showToast(`Sync completed for ${d.name}. ${newLog.recordsSynced} records imported.`, "success");
  };

  const f = <K extends keyof DeviceForm>(key: K, val: DeviceForm[K]) =>
    setForm(prev => ({ ...prev, [key]: val }));

  return (
    <>
      <PageMeta title="Biometric Devices | Optivax CRM" description="ZKTeco device management" />
      <PageBreadcrumb pageTitle="Biometric Devices" />

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-800 dark:text-white">Biometric Devices</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Manage ZKTeco attendance devices</p>
        </div>
        {isAdmin && (
          <button onClick={openAdd}
            className="bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
            + Add Device
          </button>
        )}
      </div>

      {/* Device grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mb-6">
        {devices.map(d => (
          <div key={d.id} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <div className="flex items-start justify-between mb-3">
              <div className="min-w-0">
                <h3 className="font-semibold text-gray-800 dark:text-white truncate">{d.name}</h3>
                <p className="text-xs text-gray-500 mt-0.5">{d.branch}</p>
              </div>
              <span className={`ml-2 shrink-0 px-2 py-0.5 text-xs rounded-full font-medium ${STATUS_COLORS[d.status]}`}>{d.status}</span>
            </div>

            <div className="space-y-1 text-xs text-gray-500 dark:text-gray-400 mb-4">
              <div className="flex justify-between"><span>Serial</span><span className="font-mono text-gray-700 dark:text-gray-300">{d.serialNumber}</span></div>
              <div className="flex justify-between"><span>IP / Port</span><span className="font-mono text-gray-700 dark:text-gray-300">{d.ipAddress}:{d.port}</span></div>
              <div className="flex justify-between"><span>Firmware</span><span>{d.firmwareVersion}</span></div>
              <div className="flex justify-between"><span>Sync</span><span>{SYNC_FREQ_LABELS[d.syncFrequency]}</span></div>
              <div className="flex justify-between"><span>Users</span><span>{d.totalUsers} enrolled</span></div>
              <div className="flex justify-between"><span>Last Sync</span><span>{new Date(d.lastSync).toLocaleString()}</span></div>
            </div>

            <div className="flex gap-2 flex-wrap">
              <button onClick={() => handleTestConnection(d)}
                className="text-xs px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-colors">
                Test Connection
              </button>
              <button onClick={() => handleSyncNow(d)}
                className="text-xs px-3 py-1.5 rounded-lg bg-brand-50 hover:bg-brand-100 dark:bg-brand-900/20 dark:hover:bg-brand-900/40 text-brand-700 dark:text-brand-400 transition-colors">
                Sync Now
              </button>
              {isAdmin && (
                <>
                  <button onClick={() => openEdit(d)}
                    className="text-xs px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-colors">
                    Edit
                  </button>
                  <button onClick={() => setConfirmDeleteId(d.id)}
                    className="text-xs px-3 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400 transition-colors">
                    Delete
                  </button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Device stats */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
        <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4">Device Summary</h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Total Devices",   value: String(devices.length) },
            { label: "Online",          value: String(devices.filter(d => d.status === "online").length) },
            { label: "Offline / Error", value: String(devices.filter(d => d.status !== "online").length) },
            { label: "Total Enrolled",  value: String(devices.reduce((s, d) => s + d.totalUsers, 0)) },
          ].map(c => (
            <div key={c.label} className="text-center p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
              <p className="text-2xl font-bold text-gray-800 dark:text-white">{c.value}</p>
              <p className="text-xs text-gray-500 mt-1">{c.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-gray-900 shadow-xl">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-800 dark:text-white">
                {editingDevice ? "Edit Device" : "Add Biometric Device"}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xl leading-none">&times;</button>
            </div>
            <div className="p-6 space-y-4 overflow-y-auto max-h-[70vh]">
              {[
                { label: "Device Name",       key: "name" as const,          type: "text",   placeholder: "e.g. Main Office — Entrance" },
                { label: "Serial Number",     key: "serialNumber" as const,  type: "text",   placeholder: "e.g. ZK-A8204-001" },
                { label: "IP Address",        key: "ipAddress" as const,     type: "text",   placeholder: "e.g. 192.168.1.101" },
                { label: "Firmware Version",  key: "firmwareVersion" as const, type: "text", placeholder: "e.g. 6.60.3100" },
              ].map(({ label, key, type, placeholder }) => (
                <div key={key}>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{label}</label>
                  <input type={type} placeholder={placeholder}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                    value={String(form[key])}
                    onChange={e => f(key, e.target.value as DeviceForm[typeof key])} />
                </div>
              ))}

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Port</label>
                <input type="number" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  value={form.port} onChange={e => f("port", Number(e.target.value))} />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Branch</label>
                <select className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  value={form.branch} onChange={e => f("branch", e.target.value)}>
                  {BRANCHES.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Status</label>
                <select className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  value={form.status} onChange={e => f("status", e.target.value as DeviceStatus)}>
                  {(["online", "offline", "error"] as DeviceStatus[]).map(s =>
                    <option key={s} value={s} className="capitalize">{s}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Sync Frequency</label>
                <select className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  value={form.syncFrequency} onChange={e => f("syncFrequency", e.target.value as SyncFrequency)}>
                  {Object.entries(SYNC_FREQ_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
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
                {editingDevice ? "Save Changes" : "Add Device"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm modal */}
      {confirmDeleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-gray-900 shadow-xl p-6 text-center">
            <p className="text-gray-800 dark:text-white font-semibold mb-2">Delete this device?</p>
            <p className="text-sm text-gray-500 mb-6">This action cannot be undone.</p>
            <div className="flex gap-3 justify-center">
              <button onClick={() => setConfirmDeleteId(null)}
                className="px-4 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300">
                Cancel
              </button>
              <button onClick={() => handleDelete(confirmDeleteId)}
                className="px-4 py-2 text-sm rounded-lg bg-red-500 hover:bg-red-600 text-white font-medium">
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
