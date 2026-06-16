import { useState, useEffect, useCallback } from "react";
import { Invoice } from "../types";
import { InvoiceService } from "../services/invoiceService";
import { useAuth } from "../context/AuthContext";
import { api } from "../lib/client";

export function useInvoices() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const fetchInvoices = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      let data: Invoice[] = [];
      if (user?.role === "client") {
        if (user.email) {
          // Look up client record by email to get their clientId
          const clients = await api.get<{ id: string }[]>(
            `/saas/v1/clients/list?email=${encodeURIComponent(user.email)}`
          );
          const clientId = clients?.[0]?.id;
          if (clientId) {
            data = await InvoiceService.getByClientId(clientId);
          } else {
            data = await InvoiceService.getByClientId(user.id);
          }
        } else {
          data = await InvoiceService.getByClientId(user.id);
        }
      } else if (user?.role?.endsWith("_member")) {
        data = await InvoiceService.getAll(user.id);
      } else {
        data = await InvoiceService.getAll();
      }
      setInvoices(data);
    } catch (err: any) {
      setError(err.message || "Failed to fetch invoices");
    } finally {
      setIsLoading(false);
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
    } catch (err: any) {
      throw new Error(err.message || "Failed to add invoice");
    }
  };

  const updateInvoice = async (id: string, updates: Partial<Invoice>) => {
    try {
      const updatedInvoice = await InvoiceService.update(id, updates);
      setInvoices((prev) =>
        prev.map((i) => (i.id === id ? updatedInvoice : i))
      );
      return updatedInvoice;
    } catch (err: any) {
      throw new Error(err.message || "Failed to update invoice");
    }
  };

  const deleteInvoice = async (id: string) => {
    try {
      await InvoiceService.delete(id);
      setInvoices((prev) => prev.filter((i) => i.id !== id));
    } catch (err: any) {
      throw new Error(err.message || "Failed to delete invoice");
    }
  };

  const markAsPaid = async (id: string) => {
    try {
      const updatedInvoice = await InvoiceService.markPaid(id);
      setInvoices((prev) =>
        prev.map((i) => (i.id === id ? updatedInvoice : i))
      );
      return updatedInvoice;
    } catch (err: any) {
      throw new Error(err.message || "Failed to mark invoice as paid");
    }
  };

  return {
    invoices,
    isLoading,
    error,
    addInvoice,
    updateInvoice,
    deleteInvoice,
    markAsPaid,
    refreshInvoices: fetchInvoices,
  };
}
