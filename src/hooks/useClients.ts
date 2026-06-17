import { useState, useEffect, useCallback } from "react";
import { Client } from "../types";
import { ClientService } from "../services/clientService";
import { useAuth } from "../context/AuthContext";

export function useClients() {
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { user } = useAuth();

  const fetchClients = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      let data: Client[] = [];
      if (user?.role === "client") {
        // clients should only see their own record
        if (user.email) {
          const clientsByEmail = await ClientService.getAll();
          const own = clientsByEmail.filter((c) => c.email?.toLowerCase() === user.email?.toLowerCase());
          data = own;
        } else {
          data = [];
        }
      } else if (user?.role === "production_member") {
        // Only production members are stored in assignedProductionMembers
        data = await ClientService.getAll(user.id);
      } else {
        data = await ClientService.getAll();
      }
      setClients(data);
    } catch (err: any) {
      setError(err.message || "Failed to fetch clients");
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  const addClient = async (clientData: Omit<Client, "id">) => {
    try {
      const newClient = await ClientService.create(clientData);
      setClients((prev) => [...prev, newClient]);
      return newClient;
    } catch (err: any) {
      throw new Error(err.message || "Failed to add client");
    }
  };

  const updateClient = async (id: string, updates: Partial<Client>) => {
    try {
      const updatedClient = await ClientService.update(id, updates);
      setClients((prev) =>
        prev.map((c) => (c.id === id ? updatedClient : c))
      );
      return updatedClient;
    } catch (err: any) {
      throw new Error(err.message || "Failed to update client");
    }
  };

  const deleteClient = async (id: string) => {
    try {
      await ClientService.delete(id);
      setClients((prev) => prev.filter((c) => c.id !== id));
    } catch (err: any) {
      throw new Error(err.message || "Failed to delete client");
    }
  };

  const searchClients = async (query: string) => {
    setIsLoading(true);
    try {
      const allClients = await ClientService.getAll();
      const lowerQuery = query.toLowerCase();
      const results = allClients.filter((c) => 
        c.name.toLowerCase().includes(lowerQuery) || 
        c.email.toLowerCase().includes(lowerQuery) ||
        c.company.toLowerCase().includes(lowerQuery)
      );
      setClients(results);
    } catch (err: any) {
      setError(err.message || "Failed to search clients");
    } finally {
      setIsLoading(false);
    }
  };

  return {
    clients,
    isLoading,
    error,
    addClient,
    updateClient,
    deleteClient,
    searchClients,
    refreshClients: fetchClients,
  };
}
