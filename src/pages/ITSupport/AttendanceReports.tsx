import { useState } from "react";
import PageMeta from "../../components/common/PageMeta";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import { getAttendanceExceptions, getDeviceSyncLogs, getDevices } from "../../mock/itSupportData";
import { mockUsers } from "../../mock/users";

const STAFF = mockUsers.filter(u => u.role !== "client");
const DEPTS = ["All Departments", "Sales", "Production", "Marketing", "HR", "IT Support"];

function getDeptId(dept: string) {
  return dept === "IT Support" ? "dept-it-support" : `dept-${dept.toLowerCase()}`;
}

export default function AttendanceReports() {
  const [selectedDept, setSelectedDept]   = useState("All Departments");
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));

  const exceptions  = getAttendanceExceptions();
  const syncLogs    = getDeviceSyncLogs();
  const devices     = getDevices();

  const staffFiltered = selectedDept === "All Departments"
    ? STAFF
    : STAFF.filter(u => u.departmentId === getDeptId(selectedDept));

  const totalExceptions = exceptions.length;
  const missingPunches  = exceptions.filter(e => e.exceptionType === "missing-punch" || e.exceptionType === "no-record").length;
  const lateArrivals    = exceptions.filter(e => e.exceptionType === "late-arrival").length;
  const successRate     = syncLogs.length > 0
    ? Math.round((syncLogs.filter(l => l.result === "success").length / syncLogs.length) * 100)
    : 0;

  const deptSummary = ["Sales", "Production", "Marketing", "HR", "IT Support"].map(dept => {
    const id   = getDeptId(dept);
    const staff = STAFF.filter(u => u.departmentId === id);
    const exc   = exceptions.filter(e => e.department === dept);
    const rate  = staff.length > 0 ? Math.round(((staff.length - exc.length) / staff.length) * 100) : 100;
    return { dept, staffCount: staff.length, exceptions: exc.length, attendanceRate: rate };
  });

  return (
    <>
      <PageMeta title="Attendance Reports | Optivax CRM" description="Attendance analytics and KPIs" />
      <PageBreadcrumb pageTitle="Attendance Reports" />

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <select className="rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
          value={selectedDept} onChange={e => setSelectedDept(e.target.value)}>
          {DEPTS.map(d => <option key={d}>{d}</option>)}
        </select>
        <input type="month" className="rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
          value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} />
        <button className="px-4 py-2 text-sm rounded-lg bg-brand-500 hover:bg-brand-600 text-white font-medium">
          Export CSV
        </button>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Total Staff",         value: String(staffFiltered.length),  color: "text-gray-800 dark:text-white" },
          { label: "Attendance Rate",     value: "85%",                          color: "text-green-600 dark:text-green-400" },
          { label: "Total Exceptions",    value: String(totalExceptions),        color: totalExceptions > 0 ? "text-yellow-600 dark:text-yellow-400" : "text-green-600 dark:text-green-400" },
          { label: "Device Sync Rate",    value: `${successRate}%`,              color: successRate >= 90 ? "text-green-600 dark:text-green-400" : "text-orange-600 dark:text-orange-400" },
        ].map(c => (
          <div key={c.label} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400">{c.label}</p>
            <p className={`mt-2 text-2xl font-bold ${c.color}`}>{c.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Department breakdown */}
        <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
          <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4">Department Attendance</h3>
          <div className="space-y-4">
            {deptSummary.map(d => (
              <div key={d.dept}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-medium text-gray-700 dark:text-gray-300">{d.dept}</span>
                  <span className="text-gray-500">{d.staffCount} staff · {d.exceptions} exceptions</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${d.attendanceRate >= 90 ? "bg-green-500" : d.attendanceRate >= 80 ? "bg-yellow-500" : "bg-red-500"}`}
                    style={{ width: `${d.attendanceRate}%` }}
                  />
                </div>
                <p className="text-xs text-gray-400 mt-0.5">{d.attendanceRate}% attendance rate</p>
              </div>
            ))}
          </div>
        </div>

        {/* Exception breakdown */}
        <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
          <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4">Exception Breakdown</h3>
          <div className="space-y-3">
            {[
              { label: "Missing Punches",   count: missingPunches, color: "bg-red-500" },
              { label: "Late Arrivals",     count: lateArrivals, color: "bg-yellow-500" },
              { label: "Early Departures",  count: exceptions.filter(e => e.exceptionType === "early-departure").length, color: "bg-orange-500" },
              { label: "No Records",        count: exceptions.filter(e => e.exceptionType === "no-record").length, color: "bg-gray-500" },
            ].map(item => (
              <div key={item.label} className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full shrink-0 ${item.color}`} />
                <span className="text-sm text-gray-700 dark:text-gray-300 flex-1">{item.label}</span>
                <span className="text-sm font-semibold text-gray-800 dark:text-white">{item.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Device performance */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900 mb-6">
        <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4">Device Performance</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800 text-sm">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-800/50">
                {["Device", "Branch", "Status", "Total Syncs", "Success Rate", "Records Imported", "Last Sync"].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
              {devices.map(d => {
                const dLogs     = syncLogs.filter(l => l.deviceId === d.id);
                const dSuccess  = dLogs.filter(l => l.result === "success").length;
                const dRate     = dLogs.length > 0 ? Math.round((dSuccess / dLogs.length) * 100) : 0;
                const dRecords  = dLogs.reduce((s, l) => s + l.recordsSynced, 0);
                return (
                  <tr key={d.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30">
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white whitespace-nowrap">{d.name}</td>
                    <td className="px-4 py-3 text-gray-500">{d.branch}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${
                        d.status === "online"  ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" :
                        d.status === "offline" ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400" :
                        "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400"
                      }`}>{d.status}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{dLogs.length}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-16 bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                          <div className={`h-1.5 rounded-full ${dRate >= 90 ? "bg-green-500" : dRate >= 70 ? "bg-yellow-500" : "bg-red-500"}`}
                            style={{ width: `${dRate}%` }} />
                        </div>
                        <span className="text-xs text-gray-600 dark:text-gray-400">{dRate}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{dRecords}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">{new Date(d.lastSync).toLocaleString()}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Employee attendance detail */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
        <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4">Employee Attendance Detail</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800 text-sm">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-800/50">
                {["Employee", "Department", "Role", "Exceptions", "Attendance Rate"].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
              {staffFiltered.map(u => {
                const empExc = exceptions.filter(e => e.employeeId === u.id);
                const rate   = Math.max(70, 100 - empExc.length * 5);
                return (
                  <tr key={u.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30">
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{u.name}</td>
                    <td className="px-4 py-3 text-gray-500 capitalize">{u.departmentId?.replace("dept-", "").replace(/-/g, " ") ?? "—"}</td>
                    <td className="px-4 py-3 text-gray-500 capitalize">{u.role.replace(/_/g, " ")}</td>
                    <td className="px-4 py-3 text-gray-500">{empExc.length}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-20 bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                          <div className={`h-1.5 rounded-full ${rate >= 90 ? "bg-green-500" : rate >= 80 ? "bg-yellow-500" : "bg-red-500"}`}
                            style={{ width: `${rate}%` }} />
                        </div>
                        <span className="text-xs text-gray-600 dark:text-gray-400">{rate}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
