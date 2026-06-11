import React, { useState } from "react";
import PageMeta from "../../components/common/PageMeta";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";

// Mock Data Types
interface Campaign { id: string; name: string; platform: string; status: "Active" | "Draft" | "Completed"; budget: number; spent: number; }
interface SocialTask { id: string; title: string; platform: string; status: "To Do" | "In Progress" | "Done"; dueDate: string; }
interface AdStat { id: string; campaign: string; clicks: number; impressions: number; conversions: number; }

export default function MarketingPanel() {
  const [activeTab, setActiveTab] = useState("campaigns");

  // Mock State
  const [campaigns, setCampaigns] = useState<Campaign[]>([
    { id: "cm1", name: "Summer Sale 2026", platform: "Facebook", status: "Active", budget: 5000, spent: 2340 },
    { id: "cm2", name: "B2B Lead Gen", platform: "LinkedIn", status: "Active", budget: 10000, spent: 4500 },
    { id: "cm3", name: "Retargeting Fall", platform: "Google Ads", status: "Draft", budget: 2000, spent: 0 },
  ]);

  const [socialTasks, setSocialTasks] = useState<SocialTask[]>([
    { id: "st1", title: "Write Blog Post on CRM", platform: "WordPress", status: "To Do", dueDate: "2026-06-15" },
    { id: "st2", title: "Create Twitter Thread", platform: "Twitter", status: "In Progress", dueDate: "2026-06-12" },
    { id: "st3", title: "Instagram Reel Editing", platform: "Instagram", status: "Done", dueDate: "2026-06-10" },
  ]);

  const [adStats] = useState<AdStat[]>([
    { id: "as1", campaign: "Summer Sale 2026", clicks: 1240, impressions: 45000, conversions: 120 },
    { id: "as2", campaign: "B2B Lead Gen", clicks: 850, impressions: 12000, conversions: 45 },
  ]);

  const [newCampaign, setNewCampaign] = useState({ name: "", platform: "Facebook", budget: 0 });

  const handleAddCampaign = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCampaign.name) return;
    setCampaigns([...campaigns, {
      id: `cm${campaigns.length + 1}`,
      name: newCampaign.name,
      platform: newCampaign.platform,
      status: "Draft",
      budget: newCampaign.budget,
      spent: 0
    }]);
    setNewCampaign({ name: "", platform: "Facebook", budget: 0 });
    alert("Campaign created successfully!");
  };

  const handleTaskStatusChange = (id: string, newStatus: SocialTask["status"]) => {
    setSocialTasks(socialTasks.map(t => t.id === id ? { ...t, status: newStatus } : t));
  };

  const totalBudget = campaigns.reduce((sum, c) => sum + c.budget, 0);
  const totalSpent = campaigns.reduce((sum, c) => sum + c.spent, 0);
  const totalClicks = adStats.reduce((sum, s) => sum + s.clicks, 0);
  const activeCampaigns = campaigns.filter(c => c.status === "Active").length;

  return (
    <>
      <PageMeta title="Marketing Dashboard | Optivax CRM" description="Marketing admin dashboard" />
      <PageBreadcrumb pageTitle="Marketing Dashboard" />
      
      {/* Top KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Ad Budget</p>
          <h4 className="mt-2 text-2xl font-bold text-gray-800 dark:text-white">${totalBudget.toLocaleString()}</h4>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Spent</p>
          <h4 className="mt-2 text-2xl font-bold text-orange-500">${totalSpent.toLocaleString()}</h4>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Active Campaigns</p>
          <h4 className="mt-2 text-2xl font-bold text-blue-500">{activeCampaigns}</h4>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Clicks</p>
          <h4 className="mt-2 text-2xl font-bold text-green-500">{totalClicks.toLocaleString()}</h4>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="mb-6 border-b border-gray-200 dark:border-gray-800">
        <nav className="-mb-px flex space-x-8">
          {["campaigns", "content", "analytics"].map(tab => (
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
        
        {/* Campaigns Tab */}
        {activeTab === "campaigns" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900 lg:col-span-2">
              <h3 className="mb-4 text-lg font-bold text-gray-800 dark:text-white">Active Campaigns</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
                  <thead>
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Campaign Name</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Platform</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Budget / Spent</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                    {campaigns.map(camp => (
                      <tr key={camp.id}>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">{camp.name}</td>
                        <td className="px-4 py-3 text-sm text-gray-500">{camp.platform}</td>
                        <td className="px-4 py-3 text-sm text-gray-500">${camp.spent} / ${camp.budget}</td>
                        <td className="px-4 py-3 text-sm">
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            camp.status === 'Active' ? 'bg-green-100 text-green-800' : 
                            camp.status === 'Draft' ? 'bg-gray-100 text-gray-800' : 'bg-blue-100 text-blue-800'
                          }`}>
                            {camp.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
              <h3 className="mb-4 text-lg font-bold text-gray-800 dark:text-white">Create Campaign</h3>
              <form onSubmit={handleAddCampaign} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Campaign Name</label>
                  <input type="text" required className="w-full rounded-lg border border-gray-300 p-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white" value={newCampaign.name} onChange={e => setNewCampaign({...newCampaign, name: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Platform</label>
                  <select required className="w-full rounded-lg border border-gray-300 p-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white" value={newCampaign.platform} onChange={e => setNewCampaign({...newCampaign, platform: e.target.value})}>
                    <option value="Facebook">Facebook</option>
                    <option value="Google Ads">Google Ads</option>
                    <option value="LinkedIn">LinkedIn</option>
                    <option value="Twitter">Twitter</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Budget ($)</label>
                  <input type="number" required className="w-full rounded-lg border border-gray-300 p-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white" value={newCampaign.budget} onChange={e => setNewCampaign({...newCampaign, budget: parseInt(e.target.value) || 0})} />
                </div>
                <button type="submit" className="w-full bg-brand-500 hover:bg-brand-600 text-white font-medium py-2 px-4 rounded-lg transition-colors text-sm">
                  Create Draft
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Content Planning Tab */}
        {activeTab === "content" && (
          <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
            <h3 className="mb-4 text-lg font-bold text-gray-800 dark:text-white">Content Planning & Social Media</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
                <thead>
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Title</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Platform</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Due Date</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                  {socialTasks.map(task => (
                    <tr key={task.id}>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">{task.title}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">{task.platform}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">{task.dueDate}</td>
                      <td className="px-4 py-3 text-sm">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          task.status === 'Done' ? 'bg-green-100 text-green-800' : 
                          task.status === 'In Progress' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {task.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-right">
                        <select 
                          className="rounded border border-gray-300 px-2 py-1 text-xs dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                          value={task.status}
                          onChange={(e) => handleTaskStatusChange(task.id, e.target.value as SocialTask["status"])}
                        >
                          <option value="To Do">To Do</option>
                          <option value="In Progress">In Progress</option>
                          <option value="Done">Done</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Analytics Tab */}
        {activeTab === "analytics" && (
          <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
            <h3 className="mb-4 text-lg font-bold text-gray-800 dark:text-white">Ad Tracking & Analytics</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {adStats.map(stat => (
                <div key={stat.id} className="p-5 border border-gray-100 dark:border-gray-800 rounded-xl bg-gray-50 dark:bg-gray-800/50">
                  <h4 className="font-semibold text-lg text-gray-900 dark:text-white mb-4">{stat.campaign}</h4>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Impressions</p>
                      <p className="text-lg font-bold text-gray-800 dark:text-white">{stat.impressions.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Clicks</p>
                      <p className="text-lg font-bold text-blue-500">{stat.clicks.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Conversions</p>
                      <p className="text-lg font-bold text-green-500">{stat.conversions}</p>
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 flex justify-between text-sm">
                    <span className="text-gray-500">CTR (Click-Through Rate)</span>
                    <span className="font-medium text-gray-900 dark:text-white">{((stat.clicks / stat.impressions) * 100).toFixed(2)}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </>
  );
}
