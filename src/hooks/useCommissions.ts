import { useState, useEffect, useCallback, useRef } from "react";
import { CommissionService, type Commission } from "../services/commissionService";

export type { Commission };

export const useCommissions = () => {
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const fetchCommissions = useCallback(async (params?: Record<string, string>) => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await CommissionService.getAll(params);
      if (mountedRef.current) setCommissions(data);
    } catch (err: unknown) {
      if (mountedRef.current) setError(err instanceof Error ? err.message : "Failed to fetch commissions");
    } finally {
      if (mountedRef.current) setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchCommissions(); }, [fetchCommissions]);

  const addCommission = async (data: Omit<Commission, "id" | "createdAt">) => {
    const commission = await CommissionService.create(data);
    setCommissions((prev) => [commission, ...prev]);
    return commission;
  };

  const updateCommission = async (id: string, data: Partial<Commission>) => {
    const commission = await CommissionService.update(id, data);
    setCommissions((prev) => prev.map((c) => (c.id === id ? commission : c)));
    return commission;
  };

  const deleteCommission = async (id: string) => {
    await CommissionService.delete(id);
    setCommissions((prev) => prev.filter((c) => c.id !== id));
  };

  return { commissions, isLoading, error, addCommission, updateCommission, deleteCommission, refresh: fetchCommissions };
};
