// src/hooks/useUserRole.ts
import { useEffect, useState } from 'react';
import { api } from '../lib/client';

export const useUserRole = () => {
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRole = async () => {
      try {
        const response = await api.get<
          | { session?: { user_metadata: { role: string } }; user?: { user_metadata: { role: string } } }
          | { user_metadata?: { role: string } }
        >("/saas/v1/auth/me");

        const typedResponse = response as {
          session?: { user_metadata: { role: string } };
          user?: { user_metadata: { role: string } };
          user_metadata?: { role: string };
        };

        const fetchedRole =
          typedResponse.session?.user_metadata?.role ??
          typedResponse.user?.user_metadata?.role ??
          typedResponse.user_metadata?.role ??
          null;

        setRole(fetchedRole);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'Failed to load role');
      } finally {
        setLoading(false);
      }
    };
    fetchRole();
  }, []);

  return { role, loading, error };
};
