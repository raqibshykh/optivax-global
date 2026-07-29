import { api } from "../lib/client";
import type { ClientOwnership, ClientOwnershipHistoryEntry } from "../types";

const BASE = "/saas/v1/client-ownership";

export class ClientOwnershipService {
  static async getAll(): Promise<ClientOwnership[]> {
    const data = await api.get<ClientOwnership[]>(`${BASE}/list`);
    return data || [];
  }

  static async getByClientId(clientId: string): Promise<ClientOwnership | null> {
    const data = await api.get<ClientOwnership[]>(`${BASE}/list?clientId=${encodeURIComponent(clientId)}`);
    return data?.[0] ?? null;
  }

  static async getByMemberId(memberId: string): Promise<ClientOwnership[]> {
    const data = await api.get<ClientOwnership[]>(`${BASE}/list?ownerId=${encodeURIComponent(memberId)}`);
    return data || [];
  }

  static async getHistory(clientId?: string): Promise<ClientOwnershipHistoryEntry[]> {
    const url = clientId ? `${BASE}/history?clientId=${encodeURIComponent(clientId)}` : `${BASE}/history`;
    const data = await api.get<ClientOwnershipHistoryEntry[]>(url);
    return data || [];
  }

  static async assign(next: ClientOwnership): Promise<ClientOwnershipHistoryEntry> {
    return api.post<ClientOwnershipHistoryEntry>(`${BASE}/assign`, next);
  }

  static async remove(
    clientId: string,
    clientName: string,
    removedById: string,
    removedByName: string,
    removedByRole: string
  ): Promise<ClientOwnershipHistoryEntry | null> {
    return api.post<ClientOwnershipHistoryEntry | null>(`${BASE}/remove`, {
      clientId,
      clientName,
      removedById,
      removedByName,
      removedByRole,
    });
  }
}
