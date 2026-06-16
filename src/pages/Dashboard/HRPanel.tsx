import React, { useState } from "react";
import PageMeta from "../../components/common/PageMeta";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import { RequirePermission } from "../../components/auth/RequirePermission";
import Placeholder from "../../components/common/Placeholder";

// Mock Data Types
interface Employee { id: string; name: string; email: string; department: string; status: string; }
interface LeaveRequest { id: string; employee: string; department: string; type: string; days: number; status: "Pending" | "Approved" | "Rejected"; }
interface Attendance { id: string; employee: string; date: string; status: "Present" | "Absent" | "Late"; }

export default function HRPanel() {
  const [activeTab, setActiveTab] = useState("directory");

  // Mock State
  const [employees, setEmployees] = useState<Employee[]>([
    { id: "e1", name: "Alice Johnson", email: "alice@example.com", department: "Production", status: "Active" },
    { id: "e2", name: "Bob Smith", email: "bob@example.com", department: "Production", status: "Active" },
    { id: "e3", name: "Charlie Davis", email: "charlie@example.com", department: "Sales", status: "Active" },
    { id: "e4", name: "Diana Prince", email: "diana@example.com", department: "Marketing", status: "On Leave" },
  ]);

  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([
    { id: "lr1", employee: "Bob Smith", department: "Production", type: "Sick Leave", days: 2, status: "Pending" },
    { id: "lr2", employee: "Diana Prince", department: "Marketing", type: "Annual Leave", days: 5, status: "Approved" },
    { id: "lr3", employee: "Charlie Davis", department: "Sales", type: "Personal", days: 1, status: "Pending" },
  ]);

  const [attendance] = useState<Attendance[]>([
    { id: "a1", employee: "Alice Johnson", date: new Date().toLocaleDateString(), status: "Present" },
    { id: "a2", employee: "Bob Smith", date: new Date().toLocaleDateString(), status: "Absent" },
    { id: "a3", employee: "Charlie Davis", date: new Date().toLocaleDateString(), status: "Late" },
  ]);

  const [newEmployee, setNewEmployee] = useState({ name: "", email: "", department: "Sales" });

  const handleAddEmployee = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmployee.name || !newEmployee.email) return;
    setEmployees([...employees, {
      id: `e${employees.length + 1}`,
      name: newEmployee.name,
      email: newEmployee.email,
      department: newEmployee.department,
      status: "Active"
    }]);
    setNewEmployee({ name: "", email: "", department: "Sales" });
    alert("Employee added successfully!");
  };

  const handleLeaveAction = (id: string, action: "Approved" | "Rejected") => {
    setLeaveRequests(leaveRequests.map(lr => 
      lr.id === id ? { ...lr, status: action } : lr
    ));
  };

  // Group employees by department
  const employeesByDept = employees.reduce((acc, emp) => {
    if (!acc[emp.department]) acc[emp.department] = [];
    acc[emp.department].push(emp);
    return acc;
  }, {} as Record<string, Employee[]>);

  const pendingLeaves = leaveRequests.filter(lr => lr.status === "Pending").length;

  return (
    <>
      <PageMeta title="HR Dashboard | Optivax CRM" description="HR Dashboard for managing users and departments" />
      <PageBreadcrumb pageTitle="HR Dashboard" />
      
      {/* Top KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Employees</p>
          <h4 className="mt-2 text-2xl font-bold text-gray-800 dark:text-white">{employees.length}</h4>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Departments</p>
          <h4 className="mt-2 text-2xl font-bold text-gray-800 dark:text-white">{Object.keys(employeesByDept).length}</h4>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Pending Leave Requests</p>
          <h4 className="mt-2 text-2xl font-bold text-gray-800 dark:text-white">{pendingLeaves}</h4>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Absent Today</p>
          <h4 className="mt-2 text-2xl font-bold text-red-500 dark:text-red-400">{attendance.filter(a => a.status === 'Absent').length}</h4>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="mb-6 border-b border-gray-200 dark:border-gray-800">
        <nav className="-mb-px flex space-x-8">
          {["directory", "leave", "attendance"].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab 
                  ? "border-brand-500 text-brand-600 dark:text-brand-400" 
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300"
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </nav>
      </div>

      <div className="space-y-6">
        {/* Directory Tab */}
        {activeTab === "directory" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900 lg:col-span-2">
              <h3 className="mb-4 text-lg font-bold text-gray-800 dark:text-white">Department-wise Employees</h3>
              {Object.entries(employeesByDept).map(([dept, emps]) => (
                <div key={dept} className="mb-6">
                  <h4 className="text-md font-semibold text-gray-700 dark:text-gray-300 mb-2 border-b border-gray-100 dark:border-gray-800 pb-2">{dept}</h4>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
                      <thead>
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                        {emps.map(emp => (
                          <tr key={emp.id}>
                            <td className="px-4 py-2 text-sm font-medium text-gray-900 dark:text-white">{emp.name}</td>
                            <td className="px-4 py-2 text-sm text-gray-500">{emp.email}</td>
                            <td className="px-4 py-2 text-sm">
                              <span className={`px-2 py-1 text-xs rounded-full ${emp.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                                {emp.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>

            <RequirePermission
              domain="hr"
              action="CREATE"
              fallback={
                <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
                  <h3 className="mb-4 text-lg font-bold text-gray-800 dark:text-white">Add New Employee</h3>
                  <Placeholder message="You don't have permission to add employees." />
                </div>
              }
            >
            <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
              <h3 className="mb-4 text-lg font-bold text-gray-800 dark:text-white">Add New Employee</h3>
              <form onSubmit={handleAddEmployee} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Full Name</label>
                  <input 
                    type="text" required
                    className="w-full rounded-lg border border-gray-300 p-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                    value={newEmployee.name}
                    onChange={e => setNewEmployee({...newEmployee, name: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
                  <input 
                    type="email" required
                    className="w-full rounded-lg border border-gray-300 p-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                    value={newEmployee.email}
                    onChange={e => setNewEmployee({...newEmployee, email: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Department</label>
                  <select 
                    className="w-full rounded-lg border border-gray-300 p-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                    value={newEmployee.department}
                    onChange={e => setNewEmployee({...newEmployee, department: e.target.value})}
                  >
                    <option value="Production">Production</option>
                    <option value="Sales">Sales</option>
                    <option value="Marketing">Marketing</option>
                    <option value="HR">HR</option>
                  </select>
                </div>
                <button type="submit" className="w-full bg-brand-500 hover:bg-brand-600 text-white font-medium py-2 px-4 rounded-lg transition-colors text-sm">
                  Add Employee
                </button>
              </form>
            </div>
            </RequirePermission>
          </div>
        )}

        {/* Leave Tab */}
        {activeTab === "leave" && (
          <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
            <h3 className="mb-4 text-lg font-bold text-gray-800 dark:text-white">Leave Requests</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
                <thead>
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Employee</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Department</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type & Duration</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                  {leaveRequests.map(lr => (
                    <tr key={lr.id}>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">{lr.employee}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">{lr.department}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">{lr.type} ({lr.days} days)</td>
                      <td className="px-4 py-3 text-sm">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          lr.status === 'Approved' ? 'bg-green-100 text-green-800' : 
                          lr.status === 'Rejected' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {lr.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-right">
                        {lr.status === 'Pending' && (
                          <div className="flex justify-end gap-2">
                            <RequirePermission domain="hr" action="APPROVE" fallback={<span className="text-gray-400 text-xs">Restricted</span>}>
                              <button onClick={() => handleLeaveAction(lr.id, 'Approved')} className="text-green-600 hover:text-green-900 bg-green-50 hover:bg-green-100 px-2 py-1 rounded text-xs font-medium">Approve</button>
                            </RequirePermission>
                            <RequirePermission domain="hr" action="APPROVE" fallback={<span className="text-gray-400 text-xs">Restricted</span>}>
                              <button onClick={() => handleLeaveAction(lr.id, 'Rejected')} className="text-red-600 hover:text-red-900 bg-red-50 hover:bg-red-100 px-2 py-1 rounded text-xs font-medium">Reject</button>
                            </RequirePermission>
                          </div>
                        )}
                        {lr.status !== 'Pending' && <span className="text-gray-400 text-xs">Processed</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Attendance Tab */}
        {activeTab === "attendance" && (
          <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
            <h3 className="mb-4 text-lg font-bold text-gray-800 dark:text-white">Today's Attendance</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
                <thead>
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Employee</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                  {attendance.map(a => (
                    <tr key={a.id}>
                      <td className="px-4 py-3 text-sm text-gray-500">{a.date}</td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">{a.employee}</td>
                      <td className="px-4 py-3 text-sm">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          a.status === 'Present' ? 'bg-green-100 text-green-800' : 
                          a.status === 'Late' ? 'bg-orange-100 text-orange-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {a.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>
    </>
  );
}
