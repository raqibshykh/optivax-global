import { useState, useMemo } from "react";
import PageMeta from "../../components/common/PageMeta";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import {
  getAttendanceExceptions, saveAttendanceExceptions,
  type AttendanceException, type ExceptionType,
} from "../../mock/itSupportData";

const EXCEPTION_LABELS: Record<ExceptionType, string> = {
  "missing-punch":    "Missing Punch",
  "late-arrival":     "Late Arrival",
  "early-departure":  "Early Departure",
  "overtime":         "Overtime",
  "no-record":        "No Record",
};

export default function AttendanceExceptions() {
  const { user } = useAuth();
  const { showToast } = useToast();

  const isAdmin = user?.role === "it_admin" || user?.role === "super_admin";

  const [exceptions, setExceptions] = useState<AttendanceException[]>(() => getAttendanceExceptions());
  const [filterType, setFilterType]   = useState<"all" | ExceptionType>("all");
  const [filterStatus, setFilterStatus] = useState<"all" | AttendanceException["status"]>("all");
  const [notesModal, setNotesModal]   = useState<{ id: string; notes: string } | null>(null);

  const filtered = useMemo(() =>
    exceptions.filter(ex => {
      if (filterType !== "all" && ex.exceptionType !== filterType) return false;
      if (filterStatus !== "all" && ex.status !== filterStatus) return false;
      return true;
    }),
    [exceptions, filterType, filterStatus],
  );

  const pending  = exceptions.filter(e => e.status === "pending").length;
  const reviewed = exceptions.filter(e => e.status === "reviewed").length;
  const resolved = exceptions.filter(e => e.status === "approved" || e.status === "rejected").length;

  const updateStatus = (id: string, status: AttendanceException["status"]) => {
    const updated = exceptions.map(e => e.id === id ? { ...e, status } : e);
    setExceptions(updated);
    saveAttendanceExceptions(updated);
    showToast(`Exception marked as ${status}.`, "success");
  };

  const saveNotes = () => {
    if (!notesModal) return;
    const updated = exceptions.map(e => e.id === notesModal.id ? { ...e, notes: notesModal.notes } : e);
    setExceptions(updated);
    saveAttendanceExceptions(updated);
    setNotesModal(null);
    showToast("Notes saved.", "success");
  };

  return (
    <>
      <PageMeta title="Attendance Exceptions | Optivax CRM" description="Missing punches and attendance exceptions" />
      <PageBreadcrumb pageTitle="Attendance Exceptions" />

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Total Exceptions",  value: String(exceptions.length), color: "text-gray-800 dark:text-white" },
          { label: "Pending Review",    value: String(pending),  color: pending > 0  ? "text-yellow-600 dark:text-yellow-400" : "text-green-600 dark:text-green-400" },
          { label: "Reviewed",          value: String(reviewed), color: "text-blue-600 dark:text-blue-400" },
          { label: "Resolved",          value: String(resolved), color: "text-green-600 dark:text-green-400" },
        ].map(c => (
          <div key={c.label} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400">{c.label}</p>
            <p className={`mt-2 text-2xl font-bold ${c.color}`}>{c.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <select className="rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
          value={filterType} onChange={e => setFilterType(e.target.value as "all" | ExceptionType)}>
          <option value="all">All Types</option>
          {(Object.keys(EXCEPTION_LABELS) as ExceptionType[]).map(k => (
            <option key={k} value={k}>{EXCEPTION_LABELS[k]}</option>
          ))}
        </select>

        <select className="rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
          value={filterStatus} onChange={e => setFilterStatus(e.target.value as "all" | AttendanceException["status"])}>
          <option value="all">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="reviewed">Reviewed</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>

        <span className="self-center text-sm text-gray-500">{filtered.length} exception{filtered.length !== 1 ? "s" : ""}</span>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800 text-sm">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-800/50">
                {["Employee", "Dept", "Date", "Exception Type", "Check In", "Check Out", "Expected In", "Status", "Notes", ...(isAdmin ? ["Actions"] : [])].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={10} className="px-4 py-8 text-center text-sm text-gray-500">No exceptions found.</td>
                </tr>
              )}
              {filtered.map(ex => (
                <tr key={ex.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30">
                  <td className="px-4 py-3 font-medium text-gray-900 dark:text-white whitespace-nowrap">{ex.employeeName}</td>
                  <td className="px-4 py-3 text-gray-500">{ex.department}</td>
                  <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{ex.date}</td>
                  <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{EXCEPTION_LABELS[ex.exceptionType]}</td>
                  <td className="px-4 py-3 text-gray-500">{ex.checkIn ?? "—"}</td>
                  <td className="px-4 py-3 text-gray-500">{ex.checkOut ?? "—"}</td>
                  <td className="px-4 py-3 text-gray-500">{ex.expectedCheckIn}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${
                      ex.status === "pending"  ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400" :
                      ex.status === "reviewed" ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400" :
                      ex.status === "approved" ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" :
                      "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
                    }`}>{ex.status}</span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-400 max-w-xs">
                    <button onClick={() => setNotesModal({ id: ex.id, notes: ex.notes ?? "" })}
                      className="text-brand-500 hover:text-brand-700 dark:text-brand-400 text-xs underline">
                      {ex.notes ? "View/Edit" : "Add Notes"}
                    </button>
                  </td>
                  {isAdmin && (
                    <td className="px-4 py-3">
                      <div className="flex gap-1 flex-wrap">
                        {ex.status === "pending" && (
                          <button onClick={() => updateStatus(ex.id, "reviewed")}
                            className="text-xs px-2 py-1 rounded bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 hover:bg-blue-100">
                            Mark Reviewed
                          </button>
                        )}
                        {(ex.status === "pending" || ex.status === "reviewed") && (
                          <>
                            <button onClick={() => updateStatus(ex.id, "approved")}
                              className="text-xs px-2 py-1 rounded bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 hover:bg-green-100">
                              Approve
                            </button>
                            <button onClick={() => updateStatus(ex.id, "rejected")}
                              className="text-xs px-2 py-1 rounded bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 hover:bg-red-100">
                              Reject
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Notes modal */}
      {notesModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-gray-900 shadow-xl p-6">
            <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4">Exception Notes</h3>
            <textarea
              rows={5}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white mb-4"
              value={notesModal.notes}
              onChange={e => setNotesModal(prev => prev ? { ...prev, notes: e.target.value } : null)}
              placeholder="Add notes about this attendance exception..."
            />
            <div className="flex gap-3 justify-end">
              <button onClick={() => setNotesModal(null)}
                className="px-4 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300">
                Cancel
              </button>
              <button onClick={saveNotes}
                className="px-4 py-2 text-sm rounded-lg bg-brand-500 hover:bg-brand-600 text-white font-medium">
                Save Notes
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
