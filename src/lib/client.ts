// Authentication relies on HttpOnly cookie set by the server — no client-side token storage
import { mockUsers } from "../mock/users";

interface SaasApiResponse<T = unknown> {
  success: boolean;
  data: T;
  meta?: Record<string, unknown>;
  error?: string | null;
}

// Resolve base URL from Vite environment variables.
// In dev mode the mock server intercepts fetch by pathname, so we must
// use relative paths (empty string base) — an absolute "http://localhost/api"
// prefix causes mock server checks like startsWith("/saas/v1/...") to fail.
const getBaseUrl = (): string => {
  const env = import.meta.env as Record<string, string | undefined>;
  const envUrl = env.VITE_API_URL ?? env.VITE_API_BASE;
  if (envUrl) {
    return envUrl.replace(/\/$/, "");
  }
  return "";
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

const MOCK_PROFILES_KEY = "mock_profiles";
const MOCK_PASSWORDS_KEY = "mock_passwords";
const MOCK_SESSION_KEY = "mock_session";

export const clearMockSession = (): void => {
  localStorage.removeItem(MOCK_SESSION_KEY);
};

/** Store a password for a dynamically-created mock user (keyed by email). */
export const storeMockPassword = (email: string, password: string): void => {
  try {
    const raw = localStorage.getItem(MOCK_PASSWORDS_KEY);
    const map: Record<string, string> = raw ? JSON.parse(raw) : {};
    map[email] = password;
    localStorage.setItem(MOCK_PASSWORDS_KEY, JSON.stringify(map));
  } catch {}
};

// Mock login function
export const mockLogin = async (email: string, password: string): Promise<MockUserSession | null> => {
  // 1. Check hardcoded mock users first (any password accepted for built-in devs)
  const staticUser = mockUsers.find((u) => u.email === email);
  if (staticUser) {
    const session: MockUserSession = {
      id: staticUser.id,
      email: staticUser.email,
      user_metadata: {
        role: staticUser.role as MockUserSession["user_metadata"]["role"],
        full_name: staticUser.name,
        avatar_url: staticUser.avatar,
        company: undefined,
      },
    };
    try { localStorage.setItem(MOCK_SESSION_KEY, JSON.stringify(session)); } catch {}
    return session;
  }

  // 2. Fall back to dynamically-created profiles in localStorage
  try {
    const profilesRaw = localStorage.getItem(MOCK_PROFILES_KEY);
    const profiles: Array<{
      id: string; email: string; full_name: string;
      avatar_url?: string; company?: string; role: string;
    }> = profilesRaw ? JSON.parse(profilesRaw) : [];

    const profile = profiles.find((p) => p.email === email);
    if (!profile) return null;

    // Validate password against mock_passwords store
    const pwRaw = localStorage.getItem(MOCK_PASSWORDS_KEY);
    const passwords: Record<string, string> = pwRaw ? JSON.parse(pwRaw) : {};
    const stored = passwords[email];
    if (stored && stored !== password) return null;

    const session: MockUserSession = {
      id: profile.id,
      email: profile.email,
      user_metadata: {
        role: profile.role as MockUserSession["user_metadata"]["role"],
        full_name: profile.full_name,
        avatar_url: profile.avatar_url,
        company: profile.company,
      },
    };
    try { localStorage.setItem(MOCK_SESSION_KEY, JSON.stringify(session)); } catch {}
    return session;
  } catch {
    return null;
  }
};

// Fetch current mock session from localStorage
export const fetchSession = async (): Promise<MockUserSession | null> => {
  try {
    const raw = localStorage.getItem(MOCK_SESSION_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw) as MockUserSession;
    if (!session?.id || !session?.email || !session?.user_metadata?.role) return null;
    return session;
  } catch {
    return null;
  }
};

// Start the in-browser mock server in dev mode for profile endpoints
try {
  if (typeof window !== "undefined" && (import.meta.env?.DEV)) {
    // dynamic import to avoid bundling in production
    import("../mock/server").then((m) => m.startMockServer()).catch(() => {});
  }
} catch {}
