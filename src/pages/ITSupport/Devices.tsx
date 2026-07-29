import { useState, useEffect, useCallback } from "react";
import PageMeta from "../../components/common/PageMeta";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import LoadingState from "../../components/common/LoadingState";
import ErrorState from "../../components/common/ErrorState";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import {
  DeviceService,
  type BiometricDevice, type DeviceStatus, type SyncFrequency,
  type TestConnectionResult, type LiveSyncResult,
} from "../../services/itSupportService";
import { ApiError, type ApiExceptionBody } from "../../lib/apiError";
import { CopyIcon } from "../../icons";

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

type DeviceForm = Omit<
  BiometricDevice,
  "id" | "lastSync" | "totalUsers" | "totalLogs" | "lastConnection" | "lastDownload" | "lastSuccessfulSync" | "lastError" | "lastDeviceTime"
>;

function formatDateTime(value?: string | null): string {
  if (!value) return "Never";
  const d = new Date(value.includes("T") || value.endsWith("Z") ? value : value.replace(" ", "T") + "Z");
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleString();
}

/**
 * Structured detail for a genuinely failed connector call (thrown
 * exception — network failure, 500/502/422 from the backend), rendered in
 * a real "Connection Failed" panel rather than a toast. Never built from a
 * bare `"Error"` string — every field is pulled from the actual ApiError /
 * ApiResponse::exceptionError() envelope.
 */
interface ConnectorErrorDetails {
  device: BiometricDevice;
  title: string;
  httpStatus?: number;
  message: string;
  errorText: string;
  file?: string;
  line?: number;
  stack?: string;
}

function buildErrorDetails(device: BiometricDevice, title: string, err: unknown): ConnectorErrorDetails {
  if (err instanceof ApiError) {
    const body = err.rawBody as Partial<ApiExceptionBody> | undefined;
    return {
      device,
      title,
      httpStatus: err.status,
      message: (body?.message && body.message.trim()) || err.message,
      errorText: (body?.error && body.error.trim()) || err.message,
      file: body?.file,
      line: body?.line,
      stack: body?.stack,
    };
  }
  const message = err instanceof Error ? err.message : String(err);
  return { device, title, message, errorText: message };
}

/**
 * console.group("Biometric Connection") — device IP/port, payload, and
 * either the full response or the full ApiError (request URL/method/
 * headers, HTTP status, response headers/body, the raw Error object) so a
 * developer can see exactly what happened without reproducing the call.
 */
function logBiometricCall(action: string, device: BiometricDevice, payload: unknown, outcome: { response?: unknown; error?: unknown }): void {
  console.group("Biometric Connection");
  console.log("Action:", action);
  console.log("Device IP:", device.ipAddress);
  console.log("Port:", device.port);
  console.log("Payload:", payload);
  if (outcome.error instanceof ApiError) {
    console.log("Request URL:", outcome.error.requestUrl);
    console.log("Method:", outcome.error.requestMethod);
    console.log("Request Headers:", outcome.error.requestHeaders);
    console.log("Status Code:", outcome.error.status);
    console.log("Response Headers:", outcome.error.responseHeaders);
    console.log("Response:", outcome.error.rawBody);
    console.log("Full Error:", outcome.error);
  } else if (outcome.error) {
    console.log("Full Error:", outcome.error);
  } else {
    console.log("Response:", outcome.response);
  }
  console.groupEnd();
}

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

  const [devices, setDevices] = useState<BiometricDevice[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDevice, setEditingDevice] = useState<BiometricDevice | null>(null);
  const [form, setForm] = useState<DeviceForm>(EMPTY_FORM);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [connectionResult, setConnectionResult] = useState<{ device: BiometricDevice; result: TestConnectionResult } | null>(null);
  const [syncResult, setSyncResult] = useState<{ device: BiometricDevice; result: LiveSyncResult } | null>(null);
  const [errorDetails, setErrorDetails] = useState<ConnectorErrorDetails | null>(null);
  const [confirmKeyDevice, setConfirmKeyDevice] = useState<BiometricDevice | null>(null);
  const [generatingKeyId, setGeneratingKeyId] = useState<string | null>(null);
  const [apiKeyReveal, setApiKeyReveal] = useState<{ device: BiometricDevice; apiKey: string; lastFour: string } | null>(null);
  const [apiKeyCopied, setApiKeyCopied] = useState(false);

  const loadDevices = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      setDevices(await DeviceService.getAll());
    } catch (err: unknown) {
      setLoadError(err instanceof Error ? err.message : "Failed to load devices");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { loadDevices(); }, [loadDevices]);

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

  const handleSave = async () => {
    if (!form.name || !form.serialNumber || !form.ipAddress) {
      showToast("Name, serial number and IP address are required.", "error");
      return;
    }
    if (editingDevice) {
      const updated = await DeviceService.update(editingDevice.id, form);
      setDevices(prev => prev.map(d => d.id === editingDevice.id ? updated : d));
    } else {
      const created = await DeviceService.create({ ...form, lastSync: new Date().toISOString(), totalUsers: 0, totalLogs: 0 });
      setDevices(prev => [...prev, created]);
    }
    setIsModalOpen(false);
    showToast(editingDevice ? "Device updated." : "Device added.", "success");
  };

  const handleDelete = async (id: string) => {
    await DeviceService.delete(id);
    setDevices(prev => prev.filter(d => d.id !== id));
    setConfirmDeleteId(null);
    showToast("Device removed.", "success");
  };

  /**
   * Real live TCP probe (connect, read firmware/clock/enrolled-user count,
   * disconnect) — not a cached-status check. An unreachable device is a
   * normal outcome here (result.reachable === false, still a 200 response
   * with a real error message from the backend) and is shown in the same
   * modal. A THROWN error (network failure, unexpected 4xx/5xx) is never
   * reduced to a toast — it goes to the full error-details panel with
   * whatever the backend's exceptionError() envelope actually said.
   */
  const handleTestConnection = async (d: BiometricDevice) => {
    setTestingId(d.id);
    const payload = { deviceId: d.id };
    try {
      const result = await DeviceService.testConnection(d.id);
      logBiometricCall("test-connection", d, payload, { response: result });
      setConnectionResult({ device: d, result });
      await loadDevices();
    } catch (err: unknown) {
      logBiometricCall("test-connection", d, payload, { error: err });
      setErrorDetails(buildErrorDetails(d, "Connection Failed", err));
    } finally {
      setTestingId(null);
    }
  };

  /**
   * The real "Sync Now": connects to the physical device over TCP right
   * now, downloads its attendance log, and ingests whatever's new. No
   * pre-check against cached `status` — the sync attempt itself is the
   * authoritative reachability test. A failure here always goes to the
   * full error-details panel (never `catch { showToast("Error") }`) — the
   * exact message, HTTP status, and (in dev mode) stack trace the backend
   * returned are always shown.
   */
  const handleSyncNow = async (d: BiometricDevice) => {
    setSyncingId(d.id);
    const payload = { deviceId: d.id };
    try {
      const result = await DeviceService.liveSync(d.id);
      logBiometricCall("live-sync", d, payload, { response: result });
      setSyncResult({ device: d, result });
      await loadDevices();
    } catch (err: unknown) {
      logBiometricCall("live-sync", d, payload, { error: err });
      setErrorDetails(buildErrorDetails(d, "Sync Failed", err));
      await loadDevices(); // device.lastError was still recorded server-side even though this call threw
    } finally {
      setSyncingId(null);
    }
  };

  /**
   * Generates (or, if one already exists, rotates — same backend operation
   * either way) this device's API key. The plaintext is only ever present
   * in this one response; it's held in `apiKeyReveal` purely as transient
   * UI state for the one-time reveal dialog below and is never written
   * back into `devices`/persisted anywhere else. A failure here is a real
   * error (RBAC/network/unknown device), not a "reachability" outcome like
   * Test Connection, so it goes to a toast rather than the error-details panel.
   */
  const handleGenerateApiKey = async (d: BiometricDevice) => {
    setConfirmKeyDevice(null);
    setGeneratingKeyId(d.id);
    try {
      const result = await DeviceService.generateApiKey(d.id);
      setApiKeyReveal({ device: d, apiKey: result.apiKey, lastFour: result.lastFour });
      showToast(d.apiKeyLastFour ? "API key rotated successfully." : "API key generated successfully.", "success");
      await loadDevices();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "Failed to generate API key.", "error");
    } finally {
      setGeneratingKeyId(null);
    }
  };

  const handleCopyApiKey = async () => {
    if (!apiKeyReveal) return;
    try {
      await navigator.clipboard.writeText(apiKeyReveal.apiKey);
      setApiKeyCopied(true);
      setTimeout(() => setApiKeyCopied(false), 2000);
    } catch {
      showToast("Could not copy to clipboard — select and copy the key manually.", "error");
    }
  };

  const closeApiKeyReveal = () => {
    setApiKeyReveal(null);
    setApiKeyCopied(false);
  };

  const toggleExpanded = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
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

      {isLoading ? (
        <LoadingState label="Loading devices..." />
      ) : loadError ? (
        <ErrorState message={loadError} onRetry={loadDevices} />
      ) : (
      <>
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
              <div className="flex justify-between"><span>Firmware</span><span>{d.firmwareVersion || "—"}</span></div>
              <div className="flex justify-between"><span>Sync</span><span>{SYNC_FREQ_LABELS[d.syncFrequency]}</span></div>
              <div className="flex justify-between"><span>Users</span><span>{d.totalUsers} enrolled</span></div>
              <div className="flex justify-between"><span>Total Logs</span><span>{d.totalLogs}</span></div>
              <div className="flex justify-between"><span>Last Sync</span><span>{formatDateTime(d.lastSync)}</span></div>
              <div className="flex justify-between">
                <span>API Key</span>
                <span className="font-mono text-gray-700 dark:text-gray-300">
                  {d.apiKeyLastFour ? `••••••••${d.apiKeyLastFour}` : "Not generated"}
                </span>
              </div>

              {expandedIds.has(d.id) && (
                <>
                  <div className="flex justify-between"><span>Last Connection</span><span>{formatDateTime(d.lastConnection)}</span></div>
                  <div className="flex justify-between"><span>Last Download</span><span>{formatDateTime(d.lastDownload)}</span></div>
                  <div className="flex justify-between"><span>Last Successful Sync</span><span>{formatDateTime(d.lastSuccessfulSync)}</span></div>
                  <div className="flex justify-between"><span>Device Time</span><span>{formatDateTime(d.lastDeviceTime)}</span></div>
                  {d.lastError && (
                    <div className="mt-1.5 rounded-lg bg-red-50 dark:bg-red-900/20 px-2 py-1.5 text-red-600 dark:text-red-400">
                      <span className="font-medium">Last Error: </span>{d.lastError}
                    </div>
                  )}
                </>
              )}

              <button onClick={() => toggleExpanded(d.id)} className="text-brand-600 dark:text-brand-400 hover:underline mt-1">
                {expandedIds.has(d.id) ? "Hide diagnostics" : "Show diagnostics"}
              </button>
            </div>

            <div className="flex gap-2 flex-wrap">
              <button onClick={() => handleTestConnection(d)} disabled={testingId === d.id}
                className="text-xs px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                {testingId === d.id ? "Testing…" : "Test Connection"}
              </button>
              <button onClick={() => handleSyncNow(d)} disabled={syncingId === d.id}
                className="text-xs px-3 py-1.5 rounded-lg bg-brand-50 hover:bg-brand-100 dark:bg-brand-900/20 dark:hover:bg-brand-900/40 text-brand-700 dark:text-brand-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                {syncingId === d.id ? "Syncing…" : "Sync Now"}
              </button>
              {isAdmin && (
                <>
                  <button onClick={() => setConfirmKeyDevice(d)} disabled={generatingKeyId === d.id}
                    className="text-xs px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                    {generatingKeyId === d.id ? "Generating…" : d.apiKeyLastFour ? "Rotate API Key" : "Generate API Key"}
                  </button>
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
      </>
      )}

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

      {/* Generate/Rotate API Key — confirmation */}
      {confirmKeyDevice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-gray-900 shadow-xl p-6 text-center">
            <p className="text-gray-800 dark:text-white font-semibold mb-2">
              {confirmKeyDevice.apiKeyLastFour ? "Rotate API key for this device?" : "Generate an API key for this device?"}
            </p>
            <p className="text-sm text-gray-500 mb-6">
              {confirmKeyDevice.apiKeyLastFour
                ? "The current key will stop working immediately. Any Local Bridge Application using it must be updated with the new key right away."
                : "This key authenticates the Local Bridge Application when it sends attendance punches to this device's import endpoint."}
            </p>
            <div className="flex gap-3 justify-center">
              <button onClick={() => setConfirmKeyDevice(null)}
                className="px-4 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300">
                Cancel
              </button>
              <button onClick={() => handleGenerateApiKey(confirmKeyDevice)}
                className="px-4 py-2 text-sm rounded-lg bg-brand-500 hover:bg-brand-600 text-white font-medium">
                {confirmKeyDevice.apiKeyLastFour ? "Rotate Key" : "Generate Key"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Generate/Rotate API Key — one-time plaintext reveal. Never shown again after this dialog closes. */}
      {apiKeyReveal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-gray-900 shadow-xl">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800">
              <h3 className="text-lg font-bold text-gray-800 dark:text-white">API Key Generated Successfully</h3>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-gray-500">
                Copy this key now and paste it into the Local Bridge Application's configuration for{" "}
                <span className="font-medium text-gray-700 dark:text-gray-300">{apiKeyReveal.device.name}</span>.
              </p>
              <div className="flex items-center gap-2">
                <code className="flex-1 min-w-0 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-3 py-2 text-xs font-mono text-gray-800 dark:text-white break-all select-all">
                  {apiKeyReveal.apiKey}
                </code>
                <button onClick={handleCopyApiKey}
                  className="shrink-0 flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg bg-brand-50 hover:bg-brand-100 dark:bg-brand-900/20 dark:hover:bg-brand-900/40 text-brand-700 dark:text-brand-400 transition-colors">
                  <CopyIcon className="size-4 fill-current" />
                  {apiKeyCopied ? "Copied!" : "Copy"}
                </button>
              </div>
              <div className="rounded-lg bg-amber-50 dark:bg-amber-900/20 px-3 py-2 text-amber-700 dark:text-amber-400 text-xs font-medium">
                ⚠ This key will never be shown again. Store it securely now — closing this dialog cannot be undone.
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-800 flex justify-end">
              <button onClick={closeApiKeyReveal}
                className="px-4 py-2 text-sm rounded-lg bg-brand-500 hover:bg-brand-600 text-white font-medium">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Test Connection result modal */}
      {connectionResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-gray-900 shadow-xl">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-800 dark:text-white">Connection Test — {connectionResult.device.name}</h3>
              <button onClick={() => setConnectionResult(null)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xl leading-none">&times;</button>
            </div>
            <div className="p-6 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Connection Status</span>
                <span className={`font-semibold ${connectionResult.result.reachable ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                  {connectionResult.result.reachable ? "Reachable" : "Unreachable"}
                </span>
              </div>
              <div className="flex justify-between"><span className="text-gray-500">Response Time</span><span className="text-gray-800 dark:text-white">{connectionResult.result.responseTimeMs} ms</span></div>
              {connectionResult.result.reachable ? (
                <>
                  <div className="flex justify-between"><span className="text-gray-500">Device Name</span><span className="text-gray-800 dark:text-white">{connectionResult.result.deviceName || "—"}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Firmware</span><span className="text-gray-800 dark:text-white">{connectionResult.result.firmwareVersion || "—"}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Device Time</span><span className="text-gray-800 dark:text-white">{connectionResult.result.deviceTime || "—"}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Enrolled Users</span><span className="text-gray-800 dark:text-white">{connectionResult.result.enrolledUsers ?? "—"}</span></div>
                </>
              ) : (
                <div className="mt-2 rounded-lg bg-red-50 dark:bg-red-900/20 p-3 text-red-600 dark:text-red-400 space-y-2">
                  <p className="font-semibold">❌ Cannot connect to biometric device</p>
                  <div><span className="font-medium">Reason:</span> {connectionResult.result.error}</div>
                  <div><span className="font-medium">IP:</span> {connectionResult.device.ipAddress}</div>
                  <div><span className="font-medium">Port:</span> {connectionResult.device.port}</div>
                  <div>
                    <span className="font-medium">Suggestion:</span>
                    <ul className="list-disc list-inside mt-1">
                      <li>Check TCP/IP connectivity</li>
                      <li>Check Firewall rules on this port</li>
                      <li>Confirm the Device is Online</li>
                    </ul>
                  </div>
                </div>
              )}
            </div>
            <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-800 flex justify-end">
              <button onClick={() => setConnectionResult(null)}
                className="px-4 py-2 text-sm rounded-lg bg-brand-500 hover:bg-brand-600 text-white font-medium">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sync Now result modal */}
      {syncResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-gray-900 shadow-xl">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-800 dark:text-white">Sync Result — {syncResult.device.name}</h3>
              <button onClick={() => setSyncResult(null)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xl leading-none">&times;</button>
            </div>
            <div className="p-6 grid grid-cols-2 gap-3 text-sm">
              {[
                { label: "Downloaded", value: syncResult.result.rawRecordsDownloaded },
                { label: "Processed", value: syncResult.result.accepted },
                { label: "Duplicates", value: syncResult.result.duplicates },
                { label: "Unmapped", value: syncResult.result.unmapped },
                { label: "Errors", value: syncResult.result.errors.length },
                { label: "Duration", value: `${syncResult.result.durationMs} ms` },
              ].map(c => (
                <div key={c.label} className="text-center p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                  <p className="text-xl font-bold text-gray-800 dark:text-white">{c.value}</p>
                  <p className="text-xs text-gray-500 mt-1">{c.label}</p>
                </div>
              ))}
            </div>
            {syncResult.result.errors.length > 0 && (
              <div className="px-6 pb-4">
                <div className="rounded-lg bg-red-50 dark:bg-red-900/20 px-3 py-2 text-xs text-red-600 dark:text-red-400 max-h-32 overflow-y-auto space-y-1">
                  {syncResult.result.errors.map((e, i) => <div key={i}>{e}</div>)}
                </div>
              </div>
            )}
            <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-800 flex justify-end">
              <button onClick={() => setSyncResult(null)}
                className="px-4 py-2 text-sm rounded-lg bg-brand-500 hover:bg-brand-600 text-white font-medium">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Connector error details — the real exception, never a bare "Error" toast */}
      {errorDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-gray-900 shadow-xl">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
              <h3 className="text-lg font-bold text-red-600 dark:text-red-400">{errorDetails.title}</h3>
              <button onClick={() => setErrorDetails(null)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xl leading-none">&times;</button>
            </div>
            <div className="p-6 space-y-3 text-sm max-h-[70vh] overflow-y-auto">
              {errorDetails.httpStatus != null && (
                <div><span className="font-medium text-gray-500">HTTP:</span> <span className="font-mono text-gray-800 dark:text-white">{errorDetails.httpStatus}</span></div>
              )}
              <div>
                <p className="font-medium text-gray-500">Message</p>
                <p className="text-gray-800 dark:text-white">{errorDetails.message}</p>
              </div>
              <div>
                <p className="font-medium text-gray-500">Device</p>
                <p className="font-mono text-gray-800 dark:text-white">{errorDetails.device.ipAddress}:{errorDetails.device.port}</p>
              </div>
              <div>
                <p className="font-medium text-gray-500">Details</p>
                <p className="text-gray-800 dark:text-white whitespace-pre-wrap break-words">{errorDetails.errorText}</p>
              </div>
              <div className="rounded-lg bg-amber-50 dark:bg-amber-900/20 px-3 py-2 text-amber-700 dark:text-amber-400 text-xs">
                <p className="font-medium mb-1">Suggestion</p>
                <ul className="list-disc list-inside space-y-0.5">
                  <li>Check TCP/IP connectivity</li>
                  <li>Check Firewall rules on port {errorDetails.device.port}</li>
                  <li>Confirm the Device is Online</li>
                </ul>
              </div>
              {errorDetails.file && (
                <p className="text-xs text-gray-400 font-mono break-all">{errorDetails.file}:{errorDetails.line}</p>
              )}
              {import.meta.env.DEV && errorDetails.stack && (
                <details className="text-xs">
                  <summary className="cursor-pointer text-gray-500">Stack trace (development mode only)</summary>
                  <pre className="mt-1 whitespace-pre-wrap text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 p-2 rounded-lg overflow-x-auto">{errorDetails.stack}</pre>
                </details>
              )}
            </div>
            <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-800 flex justify-end">
              <button onClick={() => setErrorDetails(null)}
                className="px-4 py-2 text-sm rounded-lg bg-brand-500 hover:bg-brand-600 text-white font-medium">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
