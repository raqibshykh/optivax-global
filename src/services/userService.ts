import { api } from "../lib/client";

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  avatar_url: string;
  company: string;
  role: string;
  created_at: string;
}

const BASE = "/saas/v1/profiles";

export class UserService {
  static async getAll(): Promise<UserProfile[]> {
    const data = await api.get<UserProfile[]>(`${BASE}/list`);
    return data || [];
  }

  static async getById(id: string): Promise<UserProfile | null> {
    const data = await api.get<UserProfile[]>(`${BASE}/list?id=${encodeURIComponent(id)}`);
    return data?.[0] ?? null;
  }

  static async getByEmail(email: string): Promise<UserProfile | null> {
    const data = await api.get<UserProfile[]>(
      `${BASE}/list?email=${encodeURIComponent(email)}`
    );
    return data?.[0] ?? null;
  }

  static async create(user: Omit<UserProfile, "id">): Promise<UserProfile> {
    return api.post<UserProfile>(`${BASE}/create`, user);
  }

  static async update(id: string, updates: Partial<UserProfile>): Promise<UserProfile> {
    return api.put<UserProfile>(`${BASE}/update`, { id, ...updates });
  }

  static async delete(id: string): Promise<void> {
    await api.delete(`${BASE}/delete`, { id });
  }
}
