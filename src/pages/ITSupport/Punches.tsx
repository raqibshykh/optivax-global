import { useState, useEffect } from "react";
import PageMeta from "../../components/common/PageMeta";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import {
  BiometricPunchService, DeviceService,
  type BiometricPunch, type BiometricDevice, type PunchType, type PunchProcessedStatus,
} from "../../services/itSupportService";

const STATUS_COLORS: Record<PunchProcessedStatus, string> = {
  pending:   "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  processed: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  failed:    "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  unmapped:  "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
};

const PUNCH_TYPE_LABELS: Record<PunchType, string> = {
  in:         "Check In",
  out:        "Check Out",
  "break-in": "Break Start",
  "break-out": "Break End",
};

/**
 * Read-only viewer over the raw punches a biometric device (or its bridge)
 * has pushed — the ground truth behind every attendance row and exception
 * this integration produces. Useful for tracing exactly why a given
 * attendance record or exception looks the way it does.
 */
export default function Punches() {
  const [punches, setPunches] = useState<BiometricPunch[]>([]);
  const [devices, setDevices] = useState<BiometricDevice[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [filterDevice, setFilterDevice] = useState("all");
  const [filterType, setFilterType] = useState<"all" | PunchType>("all");
  const [filterStatus, setFilterStatus] = useState<"all" | PunchProcessedStatus>("all");

  useEffect(() => {
    setIsLoading(true);
    Promise.all([
      BiometricPunchService.getAll({
        deviceId: filterDevice !== "all" ? filterDevice : undefined,
        punchType: filterType !== "all" ? filterType : undefined,
        processedStatus: filterStatus !== "all" ? filterStatus : undefined,
      }),
      DeviceService.getAll(),
    ])
      .then(([p, d]) => { setPunches(p); setDevices(d); })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, [filterDevice, filterType, filterStatus]);

  const deviceName = (id: string) => devices.find(d => d.id === id)?.name ?? id;

  return (
    <>
      <PageMeta title="Biometric Punches | Optivax CRM" description="Raw biometric device punch log" />
      <PageBreadcrumb pageTitle="Biometric Punches" />

      <div className="flex flex-wrap gap-3 mb-4">
        <select className="rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
          value={filterDevice} onChange={e => setFilterDevice(e.target.value)}>
          <option value="all">All Devices</option>
          {devices.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>

        <select className="rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
          value={filterType} onChange={e => setFilterType(e.target.value as "all" | PunchType)}>
          <option value="all">All Punch Types</option>
          {(Object.keys(PUNCH_TYPE_LABELS) as PunchType[]).map(t => (
            <option key={t} value={t}>{PUNCH_TYPE_LABELS[t]}</option>
          ))}
        </select>

        <select className="rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
          value={filterStatus} onChange={e => setFilterStatus(e.target.value as "all" | PunchProcessedStatus)}>
          <option value="all">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="processed">Processed</option>
          <option value="failed">Failed</option>
          <option value="unmapped">Unmapped</option>
        </select>

        <span className="self-center text-sm text-gray-500">{punches.length} punch{punches.length !== 1 ? "es" : ""}</span>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800 text-sm">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-800/50">
                {["Device", "Employee", "Biometric ID", "Type", "Time (local)", "Date", "Duplicate", "Status"].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
              {isLoading && (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-sm text-gray-500">Loading…</td></tr>
              )}
              {!isLoading && punches.length === 0 && (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-sm text-gray-500">No punches found.</td></tr>
              )}
              {!isLoading && punches.map(p => (
                <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30">
                  <td className="px-4 py-3 font-medium text-gray-900 dark:text-white whitespace-nowrap">{deviceName(p.deviceId)}</td>
                  <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{p.mappedUserName ?? "Unmapped"}</td>
                  <td className="px-4 py-3 text-gray-500 font-mono text-xs">{p.biometricUserId}</td>
                  <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{PUNCH_TYPE_LABELS[p.punchType]}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">{new Date(p.punchTimeUtc + "Z").toLocaleTimeString()}</td>
                  <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{p.attendanceDate}</td>
                  <td className="px-4 py-3">{p.isDuplicate ? <span className="text-orange-500 text-xs font-medium">Yes</span> : <span className="text-gray-400 text-xs">No</span>}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${STATUS_COLORS[p.processedStatus]}`}>{p.processedStatus}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
