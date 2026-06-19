import { useState, useEffect, useCallback } from "react";
import { api } from "../lib/client";

export interface Commission {
  id: string;
  userId: string;
  userName: string;
  type: "percentage" | "fixed";
  value: number;
  projectId?: string;
  projectName?: string;
  invoiceId?: string;
  amount: number;
  status: "pending" | "approved" | "paid";
  notes?: string;
  createdAt: string;
}

export const useCommissions = () => {
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCommissions = useCallback(async (params?: Record<string, string>) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.get<{ commissions: Commission[] }>("/saas/v1/commissions", { params });
      setCommissions(res.commissions ?? []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to fetch commissions";
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchCommissions(); }, [fetchCommissions]);

  const addCommission = async (data: Omit<Commission, "id" | "createdAt">) => {
    const res = await api.post<{ commission: Commission }>("/saas/v1/commissions", data);
    setCommissions((prev) => [res.commission, ...prev]);
    return res.commission;
  };

  const updateCommission = async (id: string, data: Partial<Commission>) => {
    const res = await api.put<{ commission: Commission }>("/saas/v1/commissions", { id, ...data });
    setCommissions((prev) => prev.map((c) => (c.id === id ? res.commission : c)));
    return res.commission;
  };

  const deleteCommission = async (id: string) => {
    await api.delete("/saas/v1/commissions", { id });
    setCommissions((prev) => prev.filter((c) => c.id !== id));
  };

  return { commissions, isLoading, error, addCommission, updateCommission, deleteCommission, refresh: fetchCommissions };
};
