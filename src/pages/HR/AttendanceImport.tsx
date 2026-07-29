import React, { useEffect, useState, useCallback } from "react";
import PageMeta from "../../components/common/PageMeta";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import LoadingState from "../../components/common/LoadingState";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { ApiError } from "../../lib/apiError";
import { AttendanceService, type StaffUser } from "../../services/attendanceService";
import {
  AttendanceImportService,
  type AttendanceImportPreviewRow,
  type AttendanceImportPreviewResult,
  type AttendanceImportConfirmResult,
  type AttendanceImportHistoryEntry,
  type BiometricMapping,
} from "../../services/attendanceImportService";

type Tab = "import" | "history" | "mapping";

const STATUS_BADGE: Record<AttendanceImportPreviewRow["status"], string> = {
  ready: "bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400",
  duplicate: "bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400",
  unmapped: "bg-orange-50 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400",
  failed: "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400",
};
const STATUS_LABEL: Record<AttendanceImportPreviewRow["status"], string> = {
  ready: "Will Import",
  duplicate: "Duplicate",
  unmapped: "Unmapped ID",
  failed: "Failed",
};

const errorMessage = (e: unknown, fallback: string): string =>
  e instanceof ApiError ? e.message : fallback;

export default function AttendanceImport() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const isAllowed = user?.role === "super_admin" || user?.role === "hr_admin";

  const [tab, setTab] = useState<Tab>("import");

  // ── Import tab state ────────────────────────────────────────────────────
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [preview, setPreview] = useState<AttendanceImportPreviewResult | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [confirmResult, setConfirmResult] = useState<AttendanceImportConfirmResult | null>(null);

  const resetImport = () => {
    setSelectedFile(null);
    setPreview(null);
    setConfirmResult(null);
  };

  const handlePreview = async () => {
    if (!selectedFile) return;
    setPreviewing(true);
    setConfirmResult(null);
    try {
      const result = await AttendanceImportService.previewFile(selectedFile);
      setPreview(result);
      if (result.summary.total === 0) {
        showToast("The file has no data rows.", "warning");
      }
    } catch (e) {
      showToast(errorMessage(e, "Could not read the uploaded file."), "error");
      setPreview(null);
    } finally {
      setPreviewing(false);
    }
  };

  const handleConfirm = async () => {
    if (!preview) return;
    setConfirming(true);
    try {
      const result = await AttendanceImportService.confirmImport(preview.fileName, preview.rows);
      setConfirmResult(result);
      showToast(
        `Import complete — ${result.importedRecords} imported, ${result.duplicateRecords} duplicates, ${result.failedRecords} failed.`,
        "success"
      );
    } catch (e) {
      showToast(errorMessage(e, "Could not complete the import."), "error");
    } finally {
      setConfirming(false);
    }
  };

  if (!isAllowed) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
          <svg className="w-6 h-6 text-red-500" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 1a4.5 4.5 0 00-4.5 4.5V9H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2h-.5V5.5A4.5 4.5 0 0010 1zm3 8V5.5a3 3 0 10-6 0V9h6z" clipRule="evenodd" />
          </svg>
        </div>
        <p className="text-gray-700 dark:text-gray-300 font-medium text-sm">Access Restricted</p>
        <p className="text-gray-400 text-xs text-center max-w-sm">
          Attendance Import is only accessible to Super Admin and HR Admin.
        </p>
      </div>
    );
  }

  return (
    <>
      <PageMeta title="Import Attendance | Optivax HR" description="Upload ZKTeco attendance exports and sync them into the ERP" />
      <PageBreadcrumb pageTitle="Import Attendance" />

      {/* ── Tabs ────────────────────────────────────────────────────────────── */}
      <div className="mb-5 flex gap-2 border-b border-gray-200 dark:border-gray-800">
        {([
          ["import", "Import"],
          ["history", "Import History"],
          ["mapping", "Biometric Mapping"],
        ] as [Tab, string][]).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              tab === key
                ? "border-brand-500 text-brand-600 dark:text-brand-400"
                : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "import" && (
        <ImportTab
          selectedFile={selectedFile}
          setSelectedFile={setSelectedFile}
          previewing={previewing}
          preview={preview}
          confirming={confirming}
          confirmResult={confirmResult}
          onPreview={handlePreview}
          onConfirm={handleConfirm}
          onCancel={resetImport}
        />
      )}
      {tab === "history" && <HistoryTab />}
      {tab === "mapping" && <MappingTab />}
    </>
  );
}

// ── Import tab ──────────────────────────────────────────────────────────────

interface ImportTabProps {
  selectedFile: File | null;
  setSelectedFile: (f: File | null) => void;
  previewing: boolean;
  preview: AttendanceImportPreviewResult | null;
  confirming: boolean;
  confirmResult: AttendanceImportConfirmResult | null;
  onPreview: () => void;
  onConfirm: () => void;
  onCancel: () => void;
}

function ImportTab({
  selectedFile, setSelectedFile, previewing, preview, confirming, confirmResult, onPreview, onConfirm, onCancel,
}: ImportTabProps) {
  return (
    <div className="space-y-5">
      {/* Upload box */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-1">Upload Attendance Export</h3>
        <p className="text-xs text-gray-400 mb-4">
          Accepts .xls, .xlsx, or .csv files exported from Attendance Management 2011 or current ZKTeco Attendance Software. Columns are detected automatically regardless of order.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="file"
            accept=".xls,.xlsx,.csv"
            onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)}
            className="text-sm text-gray-700 dark:text-gray-300 file:mr-3 file:rounded-lg file:border-0 file:bg-brand-50 file:px-3 file:py-2 file:text-sm file:font-medium file:text-brand-700 hover:file:bg-brand-100 dark:file:bg-brand-900/30 dark:file:text-brand-300"
          />
          <button
            onClick={onPreview}
            disabled={!selectedFile || previewing}
            className="px-4 py-2 text-sm font-medium text-white bg-brand-500 rounded-lg hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {previewing ? "Reading file…" : "Preview Import"}
          </button>
          {preview && (
            <button
              onClick={onCancel}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700"
            >
              Cancel / Start Over
            </button>
          )}
        </div>
      </div>

      {previewing && <LoadingState label="Reading and mapping the file…" />}

      {preview && !confirmResult && (
        <>
          <SummaryCards
            total={preview.summary.total}
            imported={preview.summary.imported}
            duplicates={preview.summary.duplicates}
            failed={preview.summary.failed}
            importedLabel="Will Import"
          />

          <div className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between flex-wrap gap-3">
              <div>
                <h3 className="text-base font-semibold text-gray-900 dark:text-white">Preview — {preview.fileName}</h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  Each row is one raw punch; check-in/check-out times are derived automatically after import.
                </p>
              </div>
              <button
                onClick={onConfirm}
                disabled={confirming || preview.summary.imported === 0}
                className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {confirming ? "Importing…" : `Confirm Import (${preview.summary.imported})`}
              </button>
            </div>
            <PreviewTable rows={preview.rows} />
          </div>
        </>
      )}

      {confirmResult && (
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4">Import Complete</h3>
          <SummaryCards
            total={confirmResult.totalRecords}
            imported={confirmResult.importedRecords}
            duplicates={confirmResult.duplicateRecords}
            failed={confirmResult.failedRecords}
            importedLabel="Imported"
          />
          {confirmResult.aggregationErrors > 0 && (
            <p className="mt-3 text-xs text-amber-600 dark:text-amber-400">
              {confirmResult.aggregationErrors} employee/day record(s) failed to update attendance history — check server logs.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function SummaryCards({
  total, imported, duplicates, failed, importedLabel,
}: { total: number; imported: number; duplicates: number; failed: number; importedLabel: string }) {
  const cards = [
    { label: "Total Records", value: total, color: "text-gray-700 dark:text-gray-300" },
    { label: importedLabel, value: imported, color: "text-green-600 dark:text-green-400" },
    { label: "Duplicates", value: duplicates, color: "text-amber-600 dark:text-amber-400" },
    { label: "Failed", value: failed, color: "text-red-600 dark:text-red-400" },
  ];
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {cards.map((c) => (
        <div key={c.label} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <p className="text-xs text-gray-500 dark:text-gray-400">{c.label}</p>
          <p className={`mt-1 text-xl font-bold ${c.color}`}>{c.value}</p>
        </div>
      ))}
    </div>
  );
}

function PreviewTable({ rows }: { rows: AttendanceImportPreviewRow[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="bg-gray-50 dark:bg-gray-800/50">
            {["Row", "Employee", "Biometric ID", "Date", "Time", "Type", "Status", "Note"].map((h) => (
              <th key={h} className="px-3 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
          {rows.length === 0 ? (
            <tr><td colSpan={8} className="px-6 py-12 text-center text-sm text-gray-400">No rows found in this file.</td></tr>
          ) : rows.map((row) => (
            <tr key={row.rowNumber} className="hover:bg-gray-50 dark:hover:bg-gray-800/30">
              <td className="px-3 py-2.5 text-xs text-gray-400">{row.rowNumber}</td>
              <td className="px-3 py-2.5 text-xs font-medium text-gray-900 dark:text-white whitespace-nowrap">{row.employeeName ?? "—"}</td>
              <td className="px-3 py-2.5 text-xs text-gray-500 whitespace-nowrap">{row.biometricUserId ?? "—"}</td>
              <td className="px-3 py-2.5 text-xs text-gray-500 whitespace-nowrap">{row.date ?? "—"}</td>
              <td className="px-3 py-2.5 text-xs text-gray-500 whitespace-nowrap">{row.time ?? "—"}</td>
              <td className="px-3 py-2.5 text-xs text-gray-500 capitalize whitespace-nowrap">{row.punchType ?? "—"}</td>
              <td className="px-3 py-2.5 whitespace-nowrap">
                <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${STATUS_BADGE[row.status]}`}>
                  {STATUS_LABEL[row.status]}
                </span>
              </td>
              <td className="px-3 py-2.5 text-xs text-gray-400 max-w-[240px] truncate" title={row.errorMessage ?? ""}>{row.errorMessage ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── History tab ─────────────────────────────────────────────────────────────

function HistoryTab() {
  const [loading, setLoading] = useState(true);
  const [entries, setEntries] = useState<AttendanceImportHistoryEntry[]>([]);
  const { showToast } = useToast();

  useEffect(() => {
    AttendanceImportService.getHistory()
      .then(setEntries)
      .catch((e) => showToast(errorMessage(e, "Could not load import history."), "error"))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) return <LoadingState label="Loading import history…" />;

  return (
    <div className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900 overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-800">
        <h3 className="text-base font-semibold text-gray-900 dark:text-white">Import History</h3>
        <p className="text-xs text-gray-400 mt-0.5">{entries.length} import(s) — most recent first</p>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-gray-50 dark:bg-gray-800/50">
              {["File", "Uploaded At", "Total", "Imported", "Duplicates", "Failed"].map((h) => (
                <th key={h} className="px-3 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
            {entries.length === 0 ? (
              <tr><td colSpan={6} className="px-6 py-12 text-center text-sm text-gray-400">No imports yet.</td></tr>
            ) : entries.map((entry) => (
              <tr key={entry.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30">
                <td className="px-3 py-2.5 text-xs font-medium text-gray-900 dark:text-white whitespace-nowrap">{entry.fileName}</td>
                <td className="px-3 py-2.5 text-xs text-gray-500 whitespace-nowrap">{new Date(entry.uploadedAt).toLocaleString()}</td>
                <td className="px-3 py-2.5 text-xs text-gray-500">{entry.totalRecords}</td>
                <td className="px-3 py-2.5 text-xs text-green-600 dark:text-green-400">{entry.importedRecords}</td>
                <td className="px-3 py-2.5 text-xs text-amber-600 dark:text-amber-400">{entry.duplicateRecords}</td>
                <td className="px-3 py-2.5 text-xs text-red-600 dark:text-red-400">{entry.failedRecords}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Mapping tab ──────────────────────────────────────────────────────────────

function MappingTab() {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [mappings, setMappings] = useState<BiometricMapping[]>([]);
  const [staff, setStaff] = useState<StaffUser[]>([]);
  const [employeeId, setEmployeeId] = useState("");
  const [biometricUserId, setBiometricUserId] = useState("");
  const [deviceName, setDeviceName] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [m, s] = await Promise.all([AttendanceImportService.getMappings(), AttendanceService.getStaffUsers()]);
      setMappings(m);
      setStaff(s);
    } catch (e) {
      showToast(errorMessage(e, "Could not load biometric mappings."), "error");
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { load(); }, [load]);

  const staffName = (id: string): string => staff.find((s) => s.id === id)?.name ?? id;

  const handleAdd = async () => {
    if (!employeeId || !biometricUserId.trim()) {
      showToast("Select an employee and enter a biometric ID.", "warning");
      return;
    }
    setSaving(true);
    try {
      await AttendanceImportService.createMapping({
        employeeId,
        biometricUserId: biometricUserId.trim(),
        deviceName: deviceName.trim() || undefined,
      });
      showToast("Mapping added.", "success");
      setEmployeeId("");
      setBiometricUserId("");
      setDeviceName("");
      await load();
    } catch (e) {
      showToast(errorMessage(e, "Could not add mapping."), "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Remove this biometric mapping?")) return;
    try {
      await AttendanceImportService.deleteMapping(id);
      showToast("Mapping removed.", "success");
      await load();
    } catch (e) {
      showToast(errorMessage(e, "Could not remove mapping."), "error");
    }
  };

  if (loading) return <LoadingState label="Loading biometric mappings…" />;

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-1">Add Mapping</h3>
        <p className="text-xs text-gray-400 mb-4">
          One employee can have exactly one biometric ID, and a biometric ID can only map to one employee.
        </p>
        <div className="flex flex-wrap gap-3 items-end">
          <div className="min-w-[200px]">
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Employee</label>
            <select
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg dark:bg-gray-800 dark:border-gray-700 dark:text-white focus:ring-2 focus:ring-brand-500"
            >
              <option value="">Select employee…</option>
              {staff.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Biometric ID</label>
            <input
              type="text"
              value={biometricUserId}
              onChange={(e) => setBiometricUserId(e.target.value)}
              placeholder="e.g. 101"
              className="px-3 py-2 text-sm border border-gray-300 rounded-lg dark:bg-gray-800 dark:border-gray-700 dark:text-white focus:ring-2 focus:ring-brand-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Device Name (optional)</label>
            <input
              type="text"
              value={deviceName}
              onChange={(e) => setDeviceName(e.target.value)}
              placeholder="e.g. Main Office K70"
              className="px-3 py-2 text-sm border border-gray-300 rounded-lg dark:bg-gray-800 dark:border-gray-700 dark:text-white focus:ring-2 focus:ring-brand-500"
            />
          </div>
          <button
            onClick={handleAdd}
            disabled={saving}
            className="px-4 py-2 text-sm font-medium text-white bg-brand-500 rounded-lg hover:bg-brand-600 disabled:opacity-50 transition-colors"
          >
            {saving ? "Saving…" : "Add Mapping"}
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-800">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white">Existing Mappings</h3>
          <p className="text-xs text-gray-400 mt-0.5">{mappings.length} mapping(s)</p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-800/50">
                {["Employee", "Biometric ID", "Device Name", "Updated", ""].map((h) => (
                  <th key={h} className="px-3 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
              {mappings.length === 0 ? (
                <tr><td colSpan={5} className="px-6 py-12 text-center text-sm text-gray-400">No mappings yet.</td></tr>
              ) : mappings.map((m) => (
                <tr key={m.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30">
                  <td className="px-3 py-2.5 text-xs font-medium text-gray-900 dark:text-white whitespace-nowrap">{staffName(m.employeeId)}</td>
                  <td className="px-3 py-2.5 text-xs text-gray-500 whitespace-nowrap">{m.biometricUserId}</td>
                  <td className="px-3 py-2.5 text-xs text-gray-500 whitespace-nowrap">{m.deviceName ?? "—"}</td>
                  <td className="px-3 py-2.5 text-xs text-gray-400 whitespace-nowrap">{new Date(m.updatedAt).toLocaleDateString()}</td>
                  <td className="px-3 py-2.5 text-right">
                    <button
                      onClick={() => handleDelete(m.id)}
                      className="text-xs font-medium text-red-600 hover:text-red-700 dark:text-red-400"
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
