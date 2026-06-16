// Simple in-browser mock server to simulate /saas/v1/profiles endpoints for local development
// Stores data in localStorage under 'mock_profiles'

import { mockUsers } from "./users";
import { safeParseBody, safeParse } from "../lib/storage";

const TASKS_KEY = "mock_tasks";
const NOTIFS_KEY = "mock_notifications";

type Profile = {
  id: string;
  email: string;
  full_name: string;
  avatar_url?: string;
  company?: string;
  role: string;
  departmentId?: string;
  created_at?: string;
};

const STORAGE_KEY = "mock_profiles";

const read = (): Profile[] => {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    const initial = mockUsers.map((u) => ({
      id: u.id,
      email: u.email,
      full_name: u.name,
      avatar_url: u.avatar,
      company: u.company || "",
      role: u.role,
      departmentId: u.departmentId,
      created_at: (u.joinDate as string) || new Date().toISOString(),
    }));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
    return initial;
  }
  try {
    return safeParse<Profile[]>(raw, []);
  } catch {
    return [];
  }
};

const write = (profiles: Profile[]) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(profiles));
};

const jsonResponse = (data: unknown) => ({
  success: true,
  data,
});

export function startMockServer() {
  if (typeof window === "undefined") return;
  if ((window as any).__MOCK_SERVER_STARTED) return;
  (window as any).__MOCK_SERVER_STARTED = true;

  const originalFetch = window.fetch.bind(window);
  
  // Simple in-page SSE shim for dev: maintain clients and push notification events
  const sseClients: Set<any> = new Set();

  // Only override EventSource in the dev page when not already mocked
  try {
    const NativeEventSource = (window as any).EventSource;
    if (NativeEventSource && !(NativeEventSource as any).__IS_MOCKED) {
      class MockEventSource {
        url: string;
        readyState: number;
        onopen: ((ev?: Event) => void) | null = null;
        onmessage: ((ev: MessageEvent) => void) | null = null;
        onerror: ((ev?: Event) => void) | null = null;
        listeners: Record<string, Function[]> = {};
        constructor(url: string) {
          this.url = url;
          this.readyState = 1; // OPEN
          sseClients.add(this);
          // async open
          setTimeout(() => {
            try {
              this.onopen && this.onopen(new Event("open"));
            } catch {}
          }, 10);
        }
        addEventListener(type: string, cb: EventListenerOrEventListenerObject) {
          (this.listeners[type] ||= []).push(cb as Function);
        }
        removeEventListener(type: string, cb: EventListenerOrEventListenerObject) {
          const arr = this.listeners[type] || [];
          this.listeners[type] = arr.filter((f) => f !== cb);
        }
        close() {
          this.readyState = 2; // CLOSED
          sseClients.delete(this);
        }
        // internal: deliver event
        _emit(type: string, data: string) {
          const ev = new MessageEvent("message", { data });
          try { this.onmessage && this.onmessage(ev); } catch {}
          const listeners = this.listeners[type] || [];
          listeners.forEach((fn) => {
            try { fn(ev); } catch {}
          });
        }
      }
      (MockEventSource as any).__IS_MOCKED = true;
      (window as any).EventSource = MockEventSource as any;
    }
  } catch (e) {
    // ignore environment where EventSource can't be overridden
  }
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    try {
      const url = typeof input === "string" ? input : input instanceof URL ? input.href : (input as Request).url;
      const parsed = new URL(url, window.location.href);

      const method = (init?.method || "GET").toUpperCase();
      // Read optional mock auth headers for basic RBAC simulation
      const getHeader = (name: string) => {
        const h = init?.headers as Record<string, string> | Headers | undefined;
        if (!h) return null;
        if (h instanceof Headers) return h.get(name) || h.get(name.toLowerCase());
        return (h as Record<string, string>)[name] || (h as Record<string, string>)[name.toLowerCase()] || null;
      };

      const mockUserId = getHeader("X-Mock-UserId") || getHeader("x-mock-userid");
      const mockUserRole = getHeader("X-Mock-UserRole") || getHeader("x-mock-userrole");
      const profiles = read();
      if (parsed.pathname.startsWith("/saas/v1/profiles")) {

        // GET /saas/v1/profiles/list
        if (method === "GET" && parsed.pathname.endsWith("/list")) {
          const id = parsed.searchParams.get("id");
          const email = parsed.searchParams.get("email");
          let out = profiles;
          if (id) out = profiles.filter((p) => p.id === id);
          if (email) out = profiles.filter((p) => p.email === email);
          return new Response(JSON.stringify(jsonResponse(out)), { status: 200, headers: { "Content-Type": "application/json" } });
        }

        // POST /saas/v1/profiles/create
        if (method === "POST" && parsed.pathname.endsWith("/create")) {
          const body = safeParseBody<any>(init?.body, {});
          const id = `u${Math.floor(Math.random() * 100000)}`;
          const p: Profile = {
            id,
            email: body.email,
            full_name: body.full_name,
            avatar_url: body.avatar_url || "",
            company: body.company || "",
            role: body.role || "client",
            departmentId: body.departmentId,
            created_at: new Date().toISOString(),
          };
          const updated = [p, ...profiles];
          write(updated);
          return new Response(JSON.stringify(jsonResponse(p)), { status: 200, headers: { "Content-Type": "application/json" } });
        }

        // PUT /saas/v1/profiles/update
        if (method === "PUT" && parsed.pathname.endsWith("/update")) {
          const body = safeParseBody<any>(init?.body, {});
          const id = body.id;
          const updated = profiles.map((p) => (p.id === id ? { ...p, ...body } : p));
          write(updated);
          const out = updated.find((p) => p.id === id) || null;
          return new Response(JSON.stringify(jsonResponse(out)), { status: 200, headers: { "Content-Type": "application/json" } });
        }

        // DELETE /saas/v1/profiles/delete
        if (method === "DELETE" && parsed.pathname.endsWith("/delete")) {
          const body = safeParseBody<any>(init?.body, {});
          const id = body.id;
          const updated = profiles.filter((p) => p.id !== id);
          write(updated);
          return new Response(JSON.stringify(jsonResponse({})), { status: 200, headers: { "Content-Type": "application/json" } });
        }
      }

        // ── Tasks endpoints (localStorage backed) ─────────────────────────
        if (parsed.pathname.startsWith("/saas/v1/tasks")) {
          const tasksRaw = localStorage.getItem(TASKS_KEY);
          const tasks = tasksRaw ? safeParseBody<any[]>(tasksRaw, []) : [];

          // GET /saas/v1/tasks
            if (method === "GET" && parsed.pathname === "/saas/v1/tasks") {
              // If a mock user is provided, scope tasks: clients see their tasks; domain admins see domain tasks; super/management see all
              if (mockUserId || mockUserRole) {
                const role = mockUserRole || (profiles.find(p => p.id === mockUserId)?.role) || null;
                if (role === "client") {
                  const out = tasks.filter(t => t.assigneeId === mockUserId || t.userId === mockUserId);
                  return new Response(JSON.stringify(jsonResponse(out)), { status: 200, headers: { "Content-Type": "application/json" } });
                }
                if (role && role.endsWith("_admin") && role !== "hr_admin") {
                  const domain = role.split("_")[0];
                  const out = tasks.filter(t => {
                    // task may have assigneeDept or assigneeRole fields in mock data
                    if (t.assigneeDept && t.assigneeDept === `dept-${domain}`) return true;
                    if (t.assigneeRole && t.assigneeRole.startsWith(domain)) return true;
                    return false;
                  });
                  return new Response(JSON.stringify(jsonResponse(out)), { status: 200, headers: { "Content-Type": "application/json" } });
                }
                // management, super_admin, hr_admin see all
              }
              return new Response(JSON.stringify(jsonResponse(tasks)), { status: 200, headers: { "Content-Type": "application/json" } });
            }

          // POST /saas/v1/tasks
          if (method === "POST" && parsed.pathname === "/saas/v1/tasks") {
            const body = safeParseBody<any>(init?.body, {});
            // basic permission: only admins, super_admin, or management may create tasks for others; members can create for themselves
            const role = mockUserRole || (profiles.find(p => p.id === mockUserId)?.role) || null;
            if (role && role.endsWith("_member") && body.assigneeId && body.assigneeId !== mockUserId) {
              return new Response(JSON.stringify({ success: false, error: "Forbidden" }), { status: 403, headers: { "Content-Type": "application/json" } });
            }
            const id = `t${Date.now()}`;
            const t = { id, ...body };
            const updated = [t, ...tasks];
            localStorage.setItem(TASKS_KEY, JSON.stringify(updated));
            return new Response(JSON.stringify(jsonResponse(t)), { status: 200, headers: { "Content-Type": "application/json" } });
          }

          // PUT /saas/v1/tasks/:id
          if (method === "PUT" && parsed.pathname.startsWith("/saas/v1/tasks/")) {
            const id = parsed.pathname.split("/").pop();
            const body = safeParseBody<any>(init?.body, {});
            const updated = tasks.map((x: any) => (x.id === id ? { ...x, ...body } : x));
            localStorage.setItem(TASKS_KEY, JSON.stringify(updated));
            const out = updated.find((x: any) => x.id === id) || null;
            return new Response(JSON.stringify(jsonResponse(out)), { status: 200, headers: { "Content-Type": "application/json" } });
          }

          // DELETE /saas/v1/tasks/:id
          if (method === "DELETE" && parsed.pathname.startsWith("/saas/v1/tasks/")) {
            const id = parsed.pathname.split("/").pop();
            const updated = tasks.filter((x: any) => x.id !== id);
            localStorage.setItem(TASKS_KEY, JSON.stringify(updated));
            return new Response(JSON.stringify(jsonResponse({})), { status: 200, headers: { "Content-Type": "application/json" } });
          }
        }

        // ── Notifications endpoints (localStorage backed) ────────────────
        if (parsed.pathname.startsWith("/saas/v1/notifications")) {
          const notifsRaw = localStorage.getItem(NOTIFS_KEY);
          const notifs = notifsRaw ? safeParseBody<any[]>(notifsRaw, []) : [];

          // GET /saas/v1/notifications
          if (method === "GET" && parsed.pathname === "/saas/v1/notifications") {
            const userId = parsed.searchParams.get("userId") || mockUserId;
            const role = mockUserRole || (profiles.find(p => p.id === mockUserId)?.role) || null;
            if (userId) {
              const out = notifs.filter(n => n.userId === userId);
              return new Response(JSON.stringify(jsonResponse(out)), { status: 200, headers: { "Content-Type": "application/json" } });
            }
            // if no specific user, admins see all, members see their own
            if (role && role.endsWith("_member") && mockUserId) {
              const out = notifs.filter(n => n.userId === mockUserId);
              return new Response(JSON.stringify(jsonResponse(out)), { status: 200, headers: { "Content-Type": "application/json" } });
            }
            return new Response(JSON.stringify(jsonResponse(notifs)), { status: 200, headers: { "Content-Type": "application/json" } });
          }

          // POST /saas/v1/notifications
          if (method === "POST" && parsed.pathname === "/saas/v1/notifications") {
            const body = safeParseBody<any>(init?.body, {});
            const id = `n-${Math.random().toString(36).slice(2,9)}`;
            const n = { id, ...body };
            const updated = [n, ...notifs];
            localStorage.setItem(NOTIFS_KEY, JSON.stringify(updated));
            // Broadcast in-page event for listeners and SSE clients
            try {
              const payload = { id: n.id, type: n.type || "notification", payload: n };
              const custom = new CustomEvent("saas:notification", { detail: payload });
              window.dispatchEvent(custom);
            } catch {}
            // also deliver to any connected MockEventSource clients
            try {
              const data = JSON.stringify({ id: n.id, type: n.type || "notification", payload: n });
              (sseClients as Set<any>).forEach((c) => {
                try { c._emit("notification", data); } catch {}
              });
            } catch {}
            return new Response(JSON.stringify(jsonResponse(n)), { status: 200, headers: { "Content-Type": "application/json" } });
          }

          // PUT /saas/v1/notifications/:id/read -> mark read
          if (method === "PUT" && parsed.pathname.startsWith("/saas/v1/notifications/") && parsed.pathname.endsWith("/read")) {
            const parts = parsed.pathname.split("/");
            const id = parts[parts.length - 2];
            const updated = notifs.map((x: any) => (x.id === id ? { ...x, read: true } : x));
            localStorage.setItem(NOTIFS_KEY, JSON.stringify(updated));
            const out = updated.find((x: any) => x.id === id) || null;
            return new Response(JSON.stringify(jsonResponse(out)), { status: 200, headers: { "Content-Type": "application/json" } });
          }
        }

      return originalFetch(input, init);
    } catch (err) {
      return Promise.reject(err);
    }
  };
}
