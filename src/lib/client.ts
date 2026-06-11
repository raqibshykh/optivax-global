// Authentication relies on HttpOnly cookie set by the server — no client-side token storage
import { mockUsers } from "../mock/users";

interface SaasApiResponse<T = unknown> {
  success: boolean;
  data: T;
  meta?: Record<string, unknown>;
  error?: string | null;
}

// Resolve base URL from Vite environment variables
const getBaseUrl = (): string => {
  const env = import.meta.env as Record<string, string | undefined>;
  const envUrl = env.VITE_API_URL ?? env.VITE_API_BASE;
  if (envUrl) {
    return envUrl.replace(/\/$/, "");
  }
  return "http://localhost:5173/api";
};

// Build request headers, merging extra headers
const buildHeaders = (extra: Record<string, string> = {}): Record<string, string> => ({
  "Content-Type": "application/json",
  ...extra,
});

// Parse error from API response
const parseErrorMessage = (
  body: SaasApiResponse | { message?: string; error?: string } | null,
  status: number
): string => {
  if (!body) return `Request failed: ${status}`;
  if ("error" in body && body.error) return body.error;
  if ("message" in body && body.message) return body.message;
  return `Request failed: ${status}`;
};

// Core request helper
const request = async <T = unknown>(path: string, options: RequestInit = {}): Promise<T> => {
  const url = `${getBaseUrl()}${path}`;
  const res = await fetch(url, {
    ...options,
    credentials: "include",
    headers: buildHeaders((options.headers as Record<string, string>) || {}),
  });

  let body: SaasApiResponse<T> | null = null;
  try {
    body = await res.json();
  } catch {
    // ignore non‑JSON response
  }

  if (body?.success === false) {
    throw new Error(parseErrorMessage(body, res.status));
  }
  if (!res.ok) {
    throw new Error(parseErrorMessage(body, res.status));
  }
  if (body && "data" in body) {
    return body.data as T;
  }
  return body as unknown as T;
};

export const api = {
  get: <T = unknown>(path: string, options?: { params?: Record<string, unknown> }) => {
    let finalPath = path;
    if (options?.params) {
      const cleaned = Object.entries(options.params).reduce(
        (acc, [k, v]) => {
          if (v !== undefined && v !== null) acc[k] = String(v);
          return acc;
        },
        {} as Record<string, string>
      );
      const q = new URLSearchParams(cleaned).toString();
      if (q) finalPath += `?${q}`;
    }
    return request<T>(finalPath, { method: "GET" });
  },
  post: <T = unknown>(path: string, body: unknown) => request<T>(path, { method: "POST", body: JSON.stringify(body) }),
  put: <T = unknown>(path: string, body: unknown) => request<T>(path, { method: "PUT", body: JSON.stringify(body) }),
  patch: <T = unknown>(path: string, body: unknown) => request<T>(path, { method: "PATCH", body: JSON.stringify(body) }),
  delete: <T = unknown>(path: string, body?: unknown) => request<T>(path, { method: "DELETE", ...(body ? { body: JSON.stringify(body) } : {}) }),
};

// Mock session definition used for pure‑React development
import { UserRole } from "../types";

export interface MockUserSession {
  id: string;
  email: string;
  user_metadata: {
    role: UserRole;
    full_name: string;
    avatar_url?: string;
    company?: string;
  };
}

// Mock login function
export const mockLogin = async (email: string, _password: string): Promise<MockUserSession | null> => {
  const user = mockUsers.find((u) => u.email === email);
  if (!user) return null;
  return {
    id: user.id,
    email: user.email,
    user_metadata: {
      role: user.role as MockUserSession["user_metadata"]["role"],
      full_name: user.name,
      avatar_url: user.avatar,
      company: undefined,
    },
  };
};

// Fetch current mock session – returns null for now
export const fetchSession = async (): Promise<MockUserSession | null> => {
  return null;
};
