import { api } from "../lib/client";
import { mockUsers } from "../mock/users";

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  avatar_url: string;
  company: string;
  role: string;
  departmentId?: string;
  created_at: string;
}

const BASE = "/saas/v1/profiles";
const MOCK_STORAGE_KEY = "mock_profiles";

const toProfile = (u: typeof mockUsers[number]): UserProfile => ({
  id: u.id,
  email: u.email,
  full_name: u.name,
  avatar_url: u.avatar || "",
  company: u.company || "",
  role: u.role,
  departmentId: u.departmentId,
  created_at: (u.joinDate as string) || new Date().toISOString(),
});

export class UserService {
  static async getAll(): Promise<UserProfile[]> {
    // A: Try the API / mock server
    try {
      const data = await api.get<UserProfile[]>(`${BASE}/list`);
      if (Array.isArray(data) && data.length > 0) return data;
    } catch {
      // API unavailable — continue to local fallback
    }

    // B: Check localStorage (seeded by mock server on first load)
    const stored = localStorage.getItem(MOCK_STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as UserProfile[];
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch {
        // corrupt JSON — fall through to seed
      }
    }

    // C: Seed localStorage from mockUsers and return them
    const seeded = mockUsers.map(toProfile);
    localStorage.setItem(MOCK_STORAGE_KEY, JSON.stringify(seeded));
    return seeded;
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
