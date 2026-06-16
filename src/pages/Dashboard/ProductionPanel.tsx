import React, { useState } from "react";
import PageMeta from "../../components/common/PageMeta";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import { RequirePermission } from "../../components/auth/RequirePermission";

// Mock Data Types
interface Task { id: string; title: string; assignedBy: string; status: "Pending" | "In Progress" | "Completed"; due_date: string; }
interface Project { id: string; name: string; client: string; status: "Planning" | "In Progress" | "Review" | "Completed"; completion_percentage: number; }
interface Client { id: string; name: string; company: string; contact: string; }

export default function ProductionPanel() {
  const [activeTab, setActiveTab] = useState("tasks");

  // Mock State
  const [tasks, setTasks] = useState<Task[]>([
    { id: "t1", title: "Design Homepage UI", assignedBy: "Manager", status: "In Progress", due_date: "2026-06-15" },
    { id: "t2", title: "Optimize DB Queries", assignedBy: "Manager", status: "Pending", due_date: "2026-06-18" },
    { id: "t3", title: "Client Feedback Revisions", assignedBy: "Sales Admin", status: "Completed", due_date: "2026-06-10" },
  ]);

  const [projects, setProjects] = useState<Project[]>([
    { id: "p1", name: "Alpha App Redesign", client: "Acme Corp", status: "In Progress", completion_percentage: 60 },
    { id: "p2", name: "Backend Migration", client: "Globex", status: "Planning", completion_percentage: 15 },
    { id: "p3", name: "E-Commerce Launch", client: "Stark Ind", status: "Review", completion_percentage: 95 },
  ]);

  const [clients] = useState<Client[]>([
    { id: "c1", name: "John Doe", company: "Acme Corp", contact: "john@acme.com" },
    { id: "c2", name: "Jane Smith", company: "Globex", contact: "jane@globex.com" },
    { id: "c3", name: "Tony Stark", company: "Stark Ind", contact: "tony@stark.com" },
  ]);

  const handleTaskStatusChange = (id: string, newStatus: Task["status"]) => {
    setTasks(tasks.map(t => t.id === id ? { ...t, status: newStatus } : t));
  };

  const handleProjectStatusChange = (id: string, newStatus: Project["status"]) => {
    setProjects(projects.map(p => p.id === id ? { ...p, status: newStatus } : p));
  };

  const pendingTasks = tasks.filter(t => t.status !== "Completed");

  return (
    <>
      <PageMeta title="Production Dashboard | Optivax CRM" description="Production admin dashboard" />
      <PageBreadcrumb pageTitle="Production Dashboard" />
      
      {/* Top KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Assigned Projects</p>
          <h4 className="mt-2 text-2xl font-bold text-gray-800 dark:text-white">{projects.length}</h4>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Pending Tasks</p>
          <h4 className="mt-2 text-2xl font-bold text-yellow-500">{pendingTasks.length}</h4>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Active Clients</p>
          <h4 className="mt-2 text-2xl font-bold text-gray-800 dark:text-white">{clients.length}</h4>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="mb-6 border-b border-gray-200 dark:border-gray-800">
        <nav className="-mb-px flex space-x-8">
          {["tasks", "projects", "clients"].map(tab => (
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
        
        {/* Tasks Tab */}
        {activeTab === "tasks" && (
          <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
            <h3 className="mb-4 text-lg font-bold text-gray-800 dark:text-white">Assigned Tasks</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
                <thead>
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Title</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Assigned By</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Due Date</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                  {tasks.map(task => (
                    <tr key={task.id}>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">{task.title}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">{task.assignedBy}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">{task.due_date}</td>
                      <td className="px-4 py-3 text-sm">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          task.status === 'Completed' ? 'bg-green-100 text-green-800' : 
                          task.status === 'In Progress' ? 'bg-blue-100 text-blue-800' : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {task.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-right">
                        <RequirePermission domain="production" action="EDIT" fallback={
                          <select className="rounded border border-gray-300 px-2 py-1 text-xs" value={task.status} disabled>
                            <option value="Pending">Pending</option>
                            <option value="In Progress">In Progress</option>
                            <option value="Completed">Completed</option>
                          </select>
                        }>
                          <select 
                            className="rounded border border-gray-300 px-2 py-1 text-xs dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                            value={task.status}
                            onChange={(e) => handleTaskStatusChange(task.id, e.target.value as Task["status"])}
                          >
                            <option value="Pending">Pending</option>
                            <option value="In Progress">In Progress</option>
                            <option value="Completed">Completed</option>
                          </select>
                        </RequirePermission>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Projects Tab */}
        {activeTab === "projects" && (
          <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
            <h3 className="mb-4 text-lg font-bold text-gray-800 dark:text-white">Ongoing Projects Workflow</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {projects.map(proj => (
                <div key={proj.id} className="p-4 border border-gray-100 dark:border-gray-800 rounded-lg bg-gray-50 dark:bg-gray-800/50">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className="font-medium text-gray-900 dark:text-white">{proj.name}</h4>
                      <p className="text-xs text-gray-500">Client: {proj.client}</p>
                    </div>
                    <RequirePermission domain="production" action="EDIT" fallback={
                      <select className="text-xs rounded-full px-2 py-1 font-medium border-0 focus:ring-0" value={proj.status} disabled>
                        <option value="Planning">Planning</option>
                        <option value="In Progress">In Progress</option>
                        <option value="Review">Review</option>
                        <option value="Completed">Completed</option>
                      </select>
                    }>
                      <select 
                        className={`text-xs rounded-full px-2 py-1 font-medium border-0 focus:ring-0 ${
                          proj.status === 'Completed' ? 'bg-green-100 text-green-800' : 
                          proj.status === 'Review' ? 'bg-purple-100 text-purple-800' : 
                          proj.status === 'In Progress' ? 'bg-blue-100 text-blue-800' : 'bg-yellow-100 text-yellow-800'
                        }`}
                        value={proj.status}
                        onChange={(e) => handleProjectStatusChange(proj.id, e.target.value as Project["status"])}
                      >
                        <option value="Planning" className="bg-white text-gray-900">Planning</option>
                        <option value="In Progress" className="bg-white text-gray-900">In Progress</option>
                        <option value="Review" className="bg-white text-gray-900">Review</option>
                        <option value="Completed" className="bg-white text-gray-900">Completed</option>
                      </select>
                    </RequirePermission>
                  </div>
                  <div className="flex justify-between text-xs mb-1 mt-4">
                    <span className="text-gray-500">Completion</span>
                    <span className="font-medium text-gray-900 dark:text-white">{proj.completion_percentage}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2 dark:bg-gray-700">
                    <div 
                      className={`h-2 rounded-full ${proj.completion_percentage === 100 ? 'bg-green-500' : 'bg-brand-500'}`} 
                      style={{ width: `${proj.completion_percentage}%` }} 
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Clients Tab */}
        {activeTab === "clients" && (
          <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
            <h3 className="mb-4 text-lg font-bold text-gray-800 dark:text-white">Production Clients</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
                <thead>
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Client Name</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Company</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contact Email</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                  {clients.map(client => (
                    <tr key={client.id}>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">{client.name}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">{client.company}</td>
                      <td className="px-4 py-3 text-sm text-brand-500 hover:underline cursor-pointer">{client.contact}</td>
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
