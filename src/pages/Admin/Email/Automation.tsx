import { useState } from "react";
import PageMeta from "../../../components/common/PageMeta";
import { useAutomations, useTemplates } from "../../../hooks/useEmailMarketing";
import { useToast } from "../../../context/ToastContext";
import type { EmailAutomation } from "../../../types";
import Badge from "../../../components/ui/badge/Badge";

export default function Automation() {
  const { automations, isLoading, updateAutomation } = useAutomations();
  const { templates } = useTemplates();
  const { showToast } = useToast();
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    templateId: "",
    status: "inactive" as "active" | "inactive",
    delayHours: 0,
  });

  const handleEdit = (auto: EmailAutomation) => {
    setEditingId(auto.id);
    setEditForm({
      templateId: auto.templateId,
      status: auto.status,
      delayHours: auto.delayHours,
    });
  };

  const handleSave = async (id: string) => {
    await updateAutomation(id, editForm);
    showToast("Automation updated successfully", "success");
    setEditingId(null);
  };

  const handleToggle = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === "active" ? "inactive" : "active";
    await updateAutomation(id, { status: newStatus });
    showToast(`Automation ${newStatus}`, "success");
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-solid border-brand-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <>
      <PageMeta title="Email Automation | Optivax Global" description="Configure automated email workflows" />
      <div className="flex flex-col gap-4 mb-6 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Email Automation</h1>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Set up triggers to send emails automatically.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {automations.map((auto) => (
          <div key={auto.id} className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{auto.name}</h3>
                  <Badge color={auto.status === 'active' ? 'success' : 'light'}>
                    {auto.status.toUpperCase()}
                  </Badge>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Trigger: <span className="font-mono text-xs bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">{auto.triggerType}</span>
                </p>
              </div>

              {editingId === auto.id ? (
                <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto items-start sm:items-center bg-gray-50 dark:bg-gray-800/50 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                  <div className="w-full sm:w-48">
                    <label className="block text-xs text-gray-500 mb-1">Template</label>
                    <select
                      value={editForm.templateId}
                      onChange={(e) => setEditForm({ ...editForm, templateId: e.target.value })}
                      className="w-full text-sm px-3 py-2 border border-gray-300 rounded focus:ring-1 focus:ring-brand-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                    >
                      <option value="" disabled>Select Template</option>
                      {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                  </div>
                  <div className="w-full sm:w-32">
                    <label className="block text-xs text-gray-500 mb-1">Delay (Hours)</label>
                    <input
                      type="number"
                      min="0"
                      value={editForm.delayHours}
                      onChange={(e) => setEditForm({ ...editForm, delayHours: parseInt(e.target.value) || 0 })}
                      className="w-full text-sm px-3 py-2 border border-gray-300 rounded focus:ring-1 focus:ring-brand-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                    />
                  </div>
                  <div className="flex gap-2 mt-4 sm:mt-0 self-end">
                    <button onClick={() => setEditingId(null)} className="px-3 py-2 text-sm text-gray-600 bg-white border border-gray-300 rounded hover:bg-gray-50 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600">Cancel</button>
                    <button onClick={() => handleSave(auto.id)} className="px-3 py-2 text-sm text-white bg-brand-500 rounded hover:bg-brand-600">Save</button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-4">
                  <div className="text-right hidden sm:block">
                    <p className="text-sm text-gray-900 dark:text-white font-medium">
                      {templates.find(t => t.id === auto.templateId)?.name || "No Template"}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {auto.delayHours === 0 ? "Sends immediately" : `Sends after ${auto.delayHours} hours`}
                    </p>
                  </div>
                  <div className="h-8 w-px bg-gray-200 dark:bg-gray-700 hidden sm:block"></div>
                  <button onClick={() => handleEdit(auto)} className="px-4 py-2 text-sm font-medium text-brand-500 bg-brand-50 dark:bg-brand-500/10 rounded-lg hover:bg-brand-100 dark:hover:bg-brand-500/20 transition">
                    Configure
                  </button>
                  <button 
                    onClick={() => handleToggle(auto.id, auto.status)} 
                    className={`px-4 py-2 text-sm font-medium rounded-lg transition ${auto.status === 'active' ? 'text-red-600 bg-red-50 dark:bg-red-500/10 hover:bg-red-100' : 'text-green-600 bg-green-50 dark:bg-green-500/10 hover:bg-green-100'}`}
                  >
                    {auto.status === 'active' ? 'Disable' : 'Enable'}
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
