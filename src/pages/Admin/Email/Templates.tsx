import { useState } from "react";
import PageMeta from "../../../components/common/PageMeta";
import { useTemplates } from "../../../hooks/useEmailMarketing";
import { PlusIcon, PencilIcon, TrashBinIcon } from "../../../icons";
import { useToast } from "../../../context/ToastContext";
import Badge from "../../../components/ui/badge/Badge";

export default function Templates() {
  const { templates, isLoading, addTemplate, deleteTemplate, updateTemplate } = useTemplates();
  const { showToast } = useToast();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<{ id: string; name: string; subject: string; type: "welcome" | "newsletter" | "reminder" | "custom"; content: string } | null>(null);
  
  const [formData, setFormData] = useState({
    name: "",
    subject: "",
    type: "custom" as "welcome" | "newsletter" | "reminder" | "custom",
    content: "<h1>Hello [Name],</h1><p>Start writing here...</p>",
  });

  const handleOpenModal = (template?: { id: string; name: string; subject: string; type: "welcome" | "newsletter" | "reminder" | "custom"; content: string }) => {
    if (template) {
      setEditingTemplate(template);
      setFormData({
        name: template.name,
        subject: template.subject,
        type: template.type,
        content: template.content,
      });
    } else {
      setEditingTemplate(null);
      setFormData({
        name: "",
        subject: "",
        type: "custom",
        content: "<h1>Hello [Name],</h1><p>Start writing here...</p>",
      });
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.subject || !formData.content) {
      showToast("Please fill all required fields", "error");
      return;
    }
    
    if (editingTemplate) {
      await updateTemplate(editingTemplate.id, formData);
      showToast("Template updated", "success");
    } else {
      await addTemplate(formData);
      showToast("Template created", "success");
    }
    setIsModalOpen(false);
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
      <PageMeta title="Email Templates | Optivax Global" description="Manage reusable email templates" />
      <div className="flex flex-col gap-4 mb-6 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Email Templates</h1>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Design and manage reusable email templates.</p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-brand-500 rounded-lg hover:bg-brand-600 transition"
        >
          <PlusIcon className="w-5 h-5" />
          Create Template
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {templates.map((tpl) => (
          <div key={tpl.id} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900 flex flex-col">
            <div className="flex justify-between items-start mb-4">
              <Badge color={tpl.type === 'welcome' ? 'success' : tpl.type === 'newsletter' ? 'primary' : 'warning'}>
                {tpl.type.charAt(0).toUpperCase() + tpl.type.slice(1)}
              </Badge>
              <div className="flex gap-2">
                <button onClick={() => handleOpenModal(tpl)} className="text-gray-500 hover:text-brand-500 dark:hover:text-brand-400">
                  <PencilIcon className="w-4 h-4" />
                </button>
                <button onClick={() => deleteTemplate(tpl.id)} className="text-gray-500 hover:text-red-500 dark:hover:text-red-400">
                  <TrashBinIcon className="w-4 h-4" />
                </button>
              </div>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">{tpl.name}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 line-clamp-1">Subject: {tpl.subject}</p>
            <div className="mt-auto pt-4 border-t border-gray-100 dark:border-gray-800 text-xs text-gray-400">
              Last updated: {tpl.updatedAt.split('T')[0]}
            </div>
          </div>
        ))}
      </div>
      
      {templates.length === 0 && (
        <div className="text-center py-12 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl">
          <p className="text-gray-500 dark:text-gray-400">No templates found. Create one to get started.</p>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center shrink-0">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {editingTemplate ? 'Edit Template' : 'Create Template'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
                ✕
              </button>
            </div>
            <form onSubmit={handleSave} className="p-6 overflow-y-auto space-y-4 flex-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Template Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Category</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as "welcome" | "newsletter" | "reminder" | "custom" })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                  >
                    <option value="welcome">Welcome</option>
                    <option value="newsletter">Newsletter</option>
                    <option value="reminder">Reminder</option>
                    <option value="custom">Custom</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Email Subject *</label>
                <input
                  type="text"
                  required
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                />
              </div>
              <div>
                <div className="flex justify-between items-end mb-2">
                  <label className="block text-sm font-medium text-gray-900 dark:text-white">Email Content (HTML) *</label>
                  <span className="text-xs text-gray-500">Supports merge tags: [Name], [Company]</span>
                </div>
                <textarea
                  required
                  rows={8}
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  className="w-full px-4 py-3 font-mono text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                />
              </div>
              
              <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-800">
                <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">Live Preview</h4>
                <iframe
                  title="Email Preview"
                  sandbox="allow-same-origin"
                  srcDoc={`<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{font-family:sans-serif;padding:12px;margin:0;font-size:14px;line-height:1.5}</style></head><body>${formData.content}</body></html>`}
                  className="w-full min-h-[120px] bg-white border border-gray-200 dark:border-gray-700 rounded shadow-sm"
                />
              </div>
            </form>
            <div className="p-6 border-t border-gray-200 dark:border-gray-800 flex justify-end gap-3 shrink-0">
              <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700">
                Cancel
              </button>
              <button onClick={handleSave} className="px-4 py-2 text-sm font-medium text-white bg-brand-500 rounded-lg hover:bg-brand-600">
                {editingTemplate ? 'Update Template' : 'Save Template'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
