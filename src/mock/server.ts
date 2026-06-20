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
const SOCIAL_LINKS_KEY   = "social_links";
const SOCIAL_CLICKS_KEY  = "social_clicks";
const SOCIAL_METRICS_KEY = "social_account_metrics";

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
    normalizeClient({
      id: "u30", name: "Carol Stevens", company: "TechNova Inc",
      email: "client3@example.com", phone: "+1-555-0103",
      status: "active", joinDate: "2026-02-20T00:00:00Z",
      address: "789 Pine Rd", city: "Chicago",
      totalProjects: 0, totalBilled: 0,
      createdBy: "u1", createdByName: "Super Admin",
    }),
    normalizeClient({
      id: "u31", name: "Daniel Foster", company: "BluePeak Retail",
      email: "client4@example.com", phone: "+1-555-0104",
      status: "active", joinDate: "2026-03-05T00:00:00Z",
      address: "321 Elm St", city: "Houston",
      totalProjects: 0, totalBilled: 0,
      createdBy: "u1", createdByName: "Super Admin",
    }),
    normalizeClient({
      id: "u32", name: "Elena Vasquez", company: "MediCore Solutions",
      email: "client5@example.com", phone: "+1-555-0105",
      status: "active", joinDate: "2026-03-18T00:00:00Z",
      address: "654 Maple Ave", city: "Phoenix",
      totalProjects: 0, totalBilled: 0,
      createdBy: "u1", createdByName: "Super Admin",
    }),
    normalizeClient({
      id: "u33", name: "Frank Huang", company: "CapitalEdge Finance",
      email: "client6@example.com", phone: "+1-555-0106",
      status: "active", joinDate: "2026-04-02T00:00:00Z",
      address: "987 Birch Blvd", city: "Seattle",
      totalProjects: 0, totalBilled: 0,
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
      uploadedBy: "Marketing Admin", uploadedById: "u10", uploaderDept: "dept-marketing",
      uploadDate: "2026-05-10T10:00:00Z",
      clientId: "u6", projectId: "proj-1", url: "#",
      visibility: "department",
    },
    {
      id: "file-2", name: "Brand_Guidelines.pdf", size: 1843200, type: "application/pdf",
      uploadedBy: "Marketing Admin", uploadedById: "u10", uploaderDept: "dept-marketing",
      uploadDate: "2026-04-20T09:00:00Z",
      clientId: "u7", projectId: "proj-3", url: "#",
      visibility: "department",
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

      // ── Auth ─────────────────────────────────────────────────────────────
      if (p.startsWith("/saas/v1/auth")) {
        if (method === "POST" && p === "/saas/v1/auth/signup") {
          const body = safeParseBody<any>(init?.body, {});
          const email    = ((body.email as string) || "").toLowerCase().trim();
          const password = (body.password as string) || "";
          const meta     = (body.options?.data || {}) as Record<string, string>;
          const fullName = meta.full_name || email;

          if (!email || !password) {
            return new Response(JSON.stringify({ success: false, error: "Email and password are required" }), {
              status: 400, headers: { "Content-Type": "application/json" },
            });
          }

          // SECURITY: super_admin and management can never be self-assigned via signup
          const PRIVILEGED_ROLES = ["super_admin", "management", "sales_admin", "marketing_admin", "production_admin", "hr_admin"];
          const rawRole = (meta.role || "client") as string;
          const role = PRIVILEGED_ROLES.includes(rawRole) ? "client" : rawRole;

          const profiles = readProfiles();
          if (profiles.find((x) => x.email?.toLowerCase() === email)) {
            return new Response(JSON.stringify({ success: false, error: "An account with this email already exists" }), {
              status: 409, headers: { "Content-Type": "application/json" },
            });
          }

          const id = `u${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
          const profile: Profile = {
            id, email, full_name: fullName,
            avatar_url: "", company: meta.company || "",
            role, created_at: new Date().toISOString(),
          };
          writeProfiles([profile, ...profiles]);

          const pwRaw = localStorage.getItem("mock_passwords");
          const passwords: Record<string, string> = safeParse<Record<string, string>>(pwRaw, {});
          passwords[email] = password;
          localStorage.setItem("mock_passwords", JSON.stringify(passwords));

          const session = {
            id, email,
            user_metadata: { role, full_name: fullName, avatar_url: "", company: meta.company || "" },
          };
          localStorage.setItem("mock_session", JSON.stringify(session));
          return ok({ user: { id, email }, session });
        }

        if (method === "POST" && p === "/saas/v1/auth/login") {
          const body  = safeParseBody<any>(init?.body, {});
          const email = ((body.email as string) || "").toLowerCase().trim();
          const pw    = (body.password as string) || "";

          const profiles = readProfiles();
          const profile  = profiles.find((x) => x.email?.toLowerCase() === email);
          if (!profile) {
            return new Response(JSON.stringify({ success: false, error: "Invalid credentials" }), {
              status: 401, headers: { "Content-Type": "application/json" },
            });
          }

          const pwRaw  = localStorage.getItem("mock_passwords");
          const stored = safeParse<Record<string, string>>(pwRaw, {})[email];
          // Built-in mock users have no stored password — any password accepted
          if (stored && stored !== pw) {
            return new Response(JSON.stringify({ success: false, error: "Invalid credentials" }), {
              status: 401, headers: { "Content-Type": "application/json" },
            });
          }

          const session = {
            id: profile.id, email: profile.email,
            user_metadata: {
              role: profile.role, full_name: profile.full_name,
              avatar_url: profile.avatar_url || "", company: profile.company || "",
            },
          };
          localStorage.setItem("mock_session", JSON.stringify(session));
          return ok({ user: { id: profile.id, email: profile.email }, session });
        }

        if (method === "POST" && p === "/saas/v1/auth/logout") {
          localStorage.removeItem("mock_session");
          return ok({});
        }
      }

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
        const piTs = Date.now();
        const amountCents = Math.round((body.amount || 0) * 100);
        const paymentIntentId = `pi_mock_${amountCents}_${piTs}`;
        return ok({ clientSecret: `${paymentIntentId}_secret_mock`, paymentIntentId });
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

        if (method === "GET" && p === "/saas/v1/projects/billing-summary") {
          const projectId = parsed.searchParams.get("projectId");
          if (!projectId) {
            return new Response(JSON.stringify({ success: false, error: "projectId required" }), { status: 400, headers: { "Content-Type": "application/json" } });
          }
          const proj = projects.find((x: any) => x.id === projectId);
          if (!proj) {
            return new Response(JSON.stringify({ success: false, error: "Project not found" }), { status: 404, headers: { "Content-Type": "application/json" } });
          }
          const allInvoices = readStore<any>(INVOICES_KEY, seedInvoices);
          const projectInvoices = allInvoices.filter((x: any) => x.projectId === projectId);
          const totalInvoiced = projectInvoices.reduce((s: number, x: any) => s + Number(x.amount || 0), 0);
          const allPayments = readStore<any>(PAYMENTS_KEY, () => []);
          const paidInvoiceIds = new Set(projectInvoices.filter((x: any) => x.status === "paid").map((x: any) => x.id));
          const totalPaid = allPayments
            .filter((p: any) => paidInvoiceIds.has(p.invoiceId))
            .reduce((s: number, p: any) => s + Number(p.amount || 0), 0);
          const budget = Number(proj.budget || 0);
          const remainingBillable = Math.max(0, budget - totalInvoiced);
          return ok({ budget, totalInvoiced, totalPaid, remainingBillable, invoiceCount: projectInvoices.length });
        }
      }

      // ── Invoices ──────────────────────────────────────────────────────────
      if (p.startsWith("/saas/v1/invoices")) {
        const invoices = readStore<any>(INVOICES_KEY, seedInvoices);

        if (method === "GET" && p.endsWith("/list")) {
          const id       = parsed.searchParams.get("id");
          const clientId = parsed.searchParams.get("clientId");
          // Auto-flag pending invoices whose dueDate has passed as overdue
          const today = new Date().toISOString().split("T")[0];
          let dirty = false;
          const refreshed = invoices.map((x: any) => {
            if (x.status === "pending" && x.dueDate && x.dueDate < today) {
              dirty = true;
              return { ...x, status: "overdue" };
            }
            return x;
          });
          if (dirty) writeStore(INVOICES_KEY, refreshed);
          let out = dirty ? refreshed : invoices;
          if (id)       out = out.filter((x: any) => x.id === id);
          if (clientId) out = out.filter((x: any) => x.clientId === clientId);
          return ok(out);
        }

        if (method === "POST" && p.endsWith("/generate")) {
          const body = safeParseBody<any>(init?.body, {});

          if (!body.projectId) {
            return new Response(JSON.stringify({ success: false, error: "Project selection is required to generate an invoice." }), { status: 400, headers: { "Content-Type": "application/json" } });
          }

          // Enforce: amount ≤ remaining billable for this project
          const allProjects = readStore<any>(PROJECTS_KEY, seedProjects);
          const proj = allProjects.find((x: any) => x.id === body.projectId);
          if (proj?.budget) {
            const projectInvoices = invoices.filter((x: any) => x.projectId === body.projectId);
            const totalInvoiced = projectInvoices.reduce((s: number, x: any) => s + Number(x.amount || 0), 0);
            const remainingBillable = Number(proj.budget) - totalInvoiced;
            if (Number(body.amount) > remainingBillable) {
              return new Response(
                JSON.stringify({ success: false, error: `Invoice amount $${Number(body.amount).toLocaleString()} exceeds the remaining billable amount of $${remainingBillable.toLocaleString()} for this project.` }),
                { status: 422, headers: { "Content-Type": "application/json" } }
              );
            }
          }

          const inv = {
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
          // Manual mark-paid is disabled — all payments must go through Stripe checkout.
          return new Response(
            JSON.stringify({ success: false, error: "Manual payment marking is disabled. All invoice payments must be processed through Stripe checkout." }),
            { status: 410, headers: { "Content-Type": "application/json" } }
          );
        }

        if (method === "POST" && p.endsWith("/stripe-confirm")) {
          const body = safeParseBody<any>(init?.body, {});
          const { invoiceId, stripePaymentIntentId, stripeChargeId, amount, currency = "usd", paidByUserId, cardholderName } = body;

          const invoice = invoices.find((x: any) => x.id === invoiceId);
          if (!invoice) {
            return new Response(JSON.stringify({ success: false, error: "Invoice not found" }), { status: 404, headers: { "Content-Type": "application/json" } });
          }
          if (invoice.status === "paid") {
            return new Response(JSON.stringify({ success: false, error: "Invoice already paid" }), { status: 409, headers: { "Content-Type": "application/json" } });
          }

          // Duplicate payment guard
          const existingPayments = readStore<any>(PAYMENTS_KEY, () => []);
          if (existingPayments.some((pay: any) => pay.invoiceId === invoiceId)) {
            return new Response(JSON.stringify({ success: false, error: "Payment already recorded for this invoice" }), { status: 409, headers: { "Content-Type": "application/json" } });
          }

          const now = new Date().toISOString();
          const paidDate = now.split("T")[0];
          const ts = Date.now();

          // Mark invoice paid
          const updatedInvoices = invoices.map((x: any) =>
            x.id === invoiceId ? { ...x, status: "paid", paidDate } : x
          );
          writeStore(INVOICES_KEY, updatedInvoices);
          const paidInvoice = updatedInvoices.find((x: any) => x.id === invoiceId);

          // Create payment record
          const payRecord = {
            id: `pay-stripe-${ts}`,
            invoiceId,
            amount: Number(amount),
            currency,
            date: paidDate,
            paidAt: now,
            paidByUserId: paidByUserId || mockUserId || "",
            method: "credit-card",
            transactionId: stripePaymentIntentId || `TXN-${ts}`,
            stripePaymentIntentId: stripePaymentIntentId || `pi_mock_${ts}`,
            stripeChargeId: stripeChargeId || `ch_mock_${ts}`,
            created_at: now,
          };
          writeStore(PAYMENTS_KEY, [payRecord, ...existingPayments]);

          // Update project.spent
          if (paidInvoice?.projectId && paidInvoice.amount) {
            const projects = readStore<any>(PROJECTS_KEY, seedProjects);
            writeStore(PROJECTS_KEY, projects.map((proj: any) =>
              proj.id !== paidInvoice.projectId
                ? proj
                : { ...proj, spent: (proj.spent ?? 0) + Number(paidInvoice.amount) }
            ));
          }

          // Notifications
          const notifs = safeParse<any[]>(localStorage.getItem(NOTIFS_KEY) || "[]", []);
          const newNotifs: any[] = [];
          const invoiceLabel = paidInvoice?.number || invoiceId;
          const amtLabel = `$${Number(amount).toLocaleString()}`;

          if (paidInvoice?.clientId) {
            newNotifs.push({
              id: `notif-stripe-client-${ts}`,
              userId: paidInvoice.clientId,
              type: "payment",
              title: "Payment Successful",
              message: `Invoice ${invoiceLabel} for ${amtLabel} has been paid. Thank you!`,
              read: false,
              createdAt: now,
              actionUrl: "/client/billing",
            });
          }

          // Management and super_admin notifications
          const allProfiles = readProfiles();
          allProfiles
            .filter((pr: Profile) => pr.role === "management" || pr.role === "super_admin")
            .forEach((pr: Profile, i: number) => {
              newNotifs.push({
                id: `notif-stripe-staff-${ts + i + 1}`,
                userId: pr.id,
                type: "payment",
                title: "Invoice Paid",
                message: `Invoice ${invoiceLabel} for ${amtLabel} paid${cardholderName ? ` by ${cardholderName}` : ""} via Stripe.`,
                read: false,
                createdAt: now,
                actionUrl: "/management/billing",
              });
            });

          if (newNotifs.length > 0) {
            localStorage.setItem(NOTIFS_KEY, JSON.stringify([...newNotifs, ...notifs]));
          }

          return ok({ invoice: paidInvoice, payment: payRecord });
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

          // Visibility enforcement (super_admin and management see everything)
          if (mockUserId && mockUserRole && mockUserRole !== "super_admin" && mockUserRole !== "management") {
            const currentUserProfile = readProfiles().find((pr: Profile) => pr.id === mockUserId);
            const userDept = currentUserProfile?.departmentId;
            out = out.filter((f: any) => {
              const vis: string | undefined = f.visibility;
              if (!vis) return mockUserRole !== "client"; // legacy files visible to all staff
              if (vis === "private") return f.uploadedById === mockUserId;
              if (vis === "department") return !!userDept && f.uploaderDept === userDept;
              if (vis === "specific") return Array.isArray(f.visibleTo) && f.visibleTo.includes(mockUserId);
              if (vis === "project-team") {
                if (!f.projectId) return false;
                const projects = readStore<any>(PROJECTS_KEY, seedProjects);
                const proj = projects.find((pr: any) => pr.id === f.projectId);
                return !!(proj && Array.isArray(proj.assignedTo) && proj.assignedTo.includes(mockUserId));
              }
              if (vis === "client") return mockUserRole === "client" && f.clientId === mockUserId;
              return false;
            });
          }

          if (projectId) out = out.filter((x: any) => x.projectId === projectId);
          if (clientId)  out = out.filter((x: any) => x.clientId === clientId);
          return ok(out);
        }

        if (method === "POST" && p.endsWith("/create")) {
          const body = safeParseBody<any>(init?.body, {});
          const ts   = Date.now();
          const now  = new Date().toISOString();
          const file = { ...body, id: `file-${ts}`, uploadDate: now };
          writeStore(FILES_KEY, [file, ...files]);

          // Audit revision — record every upload regardless of visibility
          const revisions = readStore<any>(REVISIONS_KEY, () => []);
          const rev = {
            id:         `rev-file-${ts}`,
            projectId:  file.projectId  || "",
            clientId:   file.clientId   || "",
            comment:    `File uploaded: "${file.name}"${file.description ? ` — ${file.description}` : ""}`,
            status:     "completed",
            type:       "file_upload",
            updatedBy:  mockUserId || file.uploadedById || "",
            created_at: now,
          };
          writeStore(REVISIONS_KEY, [rev, ...revisions]);

          // Notifications — only when the file is actually shared with others
          const uploader = mockUserId || file.uploadedById || "";
          const makeNotif = (userId: string, actionUrl: string, seq: number) => ({
            id:        `notif-file-${ts + seq}-${userId}`,
            userId,
            type:      "file",
            title:     `New file shared: "${file.name}"`,
            message:   `${file.uploadedBy || "A team member"} uploaded "${file.name}"${file.description ? `: ${file.description}` : ""}.`,
            read:      false,
            createdAt: now,
            actionUrl,
          });

          const pendingNotifs: any[] = [];
          const vis = file.visibility as string | undefined;

          if (vis === "specific" && Array.isArray(file.visibleTo)) {
            (file.visibleTo as string[])
              .filter((uid) => uid !== uploader)
              .forEach((uid, i) => pendingNotifs.push(makeNotif(uid, "/files", i + 1)));
          } else if (vis === "client" && file.clientId) {
            pendingNotifs.push(makeNotif(file.clientId, "/client/files", 1));
          } else if (vis === "project-team" && file.projectId) {
            const projects = readStore<any>(PROJECTS_KEY, seedProjects);
            const proj = projects.find((pr: any) => pr.id === file.projectId);
            if (proj && Array.isArray(proj.assignedTo)) {
              (proj.assignedTo as string[])
                .filter((uid) => uid !== uploader)
                .forEach((uid, i) => pendingNotifs.push(makeNotif(uid, "/files", i + 1)));
            }
          }

          if (pendingNotifs.length > 0) {
            const notifs = safeParse<any[]>(localStorage.getItem(NOTIFS_KEY) || "[]", []);
            localStorage.setItem(NOTIFS_KEY, JSON.stringify([...pendingNotifs, ...notifs]));
          }

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

          // Role-based visibility scoping
          if (mockUserRole === "production_member" && mockUserId) {
            const projects = readStore<any>(PROJECTS_KEY, seedProjects);
            const myProjIds = new Set(
              projects
                .filter((proj: any) => Array.isArray(proj.assignedTo) && proj.assignedTo.includes(mockUserId))
                .map((proj: any) => proj.id)
            );
            out = out.filter((r: any) => myProjIds.has(r.projectId));
          } else if (
            mockUserRole !== "super_admin" &&
            mockUserRole !== "management" &&
            mockUserRole !== "production_admin"
          ) {
            out = []; // All other roles have no revision access
          }

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
          // Direct payment creation is disabled — all payments are created atomically by the
          // stripe-confirm endpoint which validates the Stripe payment intent.
          return new Response(
            JSON.stringify({ success: false, error: "Direct payment creation is disabled. Payments are recorded automatically after Stripe checkout." }),
            { status: 410, headers: { "Content-Type": "application/json" } }
          );
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

      // ── Social Account Metrics (persistent, not random per render) ────────
      if (p === "/saas/v1/social-analytics/account-metrics") {
        const links = safeParse<any[]>(localStorage.getItem(SOCIAL_LINKS_KEY), []);
        let metrics = safeParse<Record<string, any>>(localStorage.getItem(SOCIAL_METRICS_KEY), {});

        // Seed realistic metrics for any link that doesn't have them yet
        const PLATFORM_DEFAULTS: Record<string, { followers: number; engagement: number; reach: number }> = {
          facebook:   { followers: 12400,  engagement: 3.2,  reach: 8500  },
          instagram:  { followers: 28700,  engagement: 4.8,  reach: 15200 },
          linkedin:   { followers: 5800,   engagement: 2.1,  reach: 3400  },
          tiktok:     { followers: 45300,  engagement: 6.7,  reach: 32000 },
          youtube:    { followers: 9200,   engagement: 3.9,  reach: 6800  },
          twitter:    { followers: 7600,   engagement: 1.8,  reach: 4200  },
          google_ads: { followers: 0,      engagement: 2.4,  reach: 18000 },
          other:      { followers: 2500,   engagement: 2.0,  reach: 1800  },
        };
        let updated = false;
        for (const link of links) {
          if (!metrics[link.id]) {
            const base = PLATFORM_DEFAULTS[link.platform] ?? PLATFORM_DEFAULTS.other;
            // Use link.id hash to add per-link variation deterministically
            const seed = link.id.split("").reduce((s: number, c: string) => s + c.charCodeAt(0), 0);
            const variance = (n: number) => Math.round(n * (0.85 + ((seed % 30) / 100)));
            metrics[link.id] = {
              linkId:     link.id,
              platform:   link.platform,
              followers:  variance(base.followers),
              engagement: parseFloat((base.engagement + ((seed % 10) / 10 - 0.5)).toFixed(1)),
              reach:      variance(base.reach),
              lastSync:   new Date(Date.now() - Math.floor((seed % 3) * 86400000)).toISOString(),
            };
            updated = true;
          }
        }
        if (updated) localStorage.setItem(SOCIAL_METRICS_KEY, JSON.stringify(metrics));

        if (method === "GET") {
          return ok(Object.values(metrics).filter((m: any) => links.some((l: any) => l.id === m.linkId)));
        }

        if (method === "POST") {
          // Sync: update a specific link's metrics with slight variation
          const body = safeParseBody<any>(init?.body, {});
          if (body.linkId && metrics[body.linkId]) {
            const m = metrics[body.linkId];
            const delta = (n: number) => Math.round(n * (0.99 + Math.random() * 0.04));
            metrics[body.linkId] = {
              ...m,
              followers:  delta(m.followers),
              engagement: parseFloat(Math.min(10, Math.max(0.1, m.engagement + (Math.random() * 0.4 - 0.2))).toFixed(1)),
              reach:      delta(m.reach),
              lastSync:   new Date().toISOString(),
            };
            localStorage.setItem(SOCIAL_METRICS_KEY, JSON.stringify(metrics));
            return ok(metrics[body.linkId]);
          }
          return ok(null);
        }
      }

      // ── Leads ────────────────────────────────────────────────────────────
      if (p.startsWith("/saas/v1/leads")) {
        const LEADS_KEY = "mock_leads";
        const seedLeads = () => [
          { id: "lead-1", name: "Priya Sharma",    email: "priya@techwave.io",    phone: "+92-300-1234567", company: "TechWave",       source: "website",  status: "new",        estimated_value: 15000, assignedTo: "u8",  created_at: "2026-05-10T08:00:00Z", updated_at: "2026-05-10T08:00:00Z" },
          { id: "lead-2", name: "Omar Farooq",     email: "omar@nexadigital.com", phone: "+92-321-9876543", company: "NexaDigital",    source: "referral", status: "contacted",  estimated_value: 8500,  assignedTo: "u12", created_at: "2026-05-14T10:30:00Z", updated_at: "2026-05-15T09:00:00Z" },
          { id: "lead-3", name: "Sara Malik",      email: "sara@brightcorp.pk",   phone: "+92-333-2345678", company: "BrightCorp",     source: "linkedin", status: "qualified",  estimated_value: 22000, assignedTo: "u8",  created_at: "2026-05-18T11:00:00Z", updated_at: "2026-05-20T14:00:00Z" },
          { id: "lead-4", name: "Bilal Ahmed",     email: "bilal@globaltech.net", phone: "+92-345-3456789", company: "GlobalTech",     source: "cold-call",status: "converted", estimated_value: 30000, assignedTo: "u12", created_at: "2026-04-02T09:00:00Z", updated_at: "2026-06-01T10:00:00Z" },
          { id: "lead-5", name: "Nadia Hussain",   email: "nadia@pixelstudio.pk", phone: "+92-311-4567890", company: "PixelStudio",    source: "website",  status: "new",        estimated_value: 5000,  assignedTo: "u8",  created_at: "2026-06-01T07:30:00Z", updated_at: "2026-06-01T07:30:00Z" },
          { id: "lead-6", name: "Raza Khan",       email: "raza@alphasolutions.pk",phone: "+92-322-5678901", company: "AlphaSolutions", source: "event",    status: "contacted",  estimated_value: 12000, assignedTo: "u22", created_at: "2026-06-05T12:00:00Z", updated_at: "2026-06-06T10:00:00Z" },
          { id: "lead-7", name: "Fatima Zahra",    email: "fatima@cloudbase.io",  phone: "+92-315-6789012", company: "CloudBase",      source: "linkedin", status: "lost",       estimated_value: 9000,  assignedTo: "u8",  created_at: "2026-05-25T09:00:00Z", updated_at: "2026-06-10T08:00:00Z" },
          { id: "lead-8", name: "Hamza Sheikh",    email: "hamza@innotech.com",   phone: "+92-301-7890123", company: "InnoTech",       source: "referral", status: "qualified",  estimated_value: 18500, assignedTo: "u23", created_at: "2026-06-08T14:00:00Z", updated_at: "2026-06-09T11:00:00Z" },
        ];
        const leads = readStore<any>(LEADS_KEY, seedLeads);

        if (method === "GET" && (p === "/saas/v1/leads" || p.endsWith("/list"))) {
          const assignedTo = parsed.searchParams.get("assignedTo");
          const status     = parsed.searchParams.get("status");
          let out = leads;
          // members only see their assigned leads
          if (mockUserRole?.endsWith("_member") && !assignedTo) {
            out = out.filter((l: any) => l.assignedTo === mockUserId);
          } else if (assignedTo) {
            out = out.filter((l: any) => l.assignedTo === assignedTo);
          }
          if (status) out = out.filter((l: any) => l.status === status);
          return ok({ leads: out });
        }

        if (method === "GET" && p.startsWith("/saas/v1/leads/")) {
          const id = p.split("/").pop();
          return ok({ lead: leads.find((l: any) => l.id === id) ?? null });
        }

        if (method === "POST" && p.endsWith("/convert")) {
          const body   = safeParseBody<any>(init?.body, {});
          const leadId = body.leadId;
          const lead   = leads.find((l: any) => l.id === leadId);
          if (!lead) return new Response(JSON.stringify({ error: "Lead not found" }), { status: 404 });
          if (lead.status === "converted") return new Response(JSON.stringify({ error: "Lead already converted" }), { status: 409 });

          // Duplicate email guard — prevent creating a second client with the same email
          const existingClients = readStore<any>(CLIENTS_KEY, () => []);
          const duplicate = existingClients.find(
            (c: any) => c.email && lead.email && c.email.toLowerCase() === lead.email.toLowerCase()
          );
          if (duplicate) return new Response(JSON.stringify({ error: "A client with this email already exists", clientId: duplicate.id }), { status: 409 });

          // Build client record from lead data
          const now = new Date().toISOString();
          const newClient = {
            id: `client-${Date.now()}`,
            name: lead.name, contactName: lead.name,
            company: lead.company || lead.name, companyName: lead.company || lead.name,
            email: lead.email, phone: lead.phone || "",
            address: "", city: "",
            totalProjects: 0, totalBilled: 0,
            assignedProductionMembers: [],
            status: "active",
            joinDate: now, createdAt: now,
            createdBy: body.convertedBy || "",
            createdByName: body.convertedByName || "",
            convertedFromLead: leadId,
            source: lead.source,
          };
          const clients = readStore<any>(CLIENTS_KEY, () => []);
          writeStore(CLIENTS_KEY, [newClient, ...clients]);

          // Mark lead as converted
          const updatedLeads = leads.map((l: any) =>
            l.id === leadId ? { ...l, status: "converted", convertedAt: now, convertedToClientId: newClient.id, updated_at: now } : l
          );
          writeStore(LEADS_KEY, updatedLeads);

          // Notify the converting user that the client was created successfully
          if (body.convertedBy) {
            const notifs = safeParse<any[]>(localStorage.getItem(NOTIFS_KEY) || "[]", []);
            notifs.unshift({
              id: `notif-conv-${Date.now()}`,
              userId: body.convertedBy,
              type: "lead_converted",
              title: "Lead Converted",
              message: `${lead.name} (${lead.company}) has been converted to a client.`,
              read: false,
              createdAt: now,
            });
            localStorage.setItem(NOTIFS_KEY, JSON.stringify(notifs));
          }

          return ok({ lead: updatedLeads.find((l: any) => l.id === leadId), client: newClient });
        }

        if (method === "POST" && (p === "/saas/v1/leads" || p.endsWith("/create"))) {
          const body = safeParseBody<any>(init?.body, {});
          const lead = { id: `lead-${Date.now()}`, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), status: "new", ...body };
          writeStore(LEADS_KEY, [lead, ...leads]);
          return ok({ lead });
        }

        if (method === "PUT") {
          const body    = safeParseBody<any>(init?.body, {});
          const id      = body.id || p.split("/").pop();
          const updated = leads.map((l: any) => l.id === id ? { ...l, ...body, updated_at: new Date().toISOString() } : l);
          writeStore(LEADS_KEY, updated);
          return ok({ lead: updated.find((l: any) => l.id === id) ?? null });
        }

        if (method === "DELETE") {
          const body = safeParseBody<any>(init?.body, {});
          const id   = body.id || p.split("/").pop();
          writeStore(LEADS_KEY, leads.filter((l: any) => l.id !== id));
          return ok({});
        }
      }

      // ── Commissions ───────────────────────────────────────────────────────
      if (p.startsWith("/saas/v1/commissions")) {
        const COMM_KEY = "mock_commissions";
        const commissions = safeParse<any[]>(localStorage.getItem(COMM_KEY) ?? "[]", []);

        if (method === "GET" && (p === "/saas/v1/commissions" || p.endsWith("/list"))) {
          const userId    = parsed.searchParams.get("userId");
          const projectId = parsed.searchParams.get("projectId");
          let out = commissions;
          if (userId)    out = out.filter((x: any) => x.userId === userId);
          if (projectId) out = out.filter((x: any) => x.projectId === projectId);
          return ok({ commissions: out });
        }

        if (method === "POST" && (p === "/saas/v1/commissions" || p.endsWith("/create"))) {
          const body = safeParseBody<any>(init?.body, {});
          const item = {
            id: `comm-${Date.now()}`,
            createdAt: new Date().toISOString(),
            status: "pending",
            ...body,
          };
          localStorage.setItem(COMM_KEY, JSON.stringify([item, ...commissions]));
          return ok({ commission: item });
        }

        if (method === "PUT") {
          const body    = safeParseBody<any>(init?.body, {});
          const updated = commissions.map((x: any) => (x.id === body.id ? { ...x, ...body } : x));
          localStorage.setItem(COMM_KEY, JSON.stringify(updated));
          return ok({ commission: updated.find((x: any) => x.id === body.id) || null });
        }

        if (method === "DELETE") {
          const body = safeParseBody<any>(init?.body, {});
          localStorage.setItem(COMM_KEY, JSON.stringify(commissions.filter((x: any) => x.id !== body.id)));
          return ok({});
        }

        if (method === "GET" && p.includes("/")) {
          const id   = p.split("/").pop();
          const item = commissions.find((x: any) => x.id === id);
          return ok({ commission: item || null });
        }
      }

      return originalFetch(input, init);
    } catch (err) {
      return Promise.reject(err);
    }
  };
}
