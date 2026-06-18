import PageMeta from "../../components/common/PageMeta";
import { useClients } from "../../hooks/useClients";
import { useState, useEffect } from "react";
import ClientModal from "./ClientModal";
import { Client } from "../../types";
import { useToast } from "../../context/ToastContext";
import { useAuth } from "../../context/AuthContext";
import { UserService } from "../../services/userService";
import { storeMockPassword } from "../../lib/client";
import { notifyClientCreated } from "../../services/notificationHelpers";

export default function Clients() {
  const { clients, isLoading, addClient, updateClient, deleteClient } = useClients();
  const { showToast } = useToast();
  const { user } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  
  // Search & Pagination state
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const handleAdd = () => {
    setEditingClient(null);
    setIsModalOpen(true);
  };

  const handleEdit = (client: Client) => {
    setEditingClient(client);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirmDeleteId !== id) {
      setConfirmDeleteId(id);
      return;
    }
    setConfirmDeleteId(null);
    try {
      await deleteClient(id);
      showToast("Client deleted successfully", "success");
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

  const handleSave = async (clientData: Omit<Client, "id">, password?: string) => {
    try {
      if (editingClient) {
        await updateClient(editingClient.id, clientData);
        showToast("Client updated successfully", "success");
      } else {
        // Create login profile first (mock server matches email → uses same id for client record)
        const newProfile = await UserService.create({
          full_name: clientData.name,
          email: clientData.email,
          avatar_url: "",
          company: clientData.company,
          role: "client",
          created_at: new Date().toISOString(),
        });
        if (password) storeMockPassword(clientData.email, password);
        await addClient({
          ...clientData,
          createdBy: user?.id ?? "",
          createdByName: user?.name ?? "",
        });
        if (user) {
          notifyClientCreated(user.id, user.name, user.role, clientData.name, newProfile.id);
        }
        showToast("Client created successfully", "success");
      }
    } catch (err: any) {
      showToast(err.message, "error");
      throw err; // So the modal doesn't close on error
    }
  };

  // Filter & Pagination logic
  const filteredClients = clients.filter((c) =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.company.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalPages = Math.ceil(filteredClients.length / itemsPerPage);
  const currentClients = filteredClients.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Reset to page 1 on search
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  return (
    <>
      <PageMeta
        title="Clients | Optivax Global"
        description="Manage your clients and their information."
      />
      <div className="flex flex-col gap-4 mb-6 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
            Clients
          </h1>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Manage client accounts and information.
          </p>
        </div>
        <button 
          onClick={handleAdd}
          className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700"
        >
          Add New Client
        </button>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Client List
          </h3>
          <div className="relative w-full sm:w-64">
            <input
              type="text"
              placeholder="Search clients..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent dark:bg-gray-800 dark:border-gray-700 dark:text-white"
            />
            <svg
              className="absolute left-3 top-2.5 h-4 w-4 text-gray-400"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            {isLoading ? (
              <div className="flex justify-center p-8">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-solid border-brand-500 border-t-transparent"></div>
              </div>
            ) : filteredClients.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">No clients found.</p>
            ) : (
              <>
                {currentClients.map((client) => (
                  <div key={client.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border border-gray-200 rounded-lg dark:border-gray-700 gap-4">
                    <div>
                      <h4 className="font-medium text-gray-900 dark:text-white">{client.name}</h4>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{client.email} - {client.company}</p>
                      <p className="text-xs text-gray-400 mt-1">Status: <span className={client.status === 'active' ? 'text-green-500' : 'text-gray-500'}>{client.status}</span></p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleEdit(client)}
                        className="px-3 py-1 text-sm text-blue-600 hover:bg-blue-50 rounded dark:hover:bg-blue-900/20"
                      >
                        Edit
                      </button>
                      {confirmDeleteId === client.id ? (
                        <>
                          <span className="text-xs text-gray-600 dark:text-gray-400">Sure?</span>
                          <button
                            onClick={() => handleDelete(client.id)}
                            className="px-3 py-1 text-sm text-white bg-red-600 hover:bg-red-700 rounded"
                          >
                            Yes
                          </button>
                          <button
                            onClick={() => setConfirmDeleteId(null)}
                            className="px-3 py-1 text-sm text-gray-600 hover:bg-gray-100 rounded dark:text-gray-300 dark:hover:bg-gray-800"
                          >
                            No
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => handleDelete(client.id)}
                          className="px-3 py-1 text-sm text-red-600 hover:bg-red-50 rounded dark:hover:bg-red-900/20"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </div>
                ))}
                
                {/* Pagination Controls */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-200 dark:border-gray-800">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredClients.length)} of {filteredClients.length} clients
                    </p>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="px-3 py-1 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-700"
                      >
                        Previous
                      </button>
                      <button
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        className="px-3 py-1 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-700"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      <ClientModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        client={editingClient}
        onSave={handleSave}
      />
    </>
  );
}
