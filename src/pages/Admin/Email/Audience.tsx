import { useState } from "react";
import PageMeta from "../../../components/common/PageMeta";
import { useClients } from "../../../hooks/useClients";
import { useToast } from "../../../context/ToastContext";

export default function Audience() {
  const { clients, isLoading, updateClient } = useClients();
  const { showToast } = useToast();
  const [selectedClients, setSelectedClients] = useState<Set<string>>(new Set());
  const [tagInput, setTagInput] = useState("");

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedClients(new Set(clients.map(c => c.id)));
    } else {
      setSelectedClients(new Set());
    }
  };

  const handleSelect = (id: string) => {
    const newSelected = new Set(selectedClients);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedClients(newSelected);
  };

  const handleApplyTag = async () => {
    if (!tagInput.trim()) {
      showToast("Please enter a tag name", "error");
      return;
    }
    if (selectedClients.size === 0) {
      showToast("Please select at least one client", "error");
      return;
    }

    const tag = tagInput.trim();
    for (const clientId of selectedClients) {
      const client = clients.find(c => c.id === clientId);
      if (client) {
        const currentTags = client.tags || [];
        if (!currentTags.includes(tag)) {
          await updateClient(clientId, { tags: [...currentTags, tag] });
        }
      }
    }
    
    showToast(`Tag "${tag}" applied to ${selectedClients.size} clients`, "success");
    setTagInput("");
    setSelectedClients(new Set());
  };

  const handleRemoveTag = async (clientId: string, tagToRemove: string) => {
    const client = clients.find(c => c.id === clientId);
    if (client && client.tags) {
      await updateClient(clientId, { tags: client.tags.filter(t => t !== tagToRemove) });
      showToast(`Removed tag "${tagToRemove}"`, "success");
    }
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
      <PageMeta title="Audience | Optivax Global" description="Manage your email audience and segments" />
      <div className="flex flex-col gap-4 mb-6 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Audience</h1>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Segment and tag your clients for targeted campaigns.</p>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4 mb-6 shadow-sm flex items-center gap-4">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Enter a tag (e.g., VIP, Newsletter)..."
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white"
          />
        </div>
        <button
          onClick={handleApplyTag}
          disabled={selectedClients.size === 0 || !tagInput.trim()}
          className="px-4 py-2 text-sm font-medium text-white bg-brand-500 rounded-lg hover:bg-brand-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Apply Tag to Selected ({selectedClients.size})
        </button>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900 shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
            <thead className="bg-gray-50 dark:bg-gray-800/50">
              <tr>
                <th className="px-6 py-4 text-left">
                  <input
                    type="checkbox"
                    checked={selectedClients.size === clients.length && clients.length > 0}
                    onChange={handleSelectAll}
                    className="w-4 h-4 text-brand-500 border-gray-300 rounded focus:ring-brand-500 dark:bg-gray-800 dark:border-gray-600"
                  />
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400">Client</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400">Company</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400">Tags</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
              {clients.map((client) => (
                <tr key={client.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                  <td className="px-6 py-4">
                    <input
                      type="checkbox"
                      checked={selectedClients.has(client.id)}
                      onChange={() => handleSelect(client.id)}
                      className="w-4 h-4 text-brand-500 border-gray-300 rounded focus:ring-brand-500 dark:bg-gray-800 dark:border-gray-600"
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-gray-900 dark:text-white">{client.name}</span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">{client.email}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {client.company}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-2">
                      {client.tags && client.tags.map(tag => (
                        <span key={tag} className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded-full dark:bg-gray-800 dark:text-gray-300">
                          {tag}
                          <button onClick={() => handleRemoveTag(client.id, tag)} className="text-gray-500 hover:text-red-500 focus:outline-none">
                            ✕
                          </button>
                        </span>
                      ))}
                      {(!client.tags || client.tags.length === 0) && (
                        <span className="text-xs text-gray-400">No tags</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {clients.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                    No clients found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
