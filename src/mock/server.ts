// In-browser mock server — intercepts window.fetch for all /saas/v1/* endpoints.
// All data is persisted in localStorage.

import { mockUsers } from "./users";
import { safeParseBody, safeParse } from "../lib/storage";

// ── Storage keys ──────────────────────────────────────────────────────────────
const PROFILES_KEY      = "mock_profiles";
const TASKS_KEY         = "mock_tasks";
const NOTIFS_KEY        = "mock_notifications";
const CLIENTS_KEY       = "optivax_clients";
const PROJECTS_KEY      = "mock_projects";
const INVOICES_KEY      = "mock_invoices";
const FILES_KEY         = "mock_files";
const REVISIONS_KEY     = "mock_revisions";
const PAYMENTS_KEY      = "mock_payments";
const SOCIAL_LINKS_KEY  = "social_links";
const SOCIAL_CLICKS_KEY = "social_clicks";

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

// ── Generic helpers ───────────────────────────────────────────────────────────

const jsonResponse = (data: unknown) => ({ success: true, data });

function readProfiles(): Profile[] {
  const raw = localStorage.getItem(PROFILES_KEY);
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
    localStorage.setItem(PROFILES_KEY, JSON.stringify(initial));
    return initial;
  }
  return safeParse<Profile[]>(raw, []);
}

function writeProfiles(profiles: Profile[]) {
  localStorage.setItem(PROFILES_KEY, JSON.stringify(profiles));
}

function readStore<T>(key: string, seed: () => T[]): T[] {
  const raw = localStorage.getItem(key);
  if (!raw) {
    const initial = seed();
    localStorage.setItem(key, JSON.stringify(initial));
    return initial;
  }
  return safeParse<T[]>(raw, []);
}

function writeStore<T>(key: string, data: T[]): void {
  localStorage.setItem(key, JSON.stringify(data));
}

// Ensures a client record contains both Client and StoredClient field sets.
function normalizeClient(data: Record<string, any>): Record<string, any> {
  const now     = new Date().toISOString();
  const name    = data.name     || data.contactName || "";
  const company = data.company  || data.companyName || "";
  const joined  = data.joinDate || data.createdAt   || now;
  return {
    ...data,
    name,
    company,
    joinDate:                  joined,
    contactName:               data.contactName               || name,
    companyName:               data.companyName               || company,
    createdAt:                 data.createdAt                 || joined,
    address:                   data.address                   || "",
    city:                      data.city                      || "",
    totalProjects:             data.totalProjects             ?? 0,
    totalBilled:               data.totalBilled               ?? 0,
    assignedProductionMembers: data.assignedProductionMembers || [],
    createdBy:                 data.createdBy                 || "",
    createdByName:             data.createdByName             || "",
    status:                    data.status                    || "active",
  };
}

function nextInvoiceNumber(invoices: any[]): string {
  const year = new Date().getFullYear();
  const max  = invoices.reduce((n: number, inv: any) => {
    const m = String(inv.number || "").match(/INV-\d{4}-(\d+)/);
    return m ? Math.max(n, parseInt(m[1], 10)) : n;
  }, 0);
  return `INV-${year}-${String(max + 1).padStart(4, "0")}`;
}

function ok(data: unknown): Response {
  return new Response(JSON.stringify(jsonResponse(data)), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

function getHeader(init: RequestInit | undefined, name: string): string | null {
  if (!init?.headers) return null;
  const h = init.headers as Record<string, string> | Headers;
  if (h instanceof Headers) return h.get(name) || h.get(name.toLowerCase());
  return (h as Record<string, string>)[name] || (h as Record<string, string>)[name.toLowerCase()] || null;
}

// ── Seed data ─────────────────────────────────────────────────────────────────

function seedClients(): any[] {
  return [
    normalizeClient({
      id: "u6", name: "Alice Johnson", company: "Acme Corp",
      email: "client1@example.com", phone: "+1-555-0101",
      status: "active", joinDate: "2026-01-15T00:00:00Z",
      address: "123 Main St", city: "New York",
      totalProjects: 2, totalBilled: 4300,
      createdBy: "u1", createdByName: "Super Admin",
    }),
    normalizeClient({
      id: "u7", name: "Bob Williams", company: "Globex Corp",
      email: "client2@example.com", phone: "+1-555-0102",
      status: "active", joinDate: "2026-02-01T00:00:00Z",
      address: "456 Oak Ave", city: "Los Angeles",
      totalProjects: 1, totalBilled: 1800,
      createdBy: "u1", createdByName: "Super Admin",
    }),
  ];
}

function seedProjects(): any[] {
  return [
    {
      id: "proj-1", clientId: "u6", name: "Website Redesign",
      description: "Complete redesign of corporate website with modern UI",
      status: "in-progress", priority: "high",
      startDate: "2026-04-01", deadline: "2026-07-31",
      progress: 65, budget: 8000, spent: 5200, files: [], assignedTo: [],
      createdAt: "2026-04-01T10:00:00Z", updatedAt: "2026-06-10T14:30:00Z",
    },
    {
      id: "proj-2", clientId: "u6", name: "Mobile App MVP",
      description: "iOS and Android client-facing portal app",
      status: "in-progress", priority: "medium",
      startDate: "2026-05-15", deadline: "2026-09-30",
      progress: 30, budget: 15000, spent: 4500, files: [], assignedTo: [],
      createdAt: "2026-05-15T09:00:00Z", updatedAt: "2026-06-12T11:00:00Z",
    },
    {
      id: "proj-3", clientId: "u7", name: "Brand Identity Package",
      description: "Logo, color palette, and brand guidelines",
      status: "completed", priority: "low",
      startDate: "2026-03-01", deadline: "2026-04-30",
      progress: 100, budget: 3000, spent: 2800, files: [], assignedTo: [],
      createdAt: "2026-03-01T09:00:00Z", updatedAt: "2026-04-30T17:00:00Z",
    },
  ];
}

function seedInvoices(): any[] {
  return [
    {
      id: "inv-1", number: "INV-2026-0001", clientId: "u6", projectId: "proj-1",
      description: "Website Redesign — Phase 1",
      amount: 2500, status: "paid",
      issueDate: "2026-04-15", dueDate: "2026-04-30", paidDate: "2026-04-28",
      items: [
        { id: "it-1", description: "UI Design",   quantity: 1, rate: 1500, total: 1500 },
        { id: "it-2", description: "Development", quantity: 1, rate: 1000, total: 1000 },
      ],
    },
    {
      id: "inv-2", number: "INV-2026-0002", clientId: "u6", projectId: "proj-1",
      description: "Website Redesign — Phase 2",
      amount: 1800, status: "pending",
      issueDate: "2026-06-01", dueDate: "2026-06-30",
      items: [
        { id: "it-3", description: "Development", quantity: 1, rate: 1800, total: 1800 },
      ],
    },
    {
      id: "inv-3", number: "INV-2026-0003", clientId: "u7", projectId: "proj-3",
      description: "Brand Identity Package",
      amount: 1800, status: "paid",
      issueDate: "2026-05-01", dueDate: "2026-05-15", paidDate: "2026-05-10",
      items: [
        { id: "it-4", description: "Brand Design", quantity: 1, rate: 1800, total: 1800 },
      ],
    },
  ];
}

function seedFiles(): any[] {
  return [
    {
      id: "file-1", name: "Website_Mockup_v1.pdf", size: 2457600, type: "application/pdf",
      uploadedBy: "u10", uploadDate: "2026-05-10T10:00:00Z",
      clientId: "u6", projectId: "proj-1", url: "#",
    },
    {
      id: "file-2", name: "Brand_Guidelines.pdf", size: 1843200, type: "application/pdf",
      uploadedBy: "u10", uploadDate: "2026-04-20T09:00:00Z",
      clientId: "u7", projectId: "proj-3", url: "#",
    },
  ];
}

// ── Main export ───────────────────────────────────────────────────────────────

export function startMockServer() {
  if (typeof window === "undefined") return;
  if ((window as any).__MOCK_SERVER_STARTED) return;
  (window as any).__MOCK_SERVER_STARTED = true;

  // Eagerly seed all stores so they're ready before any fetch fires
  readProfiles();
  readStore(CLIENTS_KEY, seedClients);
  readStore(PROJECTS_KEY, seedProjects);
  readStore(INVOICES_KEY, seedInvoices);
  readStore(FILES_KEY, seedFiles);

  const originalFetch = window.fetch.bind(window);
  const sseClients: Set<any> = new Set();

  // SSE shim
  try {
    const NativeEventSource = (window as any).EventSource;
    if (NativeEventSource && !(NativeEventSource as any).__IS_MOCKED) {
      class MockEventSource {
        url: string; readyState: number;
        onopen: ((ev?: Event) => void) | null = null;
        onmessage: ((ev: MessageEvent) => void) | null = null;
        onerror: ((ev?: Event) => void) | null = null;
        listeners: Record<string, Function[]> = {};
        constructor(url: string) {
          this.url = url; this.readyState = 1;
          sseClients.add(this);
          setTimeout(() => { try { this.onopen && this.onopen(new Event("open")); } catch {} }, 10);
        }
        addEventListener(type: string, cb: EventListenerOrEventListenerObject) {
          (this.listeners[type] ||= []).push(cb as Function);
        }
        removeEventListener(type: string, cb: EventListenerOrEventListenerObject) {
          this.listeners[type] = (this.listeners[type] || []).filter((f) => f !== cb);
        }
        close() { this.readyState = 2; sseClients.delete(this); }
        _emit(type: string, data: string) {
          const ev = new MessageEvent("message", { data });
          try { this.onmessage && this.onmessage(ev); } catch {}
          (this.listeners[type] || []).forEach((fn) => { try { fn(ev); } catch {} });
        }
      }
      (MockEventSource as any).__IS_MOCKED = true;
      (window as any).EventSource = MockEventSource as any;
    }
  } catch {}

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    try {
      const url = typeof input === "string" ? input
        : input instanceof URL ? input.href
        : (input as Request).url;
      const parsed = new URL(url, window.location.href);
      const method = (init?.method || "GET").toUpperCase();
      const p      = parsed.pathname;

      const mockUserId   = getHeader(init, "X-Mock-UserId")   || getHeader(init, "x-mock-userid");
      const mockUserRole = getHeader(init, "X-Mock-UserRole") || getHeader(init, "x-mock-userrole");

      // ── Stripe config (super_admin + client only) ─────────────────────────
      if (method === "GET" && p === "/saas/v1/config/stripe") {
        if (mockUserRole && mockUserRole !== "super_admin" && mockUserRole !== "client") {
          return new Response(JSON.stringify({ success: false, error: "Forbidden" }), { status: 403, headers: { "Content-Type": "application/json" } });
        }
        return ok({ publishableKey: "pk_test_mock_optivax_dev" });
      }

      if (method === "POST" && p === "/saas/v1/create-payment-intent") {
        if (mockUserRole && mockUserRole !== "super_admin" && mockUserRole !== "client") {
          return new Response(JSON.stringify({ success: false, error: "Forbidden" }), { status: 403, headers: { "Content-Type": "application/json" } });
        }
        const body = safeParseBody<any>(init?.body, {});
        const amountCents = Math.round((body.amount || 0) * 100);
        return ok({ clientSecret: `pi_mock_${amountCents}_${Date.now()}_secret_mock` });
      }

      // ── Settings (super_admin only for write) ─────────────────────────────
      if (method === "POST" && p === "/saas/v1/settings/stripe") {
        if (mockUserRole !== "super_admin") {
          return new Response(JSON.stringify({ success: false, error: "Forbidden" }), { status: 403, headers: { "Content-Type": "application/json" } });
        }
        const body = safeParseBody<any>(init?.body, {});
        localStorage.setItem("optivax_stripe_settings", JSON.stringify(body));
        return ok({});
      }

      // ── Profiles ──────────────────────────────────────────────────────────
      if (p.startsWith("/saas/v1/profiles")) {
        const profiles = readProfiles();

        if (method === "GET" && p.endsWith("/list")) {
          const id    = parsed.searchParams.get("id");
          const email = parsed.searchParams.get("email");
          let out = profiles;
          if (id)    out = out.filter((x) => x.id === id);
          if (email) out = out.filter((x) => x.email?.toLowerCase() === email.toLowerCase());
          return ok(out);
        }

        if (method === "POST" && p.endsWith("/create")) {
          const body = safeParseBody<any>(init?.body, {});
          const id   = `u${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
          const prof: Profile = {
            id, email: body.email, full_name: body.full_name,
            avatar_url: body.avatar_url || "", company: body.company || "",
            role: body.role || "client", departmentId: body.departmentId,
            created_at: new Date().toISOString(),
          };
          writeProfiles([prof, ...profiles]);
          return ok(prof);
        }

        if (method === "PUT" && p.endsWith("/update")) {
          const body    = safeParseBody<any>(init?.body, {});
          const updated = profiles.map((x) => (x.id === body.id ? { ...x, ...body } : x));
          writeProfiles(updated);
          return ok(updated.find((x) => x.id === body.id) || null);
        }

        if (method === "DELETE" && p.endsWith("/delete")) {
          const body = safeParseBody<any>(init?.body, {});
          writeProfiles(profiles.filter((x) => x.id !== body.id));
          return ok({});
        }
      }

      // ── Clients ───────────────────────────────────────────────────────────
      if (p.startsWith("/saas/v1/clients")) {
        const clients = readStore<any>(CLIENTS_KEY, seedClients);

        if (method === "GET" && p.endsWith("/list")) {
          const id         = parsed.searchParams.get("id");
          const email      = parsed.searchParams.get("email");
          const assignedTo = parsed.searchParams.get("assignedTo");
          let out = clients;
          if (id)         out = out.filter((x: any) => x.id === id);
          if (email)      out = out.filter((x: any) => x.email?.toLowerCase() === email.toLowerCase());
          if (assignedTo) out = out.filter((x: any) => (x.assignedProductionMembers || []).includes(assignedTo));
          return ok(out);
        }

        if (method === "POST" && p.endsWith("/create")) {
          const body = safeParseBody<any>(init?.body, {});
          // If no id provided, use matching profile id (so client.id === profile.id === user.id at login)
          const profiles = readProfiles();
          const match    = profiles.find((pr) => pr.email?.toLowerCase() === body.email?.toLowerCase());
          const id       = body.id || match?.id || `cli-${Date.now()}`;
          const client   = normalizeClient({ id, ...body });
          writeStore(CLIENTS_KEY, [client, ...clients]);
          return ok(client);
        }

        if (method === "PUT" && p.endsWith("/update")) {
          const body    = safeParseBody<any>(init?.body, {});
          const updated = clients.map((x: any) =>
            x.id === body.id ? normalizeClient({ ...x, ...body }) : x
          );
          writeStore(CLIENTS_KEY, updated);
          return ok(updated.find((x: any) => x.id === body.id) || null);
        }

        if (method === "DELETE" && p.endsWith("/delete")) {
          const body = safeParseBody<any>(init?.body, {});
          writeStore(CLIENTS_KEY, clients.filter((x: any) => x.id !== body.id));
          return ok({});
        }
      }

      // ── Projects ──────────────────────────────────────────────────────────
      if (p.startsWith("/saas/v1/projects")) {
        const projects = readStore<any>(PROJECTS_KEY, seedProjects);

        if (method === "GET" && p.endsWith("/list")) {
          const id         = parsed.searchParams.get("id");
          const clientId   = parsed.searchParams.get("clientId");
          const assignedTo = parsed.searchParams.get("assignedTo");
          let out = projects;
          if (id)         out = out.filter((x: any) => x.id === id);
          if (clientId)   out = out.filter((x: any) => x.clientId === clientId);
          if (assignedTo) out = out.filter((x: any) => (x.assignedTo || []).includes(assignedTo));
          return ok(out);
        }

        if (method === "POST" && p.endsWith("/create")) {
          const body = safeParseBody<any>(init?.body, {});
          const proj = {
            files: [], assignedTo: [], progress: 0,
            ...body,
            id: `proj-${Date.now()}`,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          writeStore(PROJECTS_KEY, [proj, ...projects]);
          return ok(proj);
        }

        if (method === "PUT" && p.endsWith("/update")) {
          const body    = safeParseBody<any>(init?.body, {});
          const updated = projects.map((x: any) =>
            x.id === body.id ? { ...x, ...body, updatedAt: new Date().toISOString() } : x
          );
          writeStore(PROJECTS_KEY, updated);
          return ok(updated.find((x: any) => x.id === body.id) || null);
        }

        if (method === "DELETE" && p.endsWith("/delete")) {
          const body = safeParseBody<any>(init?.body, {});
          writeStore(PROJECTS_KEY, projects.filter((x: any) => x.id !== body.id));
          return ok({});
        }
      }

      // ── Invoices ──────────────────────────────────────────────────────────
      if (p.startsWith("/saas/v1/invoices")) {
        const invoices = readStore<any>(INVOICES_KEY, seedInvoices);

        if (method === "GET" && p.endsWith("/list")) {
          const id       = parsed.searchParams.get("id");
          const clientId = parsed.searchParams.get("clientId");
          let out = invoices;
          if (id)       out = out.filter((x: any) => x.id === id);
          if (clientId) out = out.filter((x: any) => x.clientId === clientId);
          return ok(out);
        }

        if (method === "POST" && p.endsWith("/generate")) {
          const body = safeParseBody<any>(init?.body, {});
          const inv  = {
            items: [], status: "pending",
            ...body,
            id: `inv-${Date.now()}`,
            number: nextInvoiceNumber(invoices),
          };
          writeStore(INVOICES_KEY, [inv, ...invoices]);
          return ok(inv);
        }

        if (method === "PUT" && p.endsWith("/update")) {
          const body    = safeParseBody<any>(init?.body, {});
          const updated = invoices.map((x: any) => (x.id === body.id ? { ...x, ...body } : x));
          writeStore(INVOICES_KEY, updated);
          return ok(updated.find((x: any) => x.id === body.id) || null);
        }

        if (method === "POST" && p.endsWith("/mark-paid")) {
          const body    = safeParseBody<any>(init?.body, {});
          const updated = invoices.map((x: any) =>
            x.id === body.id
              ? { ...x, status: "paid", paidDate: new Date().toISOString().split("T")[0] }
              : x
          );
          writeStore(INVOICES_KEY, updated);
          return ok(updated.find((x: any) => x.id === body.id) || null);
        }

        if (method === "DELETE" && p.endsWith("/delete")) {
          const body = safeParseBody<any>(init?.body, {});
          writeStore(INVOICES_KEY, invoices.filter((x: any) => x.id !== body.id));
          return ok({});
        }
      }

      // ── Files ─────────────────────────────────────────────────────────────
      if (p.startsWith("/saas/v1/files")) {
        const files = readStore<any>(FILES_KEY, seedFiles);

        if (method === "GET" && p.endsWith("/list")) {
          const projectId = parsed.searchParams.get("projectId");
          const clientId  = parsed.searchParams.get("clientId");
          let out = files;
          if (projectId) out = out.filter((x: any) => x.projectId === projectId);
          if (clientId)  out = out.filter((x: any) => x.clientId === clientId);
          return ok(out);
        }

        if (method === "POST" && p.endsWith("/create")) {
          const body = safeParseBody<any>(init?.body, {});
          const file = { ...body, id: `file-${Date.now()}`, uploadDate: new Date().toISOString() };
          writeStore(FILES_KEY, [file, ...files]);
          return ok(file);
        }

        if (method === "DELETE" && p.endsWith("/delete")) {
          const body = safeParseBody<any>(init?.body, {});
          writeStore(FILES_KEY, files.filter((x: any) => x.id !== body.id));
          return ok({});
        }
      }

      // ── Revisions ─────────────────────────────────────────────────────────
      if (p.startsWith("/saas/v1/revisions")) {
        const revisions = readStore<any>(REVISIONS_KEY, () => []);

        if (method === "GET" && p.endsWith("/list")) {
          const clientId  = parsed.searchParams.get("clientId");
          const projectId = parsed.searchParams.get("projectId");
          let out = revisions;
          if (clientId)  out = out.filter((x: any) => x.clientId === clientId);
          if (projectId) out = out.filter((x: any) => x.projectId === projectId);
          return ok(out);
        }

        if (method === "POST" && p.endsWith("/create")) {
          const body = safeParseBody<any>(init?.body, {});
          const rev  = { status: "pending", ...body, id: `rev-${Date.now()}`, created_at: new Date().toISOString() };
          writeStore(REVISIONS_KEY, [rev, ...revisions]);
          return ok(rev);
        }

        if (method === "PUT" && p.endsWith("/update")) {
          const body    = safeParseBody<any>(init?.body, {});
          const updated = revisions.map((x: any) => (x.id === body.id ? { ...x, ...body } : x));
          writeStore(REVISIONS_KEY, updated);
          return ok(updated.find((x: any) => x.id === body.id) || null);
        }
      }

      // ── Organizations ─────────────────────────────────────────────────────
      if (p.startsWith("/saas/v1/organizations")) {
        if (method === "GET" && p.endsWith("/list")) {
          const orgs = safeParse<unknown[]>(localStorage.getItem("mock_organizations") ?? "[]", []);
          return ok(orgs);
        }
      }

      // ── Subscriptions ─────────────────────────────────────────────────────
      if (p.startsWith("/saas/v1/subscriptions")) {
        if (method === "GET" && p.endsWith("/list")) {
          const subs = safeParse<unknown[]>(localStorage.getItem("mock_subscriptions") ?? "[]", []);
          return ok(subs);
        }
      }

      // ── Email Marketing ───────────────────────────────────────────────────
      if (p.startsWith("/saas/v1/email")) {
        const emailStore = (key: string) => safeParse<any[]>(localStorage.getItem(key) ?? "[]", []);
        const emailWrite = (key: string, data: any[]) => localStorage.setItem(key, JSON.stringify(data));

        if (p.includes("/templates")) {
          const KEY = "email_templates";
          if (method === "GET")  return ok(emailStore(KEY));
          if (method === "POST") {
            const body = safeParseBody<any>(init?.body, {});
            const item = { ...body, id: `et-${Date.now()}` };
            emailWrite(KEY, [...emailStore(KEY), item]);
            return ok(item);
          }
          if (method === "PUT") {
            const body = safeParseBody<any>(init?.body, {});
            const updated = emailStore(KEY).map((x: any) => x.id === body.id ? { ...x, ...body } : x);
            emailWrite(KEY, updated);
            return ok(updated.find((x: any) => x.id === body.id));
          }
          if (method === "DELETE") {
            const body = safeParseBody<any>(init?.body, {});
            emailWrite(KEY, emailStore(KEY).filter((x: any) => x.id !== body.id));
            return ok({ success: true });
          }
        }

        if (p.includes("/campaigns")) {
          const KEY = "email_campaigns";
          if (method === "GET")  return ok(emailStore(KEY));
          if (method === "POST") {
            const body = safeParseBody<any>(init?.body, {});
            const item = { ...body, id: `ec-${Date.now()}` };
            emailWrite(KEY, [...emailStore(KEY), item]);
            return ok(item);
          }
          if (method === "PUT") {
            const body = safeParseBody<any>(init?.body, {});
            const updated = emailStore(KEY).map((x: any) => x.id === body.id ? { ...x, ...body } : x);
            emailWrite(KEY, updated);
            return ok(updated.find((x: any) => x.id === body.id));
          }
          if (method === "DELETE") {
            const body = safeParseBody<any>(init?.body, {});
            emailWrite(KEY, emailStore(KEY).filter((x: any) => x.id !== body.id));
            return ok({ success: true });
          }
        }

        if (p.includes("/automations")) {
          const KEY = "email_automations";
          if (method === "GET")  return ok(emailStore(KEY));
          if (method === "POST") {
            const body = safeParseBody<any>(init?.body, {});
            const item = { ...body, id: `ea-${Date.now()}` };
            emailWrite(KEY, [...emailStore(KEY), item]);
            return ok(item);
          }
          if (method === "PUT") {
            const body = safeParseBody<any>(init?.body, {});
            const updated = emailStore(KEY).map((x: any) => x.id === body.id ? { ...x, ...body } : x);
            emailWrite(KEY, updated);
            return ok(updated.find((x: any) => x.id === body.id));
          }
          if (method === "DELETE") {
            const body = safeParseBody<any>(init?.body, {});
            emailWrite(KEY, emailStore(KEY).filter((x: any) => x.id !== body.id));
            return ok({ success: true });
          }
        }
      }

      // ── Payments ──────────────────────────────────────────────────────────
      if (p.startsWith("/saas/v1/payments")) {
        const payments = readStore<any>(PAYMENTS_KEY, () => []);

        if (method === "GET" && p.endsWith("/list")) {
          const invoiceId = parsed.searchParams.get("invoiceId");
          const out = invoiceId ? payments.filter((x: any) => x.invoiceId === invoiceId) : payments;
          return ok(out);
        }

        if (method === "POST" && p.endsWith("/create")) {
          const body = safeParseBody<any>(init?.body, {});
          const pay  = {
            date: new Date().toISOString().split("T")[0],
            transactionId: `TXN-${Date.now()}`,
            ...body,
            id: `pay-${Date.now()}`,
            created_at: new Date().toISOString(),
          };
          writeStore(PAYMENTS_KEY, [pay, ...payments]);
          return ok(pay);
        }
      }

      // ── Tasks ─────────────────────────────────────────────────────────────
      if (p.startsWith("/saas/v1/tasks")) {
        const profiles = readProfiles();
        const tasks    = safeParse<any[]>(localStorage.getItem(TASKS_KEY) || "[]", []);
        const role     = mockUserRole || (profiles.find((x) => x.id === mockUserId)?.role) || null;

        if (method === "GET" && p === "/saas/v1/tasks") {
          if (role === "client") {
            return ok(tasks.filter((t) => t.assigneeId === mockUserId || t.userId === mockUserId));
          }
          if (role && role.endsWith("_admin") && role !== "hr_admin") {
            const domain = role.split("_")[0];
            const out = tasks.filter((t: any) =>
              (t.assigneeDept && t.assigneeDept === `dept-${domain}`) ||
              (t.assigneeRole && t.assigneeRole.startsWith(domain))
            );
            return ok(out);
          }
          return ok(tasks);
        }

        if (method === "POST" && p === "/saas/v1/tasks") {
          const body = safeParseBody<any>(init?.body, {});
          if (role?.endsWith("_member") && body.assigneeId && body.assigneeId !== mockUserId) {
            return new Response(JSON.stringify({ success: false, error: "Forbidden" }), {
              status: 403, headers: { "Content-Type": "application/json" },
            });
          }
          const t = { id: `t${Date.now()}`, ...body };
          localStorage.setItem(TASKS_KEY, JSON.stringify([t, ...tasks]));
          return ok(t);
        }

        if (method === "PUT" && p.startsWith("/saas/v1/tasks/")) {
          const id      = p.split("/").pop();
          const body    = safeParseBody<any>(init?.body, {});
          const updated = tasks.map((x: any) => (x.id === id ? { ...x, ...body } : x));
          localStorage.setItem(TASKS_KEY, JSON.stringify(updated));
          return ok(updated.find((x: any) => x.id === id) || null);
        }

        if (method === "DELETE" && p.startsWith("/saas/v1/tasks/")) {
          const id      = p.split("/").pop();
          const updated = tasks.filter((x: any) => x.id !== id);
          localStorage.setItem(TASKS_KEY, JSON.stringify(updated));
          return ok({});
        }
      }

      // ── Notifications ─────────────────────────────────────────────────────
      if (p.startsWith("/saas/v1/notifications")) {
        const notifs = safeParse<any[]>(localStorage.getItem(NOTIFS_KEY) || "[]", []);
        const profiles = readProfiles();
        const role     = mockUserRole || (profiles.find((x) => x.id === mockUserId)?.role) || null;

        if (method === "GET" && (p === "/saas/v1/notifications" || p.endsWith("/list"))) {
          const userId = parsed.searchParams.get("userId") || mockUserId;
          if (userId) return ok(notifs.filter((n: any) => n.userId === userId));
          if (role?.endsWith("_member") && mockUserId) {
            return ok(notifs.filter((n: any) => n.userId === mockUserId));
          }
          return ok(notifs);
        }

        if (method === "POST" && (p === "/saas/v1/notifications" || p.endsWith("/create"))) {
          const body = safeParseBody<any>(init?.body, {});
          const n    = { id: `n-${Math.random().toString(36).slice(2, 9)}`, ...body };
          localStorage.setItem(NOTIFS_KEY, JSON.stringify([n, ...notifs]));
          try {
            window.dispatchEvent(new CustomEvent("saas:notification", {
              detail: { id: n.id, type: n.type || "notification", payload: n },
            }));
          } catch {}
          try {
            (sseClients as Set<any>).forEach((c) => {
              try { c._emit("notification", JSON.stringify({ id: n.id, type: n.type || "notification", payload: n })); } catch {}
            });
          } catch {}
          return ok(n);
        }

        if (method === "PUT") {
          if (p.endsWith("/mark-all-read")) {
            const body    = safeParseBody<any>(init?.body, {});
            const updated = notifs.map((x: any) => x.userId === body.userId ? { ...x, read: true } : x);
            localStorage.setItem(NOTIFS_KEY, JSON.stringify(updated));
            return ok({});
          }
          // mark single read: PUT /saas/v1/notifications/:id/read  OR  PUT /saas/v1/notifications/update
          if (p.endsWith("/read") || p.endsWith("/update")) {
            const body = safeParseBody<any>(init?.body, {});
            const id   = body.id || p.split("/").slice(-2, -1)[0];
            const updated = notifs.map((x: any) => (x.id === id ? { ...x, read: true, ...body } : x));
            localStorage.setItem(NOTIFS_KEY, JSON.stringify(updated));
            return ok(updated.find((x: any) => x.id === id) || null);
          }
        }

        if (method === "DELETE") {
          if (p.endsWith("/delete-all")) {
            const body    = safeParseBody<any>(init?.body, {});
            localStorage.setItem(NOTIFS_KEY, JSON.stringify(notifs.filter((x: any) => x.userId !== body.userId)));
            return ok({});
          }
          if (p.endsWith("/delete")) {
            const body = safeParseBody<any>(init?.body, {});
            localStorage.setItem(NOTIFS_KEY, JSON.stringify(notifs.filter((x: any) => x.id !== body.id)));
            return ok({});
          }
        }
      }

      // ── Social Links ──────────────────────────────────────────────────────
      if (p.startsWith("/saas/v1/social-links")) {
        const links = safeParse<any[]>(localStorage.getItem(SOCIAL_LINKS_KEY), []);

        if (method === "GET" && p.endsWith("/list")) {
          return ok(links);
        }

        if (method === "POST" && p.endsWith("/create")) {
          const body = safeParseBody<any>(init?.body, {});
          const id   = `sl-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
          const trackingId = `trk-${Math.random().toString(36).slice(2, 10)}`;
          const link = { id, trackingId, status: "active", createdAt: new Date().toISOString(), ...body };
          localStorage.setItem(SOCIAL_LINKS_KEY, JSON.stringify([link, ...links]));
          return ok(link);
        }

        if (method === "PUT" && p.endsWith("/update")) {
          const body    = safeParseBody<any>(init?.body, {});
          const updated = links.map((l: any) => l.id === body.id ? { ...l, ...body } : l);
          localStorage.setItem(SOCIAL_LINKS_KEY, JSON.stringify(updated));
          return ok(updated.find((l: any) => l.id === body.id) || null);
        }

        if (method === "DELETE" && p.endsWith("/delete")) {
          const body = safeParseBody<any>(init?.body, {});
          localStorage.setItem(SOCIAL_LINKS_KEY, JSON.stringify(links.filter((l: any) => l.id !== body.id)));
          return ok({});
        }

        if (method === "POST" && p.endsWith("/track")) {
          const body   = safeParseBody<any>(init?.body, {});
          const clicks = safeParse<any[]>(localStorage.getItem(SOCIAL_CLICKS_KEY), []);
          const event  = {
            id: `clk-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            timestamp: new Date().toISOString(),
            ...body,
          };
          localStorage.setItem(SOCIAL_CLICKS_KEY, JSON.stringify([event, ...clicks]));
          const link = links.find((l: any) => l.id === body.linkId || l.trackingId === body.trackingId);
          return ok({ recorded: true, platform: link?.platform ?? "other" });
        }
      }

      // ── Social Analytics ──────────────────────────────────────────────────
      if (method === "GET" && p === "/saas/v1/social-analytics") {
        const clicks = safeParse<any[]>(localStorage.getItem(SOCIAL_CLICKS_KEY), []);
        const links  = safeParse<any[]>(localStorage.getItem(SOCIAL_LINKS_KEY), []);
        const byPlatform: Record<string, number> = {};
        const byLink: Record<string, number> = {};
        for (const c of clicks) {
          byPlatform[c.platform] = (byPlatform[c.platform] || 0) + 1;
          byLink[c.linkId]       = (byLink[c.linkId] || 0) + 1;
        }
        return ok({ totalClicks: clicks.length, byPlatform, byLink, links, clicks: clicks.slice(0, 200) });
      }

      return originalFetch(input, init);
    } catch (err) {
      return Promise.reject(err);
    }
  };
}
