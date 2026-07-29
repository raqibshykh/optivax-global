import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { useAuth } from "./AuthContext";
import { DepartmentService, type Department } from "../services/departmentService";
import { resolveDepartmentName } from "../domain/department/calculations";

export interface DepartmentContextType {
  departments: Department[];
  isLoading: boolean;
  /** Resolves a stored departmentId (or legacy dept-<domain> slug) to its display name — "Unknown Department" if it can't be resolved. Never render a raw id/slug directly. */
  getDepartmentName: (departmentIdOrSlug: string | null | undefined) => string;
}

const DepartmentContext = createContext<DepartmentContextType | undefined>(undefined);

export const useDepartments = () => {
  const context = useContext(DepartmentContext);
  if (!context) throw new Error("useDepartments must be used within DepartmentProvider");
  return context;
};

/**
 * App-wide department list, fetched once per session (not once per page) so every screen that
 * needs to show a department name resolves it the same way, from the same data, without a
 * redundant fetch. Mounted inside AuthProvider (main.tsx) since departments are only fetchable
 * once authenticated.
 */
export const DepartmentProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) {
      setDepartments([]);
      setIsLoading(false);
      return;
    }
    let cancelled = false;
    setIsLoading(true);
    DepartmentService.getAll()
      .then((depts) => { if (!cancelled) setDepartments(depts); })
      .catch(() => { if (!cancelled) setDepartments([]); })
      .finally(() => { if (!cancelled) setIsLoading(false); });
    return () => { cancelled = true; };
  }, [isAuthenticated]);

  const getDepartmentName = useCallback(
    (departmentIdOrSlug: string | null | undefined) => resolveDepartmentName(departmentIdOrSlug, departments),
    [departments],
  );

  return (
    <DepartmentContext.Provider value={{ departments, isLoading, getDepartmentName }}>
      {children}
    </DepartmentContext.Provider>
  );
};
