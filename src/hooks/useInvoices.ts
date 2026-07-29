import { useState, useEffect, useCallback, useRef } from "react";
import { Invoice } from "../types";
import { InvoiceService } from "../services/invoiceService";
import { ClientService } from "../services/clientService";
import { useAuth } from "../context/AuthContext";

export function useInvoices() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const fetchInvoices = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      let data: Invoice[] = [];
      if (user?.role === "client") {
        const client = user.email ? await ClientService.getByEmail(user.email) : null;
        data = await InvoiceService.getByClientId(client?.id ?? user.id);
      } else {
        data = await InvoiceService.getAll();
      }
      if (mountedRef.current) setInvoices(data);
    } catch (err: unknown) {
      if (mountedRef.current) setError(err instanceof Error ? err.message : "Failed to fetch invoices");
    } finally {
      if (mountedRef.current) setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  const addInvoice = async (invoiceData: Omit<Invoice, "id" | "number">) => {
    try {
      const newInvoice = await InvoiceService.create(invoiceData);
      setInvoices((prev) => [...prev, newInvoice]);
      return newInvoice;
    } catch (err: unknown) {
      throw new Error(err instanceof Error ? err.message : "Failed to add invoice");
    }
  };

  const updateInvoice = async (id: string, updates: Partial<Invoice>) => {
    try {
      const updatedInvoice = await InvoiceService.update(id, updates);
      setInvoices((prev) =>
        prev.map((i) => (i.id === id ? updatedInvoice : i))
      );
      return updatedInvoice;
    } catch (err: unknown) {
      throw new Error(err instanceof Error ? err.message : "Failed to update invoice");
    }
  };

  const deleteInvoice = async (id: string) => {
    try {
      await InvoiceService.delete(id);
      setInvoices((prev) => prev.filter((i) => i.id !== id));
    } catch (err: unknown) {
      throw new Error(err instanceof Error ? err.message : "Failed to delete invoice");
    }
  };

  return {
    invoices,
    isLoading,
    error,
    addInvoice,
    updateInvoice,
    deleteInvoice,
    refreshInvoices: fetchInvoices,
  };
}
