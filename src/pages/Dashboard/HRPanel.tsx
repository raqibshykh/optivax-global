import React, { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import PageMeta from "../../components/common/PageMeta";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import { RequirePermission } from "../../components/auth/RequirePermission";
import { safeParse } from "../../lib/storage";
import type { LeaveRequest } from "../Client/Profile";
import { UserService, UserProfile } from "../../services/userService";
import { notifyUserCreated } from "../../services/notificationHelpers";
import { useAuth } from "../../context/AuthContext";
import { storeMockPassword } from "../../lib/client";
import { getAdvanceRequests } from "../../mock/payrollData";

const LEAVE_REQUESTS_KEY = "optivax_leave_requests";
const EXTRA_KEY = "optivax_employee_extra";
const ATTENDANCE_KEY = "optivax_attendance";

type AttendanceStatus = "Present" | "Absent" | "Late";
// stored as Record<date-string, Record<userId, AttendanceStatus>>

interface EmployeeExtraData {
  userId: string;
  leavesTaken: number;
  salary: number;
  salaryStatus: "Paid" | "Unpaid";
  workMode: "Onsite" | "Remote";
}

// HR Admin can create these roles only (not management/super_admin/client)
const HR_CREATABLE_ROLES = [
  { value: "hr_member",         label: "HR Member" },
  { value: "sales_admin",       label: "Sales Admin" },
  { value: "sales_member",      label: "Sales Member" },
  { value: "marketing_admin",   label: "Marketing Admin" },
  { value: "marketing_member",  label: "Marketing Member" },
  { value: "production_admin",  label: "Production Admin" },
  { value: "production_member", label: "Production Member" },
];

interface CreateUserForm {
  full_name: string; email: string; password: string; role: string;
}

export default function HRPanel() {
  const { user: currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState("directory");

  // ── Create User form state ────────────────────────────────────────────────
  const [createForm, setCreateForm] = useState<CreateUserForm>({
    full_name: "", email: "", password: "", role: "hr_member",
  });
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError]     = useState("");
  const [createSuccess, setCreateSuccess] = useState("");

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(""); setCreateSuccess("");
    if (!createForm.full_name || !createForm.email || !createForm.password) {
      setCreateError("All fields are required.");
      return;
    }
    setCreateLoading(true);
    try {
      const newUser = await UserService.create({
        full_name: createForm.full_name,
        email: createForm.email,
        avatar_url: "",
        company: "Optivax Global",
        role: createForm.role,
        created_at: new Date().toISOString(),
      });
      // Store password so the new user can log in
      storeMockPassword(createForm.email, createForm.password);
      if (currentUser) {
        notifyUserCreated(
          currentUser.id, currentUser.name, currentUser.role,
          newUser.id, newUser.full_name, newUser.email, newUser.role
        );
      }
      setCreateSuccess(`User "${newUser.full_name}" created. They can now log in with their email and the password you set.`);
      setCreateForm({ full_name: "", email: "", password: "", role: "hr_member" });
      // Refresh employee list
      UserService.getAll().then((all) => setEmployees(all.filter((u) => u.role !== "client")));
    } catch {
      setCreateError("Failed to create user. Email may already be in use.");
    } finally {
      setCreateLoading(false);
    }
  };

  // ── Real employees from UserService ──────────────────────────────────
  const [employees, setEmployees] = useState<UserProfile[]>([]);
  const [extraData, setExtraData] = useState<Record<string, EmployeeExtraData>>({});
  const [isLoadingEmployees, setIsLoadingEmployees] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    setIsLoadingEmployees(true);
    UserService.getAll()
      .then((all) => {
        const nonClients = all.filter((u) => u.role !== "client");
        setEmployees(nonClients);

        // Load extra data; seed defaults for any employee missing an entry
        const stored = safeParse<Record<string, EmployeeExtraData>>(
          localStorage.getItem(EXTRA_KEY),
          {}
        );
        const merged = { ...stored };
        for (const emp of nonClients) {
          if (!merged[emp.id]) {
            merged[emp.id] = { userId: emp.id, leavesTaken: 2, salary: 45000, salaryStatus: "Unpaid", workMode: "Onsite" };
          }
        }
        setExtraData(merged);
      })
      .catch(() => setEmployees([]))
      .finally(() => setIsLoadingEmployees(false));
  }, []);

  // ── Leave Requests — persisted in localStorage ────────────────────────
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>(() =>
    safeParse<LeaveRequest[]>(localStorage.getItem(LEAVE_REQUESTS_KEY), [])
  );

  useEffect(() => {
    localStorage.setItem(LEAVE_REQUESTS_KEY, JSON.stringify(leaveRequests));
  }, [leaveRequests]);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === LEAVE_REQUESTS_KEY)
        setLeaveRequests(safeParse<LeaveRequest[]>(e.newValue, []));
      if (e.key === EXTRA_KEY)
        setExtraData(safeParse<Record<string, EmployeeExtraData>>(e.newValue, {}));
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  // ── Attendance — persisted per date ──────────────────────────────────
  const todayStr = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
  const [attendanceDate, setAttendanceDate] = useState(todayStr);
  const [allAttendance, setAllAttendance] = useState<Record<string, Record<string, AttendanceStatus>>>(() =>
    safeParse<Record<string, Record<string, AttendanceStatus>>>(localStorage.getItem(ATTENDANCE_KEY), {})
  );

  const saveAttendance = (updated: Record<string, Record<string, AttendanceStatus>>) => {
    setAllAttendance(updated);
    localStorage.setItem(ATTENDANCE_KEY, JSON.stringify(updated));
  };

  const getStatusForDate = (userId: string, date: string): AttendanceStatus =>
    allAttendance[date]?.[userId] ?? "Present";

  const setStatus = (userId: string, status: AttendanceStatus) => {
    const dateRecord = { ...(allAttendance[attendanceDate] ?? {}) };
    dateRecord[userId] = status;
    saveAttendance({ ...allAttendance, [attendanceDate]: dateRecord });
  };

  // ── Derived ───────────────────────────────────────────────────────────
  const pendingLeaves = leaveRequests.filter((r) => r.status === "Pending").length;

  const pendingAdvance = useMemo(() =>
    getAdvanceRequests().filter(r => r.status === "pending").length,
  []);

  const deptCount = new Set(
    employees.map((u) => u.departmentId || (u.role ? u.role.split("_")[0] : "other"))
  ).size;

  const filteredEmployees = employees.filter((e) => {
    const q = searchQuery.toLowerCase();
    return (
      (e.full_name ?? "").toLowerCase().includes(q) ||
      e.email.toLowerCase().includes(q) ||
      (e.role ?? "").toLowerCase().includes(q)
    );
  });

  // Group filtered employees by department
  const employeeGroups = filteredEmployees.reduce<Record<string, UserProfile[]>>((acc, emp) => {
    const key = emp.departmentId
      ? emp.departmentId.replace("dept-", "")
      : (emp.role ? emp.role.split("_")[0] : "other");
    acc[key] = acc[key] ?? [];
    acc[key].push(emp);
    return acc;
  }, {});

  // ── Leave handlers ────────────────────────────────────────────────────
  const handleLeaveAction = (id: string, action: "Approved" | "Rejected") => {
    setLeaveRequests((prev) => prev.map((r) => (r.id === id ? { ...r, status: action } : r)));
  };

  const [leaveFilter, setLeaveFilter] = useState<"All" | "Pending" | "Approved" | "Rejected">("All");
  const filteredRequests = leaveRequests.filter((r) =>
    leaveFilter === "All" ? true : r.status === leaveFilter
  );

  // ── Employee detail table renderer ────────────────────────────────────
  const renderEmployeeTable = (emps: UserProfile[]) => (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800 text-sm">
        <thead>
          <tr className="bg-gray-50 dark:bg-gray-800/60">
            {["Employee", "Role", "Leaves (Taken / Left)", "Salary", "Deduction", "Salary Status", "Work Mode"].map((h) => (
              <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
          {emps.map((emp) => {
            const ex = extraData[emp.id] ?? { leavesTaken: 0, salary: 45000, salaryStatus: "Unpaid", workMode: "Onsite" };
            const leavesLeft = Math.max(0, 24 - ex.leavesTaken);
            const deduction = ex.leavesTaken > 10
              ? Math.round((ex.leavesTaken - 10) * (ex.salary / 30))
              : 0;

            return (
              <tr key={emp.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40">
                <td className="px-4 py-3 whitespace-nowrap">
                  <div className="font-medium text-gray-900 dark:text-white">{emp.full_name || "—"}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">{emp.email}</div>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <span className="px-2 py-0.5 text-xs rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                    {emp.role ?? "—"}
                  </span>
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-gray-700 dark:text-gray-300">
                  <span className="font-semibold text-gray-900 dark:text-white">{ex.leavesTaken}</span>
                  {" taken / "}
                  <span className="font-semibold text-green-600 dark:text-green-400">{leavesLeft}</span>
                  {" left"}
                </td>
                <td className="px-4 py-3 whitespace-nowrap font-semibold text-gray-900 dark:text-white">
                  Rs. {ex.salary.toLocaleString()}
                </td>
                <td className="px-4 py-3 whitespace-nowrap font-semibold text-red-500">
                  {deduction > 0 ? `Rs. ${deduction.toLocaleString()}` : "—"}
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                    ex.salaryStatus === "Paid"
                      ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                      : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
                  }`}>
                    {ex.salaryStatus}
                  </span>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                    ex.workMode === "Onsite"
                      ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
                      : "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400"
                  }`}>
                    {ex.workMode}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );

  return (
    <>
      <PageMeta title="HR Dashboard | Optivax CRM" description="HR Dashboard for managing employees and departments" />
      <PageBreadcrumb pageTitle="HR Dashboard" />

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-6">
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Employees</p>
          <h4 className="mt-2 text-2xl font-bold text-gray-800 dark:text-white">
            {isLoadingEmployees ? "—" : employees.length}
          </h4>
          <p className="text-xs text-gray-400 mt-1">Internal staff across all departments</p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Departments</p>
          <h4 className="mt-2 text-2xl font-bold text-gray-800 dark:text-white">
            {isLoadingEmployees ? "—" : deptCount}
          </h4>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Pending Leave Requests</p>
          <h4 className={`mt-2 text-2xl font-bold ${pendingLeaves > 0 ? "text-yellow-500" : "text-gray-800 dark:text-white"}`}>
            {pendingLeaves}
          </h4>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Absent Today</p>
          <h4 className="mt-2 text-2xl font-bold text-red-500 dark:text-red-400">
            {employees.filter((e) => getStatusForDate(e.id, todayStr) === "Absent").length}
          </h4>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Advance Requests</p>
          <h4 className={`mt-2 text-2xl font-bold ${pendingAdvance > 0 ? "text-orange-500 dark:text-orange-400" : "text-gray-800 dark:text-white"}`}>
            {pendingAdvance}
          </h4>
          <Link to="/hr/advance-salary" className="text-xs text-brand-500 hover:text-brand-600 mt-1 block">
            {pendingAdvance > 0 ? "Review pending →" : "View all →"}
          </Link>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-6 border-b border-gray-200 dark:border-gray-800">
        <nav className="-mb-px flex space-x-4 overflow-x-auto pb-px">
          {[
            { key: "directory", label: "Employee Directory" },
            { key: "leave", label: `Leave Requests${pendingLeaves > 0 ? ` (${pendingLeaves})` : ""}` },
            { key: "attendance", label: "Attendance" },
            { key: "create-user", label: "Create User" },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === tab.key
                  ? "border-brand-500 text-brand-600 dark:text-brand-400"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      <div className="space-y-6">

        {/* ── Directory Tab ─────────────────────────────────────────────── */}
        {activeTab === "directory" && (
          <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
            {/* Header + search */}
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold text-gray-800 dark:text-white">All Employees</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                  Full details of all internal staff across departments.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative w-full sm:w-64">
                  <input
                    type="text"
                    placeholder="Search name, email, role…"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                  />
                  <svg className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <RequirePermission domain="hr" action="CREATE" fallback={null}>
                  <Link
                    to="/hr/users"
                    className="px-3 py-2 text-sm font-medium text-white bg-brand-500 hover:bg-brand-600 rounded-lg transition-colors whitespace-nowrap"
                  >
                    + Add Employee
                  </Link>
                </RequirePermission>
              </div>
            </div>

            <div className="p-6">
              {isLoadingEmployees ? (
                <div className="flex justify-center py-12">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-solid border-brand-500 border-t-transparent" />
                </div>
              ) : filteredEmployees.length === 0 ? (
                <p className="text-center text-sm text-gray-500 dark:text-gray-400 py-8">
                  {searchQuery ? "No employees match your search." : "No employees found."}
                </p>
              ) : (
                <div className="space-y-8">
                  {Object.entries(employeeGroups).map(([dept, emps]) => (
                    <div key={dept}>
                      <div className="flex items-center gap-3 mb-3">
                        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-200 capitalize">
                          {dept} Department
                        </h4>
                        <span className="px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                          {emps.length} {emps.length === 1 ? "employee" : "employees"}
                        </span>
                      </div>
                      {renderEmployeeTable(emps)}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Leave Requests Tab ────────────────────────────────────────── */}
        {activeTab === "leave" && (
          <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
              <div>
                <h3 className="text-lg font-bold text-gray-800 dark:text-white">Leave Requests</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                  Review and action employee leave requests from all departments.
                </p>
              </div>
              <div className="flex gap-2 flex-wrap">
                {(["All", "Pending", "Approved", "Rejected"] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setLeaveFilter(f)}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                      leaveFilter === f
                        ? "bg-brand-500 text-white"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
                    }`}
                  >
                    {f}{f === "Pending" && pendingLeaves > 0 ? ` (${pendingLeaves})` : ""}
                  </button>
                ))}
              </div>
            </div>

            {filteredRequests.length === 0 ? (
              <div className="py-12 text-center">
                <p className="text-gray-500 dark:text-gray-400 text-sm">
                  {leaveFilter === "All"
                    ? "No leave requests yet. Employees submit requests from their Profile page."
                    : `No ${leaveFilter.toLowerCase()} requests.`}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
                  <thead>
                    <tr>
                      {["Employee", "Department", "Type", "Dates", "Days", "Reason", "Status", "Actions"].map((h) => (
                        <th key={h} className={`px-4 py-3 text-xs font-medium text-gray-500 uppercase ${h === "Actions" ? "text-right" : "text-left"}`}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                    {filteredRequests.map((r) => (
                      <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                        <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white whitespace-nowrap">{r.employeeName}</td>
                        <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">{r.department}</td>
                        <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">{r.type}</td>
                        <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">{r.startDate} → {r.endDate}</td>
                        <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300 whitespace-nowrap">{r.days}d</td>
                        <td className="px-4 py-3 text-sm text-gray-500 max-w-xs truncate">{r.reason}</td>
                        <td className="px-4 py-3 text-sm">
                          <span className={`px-2 py-1 text-xs rounded-full font-medium whitespace-nowrap ${
                            r.status === "Approved" ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" :
                            r.status === "Rejected" ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400" :
                            "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"
                          }`}>
                            {r.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-right">
                          {r.status === "Pending" ? (
                            <div className="flex justify-end gap-2">
                              <RequirePermission domain="hr" action="APPROVE" fallback={<span className="text-gray-400 text-xs">Restricted</span>}>
                                <button
                                  onClick={() => handleLeaveAction(r.id, "Approved")}
                                  className="text-green-600 hover:text-green-900 bg-green-50 hover:bg-green-100 dark:bg-green-900/20 dark:hover:bg-green-900/40 px-2 py-1 rounded text-xs font-medium"
                                >
                                  Approve
                                </button>
                              </RequirePermission>
                              <RequirePermission domain="hr" action="APPROVE" fallback={<span className="text-gray-400 text-xs">Restricted</span>}>
                                <button
                                  onClick={() => handleLeaveAction(r.id, "Rejected")}
                                  className="text-red-600 hover:text-red-900 bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/40 px-2 py-1 rounded text-xs font-medium"
                                >
                                  Reject
                                </button>
                              </RequirePermission>
                            </div>
                          ) : (
                            <span className="text-gray-400 text-xs">Processed</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── Attendance Tab ────────────────────────────────────────────── */}
        {activeTab === "attendance" && (
          <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold text-gray-800 dark:text-white">Attendance</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                  Mark and track daily attendance for all employees.
                </p>
              </div>
              <input
                type="date"
                value={attendanceDate}
                max={todayStr}
                onChange={(e) => setAttendanceDate(e.target.value)}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-transparent"
              />
            </div>

            {/* Summary bar */}
            {!isLoadingEmployees && employees.length > 0 && (() => {
              const present = employees.filter((e) => getStatusForDate(e.id, attendanceDate) === "Present").length;
              const absent  = employees.filter((e) => getStatusForDate(e.id, attendanceDate) === "Absent").length;
              const late    = employees.filter((e) => getStatusForDate(e.id, attendanceDate) === "Late").length;
              return (
                <div className="grid grid-cols-3 divide-x divide-gray-200 dark:divide-gray-800 border-b border-gray-200 dark:border-gray-800">
                  <div className="px-6 py-3 text-center">
                    <p className="text-xs text-gray-500 dark:text-gray-400 uppercase font-medium">Present</p>
                    <p className="text-xl font-bold text-green-600 dark:text-green-400">{present}</p>
                  </div>
                  <div className="px-6 py-3 text-center">
                    <p className="text-xs text-gray-500 dark:text-gray-400 uppercase font-medium">Absent</p>
                    <p className="text-xl font-bold text-red-500 dark:text-red-400">{absent}</p>
                  </div>
                  <div className="px-6 py-3 text-center">
                    <p className="text-xs text-gray-500 dark:text-gray-400 uppercase font-medium">Late</p>
                    <p className="text-xl font-bold text-orange-500 dark:text-orange-400">{late}</p>
                  </div>
                </div>
              );
            })()}

            <div className="p-6">
              {isLoadingEmployees ? (
                <div className="flex justify-center py-12">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-solid border-brand-500 border-t-transparent" />
                </div>
              ) : employees.length === 0 ? (
                <p className="text-center text-sm text-gray-500 dark:text-gray-400 py-8">No employees found.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800 text-sm">
                    <thead>
                      <tr className="bg-gray-50 dark:bg-gray-800/60">
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Employee</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Role</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Department</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Work Mode</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Mark</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                      {employees.map((emp) => {
                        const status = getStatusForDate(emp.id, attendanceDate);
                        const dept = emp.departmentId
                          ? emp.departmentId.replace("dept-", "")
                          : (emp.role ? emp.role.split("_")[0] : "—");
                        const workMode = extraData[emp.id]?.workMode ?? "Onsite";
                        return (
                          <tr key={emp.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40">
                            <td className="px-4 py-3 whitespace-nowrap">
                              <div className="font-medium text-gray-900 dark:text-white">{emp.full_name || "—"}</div>
                              <div className="text-xs text-gray-500 dark:text-gray-400">{emp.email}</div>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <span className="px-2 py-0.5 text-xs rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                                {emp.role ?? "—"}
                              </span>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400 capitalize">
                              {dept}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${
                                workMode === "Onsite"
                                  ? "bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400"
                                  : "bg-purple-50 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400"
                              }`}>
                                {workMode}
                              </span>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <span className={`px-2 py-1 text-xs rounded-full font-semibold ${
                                status === "Present" ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" :
                                status === "Late"    ? "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400" :
                                                      "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
                              }`}>
                                {status}
                              </span>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-right">
                              <RequirePermission domain="hr" action="EDIT" fallback={
                                <span className="text-xs text-gray-400 italic">View only</span>
                              }>
                                <div className="inline-flex rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                                  {(["Present", "Late", "Absent"] as AttendanceStatus[]).map((s) => (
                                    <button
                                      key={s}
                                      onClick={() => setStatus(emp.id, s)}
                                      className={`px-2.5 py-1 text-xs font-medium transition-colors ${
                                        status === s
                                          ? s === "Present" ? "bg-green-500 text-white" :
                                            s === "Late"    ? "bg-orange-500 text-white" :
                                                              "bg-red-500 text-white"
                                          : "bg-white text-gray-600 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
                                      }`}
                                    >
                                      {s}
                                    </button>
                                  ))}
                                </div>
                              </RequirePermission>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Create User Tab ───────────────────────────────────────────── */}
        {activeTab === "create-user" && (
          <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800">
              <h3 className="text-lg font-bold text-gray-800 dark:text-white">Create New Employee Account</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                HR Admin can create dept admins and members. Cannot create Management, Super Admin, or Client accounts.
              </p>
            </div>
            <div className="p-6 max-w-lg">
              {createSuccess && (
                <div className="mb-4 text-sm text-green-700 bg-green-50 dark:bg-green-900/20 dark:text-green-400 rounded-lg px-4 py-3 border border-green-200 dark:border-green-800">
                  {createSuccess}
                </div>
              )}
              {createError && (
                <div className="mb-4 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400 rounded-lg px-4 py-3 border border-red-200 dark:border-red-800">
                  {createError}
                </div>
              )}
              <form onSubmit={handleCreateUser} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Full Name</label>
                  <input type="text" required
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                    value={createForm.full_name}
                    onChange={(e) => setCreateForm((f) => ({ ...f, full_name: e.target.value }))}
                    placeholder="e.g. John Smith" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email Address</label>
                  <input type="email" required
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                    value={createForm.email}
                    onChange={(e) => setCreateForm((f) => ({ ...f, email: e.target.value }))}
                    placeholder="e.g. john@optivaxglobal.com" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Temporary Password</label>
                  <input type="password" required
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                    value={createForm.password}
                    onChange={(e) => setCreateForm((f) => ({ ...f, password: e.target.value }))}
                    placeholder="Minimum 8 characters" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Role</label>
                  <select required
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                    value={createForm.role}
                    onChange={(e) => setCreateForm((f) => ({ ...f, role: e.target.value }))}>
                    {HR_CREATABLE_ROLES.map((r) => (
                      <option key={r.value} value={r.value}>{r.label}</option>
                    ))}
                  </select>
                  <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                    Management, Super Admin, and Client roles can only be created by Super Admin.
                  </p>
                </div>
                <button type="submit" disabled={createLoading}
                  className="w-full bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white font-medium py-2.5 px-4 rounded-lg transition-colors text-sm">
                  {createLoading ? "Creating Account…" : "Create Account"}
                </button>
              </form>
            </div>
          </div>
        )}

      </div>
    </>
  );
}
