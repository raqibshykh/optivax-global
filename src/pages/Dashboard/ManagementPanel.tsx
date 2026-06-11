import React, { useState } from "react";
import PageMeta from "../../components/common/PageMeta";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";

// Mock Data Types
interface Employee { id: string; name: string; role: string; department: string; status: string; }
interface Team { id: string; name: string; lead: string; department: string; }
interface Project { id: string; name: string; assignedTo: string; status: string; progress: number; }
interface Department { id: string; name: string; head: string; employeeCount: number; }

export default function ManagementPanel() {
  const [activeTab, setActiveTab] = useState("overview");

  // Mock State
  const [employees] = useState<Employee[]>([
    { id: "e1", name: "Alice Johnson", role: "Developer", department: "Production", status: "Active" },
    { id: "e2", name: "Bob Smith", role: "Designer", department: "Production", status: "Active" },
    { id: "e3", name: "Charlie Davis", role: "Sales Rep", department: "Sales", status: "Active" },
    { id: "e4", name: "Diana Prince", role: "Marketing Lead", department: "Marketing", status: "On Leave" },
  ]);

  const [teams] = useState<Team[]>([
    { id: "t1", name: "Alpha Squad", lead: "Alice Johnson", department: "Production" },
    { id: "t2", name: "Sales Ninjas", lead: "Charlie Davis", department: "Sales" },
    { id: "t3", name: "Growth Hackers", lead: "Diana Prince", department: "Marketing" },
  ]);

  const [departments] = useState<Department[]>([
    { id: "d1", name: "Production", head: "Alice Johnson", employeeCount: 15 },
    { id: "d2", name: "Sales", head: "Charlie Davis", employeeCount: 8 },
    { id: "d3", name: "Marketing", head: "Diana Prince", employeeCount: 12 },
    { id: "d4", name: "HR", head: "Eve Adams", employeeCount: 4 },
  ]);

  const [projects, setProjects] = useState<Project[]>([
    { id: "p1", name: "Website Redesign", assignedTo: "Alpha Squad", status: "In Progress", progress: 65 },
    { id: "p2", name: "Q3 Sales Campaign", assignedTo: "Sales Ninjas", status: "Planning", progress: 10 },
    { id: "p3", name: "Social Media Push", assignedTo: "Growth Hackers", status: "In Progress", progress: 40 },
  ]);

  const [assignmentForm, setAssignmentForm] = useState({ project: "", assignee: "", type: "project" });

  const handleAssign = (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignmentForm.project || !assignmentForm.assignee) return;
    
    // Mock updating project/task assignment
    setProjects([...projects, {
      id: `p${projects.length + 1}`,
      name: assignmentForm.project,
      assignedTo: assignmentForm.assignee,
      status: "Just Assigned",
      progress: 0
    }]);
    setAssignmentForm({ project: "", assignee: "", type: "project" });
    alert(`Successfully assigned ${assignmentForm.project} to ${assignmentForm.assignee}!`);
  };

  return (
    <>
      <PageMeta title="Management Dashboard | Optivax CRM" description="Management Dashboard for tracking high-level metrics" />
      <PageBreadcrumb pageTitle="Management Dashboard" />
      
      {/* Top Level KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Employees</p>
          <h4 className="mt-2 text-2xl font-bold text-gray-800 dark:text-white">{employees.length}</h4>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Active Teams</p>
          <h4 className="mt-2 text-2xl font-bold text-gray-800 dark:text-white">{teams.length}</h4>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Departments</p>
          <h4 className="mt-2 text-2xl font-bold text-gray-800 dark:text-white">{departments.length}</h4>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Ongoing Projects</p>
          <h4 className="mt-2 text-2xl font-bold text-gray-800 dark:text-white">{projects.length}</h4>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="mb-6 border-b border-gray-200 dark:border-gray-800">
        <nav className="-mb-px flex space-x-8">
          {["overview", "directory", "workflow", "communication"].map(tab => (
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

      {/* Tab Content */}
      <div className="space-y-6">
        
        {/* Overview Tab (Reports & Stats) */}
        {activeTab === "overview" && (
          <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
            <h3 className="mb-4 text-lg font-bold text-gray-800 dark:text-white">Management Reports</h3>
            <div className="h-64 flex items-center justify-center bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-100 dark:border-gray-700">
              <p className="text-gray-500 dark:text-gray-400">Visual performance charts and department analytics go here.</p>
            </div>
          </div>
        )}

        {/* Directory Tab (Teams, Employees, Departments) */}
        {activeTab === "directory" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
              <h3 className="mb-4 text-lg font-bold text-gray-800 dark:text-white">All Departments</h3>
              <ul className="divide-y divide-gray-200 dark:divide-gray-800">
                {departments.map(dept => (
                  <li key={dept.id} className="py-3 flex justify-between">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">{dept.name}</p>
                      <p className="text-xs text-gray-500">Head: {dept.head}</p>
                    </div>
                    <span className="text-sm text-gray-500">{dept.employeeCount} Employees</span>
                  </li>
                ))}
              </ul>
            </div>
            
            <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
              <h3 className="mb-4 text-lg font-bold text-gray-800 dark:text-white">All Teams</h3>
              <ul className="divide-y divide-gray-200 dark:divide-gray-800">
                {teams.map(team => (
                  <li key={team.id} className="py-3 flex justify-between">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">{team.name}</p>
                      <p className="text-xs text-gray-500">Lead: {team.lead} | {team.department}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900 lg:col-span-2">
              <h3 className="mb-4 text-lg font-bold text-gray-800 dark:text-white">Employee Directory</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
                  <thead>
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Department</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                    {employees.map(emp => (
                      <tr key={emp.id}>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">{emp.name}</td>
                        <td className="px-4 py-3 text-sm text-gray-500">{emp.role}</td>
                        <td className="px-4 py-3 text-sm text-gray-500">{emp.department}</td>
                        <td className="px-4 py-3 text-sm">
                          <span className={`px-2 py-1 text-xs rounded-full ${emp.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                            {emp.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p className="mt-4 text-xs text-gray-500 italic">* Managers have view-only access to employee records. Deletion is restricted to Super Admins.</p>
              </div>
            </div>
          </div>
        )}

        {/* Workflow Tab (Assign Tasks/Projects, Monitor Ongoing) */}
        {activeTab === "workflow" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
              <h3 className="mb-4 text-lg font-bold text-gray-800 dark:text-white">Assign Workflow</h3>
              <form onSubmit={handleAssign} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Assignment Type</label>
                  <select 
                    className="w-full rounded-lg border border-gray-300 p-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                    value={assignmentForm.type}
                    onChange={(e) => setAssignmentForm({...assignmentForm, type: e.target.value})}
                  >
                    <option value="project">Project</option>
                    <option value="task">Task</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{assignmentForm.type === 'project' ? 'Project' : 'Task'} Name</label>
                  <input 
                    type="text" 
                    required
                    className="w-full rounded-lg border border-gray-300 p-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                    value={assignmentForm.project}
                    onChange={(e) => setAssignmentForm({...assignmentForm, project: e.target.value})}
                    placeholder="e.g. New Marketing Campaign"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Assign To (Team/Employee)</label>
                  <input 
                    type="text" 
                    required
                    className="w-full rounded-lg border border-gray-300 p-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                    value={assignmentForm.assignee}
                    onChange={(e) => setAssignmentForm({...assignmentForm, assignee: e.target.value})}
                    placeholder="e.g. Alpha Squad"
                  />
                </div>
                <button type="submit" className="w-full bg-brand-500 hover:bg-brand-600 text-white font-medium py-2 px-4 rounded-lg transition-colors text-sm">
                  Assign {assignmentForm.type === 'project' ? 'Project' : 'Task'}
                </button>
              </form>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
              <h3 className="mb-4 text-lg font-bold text-gray-800 dark:text-white">Ongoing Projects Monitor</h3>
              <div className="space-y-4">
                {projects.map(proj => (
                  <div key={proj.id} className="p-4 border border-gray-100 dark:border-gray-800 rounded-lg">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h4 className="font-medium text-gray-900 dark:text-white">{proj.name}</h4>
                        <p className="text-xs text-gray-500">Assigned to: {proj.assignedTo}</p>
                      </div>
                      <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">{proj.status}</span>
                    </div>
                    <div className="flex justify-between text-xs mb-1 mt-3">
                      <span className="text-gray-500">Progress</span>
                      <span className="font-medium text-gray-900 dark:text-white">{proj.progress}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-1.5 dark:bg-gray-700">
                      <div className="bg-brand-500 h-1.5 rounded-full" style={{ width: `${proj.progress}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Communication Tab (Coordinate with departments/admins) */}
        {activeTab === "communication" && (
          <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900 max-w-2xl">
            <h3 className="mb-4 text-lg font-bold text-gray-800 dark:text-white">Coordinate & Communicate</h3>
            <p className="text-sm text-gray-500 mb-6">Send messages or coordinate workflows directly with Department Heads or Admins.</p>
            <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); alert("Message sent successfully!"); }}>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">To</label>
                <select className="w-full rounded-lg border border-gray-300 p-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white">
                  <option>All Department Heads</option>
                  <option>HR Admin</option>
                  <option>Production Admin</option>
                  <option>Sales Admin</option>
                  <option>Marketing Admin</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Subject</label>
                <input type="text" className="w-full rounded-lg border border-gray-300 p-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white" placeholder="Workflow alignment for Q3" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Message</label>
                <textarea rows={4} className="w-full rounded-lg border border-gray-300 p-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white" placeholder="Type your message here..."></textarea>
              </div>
              <button type="submit" className="bg-brand-500 hover:bg-brand-600 text-white font-medium py-2 px-4 rounded-lg transition-colors text-sm">
                Send Message
              </button>
            </form>
          </div>
        )}

      </div>
    </>
  );
}
