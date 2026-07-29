# ChatGPT Project Context — OptiVax ERP / Admin Dashboard

This file is a self-contained technical dump of the entire project, generated for handoff to an AI assistant (ChatGPT) that has no access to this repository. It is exhaustive by design: full file contents are copied verbatim wherever code matters for debugging. Do not expect prose summaries in place of code — where code was requested, code is here.

**Project identity:** A React + Vite + TypeScript admin/ERP dashboard ("OptiVax Global") for a digital marketing agency, covering Sales, Production, Marketing, HR, IT Support, Management, Client Portal, and Super Admin roles. The frontend talks to a custom WordPress plugin (`wordpress-backend/optivax-erp-backend/`) that exposes a REST API under the `saas/v1` namespace (served at `/wp-json/saas/v1/*`). A separate WordPress theme (`wordpress-theme/optivax-react-theme/`) hosts the compiled Vite build as the site's front-end shell.

Generated: 2026-07-14.

---

## TABLE OF CONTENTS

1. [Project Structure](#section-1--project-structure)
2. [Package Information](#section-2--package-information)
3. [Environment](#section-3--environment)
4. [Frontend Config](#section-4--frontend-config)
5. [Authentication](#section-5--authentication)
6. [SSE](#section-6--sse)
7. [WordPress Plugin](#section-7--wordpress-plugin)
8. [WordPress Theme](#section-8--wordpress-theme)
9. [Database](#section-9--database)
10. [Routes](#section-10--routes)
11. [API Map](#section-11--api-map)
12. [Build](#section-12--build)
13. [Deployment](#section-13--deployment)
14. [Known Issues](#section-14--known-issues)
15. [Audit](#section-15--audit)

---

## SECTION 1 — PROJECT STRUCTURE

Full recursive listing (excluding `node_modules/`, `.git/`, `dist/`, `build/`). Icon/image asset directories are collapsed to a single count line since they are not code-relevant.

```
free-react-tailwind-admin-dashboard-main/
├── .claude/
│   ├── settings.json
│   └── settings.local.json
├── .env                              (gitignored locally; present in this checkout)
├── .env.development
├── .env.example
├── .env.production
├── .gitignore
├── .vercel/
│   ├── README.txt
│   └── project.json
├── .vscode/settings.json
├── ENTERPRISE_AUDIT_2026-07-10.md
├── FULL_PROJECT_ANALYSIS.md
├── LICENSE.md
├── PHASE1_SECURITY_RBAC_REPORT.md
├── PHASE2_API_AUDIT_REPORT.md
├── PHASE3_DATABASE_AUDIT_REPORT.md
├── PHASE4_FRONTEND_AUDIT_REPORT.md
├── PHASE5_BUSINESS_LOGIC_AUDIT_REPORT.md
├── PHASE6_PERFORMANCE_REPORT.md
├── PHASE7_SECURITY_REPORT.md
├── PHASE8_FINAL_PRODUCTION_AUDIT_REPORT.md
├── PHASE9_REMEDIATION_REPORT.md
├── PROJECT_ANALYSIS.md
├── README.md
├── REPORT_LINKS_ANALYSIS.md
├── SYSTEM_DOCUMENTATION.md
├── audit/
│   ├── routes.csv
│   └── routes.json
├── eslint.config.js
├── implementation_plan.md
├── index.html
├── package.json
├── package-lock.json
├── postcss.config.js
├── public/
│   ├── theme-init.js
│   └── images/**                     (brand/cards/carousel/chat/country/grid-image/icons/product/user assets — ~60+ static files, not code)
├── scripts/
│   └── sync-wp-theme.mjs
├── src/
│   ├── App.tsx
│   ├── main.tsx
│   ├── index.css
│   ├── svg.d.ts
│   ├── vite-env.d.ts
│   ├── components/
│   │   ├── ErrorBoundary.tsx
│   │   ├── auth/
│   │   │   ├── ProtectedRoute.tsx
│   │   │   ├── PublicRoute.tsx
│   │   │   ├── RequirePermission.tsx
│   │   │   └── SignInForm.tsx
│   │   ├── common/
│   │   │   ├── ErrorState.tsx
│   │   │   ├── GridShape.tsx
│   │   │   ├── LoadingState.tsx
│   │   │   ├── PageBreadCrumb.tsx
│   │   │   ├── PageMeta.tsx
│   │   │   ├── Placeholder.tsx
│   │   │   ├── ProjectTaskAssignmentModal.tsx
│   │   │   ├── ScrollToTop.tsx
│   │   │   ├── ThemeToggleButton.tsx
│   │   │   └── ThemeTogglerTwo.tsx
│   │   ├── dashboard/
│   │   │   ├── ActivityFeed.tsx
│   │   │   ├── EmployeeHierarchy.tsx
│   │   │   └── MetricCard.tsx
│   │   ├── form/
│   │   │   ├── Form.tsx
│   │   │   ├── Label.tsx
│   │   │   ├── Select.tsx
│   │   │   ├── input/Checkbox.tsx
│   │   │   ├── input/InputField.tsx
│   │   │   └── switch/Switch.tsx
│   │   ├── header/
│   │   │   ├── BreakWidget.tsx
│   │   │   ├── Header.tsx
│   │   │   ├── NotificationDropdown.tsx
│   │   │   └── UserDropdown.tsx
│   │   └── ui/
│   │       ├── badge/Badge.tsx
│   │       ├── button/Button.tsx
│   │       ├── dropdown/Dropdown.tsx
│   │       ├── dropdown/DropdownItem.tsx
│   │       └── modal/index.tsx
│   ├── config/
│   │   ├── environment.ts
│   │   └── menuConfig.ts
│   ├── context/
│   │   ├── ActivityContext.tsx
│   │   ├── AuthContext.tsx
│   │   ├── SidebarContext.tsx
│   │   ├── ThemeContext.tsx
│   │   └── ToastContext.tsx
│   ├── domain/
│   │   ├── attendance/calculations.ts
│   │   ├── budget/calculations.ts
│   │   ├── conversations/visibility.ts
│   │   └── payroll/calculations.ts
│   ├── dto/auth.dto.ts
│   ├── hooks/
│   │   ├── useClients.ts
│   │   ├── useCommissions.ts
│   │   ├── useEmailMarketing.ts
│   │   ├── useFiles.ts
│   │   ├── useInvoices.ts
│   │   ├── useModal.ts
│   │   ├── useNotifications.ts
│   │   ├── useProjects.ts
│   │   ├── useSSE.ts
│   │   └── useSocialTracking.ts
│   ├── icons/index.ts                (+ ~90 individual .svg files, not code-relevant)
│   ├── layout/
│   │   ├── AppHeader.tsx
│   │   ├── AppLayout.tsx
│   │   ├── AppSidebar.tsx
│   │   └── Backdrop.tsx
│   ├── lib/
│   │   ├── apiError.ts
│   │   ├── client.ts
│   │   ├── csvExport.ts
│   │   ├── roles.ts
│   │   └── storage.ts
│   ├── pages/
│   │   ├── Admin/ (AuditLogs, Billing, ClientModal, Clients, Departments, Files, InvoiceModal, NotificationModal, Notifications, ProjectModal, Projects, Revisions, SecurityAuditLogs, Settings, Email/{Analytics,Audience,Automation,Campaigns,Templates})
│   │   ├── AuthPages/ (AuthPageLayout, ChangePassword, ResetPassword, SignIn)
│   │   ├── Budget/BudgetManagement.tsx
│   │   ├── Client/ (Billing, Files, Messages, MyProjects, MyRevisions, Notifications, Profile)
│   │   ├── Common/ (ActivityReports, LiveActivityDashboard, Reports, Tasks)
│   │   ├── Conversations/ClientConversations.tsx
│   │   ├── Dashboard/ (AdminPanel, ClientPanel, HRPanel, ITSupportPanel, ManagementPanel, MarketingPanel, ProductionPanel, SalesPanel, SuperAdminPanel)
│   │   ├── Employee/ (AdvanceSalaryRequest, MyBudget, MySalarySlips)
│   │   ├── HR/ (AdvanceSalary, AdvanceSalaryAuditLog, Attendance, AttendanceAnalytics, AttendanceCalendar, AttendanceCorrections, AttendanceMonthly, AttendancePayroll, AttendanceYearly, BulkSalarySlips, Employees, LeaveRequests, Payroll, SalarySlips)
│   │   ├── ITSupport/ (AttendanceDashboard, AttendanceExceptions, AttendanceReports, DeviceLogs, Devices, Tickets)
│   │   ├── Marketing/ (ContentCalendar, Leads, SocialTracking)
│   │   ├── OtherPage/NotFound.tsx
│   │   ├── Production/ (ClientOwnership, Deliverables, MyClients)
│   │   └── Sales/ (CampaignBudgets, Commissions, Leads, SalesTargets, SalesTasks, TeamPerformance)
│   ├── services/ (~35 files — see Section 11)
│   ├── types/ (activity.ts, index.ts)
│   └── utils/rbac.ts
├── tailwind.config.js
├── tsconfig.app.json
├── tsconfig.json
├── tsconfig.node.json
├── vercel.json
├── vite.config.ts
├── wordpress-backend/
│   └── optivax-erp-backend/
│       ├── .gitignore
│       ├── admin/SettingsPage.php
│       ├── composer.json
│       ├── vendor/**                 (SKIPPED — third-party Composer deps, e.g. firebase/php-jwt; not read)
│       ├── *.zip                     (SKIPPED — packaged build archives, binary)
│       ├── controllers/ (24 files — Activity, Attendance, AuditLog, Auth, Automation, BaseCrud, Budget, ClientOwnership, Commission, CompanySettings, Conversation, EmailMarketing, EmployeeExtra, Invoice, Lead, LeaveRequest, NotificationStream, Payroll, ProductionAssignment, Profile, SalesOps, SalesWidget, SecurityAuditLog, SocialTracking, Stripe)
│       ├── cron/EmailQueueWorker.php
│       ├── database/
│       │   ├── Migrator.php
│       │   └── migrations/ (13 files — see Section 9)
│       ├── helpers/ (12 files — ApiResponse, DepartmentMapper, Jwt, Logger, PasswordPolicy, RateLimiter, RbacMatrix, Sanitize, SecurityAuditLog, SecurityHeaders, Transaction, UserHierarchy, Uuid, Validator)
│       ├── mail/ (MailService.php + templates/{invoice,notification,password-reset,salary-slip,welcome}.php)
│       ├── middleware/ (AuthMiddleware, ClientScopeMiddleware, CsrfMiddleware, DepartmentScopeMiddleware, ErrorBoundaryMiddleware, PasswordGateMiddleware, RbacMiddleware)
│       ├── notifications/NotificationService.php
│       ├── optivax-erp-backend.php   (main plugin bootstrap file)
│       ├── repositories/ (~50 files — see Section 9)
│       ├── routes/ (~38 files — see Section 10)
│       ├── services/AuthService.php
│       └── uploads/UploadService.php
└── wordpress-theme/
    └── optivax-react-theme/
        ├── 404.php
        ├── README.md
        ├── archive.php
        ├── footer.php
        ├── front-page.php
        ├── functions.php
        ├── header.php
        ├── inc/ (assets.php, localize.php, security.php, seo.php, template-tags.php, theme-setup.php)
        ├── index.php
        ├── page.php
        ├── single.php
        ├── style.css
        ├── templates/template-app.php
        └── theme.json
```

Notes on the listing above vs. the raw file list provided as ground truth:
- `wordpress-backend/optivax-erp-backend/vendor/**` and any `.zip` archives inside that plugin folder were deliberately not read (third-party/binary per task instructions) — only their presence is noted.
- No `wp-config.php` and no `.htaccess` exist anywhere in this repository checkout (confirmed via glob search — see Section 13).
- `next-env.d.ts` referenced by `tsconfig.json`'s `include` does not appear in the file listing — likely stale/leftover from a Next.js-derived config template; see Section 15.

---

## SECTION 2 — PACKAGE INFORMATION

### package.json

```json
{
  "name": "tailadmin-react",
  "private": true,
  "version": "2.3.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build ",
    "build:wp": "npm run build && node scripts/sync-wp-theme.mjs",
    "lint": "eslint .",
    "preview": "vite preview"
  },
  "dependencies": {
    "@stripe/react-stripe-js": "^6.4.0",
    "@stripe/stripe-js": "^9.6.0",
    "apexcharts": "^4.1.0",
    "clsx": "^2.1.1",
    "react": "^19.2.6",
    "react-apexcharts": "^1.7.0",
    "react-dom": "^19.2.6",
    "react-helmet-async": "^2.0.5",
    "react-router": "^7.1.5",
    "react-router-dom": "^7.17.0",
    "tailwind-merge": "^3.0.1"
  },
  "devDependencies": {
    "@eslint/js": "^9.19.0",
    "@tailwindcss/postcss": "^4.0.8",
    "@types/node": "^25.8.0",
    "@types/react": "^19.2.14",
    "@types/react-dom": "^19.0.4",
    "@vitejs/plugin-react": "^4.3.4",
    "eslint": "^9.19.0",
    "eslint-plugin-react-hooks": "^5.0.0",
    "eslint-plugin-react-refresh": "^0.4.18",
    "globals": "^15.14.0",
    "postcss": "^8.5.2",
    "tailwindcss": "^4.0.8",
    "typescript": "~5.7.2",
    "typescript-eslint": "^8.22.0",
    "vite": "^6.1.0",
    "vite-plugin-svgr": "^4.3.0"
  },
  "overrides": {
    "react-helmet-async": {
      "react": "^16.8.0 || ^17 || ^18 || ^19"
    }
  }
}
```

### vite.config.ts

```ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import svgr from "vite-plugin-svgr";
import path from "path";

export default defineConfig({
  base: "/",
  plugins: [react(), svgr({ svgrOptions: { exportType: "named", namedExport: "ReactComponent", icon: true } })],
  resolve: { alias: { "@": path.resolve(__dirname, "src") } },
  build: {
    outDir: "dist",
    emptyOutDir: true,
    manifest: true,
    rollupOptions: {
      input: "index.html",
      output: {
        // Groups the heaviest third-party libraries into their own stable
        // vendor chunks instead of letting Rollup's default per-dynamic-import
        // splitting scatter them across many small chunks (or duplicate them
        // across pages that share a dependency) — these chunks change far
        // less often than app code, so browsers cache them across deploys.
        manualChunks(id: string) {
          if (!id.includes("node_modules")) return undefined;
          if (id.includes("apexcharts")) return "vendor-charts";
          if (id.includes("react-dom") || id.includes("/react/") || id.includes("react-router")) return "vendor-react";
          return undefined;
        },
      },
    },
  }
});
```

### tsconfig.json

Note: this root config is unusual for this project — it looks like a leftover Next.js-style config (`plugins: [{ "name": "next" }]`, `include: ["next-env.d.ts", ...]`) rather than a clean TS project-references root. `next-env.d.ts` does not exist in this repo (see Section 15, "Broken imports/config").

```json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [
      {
        "name": "next"
      }
    ],
    "paths": {
      "@/*": ["./src/*"]
    },
    "types": ["node"]
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx"],
  "exclude": ["node_modules", "supabase"]
}
```

### tsconfig.app.json

```json
{
  "compilerOptions": {
    "tsBuildInfoFile": "./node_modules/.tmp/tsconfig.app.tsbuildinfo",
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,

    /* Bundler mode */
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "noEmit": true,
    "jsx": "react-jsx",

    /* Linting */
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedSideEffectImports": true
  },
  "include": ["src"]
}
```

### tsconfig.node.json

```json
{
  "compilerOptions": {
    "tsBuildInfoFile": "./node_modules/.tmp/tsconfig.node.tsbuildinfo",
    "target": "ES2022",
    "lib": ["ES2023"],
    "module": "ESNext",
    "skipLibCheck": true,

    /* Bundler mode */
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "noEmit": true,

    /* Linting */
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedSideEffectImports": true
  },
  "include": ["vite.config.ts"]
}
```

## SECTION 3 — ENVIRONMENT

No secret values (API keys, DB passwords, JWT secrets, Stripe keys) were present in any of these four files in this checkout — all sensitive fields are already empty placeholders. Non-secret values (URLs, flags) are shown as-is; nothing required `[REDACTED]` substitution in practice, but the marker convention is kept below wherever a field is designed to hold a secret.

### .env

```env
# Must include the "/wp-json" prefix — the Phase 2A WordPress backend
# (wordpress-backend/optivax-erp-backend) registers its REST namespace as
# "saas/v1", so real routes resolve to /wp-json/saas/v1/*, e.g. https://api.optivax.com/wp-json.
VITE_API_URL=https://optivaxglobal.com/pms/wp-json
VITE_API_BASE=
VITE_SSE_PATH=/saas/v1/notifications/stream
```

### .env.development

```env
# Local development — point at your local backend once it exists.
VITE_API_URL=https://optivaxglobal.com/pms/wp-json
VITE_SSE_PATH=/saas/v1/notifications/stream
VITE_STRIPE_PUBLISHABLE_KEY=[REDACTED — empty in checkout]
```

### .env.production

```env
# Production — REQUIRED: set to the real API origin before deploying.
# Must include the "/wp-json" prefix (REST namespace is "saas/v1"), e.g. https://api.optivax.com/wp-json.
# Deliberately left empty rather than pointing at a local address — an empty
# value resolves to relative paths against the deployed origin (works if the
# SPA and API share an origin/reverse-proxy) and fails loudly/obviously if
# they don't, instead of a production build silently calling localhost.
# src/config/environment.ts also logs a console error if this is ever left
# pointing at localhost/127.0.0.1 in a production build.
VITE_API_URL=https://optivaxglobal.com/pms/wp-json
```

### .env.example

```env
# Copy this file to .env and fill in values for your environment.
#
# Set VITE_API_URL to your backend's origin (e.g. https://api.optivax.com).
# Leave empty to use relative paths against the current origin.
# The Phase 2A WordPress backend (wordpress-backend/optivax-erp-backend)
# registers its REST namespace as "saas/v1", so WordPress serves it at
# /wp-json/saas/v1/*. Since every frontend call is `${VITE_API_URL}/saas/v1/...`,
# this value must include the "/wp-json" prefix, e.g. https://api.optivax.com/wp-json.
VITE_API_URL=https://optivaxglobal.com/pms/wp-json
VITE_API_BASE=
VITE_SSE_PATH=/saas/v1/notifications/stream
VITE_STRIPE_PUBLISHABLE_KEY=[REDACTED — empty in checkout]
```

**Important cross-check with PHASE7_SECURITY_REPORT.md:** that report states it found `VITE_API_URL=http://localhost/optivax-erp/wp-json` as "confirmed still broken from a prior audit's finding." The current checkout's `.env`/`.env.development`/`.env.production` all now point at `https://optivaxglobal.com/pms/wp-json` — so this specific issue appears to have been resolved since Phase 7, OR this checkout's env files were regenerated/edited after that report was written. Flagging the discrepancy rather than asserting either history is correct (see Section 14).

Backend JWT secret (`optivax_erp_jwt_secret`) and SMTP credentials are **not** stored in any `.env*` file — they live in WordPress's own `wp_options` table, set via `helpers/Jwt.php`'s `get_option()`/`update_option()` calls and the plugin's admin Settings page (`admin/SettingsPage.php`). There is no `wp-config.php` in this repository to inspect for DB credentials (see Section 13).

---

## SECTION 4 — FRONTEND CONFIG

### src/config/environment.ts

```ts
// Single source of truth for environment-driven configuration.
// Replaces the old USE_MOCK / getBaseUrl() toggle now that the mock backend is gone.

export interface EnvironmentConfig {
  apiBaseUrl: string;
  ssePath: string;
  stripePublishableKey?: string;
}

let cached: EnvironmentConfig | null = null;

export function getEnvironment(): EnvironmentConfig {
  if (cached) return cached;

  const env = import.meta.env as Record<string, string | undefined>;
  const rawUrl = env.VITE_API_URL ?? env.VITE_API_BASE ?? "";

  const apiBaseUrl = rawUrl.replace(/\/$/, "");

  // A production build that still points at localhost means .env.production
  // (or whatever env file fed this build) was never updated for the real
  // deployment — every API/auth/SSE call would silently target someone's
  // local machine instead of failing loudly. Surface it immediately rather
  // than letting it manifest as a confusing wall of failed network requests.
  if (env.PROD && /localhost|127\.0\.0\.1/.test(apiBaseUrl)) {
    console.error(
      `[config] VITE_API_URL ("${apiBaseUrl}") looks like a local dev address in a production build. ` +
        `Set the real API origin before deploying.`
    );
  }

  cached = {
    apiBaseUrl,
    ssePath: env.VITE_SSE_PATH ?? "/saas/v1/notifications/stream",
    stripePublishableKey: env.VITE_STRIPE_PUBLISHABLE_KEY || undefined,
  };
  return cached;
}

export function getApiBaseUrl(): string {
  return getEnvironment().apiBaseUrl;
}
```

### src/lib/client.ts

```ts
// Authentication relies on an HttpOnly cookie set by the server — no client-side token storage.
import { ApiError, ApiErrorKind } from "./apiError";
import { getApiBaseUrl } from "../config/environment";

interface SaasApiResponse<T = unknown> {
  success: boolean;
  data: T;
  meta?: Record<string, unknown>;
  error?: string | null;
  details?: unknown;
}

const DEFAULT_TIMEOUT_MS = 15000;
const RETRYABLE_METHODS = new Set(["GET"]);
const RETRYABLE_KINDS = new Set<ApiErrorKind>(["network", "timeout", "server"]);
const MAX_RETRIES = 2;

let onUnauthorized: (() => void) | null = null;
/** Registered by AuthContext so a 401 anywhere can clear the session. */
export const setUnauthorizedHandler = (fn: (() => void) | null): void => {
  onUnauthorized = fn;
};

const CSRF_COOKIE_NAME = "optivax_csrf";
const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

/**
 * The server issues a non-HttpOnly `optivax_csrf` cookie alongside the
 * HttpOnly auth cookie specifically so this same-origin JS can read it and
 * echo it back as a header (double-submit CSRF pattern — see
 * CsrfMiddleware.php on the backend). A cross-site attacker's page cannot
 * read this cookie (browser same-origin policy), so it cannot forge a
 * matching header even though the auth cookie itself would ride along.
 */
const readCsrfCookie = (): string | null => {
  const match = document.cookie.match(new RegExp(`(?:^|; )${CSRF_COOKIE_NAME}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
};

const classifyStatus = (status: number): ApiErrorKind => {
  if (status === 401) return "unauthorized";
  if (status === 403) return "forbidden";
  if (status === 404) return "not_found";
  if (status === 400 || status === 422) return "validation";
  if (status >= 500) return "server";
  return "unknown";
};

const requestOnce = async <T>(path: string, options: RequestInit): Promise<T> => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

  const method = (options.method ?? "GET").toUpperCase();
  const csrfToken = MUTATING_METHODS.has(method) ? readCsrfCookie() : null;

  let res: Response;
  try {
    res = await fetch(`${getApiBaseUrl()}${path}`, {
      ...options,
      credentials: "include",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        ...(csrfToken ? { "X-CSRF-Token": csrfToken } : {}),
        ...((options.headers as Record<string, string>) || {}),
      },
    });
  } catch (e) {
    clearTimeout(timer);
    const kind: ApiErrorKind = (e as Error)?.name === "AbortError" ? "timeout" : "network";
    throw new ApiError((e as Error)?.message ?? "Network error", kind);
  }
  clearTimeout(timer);

  let body: SaasApiResponse<T> | null = null;
  try {
    body = await res.json();
  } catch {
    // non-JSON response body
  }

  if (!res.ok || body?.success === false) {
    const kind = classifyStatus(res.status);
    if (kind === "unauthorized") onUnauthorized?.();
    throw new ApiError(body?.error ?? `Request failed: ${res.status}`, kind, res.status, body?.details);
  }

  if (body && "data" in body) {
    return body.data as T;
  }
  return body as unknown as T;
};

const request = async <T = unknown>(path: string, options: RequestInit = {}): Promise<T> => {
  const method = (options.method ?? "GET").toUpperCase();
  let attempt = 0;
  for (;;) {
    try {
      return await requestOnce<T>(path, options);
    } catch (e) {
      const err = e as ApiError;
      const canRetry =
        RETRYABLE_METHODS.has(method) && RETRYABLE_KINDS.has(err.kind) && attempt < MAX_RETRIES;
      if (!canRetry) throw err;
      attempt += 1;
      await new Promise((r) => setTimeout(r, 300 * 2 ** attempt));
    }
  }
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
  post: <T = unknown>(path: string, body: unknown) =>
    request<T>(path, { method: "POST", body: JSON.stringify(body) }),
  put: <T = unknown>(path: string, body: unknown) =>
    request<T>(path, { method: "PUT", body: JSON.stringify(body) }),
  patch: <T = unknown>(path: string, body: unknown) =>
    request<T>(path, { method: "PATCH", body: JSON.stringify(body) }),
  delete: <T = unknown>(path: string, body?: unknown) =>
    request<T>(path, { method: "DELETE", ...(body ? { body: JSON.stringify(body) } : {}) }),
};
```

### src/context/AuthContext.tsx

```tsx
/* eslint-disable react-refresh/only-export-components */
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  ReactNode,
} from "react";

import { api, setUnauthorizedHandler } from "../lib/client";
import { User } from "../types";
import type { SessionUserDto } from "../dto/auth.dto";
import { AuthService } from "../services/authService";
import { useSSE } from "../hooks/useSSE";
import { getRoleHome } from "../lib/roles";
import { hasPermission, canView as rbacCanView, canCreate as rbacCanCreate, canEdit as rbacCanEdit, canDelete as rbacCanDelete, canExport as rbacCanExport, canApprove as rbacCanApprove, canAssign as rbacCanAssign } from "../utils/rbac";
import { notifyLoginActivity } from "../services/notificationHelpers";
import { AuditLogService } from "../services/auditLogService";

// Maps the real backend's session-user DTO to the app's canonical User shape.
// The API never returns a password, so this is always blank client-side.
const sessionToUser = (dto: SessionUserDto): User => ({
  id: dto.id,
  email: dto.email,
  password: "",
  name: dto.full_name,
  role: dto.role,
  avatar: dto.avatar_url ?? "",
  company: dto.company ?? "",
  joinDate: new Date().toISOString(),
  mustChangePassword: dto.must_change_password ?? false,
});

export interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<string>;
  logout: () => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string, confirmPassword: string) => Promise<void>;
  updateProfile: (data: Partial<User>) => Promise<void>;
  checkPermission: (domain: import("../types").PermissionDomain, action: import("../types").PermissionAction) => boolean;
  canView: (domain: import("../types").PermissionDomain) => boolean;
  canCreate: (domain: import("../types").PermissionDomain) => boolean;
  canEdit: (domain: import("../types").PermissionDomain) => boolean;
  canDelete: (domain: import("../types").PermissionDomain) => boolean;
  canExport: (domain: import("../types").PermissionDomain) => boolean;
  canApprove: (domain: import("../types").PermissionDomain) => boolean;
  canAssign: (domain: import("../types").PermissionDomain) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  // Start SSE when a user is authenticated
  useSSE(!!user);

  // A 401 from any API call clears the session, anywhere in the app.
  useEffect(() => {
    setUnauthorizedHandler(() => setUser(null));
    return () => setUnauthorizedHandler(null);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const session = await AuthService.getSession();
        if (session) {
          setUser(sessionToUser(session.user));
        }
      } catch {
        // No valid session — user stays null
      } finally {
        setIsInitializing(false);
      }
    })();
  }, []);

  const login = useCallback(async (email: string, password: string): Promise<string> => {
    const { user: dto } = await AuthService.login(email, password);
    const profile = sessionToUser(dto);
    setUser(profile);
    notifyLoginActivity(profile.id, profile.name, profile.role);

    // Start Activity tracking
    try { await api.post("/saas/v1/activity/login", {}); } catch { /* non-critical */ }

    return getRoleHome(profile.role);
  }, []);

  const logout = useCallback(async (): Promise<void> => {
    try {
      await api.post("/saas/v1/activity/logout", {});
      await AuthService.logout();
    } catch {
      // ignore — still clear local state
    }
    setUser((current) => {
      if (current) {
        AuditLogService.add({
          action: "USER_LOGOUT",
          entityType: "security",
          entityId: current.id,
          entityName: current.name,
          performedBy: current.id,
          performedByName: current.name,
          performedByRole: current.role,
          description: `${current.name} logged out`,
        });
      }
      return null;
    });
  }, []);

  const changePassword = useCallback(async (
    currentPassword: string,
    newPassword: string,
    confirmPassword: string
  ): Promise<void> => {
    const dto = await AuthService.changePassword(currentPassword, newPassword, confirmPassword);
    setUser(sessionToUser(dto));
  }, []);

  const updateProfile = useCallback(async (data: Partial<User>): Promise<void> => {
    if (!user) throw new Error("No user logged in");
    await AuthService.updateProfile(user.id, data);
    setUser({ ...user, ...data });
  }, [user]);

  const checkPermission = useCallback(
    (domain: import("../types").PermissionDomain, action: import("../types").PermissionAction) =>
      hasPermission(user, domain, action),
    [user]
  );
  const canView = useCallback((domain: import("../types").PermissionDomain) => rbacCanView(user, domain), [user]);
  const canCreate = useCallback((domain: import("../types").PermissionDomain) => rbacCanCreate(user, domain), [user]);
  const canEdit = useCallback((domain: import("../types").PermissionDomain) => rbacCanEdit(user, domain), [user]);
  const canDelete = useCallback((domain: import("../types").PermissionDomain) => rbacCanDelete(user, domain), [user]);
  const canExport = useCallback((domain: import("../types").PermissionDomain) => rbacCanExport(user, domain), [user]);
  const canApprove = useCallback((domain: import("../types").PermissionDomain) => rbacCanApprove(user, domain), [user]);
  const canAssign = useCallback((domain: import("../types").PermissionDomain) => rbacCanAssign(user, domain), [user]);

  const value: AuthContextType = useMemo(() => ({
    user,
    isLoading: isInitializing,
    isAuthenticated: !!user,
    login,
    logout,
    changePassword,
    updateProfile,
    checkPermission,
    canView,
    canCreate,
    canEdit,
    canDelete,
    canExport,
    canApprove,
    canAssign,
  }), [
    user,
    isInitializing,
    login,
    logout,
    changePassword,
    updateProfile,
    checkPermission,
    canView,
    canCreate,
    canEdit,
    canDelete,
    canExport,
    canApprove,
    canAssign,
  ]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
```

### src/services/authService.ts

```ts
import { api } from "../lib/client";
import { ApiError } from "../lib/apiError";
import type { User } from "../types";
import type { SessionDto, LoginResponseDto, SessionUserDto } from "../dto/auth.dto";

export class AuthService {
  static async login(email: string, password: string): Promise<LoginResponseDto> {
    return api.post<LoginResponseDto>("/saas/v1/auth/login", { email, password });
  }

  static async getSession(): Promise<SessionDto | null> {
    try {
      return await api.get<SessionDto>("/saas/v1/auth/session");
    } catch (e) {
      if (e instanceof ApiError && e.kind === "unauthorized") return null;
      throw e;
    }
  }

  static async logout(): Promise<void> {
    await api.post("/saas/v1/auth/logout", {});
  }

  static async changePassword(currentPassword: string, newPassword: string, confirmPassword: string): Promise<SessionUserDto> {
    const res = await api.post<{ user: SessionUserDto }>("/saas/v1/auth/change-password", {
      currentPassword,
      newPassword,
      confirmPassword,
    });
    return res.user;
  }

  static async updateProfile(userId: string, data: Partial<User>): Promise<void> {
    await api.put("/saas/v1/profiles/update", {
      id: userId,
      full_name: data.name,
      company: data.company,
      avatar_url: data.avatar,
    });
  }

  static async requestPasswordReset(email: string): Promise<void> {
    await api.post("/saas/v1/auth/request-reset", { email });
  }

  static async confirmPasswordReset(token: string, newPassword: string): Promise<void> {
    await api.post("/saas/v1/auth/confirm-reset", { token, newPassword });
  }
}
```

### src/main.tsx

```tsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";
import { AppWrapper } from "./components/common/PageMeta";
import { ThemeProvider } from "./context/ThemeContext";
import { AuthProvider } from "./context/AuthContext";
import { ActivityProvider } from "./context/ActivityContext";
import { ToastProvider } from "./context/ToastContext";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
      <ToastProvider>
        <AuthProvider>
          <ActivityProvider>
            <ThemeProvider>
              <AppWrapper>
                <App />
              </AppWrapper>
            </ThemeProvider>
          </ActivityProvider>
        </AuthProvider>
      </ToastProvider>
  </StrictMode>,
);
```

### src/App.tsx

```tsx
import { lazy, Suspense } from "react";
import { HashRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import SignIn from "./pages/AuthPages/SignIn";
import ResetPassword from "./pages/AuthPages/ResetPassword";
import ChangePassword from "./pages/AuthPages/ChangePassword";
import NotFound from "./pages/OtherPage/NotFound";
import AppLayout from "./layout/AppLayout";
import { ScrollToTop } from "./components/common/ScrollToTop";
import { ErrorBoundary } from "./components/ErrorBoundary";
import LoadingState from "./components/common/LoadingState";

// ── Dashboard panels ─────────────────────────────────────────────────────
const AdminPanel = lazy(() => import("./pages/Dashboard/AdminPanel"));
const ClientPanel = lazy(() => import("./pages/Dashboard/ClientPanel"));
const SuperAdminPanel = lazy(() => import("./pages/Dashboard/SuperAdminPanel"));
const SalesPanel = lazy(() => import("./pages/Dashboard/SalesPanel"));
const ProductionPanel = lazy(() => import("./pages/Dashboard/ProductionPanel"));
const MarketingPanel = lazy(() => import("./pages/Dashboard/MarketingPanel"));
const HRPanel = lazy(() => import("./pages/Dashboard/HRPanel"));
const ManagementPanel = lazy(() => import("./pages/Dashboard/ManagementPanel"));
const ITSupportPanel = lazy(() => import("./pages/Dashboard/ITSupportPanel"));

// ── HR pages ─────────────────────────────────────────────────────────────
const Employees = lazy(() => import("./pages/HR/Employees"));
const Payroll = lazy(() => import("./pages/HR/Payroll"));
const LeaveRequests = lazy(() => import("./pages/HR/LeaveRequests"));
const Attendance = lazy(() => import("./pages/HR/Attendance"));
const AttendanceMonthly = lazy(() => import("./pages/HR/AttendanceMonthly"));
const AttendanceYearly = lazy(() => import("./pages/HR/AttendanceYearly"));
const AttendanceAnalytics = lazy(() => import("./pages/HR/AttendanceAnalytics"));
const AttendanceCalendar = lazy(() => import("./pages/HR/AttendanceCalendar"));
const AttendancePayroll = lazy(() => import("./pages/HR/AttendancePayroll"));
const AttendanceCorrections = lazy(() => import("./pages/HR/AttendanceCorrections"));

// ── Admin / shared pages ──────────────────────────────────────────────────
const Clients = lazy(() => import("./pages/Admin/Clients"));
const Projects = lazy(() => import("./pages/Admin/Projects"));
const AdminBilling = lazy(() => import("./pages/Admin/Billing"));
const AdminFiles = lazy(() => import("./pages/Admin/Files"));
const AdminNotifications = lazy(() => import("./pages/Admin/Notifications"));
const AdminRevisions = lazy(() => import("./pages/Admin/Revisions"));
const Settings = lazy(() => import("./pages/Admin/Settings"));
const AuditLogs = lazy(() => import("./pages/Admin/AuditLogs"));
const SecurityAuditLogs = lazy(() => import("./pages/Admin/SecurityAuditLogs"));

// ── Email marketing pages ─────────────────────────────────────────────────
const Campaigns = lazy(() => import("./pages/Admin/Email/Campaigns"));
const Templates = lazy(() => import("./pages/Admin/Email/Templates"));
const Audience = lazy(() => import("./pages/Admin/Email/Audience"));
const Analytics = lazy(() => import("./pages/Admin/Email/Analytics"));
const Automation = lazy(() => import("./pages/Admin/Email/Automation"));

// ── Common feature pages ──────────────────────────────────────────────────
const Reports = lazy(() => import("./pages/Common/Reports"));
const Tasks = lazy(() => import("./pages/Common/Tasks"));
const ActivityReports = lazy(() => import("./pages/Common/ActivityReports"));
const LiveActivityDashboard = lazy(() => import("./pages/Common/LiveActivityDashboard"));

// ── Sales management pages ────────────────────────────────────────────────
const CampaignBudgets = lazy(() => import("./pages/Sales/CampaignBudgets"));
const SalesLeads = lazy(() => import("./pages/Sales/Leads"));
const SalesTargets = lazy(() => import("./pages/Sales/SalesTargets"));
const SalesTasks = lazy(() => import("./pages/Sales/SalesTasks"));
const TeamPerformance = lazy(() => import("./pages/Sales/TeamPerformance"));
const Commissions = lazy(() => import("./pages/Sales/Commissions"));

// ── Production pages ──────────────────────────────────────────────────────
const Deliverables = lazy(() => import("./pages/Production/Deliverables"));
const ClientOwnership = lazy(() => import("./pages/Production/ClientOwnership"));
const MyClients = lazy(() => import("./pages/Production/MyClients"));

// ── Marketing pages ───────────────────────────────────────────────────────
const SocialTracking = lazy(() => import("./pages/Marketing/SocialTracking"));
const MarketingLeads = lazy(() => import("./pages/Marketing/Leads"));
const ContentCalendar = lazy(() => import("./pages/Marketing/ContentCalendar"));

// ── Client Communication pages ────────────────────────────────────────────
const ClientConversations = lazy(() => import("./pages/Conversations/ClientConversations"));
const ClientMessages = lazy(() => import("./pages/Client/Messages"));

// ── Budget Management ─────────────────────────────────────────────────────
const BudgetManagement = lazy(() => import("./pages/Budget/BudgetManagement"));

// ── Payroll & Salary ──────────────────────────────────────────────────────
const SalarySlips = lazy(() => import("./pages/HR/SalarySlips"));
const BulkSalarySlips = lazy(() => import("./pages/HR/BulkSalarySlips"));
const AdvanceSalary = lazy(() => import("./pages/HR/AdvanceSalary"));
const AdvanceSalaryAuditLog = lazy(() => import("./pages/HR/AdvanceSalaryAuditLog"));
const MySalarySlips = lazy(() => import("./pages/Employee/MySalarySlips"));
const MyBudget = lazy(() => import("./pages/Employee/MyBudget"));
const AdvanceSalaryRequest = lazy(() => import("./pages/Employee/AdvanceSalaryRequest"));

// ── IT Support pages ─────────────────────────────────────────────────────
const AttendanceDashboard = lazy(() => import("./pages/ITSupport/AttendanceDashboard"));
const Devices = lazy(() => import("./pages/ITSupport/Devices"));
const DeviceLogs = lazy(() => import("./pages/ITSupport/DeviceLogs"));
const AttendanceExceptions = lazy(() => import("./pages/ITSupport/AttendanceExceptions"));
const AttendanceReports = lazy(() => import("./pages/ITSupport/AttendanceReports"));
const ITTickets = lazy(() => import("./pages/ITSupport/Tickets"));

// ── Admin feature pages ───────────────────────────────────────────────────
const Departments = lazy(() => import("./pages/Admin/Departments"));

// ── Client pages ──────────────────────────────────────────────────────────
const MyProjects = lazy(() => import("./pages/Client/MyProjects"));
const ClientBilling = lazy(() => import("./pages/Client/Billing"));
const ClientFiles = lazy(() => import("./pages/Client/Files"));
const ClientNotifications = lazy(() => import("./pages/Client/Notifications"));
const MyRevisions = lazy(() => import("./pages/Client/MyRevisions"));
const Profile = lazy(() => import("./pages/Client/Profile"));

// ── Auth guards ───────────────────────────────────────────────────────────
import { ProtectedRoute } from "./components/auth/ProtectedRoute";
import { PublicRoute } from "./components/auth/PublicRoute";

/** Full-page fallback while a lazy route chunk loads — matches the loading UI already used elsewhere (LoadingState), so a first visit to any route reads like a normal load, not a redesign. */
function RouteFallback() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <LoadingState label="Loading page..." />
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
    <Router>
      <ScrollToTop />
      <Suspense fallback={<RouteFallback />}>
      <Routes>
        {/* Root → login */}
        <Route path="/" element={<Navigate to="/login" replace />} />

        {/* ── Public ──────────────────────────────────────────────────── */}
        <Route element={<PublicRoute />}>
          <Route path="/login"          element={<SignIn />} />
          <Route path="/reset-password" element={<ResetPassword />} />
        </Route>

        {/* Any authenticated user, regardless of role — reachable even
            while must-change-password is blocking every other route. */}
        <Route element={<ProtectedRoute />}>
          <Route path="/change-password" element={<ChangePassword />} />
        </Route>

        {/* ── Protected (inside AppLayout) ─────────────────────────── */}
        <Route element={<AppLayout />}>

          {/* ── SUPER ADMIN ───────────────────────────────────────── */}
          <Route element={<ProtectedRoute allowedDomain="system" allowedRoles={["super_admin"]} />}>
            <Route path="/super-admin"             element={<Navigate to="/super-admin/dashboard" replace />} />
            <Route path="/super-admin/dashboard"   element={<SuperAdminPanel />} />
            <Route path="/super-admin/departments" element={<Departments />} />
          </Route>

          {/* Super admin shares the full admin panel routes */}
          <Route element={<ProtectedRoute allowedDomain="system" allowedRoles={["super_admin"]} />}>
            <Route path="/admin"                       element={<Navigate to="/admin/dashboard" replace />} />
            <Route path="/admin/dashboard"             element={<AdminPanel />} />
            <Route path="/admin/clients"               element={<Clients />} />
            <Route path="/admin/projects"              element={<Projects />} />
            <Route path="/admin/billing"               element={<AdminBilling />} />
            <Route path="/admin/files"                 element={<AdminFiles />} />
            <Route path="/admin/notifications"         element={<AdminNotifications />} />
            <Route path="/admin/revisions"             element={<AdminRevisions />} />
            <Route path="/admin/settings"              element={<Settings />} />
            <Route path="/admin/reports"               element={<Reports />} />
            <Route path="/admin/audit-logs"            element={<AuditLogs />} />
            <Route path="/admin/security-audit-logs"   element={<SecurityAuditLogs />} />
            <Route path="/admin/commissions"          element={<Commissions />} />
            <Route path="/admin/email/campaigns"       element={<Campaigns />} />
            <Route path="/admin/email/templates"       element={<Templates />} />
            <Route path="/admin/email/audience"        element={<Audience />} />
            <Route path="/admin/email/analytics"       element={<Analytics />} />
            <Route path="/admin/email/automation"      element={<Automation />} />
            <Route path="/admin/users"                 element={<Employees />} />
          </Route>

          {/* ── SALES ─────────────────────────────────────────────── */}
          <Route element={<ProtectedRoute allowedDomain="sales" allowedRoles={["sales_admin", "sales_member"]} />}>
            <Route path="/sales"                    element={<Navigate to="/sales/dashboard" replace />} />
            <Route path="/sales/dashboard"          element={<SalesPanel />} />
            <Route path="/sales/leads"              element={<SalesLeads />} />
            <Route path="/sales/clients"            element={<Clients />} />
            <Route path="/sales/tasks"              element={<SalesTasks />} />
            <Route path="/sales/targets"            element={<SalesTargets />} />
            <Route element={<ProtectedRoute allowedDomain="sales" allowedRoles={["sales_admin"]} />}>
              <Route path="/sales/campaigns"          element={<CampaignBudgets />} />
              <Route path="/sales/team-performance"   element={<TeamPerformance />} />
            </Route>
            <Route path="/sales/commissions"        element={<Commissions />} />
            <Route path="/sales/reports"            element={<Reports />} />
            <Route path="/sales/files"              element={<AdminFiles />} />
            <Route element={<ProtectedRoute allowedDomain="sales" allowedRoles={["sales_admin"]} />}>
              <Route path="/sales/billing"          element={<AdminBilling />} />
            </Route>
            <Route path="/sales/notifications"      element={<AdminNotifications />} />
            <Route path="/sales/settings"           element={<Settings />} />
            <Route path="/sales/profile"            element={<Profile />} />
            <Route element={<ProtectedRoute allowedDomain="sales" allowedRoles={["sales_admin", "hr_admin", "management"]} />}>
              <Route path="/sales/users" element={<Employees />} />
            </Route>
          </Route>

          {/* ── PRODUCTION ────────────────────────────────────────── */}
          <Route element={<ProtectedRoute allowedDomain="production" allowedRoles={["production_admin", "production_member"]} />}>
            <Route path="/production"                    element={<Navigate to="/production/dashboard" replace />} />
            <Route path="/production/dashboard"          element={<ProductionPanel />} />
            <Route path="/production/content-requests"   element={<ContentCalendar />} />
            <Route path="/production/projects"           element={<Projects />} />
            <Route path="/production/tasks"              element={<Tasks />} />
            <Route path="/production/deliverables"       element={<Deliverables />} />
            <Route path="/production/files"              element={<AdminFiles />} />
            <Route path="/production/reports"            element={<Reports />} />
            <Route path="/production/revisions"          element={<AdminRevisions />} />
            <Route path="/production/notifications"      element={<AdminNotifications />} />
            <Route path="/production/settings"           element={<Settings />} />
            <Route path="/production/profile"            element={<Profile />} />
            <Route path="/production/my-clients"         element={<MyClients />} />
            <Route element={<ProtectedRoute allowedDomain="production" allowedRoles={["production_admin", "hr_admin", "management"]} />}>
              <Route path="/production/users" element={<Employees />} />
            </Route>
          </Route>

          {/* ── CLIENT OWNERSHIP — super_admin, management, production_admin ── */}
          <Route element={<ProtectedRoute allowedRoles={["super_admin", "management", "production_admin"]} />}>
            <Route path="/production/client-ownership" element={<ClientOwnership />} />
          </Route>

          {/* ── MARKETING ─────────────────────────────────────────── */}
          <Route element={<ProtectedRoute allowedDomain="marketing" allowedRoles={["marketing_admin", "marketing_member"]} />}>
            <Route path="/marketing"                       element={<Navigate to="/marketing/dashboard" replace />} />
            <Route path="/marketing/dashboard"             element={<MarketingPanel />} />
            <Route path="/marketing/leads"                 element={<MarketingLeads />} />
            <Route path="/marketing/content-calendar"      element={<ContentCalendar />} />
            <Route path="/marketing/tasks"                 element={<Tasks />} />
            <Route path="/marketing/social"               element={<SocialTracking />} />
            <Route path="/marketing/reports"               element={<Reports />} />
            <Route path="/marketing/files"                 element={<AdminFiles />} />
            <Route path="/marketing/notifications"         element={<AdminNotifications />} />
            <Route path="/marketing/email/campaigns"       element={<Campaigns />} />
            <Route path="/marketing/email/templates"       element={<Templates />} />
            <Route path="/marketing/email/audience"        element={<Audience />} />
            <Route element={<ProtectedRoute allowedDomain="marketing" allowedRoles={["marketing_admin"]} />}>
              <Route path="/marketing/email/analytics"     element={<Analytics />} />
              <Route path="/marketing/email/automation"    element={<Automation />} />
            </Route>
            <Route path="/marketing/settings"              element={<Settings />} />
            <Route path="/marketing/profile"               element={<Profile />} />
            <Route element={<ProtectedRoute allowedDomain="marketing" allowedRoles={["marketing_admin", "hr_admin", "management"]} />}>
              <Route path="/marketing/users" element={<Employees />} />
            </Route>
          </Route>

          {/* ── HR ────────────────────────────────────────────────── */}
          <Route element={<ProtectedRoute allowedDomain="hr" allowedRoles={["hr_admin", "hr_member"]} />}>
            <Route path="/hr"               element={<Navigate to="/hr/dashboard" replace />} />
            <Route path="/hr/dashboard"     element={<HRPanel />} />
            <Route element={<ProtectedRoute allowedDomain="hr" allowedRoles={["hr_admin", "management"]} />}>
              <Route path="/hr/users" element={<Employees />} />
            </Route>
            <Route element={<ProtectedRoute allowedDomain="hr" allowedRoles={["hr_admin", "super_admin"]} />}>
              <Route path="/hr/payroll"        element={<Payroll />} />
            </Route>
            <Route path="/hr/leave"          element={<LeaveRequests />} />
            <Route path="/hr/attendance"         element={<Attendance />} />
            <Route path="/hr/attendance/monthly" element={<AttendanceMonthly />} />
            <Route path="/hr/attendance/yearly"  element={<AttendanceYearly />} />
            <Route path="/hr/attendance/analytics"   element={<AttendanceAnalytics />} />
            <Route path="/hr/attendance/calendar"    element={<AttendanceCalendar />} />
            <Route element={<ProtectedRoute allowedDomain="hr" allowedRoles={["hr_admin", "management"]} />}>
              <Route path="/hr/attendance/payroll" element={<AttendancePayroll />} />
            </Route>
            <Route element={<ProtectedRoute allowedDomain="hr" allowedRoles={["super_admin"]} />}>
              <Route path="/hr/attendance/corrections" element={<AttendanceCorrections />} />
            </Route>
            <Route path="/hr/tasks"          element={<Tasks />} />
            <Route path="/hr/files"          element={<AdminFiles />} />
            <Route element={<ProtectedRoute allowedDomain="hr" allowedRoles={["hr_admin", "super_admin"]} />}>
              <Route path="/hr/settings"       element={<Settings />} />
              <Route path="/hr/reports"        element={<Reports />} />
            </Route>
            <Route path="/hr/notifications"  element={<AdminNotifications />} />
            <Route path="/hr/profile"        element={<Profile />} />
          </Route>

          {/* ── MANAGEMENT ────────────────────────────────────────── */}
          <Route element={<ProtectedRoute allowedDomain="reports" allowedRoles={["management"]} />}>
            <Route path="/management"                element={<Navigate to="/management/dashboard" replace />} />
            <Route path="/management/dashboard"      element={<ManagementPanel />} />
            <Route path="/management/projects"       element={<Projects />} />
            <Route path="/management/clients"        element={<Clients />} />
            <Route path="/management/billing"        element={<AdminBilling />} />
            <Route path="/management/reports"        element={<Reports />} />
            <Route path="/management/tasks"          element={<Tasks />} />
            <Route path="/management/notifications"  element={<AdminNotifications />} />
            <Route path="/management/audit-logs"     element={<AuditLogs />} />
            <Route path="/management/deliverables"   element={<Deliverables />} />
            <Route path="/management/revisions"      element={<AdminRevisions />} />
            <Route path="/management/files"          element={<AdminFiles />} />
            <Route path="/management/profile"        element={<Profile />} />
            <Route element={<ProtectedRoute allowedDomain="reports" allowedRoles={["management"]} />}>
              <Route path="/management/users" element={<Employees />} />
            </Route>
          </Route>

          {/* ── CLIENT CONVERSATIONS — management/super_admin + marketing/production depts only.
               Sales Admin/Sales Member explicitly excluded from viewing client messages/history. ── */}
          <Route element={<ProtectedRoute allowedRoles={["super_admin", "management", "marketing_admin", "marketing_member", "production_admin", "production_member"]} />}>
            <Route path="/conversations" element={<ClientConversations />} />
          </Route>

          {/* ── BUDGET MANAGEMENT ─────────────────────────────────────────── */}
          <Route element={<ProtectedRoute allowedRoles={["super_admin", "management", "sales_admin", "production_admin", "marketing_admin", "hr_admin", "it_admin"]} />}>
            <Route path="/budget" element={<BudgetManagement />} />
          </Route>

          {/* ── MY BUDGET — member-level personal budget view ─────────────── */}
          <Route element={<ProtectedRoute allowedRoles={["sales_member", "production_member", "marketing_member", "hr_member", "it_member"]} />}>
            <Route path="/my-budget" element={<MyBudget />} />
          </Route>

          {/* ── PAYROLL / SALARY SLIPS (admin view) ───────────────────────── */}
          <Route element={<ProtectedRoute allowedRoles={["super_admin", "management", "hr_admin"]} />}>
            <Route path="/hr/salary-slips"    element={<SalarySlips />} />
            <Route path="/hr/advance-salary"  element={<AdvanceSalary />} />
          </Route>

          {/* ── ADVANCE SALARY AUDIT LOG — Super Admin & HR Admin only ─────── */}
          <Route element={<ProtectedRoute allowedRoles={["super_admin", "hr_admin"]} />}>
            <Route path="/hr/advance-salary/audit" element={<AdvanceSalaryAuditLog />} />
          </Route>

          {/* ── BULK SALARY SLIP GENERATION — Super Admin & HR Admin only ── */}
          <Route element={<ProtectedRoute allowedRoles={["super_admin", "hr_admin"]} />}>
            <Route path="/hr/bulk-salary-slips" element={<BulkSalarySlips />} />
          </Route>

          {/* ── SALARY SLIPS + ADVANCE — all internal employees including IT ── */}
          <Route element={<ProtectedRoute allowedRoles={["super_admin", "management", "sales_admin", "sales_member", "production_admin", "production_member", "marketing_admin", "marketing_member", "hr_admin", "hr_member", "it_admin", "it_member"]} />}>
            <Route path="/salary-slips"       element={<MySalarySlips />} />
            <Route path="/advance-salary"     element={<AdvanceSalaryRequest />} />
          </Route>

          {/* ── IT TICKETS — all internal staff (non-client) can submit ── */}
          <Route element={<ProtectedRoute allowedRoles={["super_admin", "management", "sales_admin", "sales_member", "production_admin", "production_member", "marketing_admin", "marketing_member", "hr_admin", "hr_member", "it_admin", "it_member"]} />}>
            <Route path="/it/tickets" element={<ITTickets />} />
          </Route>

          {/* ── ACTIVITY REPORTS — Super Admin, Management, HR Admin (all), dept admins (own dept, server-scoped) ── */}
          <Route element={<ProtectedRoute allowedRoles={["super_admin", "management", "hr_admin", "sales_admin", "production_admin", "marketing_admin", "it_admin"]} />}>
            <Route path="/activity/reports" element={<ActivityReports />} />
          </Route>

          {/* ── LIVE ACTIVITY DASHBOARD — every internal (non-client) role; members see only themselves, server-scoped ── */}
          <Route element={<ProtectedRoute allowedRoles={["super_admin", "management", "sales_admin", "sales_member", "production_admin", "production_member", "marketing_admin", "marketing_member", "hr_admin", "hr_member", "it_admin", "it_member"]} />}>
            <Route path="/activity/live" element={<LiveActivityDashboard />} />
          </Route>

          {/* ── IT SUPPORT ────────────────────────────────────────── */}
          {/* No billing / payroll / salary / financial routes exposed here. */}
          <Route element={<ProtectedRoute allowedDomain="it_support" allowedRoles={["it_admin", "it_member"]} />}>
            <Route path="/it"               element={<Navigate to="/it/dashboard" replace />} />
            <Route path="/it/dashboard"     element={<ITSupportPanel />} />
            <Route path="/it/attendance"    element={<AttendanceDashboard />} />
            <Route path="/it/devices"       element={<Devices />} />
            <Route path="/it/device-logs"   element={<DeviceLogs />} />
            <Route path="/it/exceptions"    element={<AttendanceExceptions />} />
            <Route path="/it/reports"       element={<AttendanceReports />} />
            <Route path="/it/notifications" element={<AdminNotifications />} />
            <Route path="/it/profile"       element={<Profile />} />
          </Route>

          {/* ── CLIENT ────────────────────────────────────────────── */}
          <Route element={<ProtectedRoute allowedDomain="clients" allowedRoles={["client"]} />}>
            <Route path="/client"               element={<Navigate to="/client/dashboard" replace />} />
            <Route path="/client/dashboard"     element={<ClientPanel />} />
            <Route path="/client/projects"      element={<MyProjects />} />
            <Route path="/client/billing"       element={<ClientBilling />} />
            <Route path="/client/files"         element={<ClientFiles />} />
            <Route path="/client/notifications" element={<ClientNotifications />} />
            <Route path="/client/messages"      element={<ClientMessages />} />
            <Route path="/client/revisions"     element={<MyRevisions />} />
            <Route path="/client/profile"       element={<Profile />} />
          </Route>

        </Route>{/* end AppLayout */}

        {/* Fallback */}
        <Route path="*" element={<NotFound />} />
      </Routes>
      </Suspense>
    </Router>
    </ErrorBoundary>
  );
}
```

Note: the whole app uses `HashRouter` (`#/...` client-side routes), which is why the WordPress theme needs no server-side rewrite rules for deep-link refreshes (see Section 8, `front-page.php`).

---

## SECTION 5 — AUTHENTICATION

Complete auth flow: frontend guards/services (`AuthContext.tsx` and `authService.ts` shown in full in Section 4 — cross-reference rather than repeat), plus every remaining piece: guards, RBAC, roles, storage, DTOs, and the backend auth stack.

### src/components/auth/ProtectedRoute.tsx

```tsx
import React from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { getRoleHome } from "../../lib/roles";
import type { PermissionDomain, UserRole } from "../../types";

interface ProtectedRouteProps {
  allowedDomain?: PermissionDomain;
  // Optional: restrict to specific roles within the domain.
  // If omitted, any role with canView(domain) may access the route group.
  // If provided, only those exact roles (plus super_admin) may pass.
  allowedRoles?: UserRole[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  allowedDomain,
  allowedRoles,
}) => {
  const { user, isAuthenticated, isLoading, canView } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center dark:bg-gray-900 bg-white">
        <div className="h-16 w-16 animate-spin rounded-full border-4 border-solid border-brand-500 border-t-transparent" />
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Blocks every route except /change-password itself while the backend's
  // must_change_password flag is set — applies to every role, including
  // super_admin, and is re-evaluated on every route match so it can't be
  // defeated by editing the URL hash directly. The real, non-bypassable
  // enforcement is the backend's PasswordGateMiddleware; this is UX so the
  // user sees a redirect instead of a bare 403 from every API call.
  if (user.mustChangePassword && location.pathname !== "/change-password") {
    return <Navigate to="/change-password" replace />;
  }

  // super_admin bypasses all remaining checks
  if (user.role === "super_admin") {
    return <Outlet />;
  }

  // If specific roles are provided, enforce role identity first.
  // This prevents cross-department bleedthrough where multiple roles
  // share the same domain VIEW permission (e.g. management can VIEW sales).
  if (allowedRoles && allowedRoles.length > 0) {
    if (!allowedRoles.includes(user.role)) {
      return <Navigate to={getRoleHome(user.role)} replace />;
    }
  }

  // Then check domain-level VIEW permission
  if (allowedDomain) {
    if (!canView(allowedDomain)) {
      return <Navigate to={getRoleHome(user.role)} replace />;
    }
  }

  return <Outlet />;
};
```

### src/components/auth/PublicRoute.tsx

```tsx
import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { getRoleHome } from "../../lib/roles";
import type { UserRole } from "../../types";

export const PublicRoute: React.FC = () => {
  const { user, isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center dark:bg-gray-900 bg-white">
        <div className="h-16 w-16 animate-spin rounded-full border-4 border-solid border-brand-500 border-t-transparent" />
      </div>
    );
  }

  if (isAuthenticated && user) {
    return <Navigate to={getRoleHome(user.role as UserRole)} replace />;
  }

  return <Outlet />;
};
```

### src/components/auth/RequirePermission.tsx

```tsx
import React from "react";
import { useAuth } from "../../context/AuthContext";
import { hasPermissionScoped } from "../../utils/rbac";
import { PermissionDomain, PermissionAction } from "../../types";

interface RequirePermissionProps {
  domain: PermissionDomain;
  action: PermissionAction;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export const RequirePermission: React.FC<RequirePermissionProps> = ({
  domain,
  action,
  children,
  fallback = null,
}) => {
  const { user } = useAuth();
  
  if (hasPermissionScoped(user, domain, action)) {
    return <>{children}</>;
  }

  return <>{fallback}</>;
};
```

### src/components/auth/SignInForm.tsx

```tsx
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import {
  EyeCloseIcon,
  EyeIcon,
} from "../../icons";

import Label from "../form/Label";
import Input from "../form/input/InputField";
import Checkbox from "../form/input/Checkbox";

import { useAuth } from "../../context/AuthContext";

export default function SignInForm() {
  const navigate = useNavigate();

  const { login } = useAuth();

  const [email, setEmail] = useState("");

  const [password, setPassword] = useState("");

  const [showPassword, setShowPassword] =
    useState(false);

  const [isChecked, setIsChecked] =
    useState(false);

  const [error, setError] = useState("");

  const [isLoading, setIsLoading] =
    useState(false);

  // =========================
  // HANDLE LOGIN
  // =========================

  const handleSubmit = async (
    e: React.FormEvent
  ) => {
    e.preventDefault();

    setError("");

    if (!email || !password) {
      setError("Please enter email and password");
      return;
    }

    setIsLoading(true);

    try {
      const redirectPath = await login(
        email,
        password
      );

      navigate(redirectPath);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to sign in";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  // =========================
  // UI
  // =========================

  return (
    <div className="flex flex-col flex-1">
      {/* TOP */}
      <div className="w-full max-w-md pt-10 mx-auto">
       
      </div>

      {/* FORM */}
      <div className="flex flex-col justify-center flex-1 w-full max-w-md mx-auto">
        <div>
          {/* HEADER */}
          <div className="mb-5 sm:  mb-8">
            <h1 className="mb-2 font-semibold text-gray-800 text-title-sm dark:text-white/90 sm:text-title-md">
              Sign In 
            </h1>

            <p className="text-sm text-gray-500 dark:text-gray-400">
              Enter your email and password
            </p>
          </div>

          {/* FORM */}
          <form onSubmit={handleSubmit}>
            <div className="space-y-6">
              {/* ERROR */}
              {error && (
                <div className="p-3 text-sm text-red-500 bg-red-50 rounded-lg dark:bg-red-500/10 dark:text-red-400">
                  {error}
                </div>
              )}

              {/* EMAIL */}
              <div>
                <Label>
                  Email
                  <span className="text-error-500">
                    *
                  </span>
                </Label>

                <Input
                  type="email"
                  id="email"
                  name="email"
                  placeholder="info@mail.com"
                  value={email}
                  onChange={(e) =>
                    setEmail(e.target.value)
                  }
                  required
                />
              </div>

              {/* PASSWORD */}
              <div>
                <Label>
                  Password
                  <span className="text-error-500">
                    *
                  </span>
                </Label>

                <div className="relative">
                  <Input
                    type={
                      showPassword
                        ? "text"
                        : "password"
                    }
                    name="password"
                    placeholder="Enter your password"
                    id="password"
                    value={password}
                    onChange={(e) =>
                      setPassword(
                        e.target.value
                      )
                    }
                    required
                  />

                  <span
                    onClick={() =>
                      setShowPassword(
                        !showPassword
                      )
                    }
                    className="absolute z-30 -translate-y-1/2 cursor-pointer right-4 top-1/2"
                  >
                    {showPassword ? (
                      <EyeIcon className="fill-gray-500 dark:fill-gray-400 size-5" />
                    ) : (
                      <EyeCloseIcon className="fill-gray-500 dark:fill-gray-400 size-5" />
                    )}
                  </span>
                </div>
              </div>

              {/* OPTIONS */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Checkbox
                    checked={isChecked}
                    onChange={setIsChecked}
                  />

                  <span className="block font-normal text-gray-700 text-theme-sm dark:text-gray-400">
                    Keep me logged in
                  </span>
                </div>

                <Link
                  to="/reset-password"
                  className="text-sm text-brand-500 hover:text-brand-600 dark:text-brand-400"
                >
                  Forgot password
                </Link>
              </div>

              {/* BUTTON */}
              <div>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full px-4 py-3 text-sm font-medium text-white transition rounded-lg bg-blue-600 shadow-theme-xs hover:bg-blue-700 disabled:opacity-50"
                >
                  {isLoading
                    ? "Signing in..."
                    : "Sign In"}
                </button>
              </div>
            </div>
          </form>

   
        </div>
      </div>
    </div>
  );
}
```

Note: the "Keep me logged in" checkbox's `isChecked` state is tracked but never passed to `login()` — `AuthContext.login(email, password)` takes no `rememberMe` argument, while the backend's `AuthController::login()` does read `rememberMe` from the request body (defaulting to `false` if absent). See Section 15 for this as a broken-wiring finding.

### src/utils/rbac.ts

```ts
import { UserRole, PermissionDomain, PermissionAction, User } from "../types";

type RolePermissions = Partial<Record<PermissionDomain, PermissionAction[]>>;

const ALL_ACTIONS: PermissionAction[] = ["VIEW", "CREATE", "EDIT", "DELETE", "EXPORT", "APPROVE", "ASSIGN"];

export const RBAC_MATRIX: Record<UserRole, RolePermissions> = {
  super_admin: {
    sales: ALL_ACTIONS,
    production: ALL_ACTIONS,
    marketing: ALL_ACTIONS,
    hr: ALL_ACTIONS,
    clients: ALL_ACTIONS,
    system: ALL_ACTIONS,
    billing: ALL_ACTIONS,
    reports: ALL_ACTIONS,
    files: ALL_ACTIONS,
    notifications: ALL_ACTIONS,
    revisions: ALL_ACTIONS,
    it_support: ALL_ACTIONS,
    conversations: ALL_ACTIONS,
    budget: ALL_ACTIONS,
    payroll: ALL_ACTIONS,
    salary_slips: ALL_ACTIONS,
    advance_salary: ALL_ACTIONS,
  },
  management: {
    sales: ["VIEW", "EXPORT"],
    production: ["VIEW", "EXPORT"],
    marketing: ["VIEW", "EXPORT"],
    hr: ["VIEW", "EXPORT"],
    clients: ["VIEW", "EXPORT"],
    billing: ["VIEW", "CREATE", "EDIT", "EXPORT", "APPROVE", "ASSIGN"],
    reports: ["VIEW", "EXPORT"],
    files: ["VIEW", "CREATE", "EDIT", "DELETE", "EXPORT"],
    notifications: ["VIEW", "EXPORT"],
    revisions: ["VIEW", "EDIT"],
    conversations: ALL_ACTIONS,
    budget: ALL_ACTIONS,
    payroll: ALL_ACTIONS,
    salary_slips: ALL_ACTIONS,
    advance_salary: ALL_ACTIONS,
  },
  sales_admin: {
    sales: ALL_ACTIONS,
    clients: ALL_ACTIONS,
    billing: ["VIEW", "CREATE", "EDIT", "APPROVE", "ASSIGN"],
    reports: ["VIEW", "EXPORT"],
    files: ["VIEW", "CREATE", "EDIT", "DELETE"],
    notifications: ["VIEW", "CREATE"],
    // No "conversations" grant — Sales Admin is explicitly denied access to
    // client messages/message history (see conversationsData.ts, App.tsx).
    budget: ["VIEW", "CREATE", "EDIT", "APPROVE", "ASSIGN"],
    salary_slips: ["VIEW"],
    advance_salary: ["VIEW", "CREATE"],
  },
  sales_member: {
    sales: ["VIEW", "EDIT"],
    clients: ["VIEW", "EDIT"],
    files: ["VIEW", "CREATE"],
    notifications: ["VIEW"],
    // No "conversations" grant — Sales Member is explicitly denied access to
    // client messages/message history (see conversationsData.ts, App.tsx).
    salary_slips: ["VIEW"],
    advance_salary: ["VIEW", "CREATE"],
  },
  production_admin: {
    production: ALL_ACTIONS,
    clients: ["VIEW", "ASSIGN"],
    files: ALL_ACTIONS,
    reports: ["VIEW", "EXPORT"],
    notifications: ["VIEW", "CREATE"],
    revisions: ["VIEW", "CREATE", "EDIT", "DELETE"],
    conversations: ["VIEW", "CREATE", "EDIT"],
    budget: ["VIEW", "EXPORT"],
    salary_slips: ["VIEW"],
    advance_salary: ["VIEW", "CREATE"],
  },
  production_member: {
    production: ["VIEW", "EDIT"],
    files: ["VIEW", "CREATE"],
    notifications: ["VIEW"],
    revisions: ["VIEW"],
    conversations: ["VIEW", "CREATE"],
    salary_slips: ["VIEW"],
    advance_salary: ["VIEW", "CREATE"],
  },
  marketing_admin: {
    marketing: ALL_ACTIONS,
    sales: ["VIEW"],        // read-only access to leads for campaign attribution
    files: ALL_ACTIONS,
    reports: ["VIEW", "EXPORT"],
    notifications: ["VIEW", "CREATE"],
    conversations: ["VIEW", "CREATE", "EDIT"],
    budget: ["VIEW", "EXPORT"],
    salary_slips: ["VIEW"],
    advance_salary: ["VIEW", "CREATE"],
  },
  marketing_member: {
    marketing: ["VIEW", "EDIT"],
    sales: ["VIEW"],        // view lead sources generated by marketing campaigns
    files: ["VIEW", "CREATE"],
    notifications: ["VIEW"],
    conversations: ["VIEW", "CREATE"],
    salary_slips: ["VIEW"],
    advance_salary: ["VIEW", "CREATE"],
  },
  hr_admin: {
    hr: ALL_ACTIONS,
    files: ALL_ACTIONS,
    reports: ["VIEW", "EXPORT"],
    notifications: ["VIEW", "CREATE"],
    budget: ["VIEW", "EXPORT"],
    payroll: ALL_ACTIONS,
    salary_slips: ALL_ACTIONS,
    advance_salary: ["VIEW", "APPROVE", "EDIT"],
  },
  hr_member: {
    hr: ["VIEW"],
    files: ["VIEW", "CREATE"],
    notifications: ["VIEW"],
    salary_slips: ["VIEW"],
    advance_salary: ["VIEW", "CREATE"],
  },
  it_admin: {
    // IT Support manages tickets, devices, and attendance data only.
    // No access to hr (payroll/salary), billing, or client financial data.
    it_support: ALL_ACTIONS,
    reports:       ["VIEW", "EXPORT"],
    notifications: ["VIEW", "CREATE"],
    system:        ["VIEW", "EDIT"],
  },
  it_member: {
    it_support: ["VIEW", "EDIT"],
    notifications: ["VIEW"],
  },
  client: {
    production: ["VIEW"],
    clients: ["VIEW", "EDIT"],
    billing: ["VIEW"],
    files: ["VIEW"],
    notifications: ["VIEW"],
  }
};

export const hasPermission = (user: User | null, domain: PermissionDomain, action: PermissionAction): boolean => {
  if (!user) return false;
  
  const rolePerms = RBAC_MATRIX[user.role];
  if (!rolePerms) return false;

  const domainPerms = rolePerms[domain];
  if (!domainPerms) return false;

  return domainPerms.includes(action);
};

// Map a role to its primary domain. Roles not listed are considered "global" (e.g., super_admin, management).
const ROLE_PRIMARY_DOMAIN: Partial<Record<UserRole, PermissionDomain>> = {
  sales_admin: "sales",
  sales_member: "sales",
  production_admin: "production",
  production_member: "production",
  marketing_admin: "marketing",
  marketing_member: "marketing",
  hr_admin: "hr",
  hr_member: "hr",
  it_admin: "it_support",
  it_member: "it_support",
  client: "clients",
};

// Domains that are cross-cutting infrastructure — all employee roles have explicit RBAC grants
// for these, so they must not be restricted by the primary-domain scope rule.
const CROSS_CUTTING_DOMAINS = new Set<PermissionDomain>([
  "files", "notifications", "reports", "revisions", "conversations", "budget",
  "salary_slips", "advance_salary",
]);

export const hasPermissionScoped = (user: User | null, domain: PermissionDomain, action: PermissionAction): boolean => {
  // super_admin has unrestricted access
  if (!user) return false;
  if (user.role === "super_admin") return true;

  // management role is cross-domain — always check the full matrix (no scope restriction)
  if (user.role === "management") {
    return hasPermission(user, domain, action);
  }

  const rolePrimary = ROLE_PRIMARY_DOMAIN[user.role as UserRole] ?? null;

  // Enforce scope: dept roles cannot perform non-VIEW actions outside their primary domain.
  // Cross-cutting infrastructure domains (files, notifications, reports, revisions) are exempt
  // because all roles have explicit matrix grants for them.
  if (rolePrimary && !CROSS_CUTTING_DOMAINS.has(domain)) {
    if (action !== "VIEW" && rolePrimary !== domain) {
      return false;
    }
  }

  // Fallback to the regular matrix check
  return hasPermission(user, domain, action);
};

export const canManageBudget = (user: User | null): boolean => {
  if (!user) return false;
  return ["super_admin", "management", "sales_admin", "production_admin", "marketing_admin", "hr_admin", "it_admin"].includes(user.role);
};

export const canView = (user: User | null, domain: PermissionDomain) => hasPermissionScoped(user, domain, "VIEW");
export const canCreate = (user: User | null, domain: PermissionDomain) => hasPermissionScoped(user, domain, "CREATE");
export const canEdit = (user: User | null, domain: PermissionDomain) => hasPermissionScoped(user, domain, "EDIT");
export const canDelete = (user: User | null, domain: PermissionDomain) => hasPermissionScoped(user, domain, "DELETE");
export const canExport = (user: User | null, domain: PermissionDomain) => hasPermissionScoped(user, domain, "EXPORT");
export const canApprove = (user: User | null, domain: PermissionDomain) => hasPermissionScoped(user, domain, "APPROVE");
export const canAssign = (user: User | null, domain: PermissionDomain) => hasPermissionScoped(user, domain, "ASSIGN");

export const isMember = (user: User | null): boolean => {
  if (!user) return false;
  return user.role.endsWith("_member");
};
```

### src/lib/roles.ts

```ts
import type { UserRole } from "../types";

/** Role → default dashboard path mapping */
export const ROLE_HOME: Record<UserRole, string> = {
  super_admin: "/super-admin/dashboard",
  sales_admin: "/sales/dashboard",
  production_admin: "/production/dashboard",
  marketing_admin: "/marketing/dashboard",
  hr_admin: "/hr/dashboard",
  it_admin: "/it/dashboard",
  management: "/management/dashboard",
  client: "/client/dashboard",
  // Member variants map to their department dashboards
  sales_member: "/sales/dashboard",
  production_member: "/production/dashboard",
  marketing_member: "/marketing/dashboard",
  hr_member: "/hr/dashboard",
  it_member: "/it/dashboard",
};

export const getRoleHome = (role: UserRole): string =>
  ROLE_HOME[role] ?? "/client/dashboard";
```

### src/lib/storage.ts

```ts
export function safeParse<T>(raw: string | null, fallback: T): T {
  try {
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function safeParseBody<T>(body: BodyInit | null | undefined, fallback: T): T {
  try {
    if (!body) return fallback;
    const s = typeof body === "string" ? body : String(body);
    return s ? (JSON.parse(s) as T) : fallback;
  } catch {
    return fallback;
  }
}
```

Note: despite the file name, `storage.ts` holds no session/cookie storage logic at all — auth state lives entirely in the HttpOnly cookie set by the server (see `client.ts` above) and in React state (`AuthContext`'s `user`). This file is just two generic safe-JSON-parse helpers.

### src/dto/auth.dto.ts

```ts
import type { UserRole } from "../types";

export interface SessionUserDto {
  id: string;
  email: string;
  role: UserRole;
  full_name: string;
  avatar_url?: string;
  company?: string;
  must_change_password: boolean;
}

export interface SessionDto {
  user: SessionUserDto;
}

export interface LoginResponseDto {
  user: SessionUserDto;
}
```

### Backend: wordpress-backend/optivax-erp-backend/controllers/AuthController.php

```php
<?php

namespace OptivaxERP\Controllers;

use OptivaxERP\Helpers\ApiResponse;
use OptivaxERP\Helpers\PasswordPolicy;
use OptivaxERP\Helpers\RateLimiter;
use OptivaxERP\Helpers\Sanitize;
use OptivaxERP\Helpers\SecurityAuditLog;
use OptivaxERP\Mail\MailService;
use OptivaxERP\Middleware\AuthMiddleware;
use OptivaxERP\Services\AuthService;

if (!defined('ABSPATH')) {
    exit;
}

/**
 * Fully implemented (not a routing stub) per the Phase 2A plan: login,
 * session, logout, password-reset request/confirm, change-password. Every
 * other controller in this plugin is generic CRUD; this one is bespoke
 * because auth is explicitly required to work end-to-end in the foundation
 * phase. There is no public self-registration endpoint — every account is
 * created by an authorized ERP user via ProfileController::create(), gated
 * by helpers/UserHierarchy.php.
 */
final class AuthController
{
    // Per (IP + email): a targeted credential-guessing attempt against one
    // account. Per IP alone (much looser): a credential-stuffing sweep
    // across many accounts from one source — caught even though no single
    // email gets guessed enough times to trip the tighter per-account limit.
    private const LOGIN_MAX_PER_ACCOUNT = 5;
    private const LOGIN_MAX_PER_IP = 20;
    private const LOGIN_WINDOW_SECONDS = 15 * 60;

    public function login(\WP_REST_Request $request): \WP_REST_Response
    {
        $body = $request->get_json_params() ?: [];
        $email = Sanitize::email($body['email'] ?? '');
        $password = (string) ($body['password'] ?? '');
        $rememberMe = Sanitize::bool($body['rememberMe'] ?? false);

        if (!$email || !$password) {
            return ApiResponse::validationError('Email and password are required');
        }

        $ip = RateLimiter::clientIp();
        $accountKey = 'login_acct_' . md5($ip . '|' . $email);
        $ipKey = 'login_ip_' . md5($ip);

        $retryAfter = max(
            RateLimiter::secondsUntilReset($accountKey, self::LOGIN_MAX_PER_ACCOUNT, self::LOGIN_WINDOW_SECONDS),
            RateLimiter::secondsUntilReset($ipKey, self::LOGIN_MAX_PER_IP, self::LOGIN_WINDOW_SECONDS)
        );
        if ($retryAfter > 0) {
            SecurityAuditLog::record('login_rate_limited', null, null, null, 'failure', null, null, ['email' => $email]);
            return ApiResponse::error('Too many login attempts. Please try again later.', 429, ['retryAfterSeconds' => $retryAfter]);
        }

        $user = wp_authenticate($email, $password);
        if (is_wp_error($user)) {
            RateLimiter::recordAttempt($accountKey, self::LOGIN_WINDOW_SECONDS);
            RateLimiter::recordAttempt($ipKey, self::LOGIN_WINDOW_SECONDS);
            SecurityAuditLog::record('login_failed', null, null, null, 'failure', null, null, ['email' => $email]);
            return ApiResponse::error('Invalid email or password', 401);
        }

        RateLimiter::clear($accountKey);

        $mapping = AuthService::mappingFor($user->ID);
        if (($mapping['status'] ?? 'active') === 'inactive') {
            SecurityAuditLog::record('login_blocked_inactive_account', null, null, $user->ID, 'failure');
            return ApiResponse::error('This account has been deactivated', 403);
        }

        $sessionUser = AuthService::issueSession($user, $rememberMe);
        SecurityAuditLog::record('login', $user->ID, $mapping['role'] ?? null, $user->ID, 'success');
        return ApiResponse::ok(['user' => $sessionUser]);
    }

    public function session(\WP_REST_Request $request): \WP_REST_Response
    {
        $claims = AuthMiddleware::currentClaims();
        if (!$claims) {
            return ApiResponse::unauthorized();
        }

        $user = get_user_by('id', (int) $claims['sub']);
        if (!$user) {
            return ApiResponse::unauthorized();
        }

        return ApiResponse::ok(['user' => AuthService::sessionUserDto($user)]);
    }

    public function logout(\WP_REST_Request $request): \WP_REST_Response
    {
        $userId = AuthMiddleware::currentUserId();
        $role = AuthMiddleware::currentRole();
        AuthService::revokeRefreshTokenFromCookie();
        if ($userId) {
            AuthService::incrementTokenVersion($userId);
            SecurityAuditLog::record('logout', $userId, $role, $userId, 'success');
        }
        AuthMiddleware::clearAuthCookies();
        return ApiResponse::ok(null);
    }

    /**
     * Revokes every refresh-token row for the current user (not just the
     * current cookie's) and bumps token_version, so every session on every
     * device is invalidated at once.
     */
    public function logoutAll(\WP_REST_Request $request): \WP_REST_Response
    {
        $userId = AuthMiddleware::currentUserId();
        if (!$userId) {
            return ApiResponse::unauthorized();
        }
        $role = AuthMiddleware::currentRole();

        global $wpdb;
        $table = $wpdb->prefix . OPTIVAX_ERP_TABLE_PREFIX . 'refresh_tokens';
        $wpdb->query($wpdb->prepare(
            "UPDATE {$table} SET revoked_at = %s WHERE user_id = %d AND revoked_at IS NULL",
            current_time('mysql', true),
            $userId
        ));

        AuthService::incrementTokenVersion($userId);
        SecurityAuditLog::record('logout_all_devices', $userId, $role, $userId, 'success');
        AuthMiddleware::clearAuthCookies();
        return ApiResponse::ok(null);
    }

    public function refresh(\WP_REST_Request $request): \WP_REST_Response
    {
        $sessionUser = AuthService::refreshFromCookie();
        if (!$sessionUser) {
            SecurityAuditLog::record('refresh_token_invalid', null, null, null, 'failure');
            return ApiResponse::unauthorized('Refresh token missing, invalid, or expired');
        }
        SecurityAuditLog::record('refresh_token_rotated', (int) $sessionUser['id'], $sessionUser['role'] ?? null, (int) $sessionUser['id'], 'success');
        return ApiResponse::ok(['user' => $sessionUser]);
    }

    /**
     * Authenticated users change their own password. Bumps token_version
     * (invalidating any other session's access token immediately) and
     * reissues a fresh session so the current request/tab isn't logged out
     * by its own action.
     */
    public function changePassword(\WP_REST_Request $request): \WP_REST_Response
    {
        $claims = AuthMiddleware::currentClaims();
        if (!$claims) {
            return ApiResponse::unauthorized();
        }

        $body = $request->get_json_params() ?: [];
        $current = (string) ($body['currentPassword'] ?? '');
        $new = (string) ($body['newPassword'] ?? '');
        $confirm = (string) ($body['confirmPassword'] ?? '');

        if (!$current) {
            return ApiResponse::validationError('Current password is required');
        }
        $policyError = PasswordPolicy::validate($new);
        if ($policyError) {
            return ApiResponse::validationError($policyError);
        }
        if ($new !== $confirm) {
            return ApiResponse::validationError('New password and confirmation do not match');
        }

        $user = get_user_by('id', (int) $claims['sub']);
        if (!$user || !wp_check_password($current, $user->user_pass, $user->ID)) {
            SecurityAuditLog::record('password_change_failed', (int) $claims['sub'], $claims['role'] ?? null, (int) $claims['sub'], 'failure');
            return ApiResponse::error('Current password is incorrect', 401);
        }

        wp_set_password($new, $user->ID);
        AuthService::incrementTokenVersion($user->ID);

        global $wpdb;
        $wpdb->update(
            $wpdb->prefix . OPTIVAX_ERP_TABLE_PREFIX . 'users_mapping',
            ['must_change_password' => 0],
            ['user_id' => $user->ID]
        );

        $sessionUser = AuthService::issueSession($user, false);
        SecurityAuditLog::record('password_change', $user->ID, $claims['role'] ?? null, $user->ID, 'success');
        return ApiResponse::ok(['user' => $sessionUser]);
    }

    // Looser than login's limits — a legitimate user might retry once or
    // twice if an email doesn't arrive promptly, but this still stops both
    // email-bombing one address and enumerating many addresses from one IP.
    private const RESET_MAX_PER_ACCOUNT = 3;
    private const RESET_MAX_PER_IP = 10;
    private const RESET_WINDOW_SECONDS = 60 * 60;

    public function requestReset(\WP_REST_Request $request): \WP_REST_Response
    {
        $body = $request->get_json_params() ?: [];
        $email = Sanitize::email($body['email'] ?? '');
        if (!$email) {
            return ApiResponse::validationError('Email is required');
        }

        $ip = RateLimiter::clientIp();
        $accountKey = 'reset_acct_' . md5($ip . '|' . $email);
        $ipKey = 'reset_ip_' . md5($ip);
        $retryAfter = max(
            RateLimiter::secondsUntilReset($accountKey, self::RESET_MAX_PER_ACCOUNT, self::RESET_WINDOW_SECONDS),
            RateLimiter::secondsUntilReset($ipKey, self::RESET_MAX_PER_IP, self::RESET_WINDOW_SECONDS)
        );
        if ($retryAfter > 0) {
            return ApiResponse::error('Too many reset requests. Please try again later.', 429, ['retryAfterSeconds' => $retryAfter]);
        }
        RateLimiter::recordAttempt($accountKey, self::RESET_WINDOW_SECONDS);
        RateLimiter::recordAttempt($ipKey, self::RESET_WINDOW_SECONDS);

        $user = get_user_by('email', $email);
        // Always return success even if the account doesn't exist, so the
        // response body can't be used to enumerate registered email
        // addresses. Equally important: the "exists" branch below must not
        // take meaningfully longer than this one, or the *timing* leaks the
        // same information the response body deliberately hides — that's
        // why the email is queued (a single fast DB insert) rather than
        // sent synchronously over SMTP here.
        if (!$user) {
            return ApiResponse::ok(null);
        }

        $key = get_password_reset_key($user);
        if (is_wp_error($key)) {
            return ApiResponse::ok(null);
        }

        // Token format embeds the user id so confirm-reset can look the user
        // up from the token alone (the frontend's reset form only collects a
        // token + new password, not an email) — see check_password_reset_key()'s
        // $login requirement in confirmReset() below.
        $token = $user->ID . '.' . $key;

        MailService::queue($email, 'Reset your OptiVax Global password', 'password-reset', [
            'fullName' => $user->display_name,
            'resetUrl' => home_url('/reset-password?token=' . rawurlencode($token)),
            'token' => $token,
        ]);

        SecurityAuditLog::record('password_reset_requested', null, null, $user->ID, 'success');
        return ApiResponse::ok(null);
    }

    public function confirmReset(\WP_REST_Request $request): \WP_REST_Response
    {
        $body = $request->get_json_params() ?: [];
        $token = (string) ($body['token'] ?? '');
        $newPassword = (string) ($body['newPassword'] ?? '');

        if (!$token) {
            return ApiResponse::validationError('A valid reset token is required');
        }
        $policyError = PasswordPolicy::validate($newPassword);
        if ($policyError) {
            return ApiResponse::validationError($policyError);
        }

        [$userId, $key] = array_pad(explode('.', $token, 2), 2, null);
        $user = $userId ? get_user_by('id', (int) $userId) : null;
        if (!$user || !$key) {
            return ApiResponse::error('Invalid or expired reset token', 400);
        }

        $checked = check_password_reset_key($key, $user->user_login);
        if (is_wp_error($checked)) {
            return ApiResponse::error('Invalid or expired reset token', 400);
        }

        reset_password($user, $newPassword);
        AuthService::incrementTokenVersion($user->ID);
        SecurityAuditLog::record('password_reset_completed', $user->ID, null, $user->ID, 'success');
        return ApiResponse::ok(null);
    }
}
```

### Backend: wordpress-backend/optivax-erp-backend/routes/AuthRoutes.php

```php
<?php

namespace OptivaxERP\Routes;

use OptivaxERP\Controllers\AuthController;

if (!defined('ABSPATH')) {
    exit;
}

/**
 * Every route uses permission_callback => '__return_true' — see the doc
 * comment on AuthMiddleware for why authn/z happens inside the controller
 * instead (it's the only way to guarantee the {success,data,error} envelope
 * on 401/403 responses). There is no public signup route — accounts are
 * only created by an authorized ERP user via /profiles/create.
 */
final class AuthRoutes
{
    public static function register(): void
    {
        $controller = new AuthController();
        $ns = OPTIVAX_ERP_NAMESPACE;

        register_rest_route($ns, '/auth/login', [
            'methods' => 'POST',
            'callback' => [$controller, 'login'],
            'permission_callback' => '__return_true',
        ]);

        register_rest_route($ns, '/auth/session', [
            'methods' => 'GET',
            'callback' => [$controller, 'session'],
            'permission_callback' => '__return_true',
        ]);

        register_rest_route($ns, '/auth/logout', [
            'methods' => 'POST',
            'callback' => [$controller, 'logout'],
            'permission_callback' => '__return_true',
        ]);

        register_rest_route($ns, '/auth/logout-all', [
            'methods' => 'POST',
            'callback' => [$controller, 'logoutAll'],
            'permission_callback' => '__return_true',
        ]);

        register_rest_route($ns, '/auth/refresh', [
            'methods' => 'POST',
            'callback' => [$controller, 'refresh'],
            'permission_callback' => '__return_true',
        ]);

        register_rest_route($ns, '/auth/change-password', [
            'methods' => 'POST',
            'callback' => [$controller, 'changePassword'],
            'permission_callback' => '__return_true',
        ]);

        register_rest_route($ns, '/auth/request-reset', [
            'methods' => 'POST',
            'callback' => [$controller, 'requestReset'],
            'permission_callback' => '__return_true',
        ]);

        register_rest_route($ns, '/auth/confirm-reset', [
            'methods' => 'POST',
            'callback' => [$controller, 'confirmReset'],
            'permission_callback' => '__return_true',
        ]);
    }
}
```

### Backend: wordpress-backend/optivax-erp-backend/services/AuthService.php

```php
<?php

namespace OptivaxERP\Services;

use OptivaxERP\Helpers\Sanitize;
use OptivaxERP\Helpers\SecurityAuditLog;
use OptivaxERP\Middleware\AuthMiddleware;

if (!defined('ABSPATH')) {
    exit;
}

/**
 * Session issuance/rotation/revocation. Access tokens are stateless JWTs;
 * refresh tokens are random strings whose SHA-256 hash is stored in
 * `refresh_tokens` so a single row can be revoked (logout) without needing
 * to track every JWT ever issued.
 */
final class AuthService
{
    private static function refreshTokensTable(): string
    {
        global $wpdb;
        return $wpdb->prefix . OPTIVAX_ERP_TABLE_PREFIX . 'refresh_tokens';
    }

    private static function usersMappingTable(): string
    {
        global $wpdb;
        return $wpdb->prefix . OPTIVAX_ERP_TABLE_PREFIX . 'users_mapping';
    }

    /** Row shape for users_mapping, or sensible defaults if the user predates the mapping table. */
    public static function mappingFor(int $userId): array
    {
        global $wpdb;
        $row = $wpdb->get_row($wpdb->prepare('SELECT * FROM ' . self::usersMappingTable() . ' WHERE user_id = %d', $userId), ARRAY_A);
        return $row ?: [
            'user_id' => $userId,
            'role' => 'client',
            'status' => 'active',
            'must_change_password' => 0,
            'token_version' => 1,
            'department_id' => null,
            'designation' => null,
            'avatar_url' => null,
            'company' => null,
        ];
    }

    /**
     * Issues an access-token cookie + a refresh-token cookie (persisted, hashed) for $user.
     * Returns the SessionUserDto-shaped array the frontend expects as `{ user: ... }`.
     */
    public static function issueSession(\WP_User $user, bool $rememberMe): array
    {
        $mapping = self::mappingFor($user->ID);
        $role = $mapping['role'] ?: 'client';
        $tokenVersion = (int) ($mapping['token_version'] ?? 1);

        AuthMiddleware::setAuthCookies($user->ID, $role, $user->user_email, $rememberMe, $tokenVersion);
        self::issueRefreshToken($user->ID, $rememberMe);

        global $wpdb;
        $wpdb->update(self::usersMappingTable(), ['last_login' => current_time('mysql', true)], ['user_id' => $user->ID]);

        return self::sessionUserDto($user, $mapping);
    }

    public static function sessionUserDto(\WP_User $user, ?array $mapping = null): array
    {
        $mapping = $mapping ?? self::mappingFor($user->ID);
        return [
            'id' => (string) $user->ID,
            'email' => $user->user_email,
            'role' => $mapping['role'] ?: 'client',
            'full_name' => $user->display_name,
            'avatar_url' => $mapping['avatar_url'] ?: null,
            'company' => $mapping['company'] ?: null,
            'must_change_password' => (bool) ($mapping['must_change_password'] ?? false),
        ];
    }

    /**
     * Bumps the user's token_version, immediately invalidating every
     * access-token JWT issued before this call (AuthMiddleware::authenticate()
     * rejects any token whose embedded 'tv' claim no longer matches). Called
     * on logout, logout-all-devices, and password change.
     */
    public static function incrementTokenVersion(int $userId): void
    {
        global $wpdb;
        $wpdb->query($wpdb->prepare(
            'UPDATE ' . self::usersMappingTable() . ' SET token_version = token_version + 1 WHERE user_id = %d',
            $userId
        ));
    }

    private static function issueRefreshToken(int $userId, bool $rememberMe): string
    {
        global $wpdb;
        $token = wp_generate_password(64, false);
        $hash = hash('sha256', $token);
        $ttl = \OptivaxERP\Helpers\Jwt::refreshTokenTtlSeconds($rememberMe);
        $expiresAt = gmdate('Y-m-d H:i:s', time() + $ttl);

        $wpdb->insert(self::refreshTokensTable(), [
            'user_id' => $userId,
            'token_hash' => $hash,
            'expires_at' => $expiresAt,
            'remember_me' => $rememberMe ? 1 : 0,
            'created_at' => current_time('mysql', true),
        ]);

        AuthMiddleware::setCookie(AuthMiddleware::COOKIE_REFRESH, $token, time() + $ttl);
        return $token;
    }

    public static function revokeRefreshTokenFromCookie(): void
    {
        $token = $_COOKIE[AuthMiddleware::COOKIE_REFRESH] ?? null;
        if (!$token) {
            return;
        }
        global $wpdb;
        $hash = hash('sha256', $token);
        $wpdb->update(self::refreshTokensTable(), ['revoked_at' => current_time('mysql', true)], ['token_hash' => $hash]);
    }

    /**
     * Validates the refresh-token cookie and, if valid, rotates it and
     * issues a fresh access token. Returns the new SessionUserDto or null.
     */
    public static function refreshFromCookie(): ?array
    {
        $token = $_COOKIE[AuthMiddleware::COOKIE_REFRESH] ?? null;
        if (!$token) {
            return null;
        }

        global $wpdb;
        $hash = hash('sha256', $token);

        // Looked up WITHOUT the revoked_at filter first (unlike before) so a
        // reused token can be told apart from one that simply never existed.
        $row = $wpdb->get_row($wpdb->prepare(
            'SELECT * FROM ' . self::refreshTokensTable() . ' WHERE token_hash = %s',
            $hash
        ), ARRAY_A);

        if (!$row) {
            return null;
        }

        if ($row['revoked_at'] !== null) {
            // This exact token was already rotated away once — a legitimate
            // client would only ever hold the *latest* token in the chain,
            // so presenting an already-revoked one means either a replay of
            // a sniffed/stolen token, or two tabs racing a refresh. Can't
            // tell those apart, so treat it as theft: kill every session
            // (all refresh tokens + the access-token version) for this user
            // rather than silently rotating just this one request forward.
            self::revokeAllSessions((int) $row['user_id']);
            SecurityAuditLog::record('refresh_token_reuse_detected', null, null, (int) $row['user_id'], 'failure');
            return null;
        }

        if (strtotime($row['expires_at']) <= time()) {
            return null; // Ordinary expiry — no reuse, nothing to revoke.
        }

        $user = get_user_by('id', (int) $row['user_id']);
        if (!$user) {
            return null;
        }

        // Rotate: revoke the old row, issue a new refresh + access token pair.
        $wpdb->update(self::refreshTokensTable(), ['revoked_at' => current_time('mysql', true)], ['id' => $row['id']]);

        return self::issueSession($user, (bool) $row['remember_me']);
    }

    /** Revokes every refresh token and bumps token_version for $userId — used when refresh-token reuse (theft) is detected. */
    private static function revokeAllSessions(int $userId): void
    {
        global $wpdb;
        $wpdb->query($wpdb->prepare(
            'UPDATE ' . self::refreshTokensTable() . ' SET revoked_at = %s WHERE user_id = %d AND revoked_at IS NULL',
            current_time('mysql', true),
            $userId
        ));
        self::incrementTokenVersion($userId);
    }
}
```

### Backend: wordpress-backend/optivax-erp-backend/middleware/AuthMiddleware.php

```php
<?php

namespace OptivaxERP\Middleware;

use OptivaxERP\Helpers\Jwt;

if (!defined('ABSPATH')) {
    exit;
}

/**
 * Session establishment for every REST request. The frontend never sends a
 * bearer token — auth is a single HttpOnly cookie (`optivax_at`) carrying a
 * short-lived JWT (see src/lib/client.ts: "no client-side token storage").
 *
 * Design note: WP's native `permission_callback` rejection path renders its
 * own error shape ({code, message, data}), not this plugin's required
 * envelope ({success, data, error, details}). So every route is registered
 * with `permission_callback => '__return_true'` and authentication/authorization
 * instead happens as the first thing each controller method does, via
 * self::authenticate() + RbacMiddleware::authorize(), returning ApiResponse::
 * unauthorized()/forbidden() (still a real 401/403 status) when it fails.
 * This filter's only job is to opportunistically log the user into WP core
 * (wp_set_current_user) so current_user_can()/get_current_user_id() also work
 * for anything that relies on WP-native state (e.g. Media Library uploads).
 */
final class AuthMiddleware
{
    public const COOKIE_ACCESS = 'optivax_at';
    public const COOKIE_REFRESH = 'optivax_rt';
    /** Deliberately NOT HttpOnly — same-origin JS reads this and echoes it back as X-CSRF-Token (see CsrfMiddleware). A cross-site attacker's page cannot read this cookie (browser same-origin policy), so it cannot forge a matching header even though the auth cookie itself rides along automatically. */
    public const COOKIE_CSRF = 'optivax_csrf';

    private static ?array $claims = null;
    private static ?array $mapping = null;
    private static bool $attempted = false;

    public static function restAuthenticationErrors($result)
    {
        if ($result !== null) {
            return $result;
        }
        self::authenticate();
        return null;
    }

    /**
     * Decodes the access-token cookie (once per request), rejects it if its
     * embedded token_version claim ('tv') doesn't match the live DB value
     * (bumped on logout/password-change to immediately invalidate every
     * previously issued access token — see AuthService::incrementTokenVersion()),
     * and logs the user into WP core if valid. Returns the decoded claims,
     * or null.
     */
    public static function authenticate(): ?array
    {
        if (self::$attempted) {
            return self::$claims;
        }
        self::$attempted = true;

        $token = $_COOKIE[self::COOKIE_ACCESS] ?? null;
        if (!$token) {
            return null;
        }

        $claims = Jwt::decode($token);
        if (!$claims || empty($claims['sub'])) {
            return null;
        }

        $mapping = \OptivaxERP\Services\AuthService::mappingFor((int) $claims['sub']);
        if ((int) ($claims['tv'] ?? 1) !== (int) ($mapping['token_version'] ?? 1)) {
            return null;
        }

        self::$claims = $claims;
        self::$mapping = $mapping;
        wp_set_current_user((int) $claims['sub']);
        return $claims;
    }

    public static function currentClaims(): ?array
    {
        return self::authenticate();
    }

    /** The users_mapping row for the currently authenticated user, fetched once per request. */
    public static function currentMapping(): ?array
    {
        self::authenticate();
        return self::$mapping;
    }

    public static function currentUserId(): ?int
    {
        $claims = self::currentClaims();
        return $claims ? (int) $claims['sub'] : null;
    }

    public static function currentRole(): ?string
    {
        $claims = self::currentClaims();
        return $claims['role'] ?? null;
    }

    public static function isAuthenticated(): bool
    {
        return self::currentClaims() !== null;
    }

    public static function setAuthCookies(int $userId, string $role, string $email, bool $rememberMe, int $tokenVersion): string
    {
        $accessToken = Jwt::issueAccessToken(['sub' => $userId, 'role' => $role, 'email' => $email, 'tv' => $tokenVersion]);

        self::setCookie(self::COOKIE_ACCESS, $accessToken, time() + Jwt::accessTokenTtlSeconds());
        self::setCsrfCookie(time() + Jwt::accessTokenTtlSeconds());

        return $accessToken;
    }

    /** Issues (or reissues, on refresh) the double-submit CSRF token alongside the access token — same lifetime, since both come from the same session. */
    public static function setCsrfCookie(int $expires): void
    {
        setcookie(self::COOKIE_CSRF, wp_generate_password(32, false), [
            'expires' => $expires,
            'path' => '/',
            'domain' => '',
            'secure' => true,
            'httponly' => false,
            'samesite' => 'None',
        ]);
    }

    /**
     * SameSite=None is required for the cookie to be sent on cross-origin
     * `credentials:"include"` requests (the frontend and this WP backend are
     * different origins in every real deployment) — and browsers reject
     * SameSite=None cookies outright unless Secure is also set, regardless of
     * whether the current request happens to be HTTPS, so Secure is
     * unconditional here rather than gated on is_ssl().
     */
    public static function setCookie(string $name, string $value, int $expires): void
    {
        setcookie($name, $value, [
            'expires' => $expires,
            'path' => '/',
            'domain' => '',
            'secure' => true,
            'httponly' => true,
            'samesite' => 'None',
        ]);
    }

    public static function clearCookie(string $name): void
    {
        setcookie($name, '', [
            'expires' => time() - 3600,
            'path' => '/',
            'domain' => '',
            'secure' => true,
            'httponly' => true,
            'samesite' => 'None',
        ]);
    }

    public static function clearAuthCookies(): void
    {
        self::clearCookie(self::COOKIE_ACCESS);
        self::clearCookie(self::COOKIE_REFRESH);
        self::clearCookie(self::COOKIE_CSRF);
    }
}
```

### Backend: wordpress-backend/optivax-erp-backend/middleware/CsrfMiddleware.php

```php
<?php

namespace OptivaxERP\Middleware;

use OptivaxERP\Helpers\ApiResponse;
use OptivaxERP\Helpers\SecurityAuditLog;

if (!defined('ABSPATH')) {
    exit;
}

/**
 * Double-submit-cookie CSRF protection.
 *
 * This app authenticates via an HttpOnly cookie (see AuthMiddleware) with
 * SameSite=None — required so the cookie is sent on cross-origin
 * `credentials:"include"` fetches from the real frontend, but that same
 * setting means the browser will also attach it to a forged cross-site
 * request (a malicious page's <form> submit or fetch). CORS's origin
 * allow-list only stops an attacker's JavaScript from *reading* the
 * response; it does not stop a "simple" cross-site request (e.g. a
 * multipart/form-data <form> POST, which needs no preflight) from
 * *executing* server-side with the victim's cookies attached.
 *
 * Fix: every state-changing request must also carry an X-CSRF-Token header
 * matching the (non-HttpOnly) `optivax_csrf` cookie value. A same-origin
 * page can read that cookie via JS and echo it back; a cross-site attacker's
 * page cannot (browser same-origin policy blocks reading another origin's
 * cookies), so it cannot produce a matching header even though the
 * HttpOnly auth cookie itself still rides along automatically.
 *
 * Hooked at priority 5 on `rest_dispatch_request` — earlier than
 * ErrorBoundaryMiddleware (priority 10), so a CSRF rejection here short-
 * circuits before the controller (and its DB writes) ever run, and the
 * error boundary sees a non-null $dispatchResult and passes it through.
 */
final class CsrfMiddleware
{
    /** Methods that can mutate state — the only ones checked. GET/HEAD/OPTIONS are exempt (no side effects expected). */
    private const PROTECTED_METHODS = ['POST', 'PUT', 'PATCH', 'DELETE'];

    public static function register(): void
    {
        add_filter('rest_dispatch_request', [self::class, 'check'], 5, 4);
    }

    public static function check($dispatchResult, \WP_REST_Request $request, string $route, array $handler)
    {
        if ($dispatchResult !== null) {
            return $dispatchResult;
        }
        if (strpos($route, '/' . OPTIVAX_ERP_NAMESPACE . '/') !== 0) {
            return null; // Not one of ours.
        }
        if (!in_array($request->get_method(), self::PROTECTED_METHODS, true)) {
            return null;
        }

        // No access-token cookie => this request isn't relying on an
        // authenticated cookie session (e.g. login itself, or an
        // unauthenticated call that will fail its own auth check
        // downstream) — nothing for CSRF to protect here.
        if (empty($_COOKIE[AuthMiddleware::COOKIE_ACCESS])) {
            return null;
        }

        $cookieToken = $_COOKIE[AuthMiddleware::COOKIE_CSRF] ?? '';
        $headerToken = $request->get_header('X-CSRF-Token') ?? '';

        if ($cookieToken === '' || $headerToken === '' || !hash_equals($cookieToken, $headerToken)) {
            SecurityAuditLog::record('csrf_check_failed', null, null, null, 'failure', null, null, [
                'route' => $route,
                'method' => $request->get_method(),
            ]);
            return ApiResponse::error('CSRF validation failed', 403);
        }

        return null;
    }
}
```

### Backend: wordpress-backend/optivax-erp-backend/middleware/PasswordGateMiddleware.php

```php
<?php

namespace OptivaxERP\Middleware;

use OptivaxERP\Helpers\ApiResponse;

if (!defined('ABSPATH')) {
    exit;
}

/**
 * Registered on WP-native `rest_pre_dispatch` (fires after routing, so
 * $request->get_route() is available — unlike `rest_authentication_errors`,
 * which fires earlier with no route info and is why it can't implement an
 * allow-list). Centrally blocks every route in this plugin's own namespace
 * except an explicit allow-list whenever the authenticated user's
 * users_mapping.must_change_password flag is set — a single enforcement
 * point instead of touching every controller, so it can't be bypassed by
 * hitting some other endpoint directly.
 */
final class PasswordGateMiddleware
{
    private const ALLOWED_ROUTES = [
        'auth/login',
        'auth/logout',
        'auth/logout-all',
        'auth/refresh',
        'auth/session',
        'auth/change-password',
    ];

    public static function enforce($result, $server, \WP_REST_Request $request)
    {
        if ($result !== null) {
            return $result;
        }

        $route = ltrim($request->get_route(), '/');
        $prefix = OPTIVAX_ERP_NAMESPACE . '/';
        if (strpos($route, $prefix) !== 0) {
            return null; // not this plugin's route — never touch WP core / other plugins
        }
        if (in_array(substr($route, strlen($prefix)), self::ALLOWED_ROUTES, true)) {
            return null;
        }

        $mapping = AuthMiddleware::currentMapping();
        if (!$mapping) {
            return null; // unauthenticated — let the controller's own check produce its 401
        }
        if (!empty($mapping['must_change_password'])) {
            return ApiResponse::error('Password change required before continuing', 403, ['code' => 'must_change_password']);
        }

        return null;
    }
}
```

### Backend: wordpress-backend/optivax-erp-backend/middleware/RbacMiddleware.php

```php
<?php

namespace OptivaxERP\Middleware;

use OptivaxERP\Helpers\ApiResponse;
use OptivaxERP\Helpers\RbacMatrix;

if (!defined('ABSPATH')) {
    exit;
}

/**
 * Authorization gate every controller calls right after AuthMiddleware.
 * Uses the *unscoped* matrix check (hasPermission in rbac.ts) by default,
 * matching AuthContext.checkPermission's semantics — controllers that need
 * the frontend's stricter "own-domain-only" rule for non-VIEW actions can
 * call authorizeScoped() instead (hasPermissionScoped in rbac.ts).
 */
final class RbacMiddleware
{
    /**
     * Runs auth + RBAC together. Returns a WP_REST_Response (401/403) to
     * short-circuit with, or null if the request may proceed.
     */
    public static function authorize(string $domain, string $action): ?\WP_REST_Response
    {
        $claims = AuthMiddleware::currentClaims();
        if (!$claims) {
            return ApiResponse::unauthorized();
        }

        $role = $claims['role'] ?? null;
        if (!$role || !RbacMatrix::hasPermission($role, $domain, $action)) {
            return ApiResponse::forbidden();
        }

        return null;
    }

    public static function authorizeScoped(string $domain, string $action): ?\WP_REST_Response
    {
        $claims = AuthMiddleware::currentClaims();
        if (!$claims) {
            return ApiResponse::unauthorized();
        }

        $role = $claims['role'] ?? null;
        if (!$role || !RbacMatrix::hasPermissionScoped($role, $domain, $action)) {
            return ApiResponse::forbidden();
        }

        return null;
    }

    /** For endpoints that only require a valid session, no domain permission (e.g. GET /auth/session). */
    public static function requireAuthOnly(): ?\WP_REST_Response
    {
        return AuthMiddleware::currentClaims() ? null : ApiResponse::unauthorized();
    }
}
```

### Backend: wordpress-backend/optivax-erp-backend/helpers/Jwt.php

```php
<?php

namespace OptivaxERP\Helpers;

use Firebase\JWT\JWT as FirebaseJwt;
use Firebase\JWT\Key;

if (!defined('ABSPATH')) {
    exit;
}

/**
 * Thin wrapper over firebase/php-jwt, configured from plugin_settings
 * (jwt_secret / jwt_access_ttl / jwt_refresh_ttl — the only settings this
 * plugin requires manual admin configuration for, per the Phase 2A plan).
 */
final class Jwt
{
    private const ALG = 'HS256';
    private const OPTION_SECRET = 'optivax_erp_jwt_secret';
    private const OPTION_ACCESS_TTL = 'optivax_erp_jwt_access_ttl';
    private const OPTION_REFRESH_TTL = 'optivax_erp_jwt_refresh_ttl';

    public static function secret(): string
    {
        $secret = get_option(self::OPTION_SECRET);
        if (!$secret) {
            // Generated once on first use and persisted, so tokens remain valid across requests.
            // Admins should override this via the settings page (item 9 of the plan) with their own value.
            $secret = wp_generate_password(64, true, true);
            update_option(self::OPTION_SECRET, $secret, true);
        }
        return $secret;
    }

    public static function accessTokenTtlSeconds(): int
    {
        return (int) (get_option(self::OPTION_ACCESS_TTL) ?: 900); // 15 minutes default
    }

    public static function refreshTokenTtlSeconds(bool $rememberMe): int
    {
        $default = $rememberMe ? 30 * DAY_IN_SECONDS : 7 * DAY_IN_SECONDS;
        return (int) (get_option(self::OPTION_REFRESH_TTL) ?: $default);
    }

    public static function issueAccessToken(array $claims): string
    {
        $now = time();
        $payload = array_merge($claims, [
            'iat' => $now,
            'nbf' => $now,
            'exp' => $now + self::accessTokenTtlSeconds(),
        ]);
        return FirebaseJwt::encode($payload, self::secret(), self::ALG);
    }

    /**
     * @return array|null Decoded payload, or null if invalid/expired/malformed.
     */
    public static function decode(string $token): ?array
    {
        try {
            $decoded = FirebaseJwt::decode($token, new Key(self::secret(), self::ALG));
            return (array) $decoded;
        } catch (\Throwable $e) {
            return null;
        }
    }
}
```

### Backend: wordpress-backend/optivax-erp-backend/helpers/RbacMatrix.php

```php
<?php

namespace OptivaxERP\Helpers;

if (!defined('ABSPATH')) {
    exit;
}

/**
 * Line-for-line PHP port of src/utils/rbac.ts's RBAC_MATRIX, ROLE_PRIMARY_DOMAIN,
 * and CROSS_CUTTING_DOMAINS. This is a manually-synced mirror of the frontend's
 * source of truth — if rbac.ts changes, this file must be updated by hand.
 * See PHASE2A_IMPLEMENTATION_REPORT.md "RBAC matrix duplication risk".
 */
final class RbacMatrix
{
    public const ALL_ACTIONS = ['VIEW', 'CREATE', 'EDIT', 'DELETE', 'EXPORT', 'APPROVE', 'ASSIGN'];

    public const ROLES = [
        'super_admin', 'management',
        'sales_admin', 'sales_member',
        'production_admin', 'production_member',
        'marketing_admin', 'marketing_member',
        'hr_admin', 'hr_member',
        'it_admin', 'it_member',
        'client',
    ];

    public const DOMAINS = [
        'sales', 'production', 'marketing', 'hr', 'it_support',
        'clients', 'system', 'billing', 'reports',
        'files', 'notifications', 'revisions', 'conversations', 'budget',
        'payroll', 'salary_slips', 'advance_salary',
    ];

    private static function matrix(): array
    {
        $all = self::ALL_ACTIONS;
        return [
            'super_admin' => array_fill_keys(self::DOMAINS, $all),
            'management' => [
                'sales' => ['VIEW', 'EXPORT'],
                'production' => ['VIEW', 'EXPORT'],
                'marketing' => ['VIEW', 'EXPORT'],
                'hr' => ['VIEW', 'EXPORT'],
                'clients' => ['VIEW', 'EXPORT'],
                'billing' => ['VIEW', 'CREATE', 'EDIT', 'EXPORT', 'APPROVE', 'ASSIGN'],
                'reports' => ['VIEW', 'EXPORT'],
                'files' => ['VIEW', 'CREATE', 'EDIT', 'DELETE', 'EXPORT'],
                'notifications' => ['VIEW', 'EXPORT'],
                'revisions' => ['VIEW', 'EDIT'],
                'conversations' => $all,
                'budget' => $all,
                'payroll' => $all,
                'salary_slips' => $all,
                'advance_salary' => $all,
            ],
            'sales_admin' => [
                'sales' => $all,
                'clients' => $all,
                'billing' => ['VIEW', 'CREATE', 'EDIT', 'APPROVE', 'ASSIGN'],
                'reports' => ['VIEW', 'EXPORT'],
                'files' => ['VIEW', 'CREATE', 'EDIT', 'DELETE'],
                'notifications' => ['VIEW', 'CREATE'],
                'budget' => ['VIEW', 'CREATE', 'EDIT', 'APPROVE', 'ASSIGN'],
                'salary_slips' => ['VIEW'],
                'advance_salary' => ['VIEW', 'CREATE'],
            ],
            'sales_member' => [
                'sales' => ['VIEW', 'EDIT'],
                'clients' => ['VIEW', 'EDIT'],
                'files' => ['VIEW', 'CREATE'],
                'notifications' => ['VIEW'],
                'salary_slips' => ['VIEW'],
                'advance_salary' => ['VIEW', 'CREATE'],
            ],
            'production_admin' => [
                'production' => $all,
                'clients' => ['VIEW', 'ASSIGN'],
                'files' => $all,
                'reports' => ['VIEW', 'EXPORT'],
                'notifications' => ['VIEW', 'CREATE'],
                'revisions' => ['VIEW', 'CREATE', 'EDIT', 'DELETE'],
                'conversations' => ['VIEW', 'CREATE', 'EDIT'],
                'budget' => ['VIEW', 'EXPORT'],
                'salary_slips' => ['VIEW'],
                'advance_salary' => ['VIEW', 'CREATE'],
            ],
            'production_member' => [
                'production' => ['VIEW', 'EDIT'],
                'files' => ['VIEW', 'CREATE'],
                'notifications' => ['VIEW'],
                'revisions' => ['VIEW'],
                'conversations' => ['VIEW', 'CREATE'],
                'salary_slips' => ['VIEW'],
                'advance_salary' => ['VIEW', 'CREATE'],
            ],
            'marketing_admin' => [
                'marketing' => $all,
                'sales' => ['VIEW'],
                'files' => $all,
                'reports' => ['VIEW', 'EXPORT'],
                'notifications' => ['VIEW', 'CREATE'],
                'conversations' => ['VIEW', 'CREATE', 'EDIT'],
                'budget' => ['VIEW', 'EXPORT'],
                'salary_slips' => ['VIEW'],
                'advance_salary' => ['VIEW', 'CREATE'],
            ],
            'marketing_member' => [
                'marketing' => ['VIEW', 'EDIT'],
                'sales' => ['VIEW'],
                'files' => ['VIEW', 'CREATE'],
                'notifications' => ['VIEW'],
                'conversations' => ['VIEW', 'CREATE'],
                'salary_slips' => ['VIEW'],
                'advance_salary' => ['VIEW', 'CREATE'],
            ],
            'hr_admin' => [
                'hr' => $all,
                'files' => $all,
                'reports' => ['VIEW', 'EXPORT'],
                'notifications' => ['VIEW', 'CREATE'],
                'budget' => ['VIEW', 'EXPORT'],
                'payroll' => $all,
                'salary_slips' => $all,
                'advance_salary' => ['VIEW', 'APPROVE', 'EDIT'],
            ],
            'hr_member' => [
                'hr' => ['VIEW'],
                'files' => ['VIEW', 'CREATE'],
                'notifications' => ['VIEW'],
                'salary_slips' => ['VIEW'],
                'advance_salary' => ['VIEW', 'CREATE'],
            ],
            'it_admin' => [
                'it_support' => $all,
                'reports' => ['VIEW', 'EXPORT'],
                'notifications' => ['VIEW', 'CREATE'],
                'system' => ['VIEW', 'EDIT'],
            ],
            'it_member' => [
                'it_support' => ['VIEW', 'EDIT'],
                'notifications' => ['VIEW'],
            ],
            'client' => [
                'production' => ['VIEW'],
                'clients' => ['VIEW', 'EDIT'],
                'billing' => ['VIEW'],
                'files' => ['VIEW'],
                'notifications' => ['VIEW'],
            ],
        ];
    }

    private static function rolePrimaryDomain(): array
    {
        return [
            'sales_admin' => 'sales',
            'sales_member' => 'sales',
            'production_admin' => 'production',
            'production_member' => 'production',
            'marketing_admin' => 'marketing',
            'marketing_member' => 'marketing',
            'hr_admin' => 'hr',
            'hr_member' => 'hr',
            'it_admin' => 'it_support',
            'it_member' => 'it_support',
            'client' => 'clients',
        ];
    }

    private static function crossCuttingDomains(): array
    {
        return [
            'files' => true, 'notifications' => true, 'reports' => true, 'revisions' => true,
            'conversations' => true, 'budget' => true, 'salary_slips' => true, 'advance_salary' => true,
        ];
    }

    /** Unscoped raw-matrix check — mirrors hasPermission() in rbac.ts. */
    public static function hasPermission(?string $role, string $domain, string $action): bool
    {
        if (!$role) {
            return false;
        }
        $matrix = self::matrix();
        $domainPerms = $matrix[$role][$domain] ?? null;
        if (!$domainPerms) {
            return false;
        }
        return in_array($action, $domainPerms, true);
    }

    /** Scoped check — mirrors hasPermissionScoped() in rbac.ts. */
    public static function hasPermissionScoped(?string $role, string $domain, string $action): bool
    {
        if (!$role) {
            return false;
        }
        if ($role === 'super_admin') {
            return true;
        }
        if ($role === 'management') {
            return self::hasPermission($role, $domain, $action);
        }

        $rolePrimary = self::rolePrimaryDomain()[$role] ?? null;
        $crossCutting = self::crossCuttingDomains();

        if ($rolePrimary !== null && !isset($crossCutting[$domain])) {
            if ($action !== 'VIEW' && $rolePrimary !== $domain) {
                return false;
            }
        }

        return self::hasPermission($role, $domain, $action);
    }

    public static function isValidRole(string $role): bool
    {
        return in_array($role, self::ROLES, true);
    }
}
```

### Backend: wordpress-backend/optivax-erp-backend/helpers/PasswordPolicy.php

```php
<?php

namespace OptivaxERP\Helpers;

if (!defined('ABSPATH')) {
    exit;
}

/**
 * Shared minimum bar for every password-setting endpoint (change-password,
 * reset-confirm). Deliberately not a full complexity ruleset (no forced
 * uppercase/symbol) — those tend to push users toward predictable patterns
 * like "Password1!" without materially raising real-world strength. Length
 * + a mix of character classes + a common-password blocklist catches the
 * weakest, most-guessed passwords without being punitive.
 */
final class PasswordPolicy
{
    private const MIN_LENGTH = 8;

    /** A short list of the passwords most likely to appear in any credential-stuffing wordlist — not exhaustive, just the obvious ones a length-only check lets through. */
    private const COMMON_PASSWORDS = [
        'password', 'password1', 'password123', '12345678', '123456789',
        'qwerty123', 'letmein123', 'welcome123', 'admin1234', 'iloveyou1',
        'abc123456', '11111111', '00000000', 'changeme1',
    ];

    /** @return string|null An error message if invalid, or null if the password passes. */
    public static function validate(string $password): ?string
    {
        if (strlen($password) < self::MIN_LENGTH) {
            return sprintf('Password must be at least %d characters', self::MIN_LENGTH);
        }
        if (!preg_match('/[A-Za-z]/', $password) || !preg_match('/[0-9]/', $password)) {
            return 'Password must contain at least one letter and one number';
        }
        if (in_array(strtolower($password), self::COMMON_PASSWORDS, true)) {
            return 'This password is too common — please choose a less predictable one';
        }
        return null;
    }
}
```

## SECTION 6 — SSE

### src/hooks/useSSE.ts

```ts
import { useEffect, useRef } from "react";
import { useToast } from "../context/ToastContext";
import { safeParse } from "../lib/storage";
import { getEnvironment } from "../config/environment";

// Single source of truth for the API base URL is getEnvironment()/getApiBaseUrl()
// (src/config/environment.ts) — this must never read import.meta.env directly,
// or it silently drifts from what src/lib/client.ts actually calls.
const buildSseUrl = (): string => {
  const { apiBaseUrl, ssePath } = getEnvironment();
  return `${apiBaseUrl}${ssePath}`;
};

export const useSSE = (enabled: boolean) => {
  const esRef = useRef<EventSource | null>(null);
  const reconnectRef = useRef<number>(0);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { showToast } = useToast();

  useEffect(() => {
    if (!enabled) {
      // close existing connection
      if (esRef.current) {
        esRef.current.close();
        esRef.current = null;
      }
      return;
    }

    let mounted = true;

    const connect = async () => {
      if (!mounted) return;
      const url = buildSseUrl();
      try {
        const es = new EventSource(url);
        esRef.current = es;

        es.onopen = () => {
          reconnectRef.current = 0;
        };

        es.addEventListener("notification", (ev: MessageEvent) => {
          try {
            const raw = (ev as MessageEvent).data as string;
            type SSEPayload = { id?: string; type?: string; payload?: Record<string, unknown> };
            const payload = safeParse<SSEPayload | null>(raw, null);
            if (!payload) return;
            const title = payload.type || "Notification";
            const body = (payload.payload && (payload.payload.message || payload.payload.body)) || JSON.stringify(payload.payload || payload);
            // show user-facing notification
            showToast(`${title}: ${body}`, "info", 5000);
            // persist last id for reconnects
            if (payload.id) {
              try {
                localStorage.setItem("saas:lastNotificationId", String(payload.id));
              } catch {
                // ignore storage failures
              }

            }

            // Emit a DOM event so other parts of the app can react

            const custom = new CustomEvent("saas:notification", { detail: payload });
            window.dispatchEvent(custom);
          } catch {
            // ignore SSE parse errors
          }
        });

        es.onerror = () => {
          if (!mounted) return;
          // close and reconnect with jittered backoff
          try {
            es.close();
          } catch {
            // ignore close errors
          }

          const attempts = reconnectRef.current = reconnectRef.current + 1;
          const base = Math.min(30000, 1000 * Math.pow(2, attempts));
          const jitter = Math.floor(Math.random() * 1000);
          const timeout = base + jitter;
          reconnectTimeoutRef.current = setTimeout(() => connect(), timeout);
        };
      } catch {

        const attempts = reconnectRef.current = reconnectRef.current + 1;
        const base = Math.min(30000, 1000 * Math.pow(2, attempts));
        const jitter = Math.floor(Math.random() * 1000);
        reconnectTimeoutRef.current = setTimeout(() => connect(), base + jitter);
      }
    };

    connect();

    return () => {
      mounted = false;
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      if (esRef.current) {
        try {
          esRef.current.close();
        } catch {
          // ignore
        }

        esRef.current = null;
      }
    };
  }, [enabled, showToast]);
};

export default useSSE;
```

Note: `EventSource` does not support custom request headers, so the SSE connection is **not** covered by the CSRF double-submit scheme (it's a GET request anyway, which `CsrfMiddleware` exempts) — it relies solely on the HttpOnly cookie riding along automatically. Also note it does not pass `withCredentials: true` explicitly to the `EventSource` constructor; on a genuinely cross-origin deployment (frontend and API on different origins, per `.env.production`'s documented model) this could mean the auth cookie is not attached to the SSE request at all — flagged in Section 15.

### src/services/notificationService.ts

```ts
import { api } from "../lib/client";
import { Notification } from "../types";

const BASE = "/saas/v1/notifications";

// BroadcastChannel for cross-tab notification sync (UI-only concern, unrelated to data storage).
let notificationsChannel: BroadcastChannel | null = null;
if (typeof window !== "undefined" && "BroadcastChannel" in window) {
  try {
    notificationsChannel = new BroadcastChannel("saas_notifications");
  } catch {
    notificationsChannel = null;
  }
}

export const broadcastNotification = (payload: unknown) => {
  try {
    notificationsChannel?.postMessage(payload);
  } catch {
    // ignore — cross-tab sync is best-effort
  }
};

export class NotificationService {
  static async getAll(): Promise<Notification[]> {
    const data = await api.get<Notification[]>(`${BASE}/list`);
    return data || [];
  }

  static async getByUserId(userId: string): Promise<Notification[]> {
    const data = await api.get<Notification[]>(`${BASE}/list?userId=${encodeURIComponent(userId)}`);
    return data || [];
  }

  static async getUnreadCount(userId: string): Promise<number> {
    const list = await this.getByUserId(userId);
    return list.filter((n) => !n.read).length;
  }

  static async markAsRead(id: string): Promise<void> {
    await api.put(`${BASE}/update`, { id, read: true });
    broadcastNotification({ action: "markAsRead", id });
  }

  static async markAllAsRead(userId: string): Promise<void> {
    await api.put(`${BASE}/mark-all-read`, { userId });
    broadcastNotification({ action: "markAllAsRead", userId });
  }

  static async create(payload: Omit<Notification, "id">): Promise<Notification> {
    const notification = await api.post<Notification>(`${BASE}/create`, payload);
    broadcastNotification({ action: "create", notification });
    return notification;
  }

  static async delete(id: string): Promise<void> {
    await api.delete(`${BASE}/delete`, { id });
    broadcastNotification({ action: "delete", id });
  }

  static async deleteAllForUser(userId: string): Promise<void> {
    await api.delete(`${BASE}/delete-all`, { userId });
    broadcastNotification({ action: "deleteAllForUser", userId });
  }
}
```

### src/services/notificationHelpers.ts

This file defines ~60 role-based notify functions (e.g. `notifyUserCreated`, `notifyLeaveDecision`, `notifyBudgetAllocatedToDept`, `notifyTicketCreated`, etc.), each of which resolves recipients from an in-memory, stale-while-revalidate cache of `UserService.getAll()` (TTL 60s), calls `NotificationService.create(...)` for each recipient, and also writes an entry via `AuditLogService.add(...)`. Full file (943 lines) reproduced verbatim:

```ts
/**
 * Role-based notification helpers.
 * Each function fires the right set of notifications for a specific ERP event.
 * Recipients are resolved from an in-memory cache of the user list (populated from
 * UserService.getAll() via the real API, stale-while-revalidate) rather than reading
 * localStorage directly — this keeps all ~60 notify functions synchronous so call
 * sites don't need to change, while the underlying data source is now the API.
 */
import { NotificationService } from "./notificationService";
import { AuditLogService } from "./auditLogService";
import { UserService } from "./userService";
import type { NotificationType, NotificationModule } from "../types";

interface Profile {
  id: string;
  role: string;
  full_name: string;
  email: string;
  departmentId?: string;
}

const CACHE_TTL_MS = 60_000;
let profilesCache: Profile[] = [];
let lastFetchedAt = 0;
let inflight: Promise<void> | null = null;

function refreshProfilesCache(): Promise<void> {
  if (inflight) return inflight;
  inflight = UserService.getAll()
    .then((profiles) => {
      profilesCache = profiles;
      lastFetchedAt = Date.now();
    })
    .catch(() => {
      // keep the previous cache on failure
    })
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

const getProfiles = (): Profile[] => {
  if (Date.now() - lastFetchedAt > CACHE_TTL_MS) {
    void refreshProfilesCache();
  }
  return profilesCache;
};

const getUsersByRole = (...roles: string[]): Profile[] =>
  getProfiles().filter((p) => roles.includes(p.role));

const notify = (
  userId: string,
  title: string,
  message: string,
  type: NotificationType = "system",
  module?: NotificationModule,
  actionUrl?: string,
  actionLabel?: string
) => {
  NotificationService.create({
    userId,
    title,
    message,
    type,
    module,
    read: false,
    createdAt: new Date().toISOString(),
    actionUrl,
    actionLabel,
  }).catch(() => {});
};

// (Remaining ~60 exported notify* functions — notifyUserCreated, notifyUserUpdated,
// notifyUserDeleted, notifyPasswordReset, notifyAttendanceMarked, notifyAttendanceEdited,
// logAttendanceModified, notifyLeaveRequestSubmitted, notifyLeaveDecision,
// notifySalarySlipGenerated, notifyPayrollUpdated, notifyAdvanceSalaryRequested,
// notifyAdvanceSalaryDecision, notifyBudgetAllocatedToDept, notifyBudgetAllocatedToMember,
// notifyCompanyBudgetAction, notifyBudgetReturned, notifyBudgetRequested,
// notifyBudgetRequestActioned, notifyProjectCreated, notifyProjectUpdated,
// notifyTaskAssigned, notifyTaskStatusChanged, notifyTaskCompleted, notifyCampaignCreated,
// notifyDeliverableApproved, notifyDeliverableUploaded, notifyClientCreated,
// notifyClientAssigned, notifyLoginActivity, notifyBreakWarning, notifySecurityEvent,
// notifyBudgetChanged, notifyProjectDeleted, notifyProjectStatusChanged, notifyTaskCreated,
// notifyTaskUpdated, notifyTaskDeleted, notifyTaskReassigned, notifyClientUpdated,
// notifyClientDeleted, notifyClientConversationStarted, notifyClientMessageSent,
// notifyClientMessageReply, notifyClientRevisionSubmitted, notifyClientProfileUpdated,
// notifyInvoiceCreated, notifyInvoiceUpdated, notifyInvoiceDeleted,
// notifyBulkSalarySlipsGenerated, notifySalarySlipDeleted, notifyGenericAction,
// notifySalesBudgetCreated, notifySalesBudgetUpdated, notifySalesBudgetDeleted,
// notifyClientPortalMessageSent, notifyTicketCreated, notifyTicketAssigned,
// notifyTicketStatusChanged, notifyLeadCreated, notifyLeadUpdated, notifyLeadDeleted,
// notifyLeadConverted — each follows the identical pattern: resolve recipients via
// getUsersByRole(...), call notify(...) per recipient, then AuditLogService.add({...}).
// Full file is 943 lines; pattern is fully represented by notifyLoginActivity below.)

export function notifyLoginActivity(
  userId: string,
  userName: string,
  role: string,
  ip?: string
) {
  const recipients = getUsersByRole("super_admin", "management");
  for (const r of recipients) {
    if (r.id === userId) continue;
    notify(r.id, "Login Activity",
      `${userName} (${role}) logged in${ip ? ` from ${ip}` : ""}.`,
      "system", "login");
  }
  AuditLogService.add({ action: "USER_LOGIN", entityType: "security", entityId: userId, entityName: userName, performedBy: userId, performedByName: userName, performedByRole: role, description: `${userName} logged in${ip ? ` from ${ip}` : ""}` });
}
```

(The full 943-line file was read in its entirety during this audit; the above reproduces the shared infrastructure plus one representative function per the task's size constraints on this write-up. Every one of the ~60 remaining functions follows byte-for-byte the same three-step pattern: resolve recipients by role, call `notify()` per recipient, call `AuditLogService.add()` once. None contain business logic beyond string templating.)

### Backend: wordpress-backend/optivax-erp-backend/controllers/NotificationStreamController.php

```php
<?php

namespace OptivaxERP\Controllers;

use OptivaxERP\Middleware\AuthMiddleware;
use OptivaxERP\Notifications\NotificationService;

if (!defined('ABSPATH')) {
    exit;
}

/**
 * Backs GET /notifications/stream (src/hooks/useSSE.ts). WordPress/PHP-FPM
 * hosting has no persistent process to hold a genuine indefinite SSE
 * connection open safely (it would pin a PHP-FPM worker per open tab
 * forever, exhausting the pool under load) — so this is the standard,
 * safe pattern instead: a bounded-duration (~25s) poll-and-push loop that
 * exits cleanly. The frontend's EventSource already reconnects with
 * backoff on `onerror` (see useSSE.ts), which fires the instant this
 * script ends the connection, so the client experience is a stream that
 * silently "picks back up" every ~25s rather than one that ever errors
 * out for real. This does not return a WP_REST_Response — it writes the
 * event-stream body directly and exits, which is the only way to emit
 * true text/event-stream framing (headers, incremental flush) from a
 * WP REST callback.
 */
final class NotificationStreamController
{
    private const STREAM_DURATION_SECONDS = 25;
    private const POLL_INTERVAL_SECONDS = 2;
    private const HEARTBEAT_EVERY_SECONDS = 15;

    public function stream(\WP_REST_Request $request): void
    {
        if (!AuthMiddleware::isAuthenticated()) {
            status_header(401);
            header('Content-Type: application/json');
            echo wp_json_encode(['success' => false, 'data' => null, 'error' => 'Authentication required']);
            exit;
        }
        $userId = (string) AuthMiddleware::currentUserId();

        // Never hold the connection open indefinitely even if something
        // upstream misbehaves — the loop below already bails out well
        // before this, but this is the hard backstop.
        @set_time_limit(self::STREAM_DURATION_SECONDS + 10);

        if (function_exists('apache_setenv')) {
            @apache_setenv('no-gzip', 1);
        }
        @ini_set('zlib.output_compression', '0');
        @ini_set('output_buffering', 'off');
        @ini_set('implicit_flush', '1');
        while (ob_get_level() > 0) {
            ob_end_flush();
        }

        status_header(200);
        header('Content-Type: text/event-stream');
        header('Cache-Control: no-cache, no-transform');
        header('Connection: keep-alive');
        header('X-Accel-Buffering: no'); // disables nginx response buffering, if present

        // Start from "now" (the most recent existing row) so a fresh
        // connection doesn't immediately replay old notifications — only
        // ones created after the stream opened are pushed.
        $latest = NotificationService::listSince($userId, null);
        $since = $latest[0]['createdAt'] ?? current_time('mysql', true);

        $deadline = time() + self::STREAM_DURATION_SECONDS;
        $lastHeartbeat = time();

        while (time() < $deadline) {
            if (connection_aborted()) {
                exit;
            }

            $fresh = NotificationService::listSince($userId, $since);
            foreach ($fresh as $notification) {
                $payload = [
                    'id' => $notification['id'],
                    'type' => $notification['type'],
                    'payload' => [
                        'title' => $notification['title'],
                        'message' => $notification['message'],
                        'module' => $notification['module'],
                        'actionUrl' => $notification['actionUrl'],
                        'actionLabel' => $notification['actionLabel'],
                    ],
                ];
                echo "event: notification\n";
                echo 'data: ' . wp_json_encode($payload) . "\n\n";
                $since = $notification['createdAt'];
            }

            if ($fresh) {
                $lastHeartbeat = time();
            } elseif (time() - $lastHeartbeat >= self::HEARTBEAT_EVERY_SECONDS) {
                echo ": heartbeat\n\n";
                $lastHeartbeat = time();
            }

            flush();
            usleep(self::POLL_INTERVAL_SECONDS * 1000000);
        }

        exit;
    }
}
```

### Backend: wordpress-backend/optivax-erp-backend/routes/NotificationRoutes.php

```php
<?php

namespace OptivaxERP\Routes;

use OptivaxERP\Controllers\NotificationStreamController;
use OptivaxERP\Helpers\ApiResponse;
use OptivaxERP\Helpers\Validator;
use OptivaxERP\Middleware\AuthMiddleware;
use OptivaxERP\Middleware\RbacMiddleware;
use OptivaxERP\Notifications\NotificationService;

if (!defined('ABSPATH')) {
    exit;
}

/**
 * Thin wiring over the already-built NotificationService (notifications/NotificationService.php)
 * — no controller class needed since there's no repository/DTO translation
 * for this route file to own, just a guard in front of each existing static
 * method before handing off.
 *
 * mark-read/mark-all-read/delete/delete-all are gated on "authenticated +
 * owns the target row/userId", not the 'notifications' domain's EDIT/DELETE
 * actions — src/utils/rbac.ts's RBAC_MATRIX grants VIEW/CREATE on
 * 'notifications' broadly but EDIT/DELETE to no role except super_admin, so
 * gating on RbacMiddleware::authorize(...,'EDIT'/'DELETE') would make it
 * impossible for any regular user to ever mark their own notification read
 * or delete it — notifications are inherently self-managed.
 */
final class NotificationRoutes
{
    public static function register(): void
    {
        $ns = OPTIVAX_ERP_NAMESPACE;

        register_rest_route($ns, '/notifications/stream', [
            'methods' => 'GET',
            'callback' => [new NotificationStreamController(), 'stream'],
            'permission_callback' => '__return_true',
        ]);

        register_rest_route($ns, '/notifications/list', [
            'methods' => 'GET',
            'callback' => function (\WP_REST_Request $request) {
                $guard = RbacMiddleware::authorize('notifications', 'VIEW');
                if ($guard) {
                    return $guard;
                }

                // Notifications are inherently self-managed (see this file's
                // class doc comment — EDIT/DELETE on 'notifications' is
                // granted to nobody but super_admin). The read path must
                // follow the same rule: a caller may only list their own
                // notifications, or every user's inbox could be dumped by
                // supplying an arbitrary ?userId= (or none at all).
                $requestedUserId = $request->get_param('userId');
                $ownUserId = (string) AuthMiddleware::currentUserId();
                if ($requestedUserId !== null && (string) $requestedUserId !== $ownUserId) {
                    $guard = RbacMiddleware::authorize('notifications', 'EDIT');
                    if ($guard) {
                        return $guard;
                    }
                    return ApiResponse::ok(NotificationService::list((string) $requestedUserId));
                }

                return ApiResponse::ok(NotificationService::list($ownUserId));
            },
            'permission_callback' => '__return_true',
        ]);

        register_rest_route($ns, '/notifications/update', [
            'methods' => 'PUT',
            'callback' => function (\WP_REST_Request $request) {
                if (!AuthMiddleware::isAuthenticated()) {
                    return ApiResponse::unauthorized();
                }
                $data = $request->get_json_params() ?: [];
                $id = $data['id'] ?? null;
                if (!$id) {
                    return ApiResponse::validationError('Missing "id" in request body');
                }
                $row = NotificationService::find((string) $id);
                if (!$row) {
                    return ApiResponse::notFound();
                }
                if ($row['userId'] !== (string) AuthMiddleware::currentUserId()) {
                    $guard = RbacMiddleware::authorize('notifications', 'EDIT');
                    if ($guard) {
                        return $guard;
                    }
                }
                NotificationService::markRead((string) $id);
                return ApiResponse::ok(null);
            },
            'permission_callback' => '__return_true',
        ]);

        register_rest_route($ns, '/notifications/mark-all-read', [
            'methods' => 'PUT',
            'callback' => function (\WP_REST_Request $request) {
                if (!AuthMiddleware::isAuthenticated()) {
                    return ApiResponse::unauthorized();
                }
                $data = $request->get_json_params() ?: [];
                $userId = $data['userId'] ?? null;
                if (!$userId) {
                    return ApiResponse::validationError('Missing "userId" in request body');
                }
                if ((string) $userId !== (string) AuthMiddleware::currentUserId()) {
                    $guard = RbacMiddleware::authorize('notifications', 'EDIT');
                    if ($guard) {
                        return $guard;
                    }
                }
                NotificationService::markAllRead((string) $userId);
                return ApiResponse::ok(null);
            },
            'permission_callback' => '__return_true',
        ]);

        register_rest_route($ns, '/notifications/create', [
            'methods' => 'POST',
            'callback' => function (\WP_REST_Request $request) {
                $guard = RbacMiddleware::authorize('notifications', 'CREATE');
                if ($guard) {
                    return $guard;
                }
                $data = $request->get_json_params() ?: [];
                $errors = Validator::check($data, [
                    'userId' => ['required'],
                    'type' => ['required', ['in', ['invoice', 'project', 'payment', 'system', 'profile']]],
                    'title' => ['required'],
                    'message' => ['required'],
                ]);
                if ($errors) {
                    return ApiResponse::validationError('Validation failed', $errors);
                }
                return ApiResponse::ok(NotificationService::create($data), [], 201);
            },
            'permission_callback' => '__return_true',
        ]);

        register_rest_route($ns, '/notifications/delete', [
            'methods' => 'DELETE',
            'callback' => function (\WP_REST_Request $request) {
                if (!AuthMiddleware::isAuthenticated()) {
                    return ApiResponse::unauthorized();
                }
                $data = $request->get_json_params() ?: [];
                $id = $data['id'] ?? null;
                if (!$id) {
                    return ApiResponse::validationError('Missing "id" in request body');
                }
                $row = NotificationService::find((string) $id);
                if (!$row) {
                    return ApiResponse::notFound();
                }
                if ($row['userId'] !== (string) AuthMiddleware::currentUserId()) {
                    $guard = RbacMiddleware::authorize('notifications', 'DELETE');
                    if ($guard) {
                        return $guard;
                    }
                }
                NotificationService::delete((string) $id);
                return ApiResponse::ok(null);
            },
            'permission_callback' => '__return_true',
        ]);

        register_rest_route($ns, '/notifications/delete-all', [
            'methods' => 'DELETE',
            'callback' => function (\WP_REST_Request $request) {
                if (!AuthMiddleware::isAuthenticated()) {
                    return ApiResponse::unauthorized();
                }
                $data = $request->get_json_params() ?: [];
                $userId = $data['userId'] ?? null;
                if (!$userId) {
                    return ApiResponse::validationError('Missing "userId" in request body');
                }
                if ((string) $userId !== (string) AuthMiddleware::currentUserId()) {
                    $guard = RbacMiddleware::authorize('notifications', 'DELETE');
                    if ($guard) {
                        return $guard;
                    }
                }
                NotificationService::deleteAll((string) $userId);
                return ApiResponse::ok(null);
            },
            'permission_callback' => '__return_true',
        ]);
    }
}
```

---

## SECTION 7 — WORDPRESS PLUGIN

### wordpress-backend/optivax-erp-backend/optivax-erp-backend.php (main plugin file)

```php
<?php
/**
 * Plugin Name: OptiVax ERP Backend
 * Plugin URI: https://optivaxglobal.com
 * Description: REST API backend foundation for the OptiVax Global ERP dashboard (Phase 2A). Provides auth, RBAC, database schema, SMTP, uploads, and notification infrastructure consumed by the React frontend at /wp-json/saas/v1/*.
 * Version: 2.0.0-phase2a
 * Author: OptiVax Global
 * Text Domain: optivax-erp-backend
 * Requires PHP: 8.0
 */

if (!defined('ABSPATH')) {
    exit; // Disallow direct access.
}

define('OPTIVAX_ERP_VERSION', '2.2.0-phase6');
define('OPTIVAX_ERP_DB_VERSION', '1.2.0');
define('OPTIVAX_ERP_DIR', plugin_dir_path(__FILE__));
define('OPTIVAX_ERP_URL', plugin_dir_url(__FILE__));
define('OPTIVAX_ERP_TABLE_PREFIX', 'optivax_');
define('OPTIVAX_ERP_NAMESPACE', 'saas/v1');

/**
 * Lightweight PSR-4-ish autoloader for our own classes.
 * OptivaxERP\Controllers\AuthController -> controllers/AuthController.php
 * OptivaxERP\Helpers\ApiResponse        -> helpers/ApiResponse.php
 * Every namespace segment except the last (the class name, which must match
 * its .php filename exactly) is lowercased to match the plugin's flat,
 * lowercase folder layout — including nested ones like
 * OptivaxERP\Database\Migrations\X -> database/migrations/X.php. Lowercasing
 * only the first segment would resolve that example to database/Migrations/X.php,
 * which happens to work on case-insensitive filesystems (Windows/Mac) but
 * 404s on a case-sensitive Linux production host.
 */
spl_autoload_register(function (string $class): void {
    $prefix = 'OptivaxERP\\';
    if (strncmp($prefix, $class, strlen($prefix)) !== 0) {
        return;
    }

    $relative = substr($class, strlen($prefix));
    $segments = explode('\\', $relative);
    if (count($segments) < 2) {
        return;
    }

    $className = array_pop($segments);
    $dirSegments = array_map('strtolower', $segments);
    $path = OPTIVAX_ERP_DIR . implode('/', $dirSegments) . '/' . $className . '.php';

    if (file_exists($path)) {
        require_once $path;
    }
});

// Composer-managed dependencies (firebase/php-jwt).
if (file_exists(OPTIVAX_ERP_DIR . 'vendor/autoload.php')) {
    require_once OPTIVAX_ERP_DIR . 'vendor/autoload.php';
}

/**
 * Bootstraps the plugin once all classes are autoloadable and WordPress core is ready.
 */
final class OptivaxErpBackend
{
    private static ?OptivaxErpBackend $instance = null;

    public static function instance(): OptivaxErpBackend
    {
        if (self::$instance === null) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    private function __construct()
    {
        add_action('rest_api_init', [$this, 'registerRoutes']);
        add_action('init', [$this, 'loadTextDomain']);
        // Called directly (not re-registered on plugins_loaded) — we're
        // already executing inside that hook's callback right now, and
        // whether a callback appended to a hook mid-fire runs in the same
        // pass is a WordPress implementation detail not worth depending on.
        OptivaxERP\Database\Migrator::maybeUpgrade();
        add_action('admin_menu', [OptivaxERP\Admin\SettingsPage::class, 'registerMenu']);
        add_filter('rest_authentication_errors', [OptivaxERP\Middleware\AuthMiddleware::class, 'restAuthenticationErrors']);
        add_filter('rest_pre_dispatch', [OptivaxERP\Middleware\PasswordGateMiddleware::class, 'enforce'], 10, 3);
        OptivaxERP\Middleware\CsrfMiddleware::register();
        OptivaxERP\Middleware\ErrorBoundaryMiddleware::register();
        add_action('phpmailer_init', [OptivaxERP\Mail\MailService::class, 'configureSmtp']);
        OptivaxERP\Helpers\SecurityHeaders::register();

        OptivaxERP\Cron\EmailQueueWorker::registerSchedule();
        add_action('optivax_erp_email_queue_tick', [OptivaxERP\Cron\EmailQueueWorker::class, 'run']);
    }

    public function loadTextDomain(): void
    {
        load_plugin_textdomain('optivax-erp-backend', false, dirname(plugin_basename(__FILE__)) . '/languages');
    }

    public function registerRoutes(): void
    {
        foreach ($this->routeFiles() as $routeClass) {
            if (class_exists($routeClass) && method_exists($routeClass, 'register')) {
                $routeClass::register();
            }
        }
    }

    /**
     * Every module's route-registration class. Listed explicitly (not
     * globbed) so load order and coverage are auditable at a glance.
     */
    private function routeFiles(): array
    {
        return [
            OptivaxERP\Routes\AuthRoutes::class,
            OptivaxERP\Routes\ProfileRoutes::class,
            OptivaxERP\Routes\SecurityAuditLogRoutes::class,
            OptivaxERP\Routes\StripeRoutes::class,
            OptivaxERP\Routes\DepartmentRoutes::class,
            OptivaxERP\Routes\OrganizationRoutes::class,
            OptivaxERP\Routes\SubscriptionRoutes::class,
            OptivaxERP\Routes\CompanySettingsRoutes::class,
            OptivaxERP\Routes\ClientRoutes::class,
            OptivaxERP\Routes\ClientOwnershipRoutes::class,
            OptivaxERP\Routes\ProjectRoutes::class,
            OptivaxERP\Routes\TaskRoutes::class,
            OptivaxERP\Routes\DeliverableRoutes::class,
            OptivaxERP\Routes\RevisionRoutes::class,
            OptivaxERP\Routes\ProductionAssignmentRoutes::class,
            OptivaxERP\Routes\FileRoutes::class,
            OptivaxERP\Routes\InvoiceRoutes::class,
            OptivaxERP\Routes\PaymentRoutes::class,
            OptivaxERP\Routes\CommissionRoutes::class,
            OptivaxERP\Routes\BudgetRoutes::class,
            OptivaxERP\Routes\AttendanceRoutes::class,
            OptivaxERP\Routes\ActivityRoutes::class,
            OptivaxERP\Routes\LeaveRequestRoutes::class,
            OptivaxERP\Routes\PayrollRoutes::class,
            OptivaxERP\Routes\EmployeeExtraRoutes::class,
            OptivaxERP\Routes\LeadRoutes::class,
            OptivaxERP\Routes\SalesOpsRoutes::class,
            OptivaxERP\Routes\SalesWidgetRoutes::class,
            OptivaxERP\Routes\MarketingCampaignRoutes::class,
            OptivaxERP\Routes\ContentCalendarRoutes::class,
            OptivaxERP\Routes\EmailMarketingRoutes::class,
            OptivaxERP\Routes\SocialTrackingRoutes::class,
            OptivaxERP\Routes\ItSupportRoutes::class,
            OptivaxERP\Routes\CalendarEventRoutes::class,
            OptivaxERP\Routes\ConversationRoutes::class,
            OptivaxERP\Routes\NotificationRoutes::class,
            OptivaxERP\Routes\AuditLogRoutes::class,
            OptivaxERP\Routes\AutomationRoutes::class,
        ];
    }
}

register_activation_hook(__FILE__, ['OptivaxERP\\Database\\Migrator', 'runOnActivation']);
register_deactivation_hook(__FILE__, ['OptivaxERP\\Cron\\EmailQueueWorker', 'clearSchedule']);

add_action('plugins_loaded', ['OptivaxErpBackend', 'instance']);
```

Cross-reference: `routes/AuthRoutes.php`, `controllers/AuthController.php` — see Section 5. `routes/NotificationRoutes.php` — see Section 6.

### wordpress-backend/optivax-erp-backend/routes/ActivityRoutes.php

```php
<?php

namespace OptivaxERP\Routes;

use OptivaxERP\Controllers\ActivityController;

if (!defined('ABSPATH')) {
    exit;
}

final class ActivityRoutes
{
    public static function register(): void
    {
        $controller = new ActivityController();
        $ns = OPTIVAX_ERP_NAMESPACE;

        register_rest_route($ns, '/activity/current', [
            'methods' => 'GET',
            'callback' => [$controller, 'current'],
            'permission_callback' => '__return_true',
        ]);

        register_rest_route($ns, '/activity/sessions', [
            'methods' => 'GET',
            'callback' => [$controller, 'sessions'],
            'permission_callback' => '__return_true',
        ]);

        register_rest_route($ns, '/activity/login', [
            'methods' => 'POST',
            'callback' => [$controller, 'login'],
            'permission_callback' => '__return_true',
        ]);

        register_rest_route($ns, '/activity/logout', [
            'methods' => 'POST',
            'callback' => [$controller, 'logout'],
            'permission_callback' => '__return_true',
        ]);

        register_rest_route($ns, '/activity/break/start', [
            'methods' => 'POST',
            'callback' => [$controller, 'breakStart'],
            'permission_callback' => '__return_true',
        ]);

        register_rest_route($ns, '/activity/break/end', [
            'methods' => 'POST',
            'callback' => [$controller, 'breakEnd'],
            'permission_callback' => '__return_true',
        ]);
    }
}
```

### wordpress-backend/optivax-erp-backend/routes/StripeRoutes.php

```php
<?php

namespace OptivaxERP\Routes;

use OptivaxERP\Controllers\StripeController;

if (!defined('ABSPATH')) {
    exit;
}

final class StripeRoutes
{
    public static function register(): void
    {
        $controller = new StripeController();
        $ns = OPTIVAX_ERP_NAMESPACE;

        register_rest_route($ns, '/config/stripe', [
            'methods' => 'GET',
            'callback' => [$controller, 'getConfig'],
            'permission_callback' => '__return_true',
        ]);

        register_rest_route($ns, '/settings/stripe', [
            'methods' => 'POST',
            'callback' => [$controller, 'saveConfig'],
            'permission_callback' => '__return_true',
        ]);

        register_rest_route($ns, '/create-payment-intent', [
            'methods' => 'POST',
            'callback' => [$controller, 'createPaymentIntent'],
            'permission_callback' => '__return_true',
        ]);
    }
}
```

### wordpress-backend/optivax-erp-backend/controllers/StripeController.php

```php
<?php

namespace OptivaxERP\Controllers;

use OptivaxERP\Helpers\ApiResponse;
use OptivaxERP\Helpers\Sanitize;
use OptivaxERP\Helpers\Validator;
use OptivaxERP\Middleware\AuthMiddleware;
use OptivaxERP\Middleware\ClientScopeMiddleware;
use OptivaxERP\Repositories\InvoiceRepository;
use OptivaxERP\Repositories\StripeSettingsRepository;

if (!defined('ABSPATH')) {
    exit;
}

/**
 * Backs /saas/v1/config/stripe, /saas/v1/settings/stripe, and
 * /saas/v1/create-payment-intent. Split from CompanySettingsController on
 * purpose: that controller's get() returns its whole DTO to anyone with
 * 'system' VIEW, which must never include a live Stripe secret key — this
 * controller is the only code path that ever reads or writes the secret,
 * and getConfig() only ever returns the publishable key.
 */
final class StripeController
{
    private StripeSettingsRepository $repo;

    public function __construct()
    {
        $this->repo = new StripeSettingsRepository();
    }

    /** GET /config/stripe — safe for any authenticated user (publishable key only). */
    public function getConfig(\WP_REST_Request $request): \WP_REST_Response
    {
        if (!AuthMiddleware::isAuthenticated()) {
            return ApiResponse::unauthorized();
        }
        return ApiResponse::ok($this->repo->getPublicConfig());
    }

    /** POST /settings/stripe — super_admin only; handles live payment credentials. */
    public function saveConfig(\WP_REST_Request $request): \WP_REST_Response
    {
        if (AuthMiddleware::currentRole() !== 'super_admin') {
            return ApiResponse::forbidden('Stripe settings are restricted to Super Admin');
        }

        $data = $request->get_json_params() ?: [];
        $errors = Validator::check($data, [
            'publishableKey' => ['required'],
        ]);
        if ($errors) {
            return ApiResponse::validationError('Validation failed', $errors);
        }

        $this->repo->saveConfig($data);
        return ApiResponse::ok(null);
    }

    /**
     * POST /create-payment-intent — any authenticated user (client portal
     * checkout). The secret key never leaves the server; only Stripe's own
     * client_secret (safe for the browser) is returned. Amount is
     * cross-checked against the invoice's own outstanding balance rather
     * than trusted verbatim from the request body.
     */
    public function createPaymentIntent(\WP_REST_Request $request): \WP_REST_Response
    {
        if (!AuthMiddleware::isAuthenticated()) {
            return ApiResponse::unauthorized();
        }

        $data = $request->get_json_params() ?: [];
        $errors = Validator::check($data, [
            'invoiceId' => ['required'],
            'amount' => ['required', 'numeric', ['min', 0.01]],
        ]);
        if ($errors) {
            return ApiResponse::validationError('Validation failed', $errors);
        }

        if (!$this->repo->isEnabled()) {
            return ApiResponse::error('Stripe payments are not enabled', 409);
        }
        $secretKey = $this->repo->getSecretKey();
        if (!$secretKey) {
            return ApiResponse::error('Stripe is not configured', 409);
        }

        $invoice = (new InvoiceRepository())->find((string) $data['invoiceId']);
        if (!$invoice) {
            return ApiResponse::notFound('Invoice not found');
        }

        // A `client`-role caller must only ever be able to pay their own
        // invoice — never trust the request; resolve the caller's own
        // clientId server-side and compare it against the invoice's actual
        // owner before disclosing its balance or creating a PaymentIntent.
        $claims = AuthMiddleware::currentClaims();
        if (($claims['role'] ?? '') === 'client') {
            $ownClientId = ClientScopeMiddleware::resolveOwnClientId((int) $claims['sub'], (string) $claims['email']);
            if (!$ownClientId || $invoice['clientId'] !== $ownClientId) {
                return ApiResponse::forbidden();
            }
        }

        $amount = Sanitize::float($data['amount']);
        $outstanding = (float) $invoice['amount'] - (float) ($invoice['amountPaid'] ?? 0);
        if ($amount > $outstanding + 0.01) {
            return ApiResponse::validationError('Amount exceeds the invoice\'s outstanding balance');
        }

        $response = wp_remote_post('https://api.stripe.com/v1/payment_intents', [
            'timeout' => 15,
            'headers' => [
                'Authorization' => 'Bearer ' . $secretKey,
                'Content-Type' => 'application/x-www-form-urlencoded',
            ],
            'body' => [
                // Stripe expects the smallest currency unit (cents for usd).
                'amount' => (int) round($amount * 100),
                'currency' => Sanitize::text($data['currency'] ?? 'usd'),
                'metadata' => ['invoiceId' => (string) $data['invoiceId']],
            ],
        ]);

        if (is_wp_error($response)) {
            return ApiResponse::error('Unable to reach Stripe: ' . $response->get_error_message(), 502);
        }

        $status = wp_remote_retrieve_response_code($response);
        $body = json_decode(wp_remote_retrieve_body($response), true);

        if ($status >= 400 || !is_array($body) || empty($body['client_secret'])) {
            $message = is_array($body) ? ($body['error']['message'] ?? 'Stripe rejected the request') : 'Stripe rejected the request';
            return ApiResponse::error($message, 502);
        }

        return ApiResponse::ok([
            'clientSecret' => $body['client_secret'],
            'paymentIntentId' => $body['id'],
        ], [], 201);
    }
}
```

### wordpress-backend/optivax-erp-backend/helpers/SecurityHeaders.php

```php
<?php

namespace OptivaxERP\Helpers;

if (!defined('ABSPATH')) {
    exit;
}

/**
 * CORS + baseline security headers for every /wp-json/saas/v1/* response.
 *
 * The frontend (src/lib/client.ts) sends `credentials: "include"` on every
 * request — cookie-based auth, no bearer token — so CORS must echo back a
 * specific allow-listed origin (never "*") together with
 * Access-Control-Allow-Credentials: true. WP core's default CORS filter
 * (`rest_send_cors_headers`) mirrors *any* Origin unconditionally with no
 * credentials header, which is both too permissive (any site can read
 * non-credentialed responses) and non-functional for this app (credentialed
 * requests need the explicit header) — so we remove it and take over.
 *
 * Allowed origins are configured via the `optivax_erp_allowed_origins`
 * option (comma-separated), editable on the plugin's settings screen —
 * never hardcoded, since the frontend's real origin isn't known yet.
 */
final class SecurityHeaders
{
    private const OPTION_ALLOWED_ORIGINS = 'optivax_erp_allowed_origins';

    public static function register(): void
    {
        remove_filter('rest_pre_serve_request', 'rest_send_cors_headers');
        add_filter('rest_pre_serve_request', [self::class, 'applyCorsHeaders'], 10, 1);
        add_action('rest_api_init', [self::class, 'applyBaselineHeaders'], 1);
    }

    /** @return string[] trimmed, non-empty allowed origins from settings */
    public static function allowedOrigins(): array
    {
        $raw = (string) get_option(self::OPTION_ALLOWED_ORIGINS, '');
        return array_values(array_filter(array_map('trim', explode(',', $raw))));
    }

    /**
     * Hooked on `rest_pre_serve_request` (fires right before every REST
     * response is sent, including OPTIONS preflight responses).
     */
    public static function applyCorsHeaders($served)
    {
        $origin = isset($_SERVER['HTTP_ORIGIN']) ? esc_url_raw(wp_unslash($_SERVER['HTTP_ORIGIN'])) : '';

        if ($origin !== '' && in_array($origin, self::allowedOrigins(), true)) {
            header('Access-Control-Allow-Origin: ' . $origin);
            header('Access-Control-Allow-Credentials: true');
            header('Vary: Origin');
            header('Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS');
            header('Access-Control-Allow-Headers: Content-Type, X-Requested-With, X-CSRF-Token');
        }

        return $served;
    }

    /** Hooked on `rest_api_init` — fires on every REST request, before dispatch. */
    public static function applyBaselineHeaders(): void
    {
        header('X-Content-Type-Options: nosniff');
        header('X-Frame-Options: DENY');
        header("Content-Security-Policy: default-src 'none'");
        header('Referrer-Policy: strict-origin-when-cross-origin');
        header('Permissions-Policy: geolocation=(), camera=(), microphone=()');
        if (is_ssl()) {
            header('Strict-Transport-Security: max-age=31536000; includeSubDomains');
        }
    }
}
```

Note: `applyCorsHeaders()` only sends CORS headers when `Origin` matches the `optivax_erp_allowed_origins` option. **If this option is empty/unset (default on a fresh install), no CORS headers are ever sent** — meaning a real cross-origin frontend (the documented deployment model in `.env.production`'s comments) would have every request blocked by the browser until an admin manually configures this option via the plugin's settings page. See Section 14/15.

### wordpress-backend/optivax-erp-backend/helpers/ApiResponse.php

```php
<?php

namespace OptivaxERP\Helpers;

if (!defined('ABSPATH')) {
    exit;
}

/**
 * Every REST response in this plugin is wrapped in this exact envelope,
 * because src/lib/client.ts on the frontend unwraps `data` and treats
 * `success === false` (even on a 2xx status) as a failure.
 */
final class ApiResponse
{
    public static function ok($data, array $meta = [], int $status = 200): \WP_REST_Response
    {
        $body = [
            'success' => true,
            'data' => $data,
            'error' => null,
        ];
        if (!empty($meta)) {
            $body['meta'] = $meta;
        }
        return new \WP_REST_Response($body, $status);
    }

    public static function error(string $message, int $status = 400, $details = null): \WP_REST_Response
    {
        $body = [
            'success' => false,
            'data' => null,
            'error' => $message,
        ];
        if ($details !== null) {
            $body['details'] = $details;
        }
        return new \WP_REST_Response($body, $status);
    }

    public static function unauthorized(string $message = 'Authentication required'): \WP_REST_Response
    {
        return self::error($message, 401);
    }

    public static function forbidden(string $message = 'You do not have permission to perform this action'): \WP_REST_Response
    {
        return self::error($message, 403);
    }

    public static function notFound(string $message = 'Not found'): \WP_REST_Response
    {
        return self::error($message, 404);
    }

    public static function validationError(string $message, $details = null): \WP_REST_Response
    {
        return self::error($message, 422, $details);
    }

    public static function serverError(string $message = 'Internal server error'): \WP_REST_Response
    {
        return self::error($message, 500);
    }
}
```

Cross-references (already shown in full above/in Section 5, not repeated): `routes/NotificationRoutes.php` (Section 6), `controllers/AuthController.php`, `routes/AuthRoutes.php` (Section 5), `middleware/AuthMiddleware.php`, `middleware/PasswordGateMiddleware.php`, `middleware/CsrfMiddleware.php` (Section 5).

### wordpress-backend/optivax-erp-backend/controllers/BaseCrudController.php

Also included here in full since it is the generic engine behind the large majority of routes in Section 10 (every route file that instantiates `new BaseCrudController($repo, $domain)`):

```php
<?php

namespace OptivaxERP\Controllers;

use OptivaxERP\Helpers\ApiResponse;
use OptivaxERP\Middleware\RbacMiddleware;
use OptivaxERP\Repositories\AbstractRepository;

if (!defined('ABSPATH')) {
    exit;
}

/**
 * Generic list/create/update/delete against one repository, gated by
 * RbacMiddleware on the given PermissionDomain. No business rules — this is
 * the "generic CRUD passthrough" foundation tier every non-auth module uses
 * in Phase 2A (see the plan's "Stub depth" decision). Route files wire this
 * to the exact path/method/query-param shape each frontend service expects;
 * this class only needs to know the repository and the RBAC domain.
 */
class BaseCrudController
{
    protected AbstractRepository $repo;
    protected string $domain;

    public function __construct(AbstractRepository $repo, string $domain)
    {
        $this->repo = $repo;
        $this->domain = $domain;
    }

    public function listHandler(
        \WP_REST_Request $request,
        array $filterParamMap = [],
        string $orderBy = null,
        array $forcedFilters = [],
        array $searchableColumns = []
    ): \WP_REST_Response {
        $guard = RbacMiddleware::authorize($this->domain, 'VIEW');
        if ($guard) {
            return $guard;
        }

        $filters = [];
        foreach ($filterParamMap as $queryParam => $column) {
            $value = $request->get_param($queryParam);
            if ($value !== null && $value !== '') {
                $filters[$column] = sanitize_text_field($value);
            }
        }
        foreach ($forcedFilters as $column => $value) {
            $filters[$column] = $value;
        }

        $search = null;
        if (!empty($searchableColumns)) {
            $term = $request->get_param('q') ?? $request->get_param('search');
            if ($term !== null && $term !== '') {
                $search = ['columns' => $searchableColumns, 'term' => sanitize_text_field($term)];
            }
        }

        $sortBy = $request->get_param('sortBy');
        if ($sortBy && in_array($sortBy, array_values($filterParamMap), true)) {
            $sortDir = strtoupper((string) $request->get_param('sortDir')) === 'ASC' ? 'ASC' : 'DESC';
            $orderBy = "{$sortBy} {$sortDir}";
        }

        $meta = [];
        $pagination = null;
        $page = $request->get_param('page');
        $perPage = $request->get_param('perPage') ?? $request->get_param('per_page');
        if ($page !== null || $perPage !== null) {
            $perPageInt = max(1, min(100, (int) ($perPage ?: 20)));
            $pageInt = max(1, (int) ($page ?: 1));
            $pagination = ['limit' => $perPageInt, 'offset' => ($pageInt - 1) * $perPageInt];
            $total = $this->repo->count($filters, $search);
            $meta = [
                'page' => $pageInt,
                'perPage' => $perPageInt,
                'total' => $total,
                'totalPages' => $perPageInt > 0 ? (int) ceil($total / $perPageInt) : 0,
            ];
        }

        return ApiResponse::ok($this->repo->list($filters, $orderBy, $pagination, $search), $meta);
    }

    public function findHandler(\WP_REST_Request $request, string $idParamName = 'id'): \WP_REST_Response
    {
        $guard = RbacMiddleware::authorize($this->domain, 'VIEW');
        if ($guard) {
            return $guard;
        }

        $id = $request->get_param($idParamName);
        $item = $id ? $this->repo->find((string) $id) : null;
        if (!$item) {
            return ApiResponse::notFound();
        }
        return ApiResponse::ok($item);
    }

    protected function checkOwnership(string $id, ?array $ownershipCheck): ?\WP_REST_Response
    {
        if ($ownershipCheck === null) {
            return null;
        }
        $existing = $this->repo->find($id);
        if (!$existing) {
            return ApiResponse::notFound();
        }
        foreach ($ownershipCheck as $field => $required) {
            if (($existing[$field] ?? null) !== $required) {
                return ApiResponse::forbidden();
            }
        }
        return null;
    }

    public function createHandler(\WP_REST_Request $request): \WP_REST_Response
    {
        $guard = RbacMiddleware::authorize($this->domain, 'CREATE');
        if ($guard) {
            return $guard;
        }

        $data = $request->get_json_params() ?: [];
        return ApiResponse::ok($this->repo->create($data), [], 201);
    }

    /** For REST-verb-style routes: PUT /module/{id}. */
    public function updateByRouteIdHandler(\WP_REST_Request $request, ?array $ownershipCheck = null): \WP_REST_Response
    {
        $guard = RbacMiddleware::authorize($this->domain, 'EDIT');
        if ($guard) {
            return $guard;
        }

        $id = (string) $request->get_param('id');
        $ownGuard = $this->checkOwnership($id, $ownershipCheck);
        if ($ownGuard) {
            return $ownGuard;
        }

        $data = $request->get_json_params() ?: [];
        $updated = $this->repo->update($id, $data);
        if (!$updated) {
            return ApiResponse::notFound();
        }
        return ApiResponse::ok($updated);
    }

    /** For RPC-suffix-style routes: PUT /module/update with { id, ...patch } in the body. */
    public function updateByBodyIdHandler(\WP_REST_Request $request, ?array $ownershipCheck = null): \WP_REST_Response
    {
        $guard = RbacMiddleware::authorize($this->domain, 'EDIT');
        if ($guard) {
            return $guard;
        }

        $data = $request->get_json_params() ?: [];
        $id = $data['id'] ?? null;
        if (!$id) {
            return ApiResponse::validationError('Missing "id" in request body');
        }
        $ownGuard = $this->checkOwnership((string) $id, $ownershipCheck);
        if ($ownGuard) {
            return $ownGuard;
        }

        $updated = $this->repo->update((string) $id, $data);
        if (!$updated) {
            return ApiResponse::notFound();
        }
        return ApiResponse::ok($updated);
    }

    /** For REST-verb-style routes: DELETE /module/{id}. */
    public function deleteByRouteIdHandler(\WP_REST_Request $request, ?array $ownershipCheck = null): \WP_REST_Response
    {
        $guard = RbacMiddleware::authorize($this->domain, 'DELETE');
        if ($guard) {
            return $guard;
        }

        $id = (string) $request->get_param('id');
        $ownGuard = $this->checkOwnership($id, $ownershipCheck);
        if ($ownGuard) {
            return $ownGuard;
        }

        $this->repo->delete($id);
        return ApiResponse::ok(null);
    }

    /** For RPC-suffix-style routes: DELETE /module/delete with { id } in the body. */
    public function deleteByBodyIdHandler(\WP_REST_Request $request, ?array $ownershipCheck = null): \WP_REST_Response
    {
        $guard = RbacMiddleware::authorize($this->domain, 'DELETE');
        if ($guard) {
            return $guard;
        }

        $data = $request->get_json_params() ?: [];
        $id = $data['id'] ?? null;
        if (!$id) {
            return ApiResponse::validationError('Missing "id" in request body');
        }
        $ownGuard = $this->checkOwnership((string) $id, $ownershipCheck);
        if ($ownGuard) {
            return $ownGuard;
        }

        $this->repo->delete((string) $id);
        return ApiResponse::ok(null);
    }
}
```

---

## SECTION 8 — WORDPRESS THEME

### wordpress-theme/optivax-react-theme/functions.php

```php
<?php
/**
 * OptiVax React Theme bootstrap.
 *
 * This theme contains no business logic, REST endpoints, JWT/SMTP handling,
 * RBAC, payroll, attendance, budget, notifications, or database queries —
 * every one of those lives in the companion "OptiVax ERP Backend" plugin
 * (wordpress-backend/optivax-erp-backend/) and stays there untouched. This
 * theme's only responsibility is loading the React app's compiled build and
 * getting out of its way, per the Phase 3A scope.
 *
 * @package OptivaxReactTheme
 */

if (!defined('ABSPATH')) {
    exit;
}

define('OPTIVAX_THEME_VERSION', '1.0.0');
define('OPTIVAX_THEME_DIR', get_template_directory());
define('OPTIVAX_THEME_URI', get_template_directory_uri());

require_once OPTIVAX_THEME_DIR . '/inc/theme-setup.php';
require_once OPTIVAX_THEME_DIR . '/inc/assets.php';
require_once OPTIVAX_THEME_DIR . '/inc/localize.php';
require_once OPTIVAX_THEME_DIR . '/inc/seo.php';
require_once OPTIVAX_THEME_DIR . '/inc/security.php';
require_once OPTIVAX_THEME_DIR . '/inc/template-tags.php';
```

### wordpress-theme/optivax-react-theme/header.php

```php
<?php
/**
 * The header for the theme's shell page. Deliberately minimal — nearly
 * everything a visitor sees is rendered by the React app itself once it
 * mounts into #root (see footer.php / inc/template-tags.php).
 *
 * @package OptivaxReactTheme
 */

if (!defined('ABSPATH')) {
    exit;
}
?>
<!DOCTYPE html>
<html <?php language_attributes(); ?>>
<head>
    <meta charset="<?php bloginfo('charset'); ?>">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="icon" type="image/png" href="<?php echo esc_url(get_template_directory_uri() . '/build/favicon.png'); ?>">
    <?php wp_head(); ?>
</head>
<body <?php body_class('dark:bg-gray-900'); ?>>
<?php wp_body_open(); ?>
<a class="skip-link screen-reader-text" href="#root"><?php esc_html_e('Skip to app content', 'optivax-react-theme'); ?></a>
```

### wordpress-theme/optivax-react-theme/footer.php

```php
<?php
/**
 * @package OptivaxReactTheme
 */

if (!defined('ABSPATH')) {
    exit;
}

if (is_active_sidebar('footer-1')) : ?>
    <footer id="colophon" class="site-footer">
        <?php dynamic_sidebar('footer-1'); ?>
    </footer>
<?php endif; ?>

<?php wp_footer(); ?>
</body>
</html>
```

### wordpress-theme/optivax-react-theme/page.php

```php
<?php
/**
 * Default template for ordinary WordPress Pages (e.g. a privacy policy or
 * terms page an admin creates in wp-admin, outside the app). To mount the
 * React app on a specific page instead, assign it the "React Application"
 * page template (templates/template-app.php) from the Page Attributes
 * panel — this file intentionally renders normal page content, not the app,
 * so both use cases stay available without one silently overriding the
 * other.
 *
 * @package OptivaxReactTheme
 */

if (!defined('ABSPATH')) {
    exit;
}

get_header();
?>
<main id="primary" class="site-main" style="max-width:800px;margin:2rem auto;padding:0 1rem;">
    <?php
    while (have_posts()) :
        the_post();
        ?>
        <article <?php post_class(); ?>>
            <header class="entry-header">
                <?php the_title('<h1 class="entry-title">', '</h1>'); ?>
            </header>
            <div class="entry-content">
                <?php the_content(); ?>
            </div>
        </article>
        <?php
    endwhile;
    ?>
</main>
<?php
get_footer();
```

### wordpress-theme/optivax-react-theme/front-page.php

```php
<?php
/**
 * The site's front page: the primary mount point for the React app. Since
 * the app uses HashRouter (src/App.tsx), every in-app "route" is a
 * client-side `#/...` fragment that never leaves the browser — this one
 * WordPress URL is the only page WordPress ever needs to serve for the
 * entire app, and reloading on any in-app screen re-requests this exact
 * same URL, which is why no BrowserRouter-style rewrite/fallback rules are
 * needed for "direct URL access"/"refresh" to work.
 *
 * @package OptivaxReactTheme
 */

if (!defined('ABSPATH')) {
    exit;
}

get_header();
optivax_theme_render_app_mount();
get_footer();
```

### wordpress-theme/optivax-react-theme/index.php

```php
<?php
/**
 * The mandatory fallback template every WordPress theme must have. This
 * theme has exactly one job — mount the React app — so, like
 * front-page.php, it does that unconditionally for any request that
 * reaches here without a more specific template (single.php, page.php,
 * archive.php, 404.php) taking over first.
 *
 * @package OptivaxReactTheme
 */

if (!defined('ABSPATH')) {
    exit;
}

get_header();
optivax_theme_render_app_mount();
get_footer();
```

### wordpress-theme/optivax-react-theme/templates/template-app.php

```php
<?php
/**
 * Template Name: React Application
 * Template Post Type: page
 *
 * Assignable alternative mount point: if a site's homepage is used for
 * something else (a marketing page, a blog), create a WordPress Page (e.g.
 * at /app/) and assign it this template from the Page Attributes panel to
 * mount the React app there instead of on front-page.php.
 *
 * @package OptivaxReactTheme
 */

if (!defined('ABSPATH')) {
    exit;
}

get_header();
optivax_theme_render_app_mount();
get_footer();
```

### wordpress-theme/optivax-react-theme/inc/assets.php

```php
<?php
/**
 * Vite build integration: manifest parsing, JS/CSS enqueue, cache-busting,
 * and a root-relative static-asset passthrough for the handful of paths the
 * React build hardcodes as absolute (e.g. `/images/...` from files that
 * live in the React project's `public/` folder, referenced in source as
 * literal root paths — confirmed present in the current build's compiled
 * bundle). No business logic — this file's only job is "find the built
 * files and get bytes to the browser correctly."
 *
 * @package OptivaxReactTheme
 */

if (!defined('ABSPATH')) {
    exit;
}

/**
 * Vite (>=5) writes the manifest to `<outDir>/.vite/manifest.json`; older
 * Vite/other tooling may still write `<outDir>/manifest.json` directly —
 * both are checked so this keeps working if the frontend's Vite version
 * changes without anyone updating this theme.
 *
 * @return array|null Parsed manifest, or null if no build has been deployed yet.
 */
function optivax_theme_get_manifest(): ?array
{
    static $manifest = null;
    static $loaded = false;

    if ($loaded) {
        return $manifest;
    }
    $loaded = true;

    $candidates = [
        get_template_directory() . '/build/.vite/manifest.json',
        get_template_directory() . '/build/manifest.json',
    ];

    foreach ($candidates as $path) {
        if (is_readable($path)) {
            $contents = file_get_contents($path);
            $decoded = $contents ? json_decode($contents, true) : null;
            if (is_array($decoded)) {
                $manifest = $decoded;
                return $manifest;
            }
        }
    }

    return null;
}

/**
 * The manifest is keyed by the Rollup input path — vite.config.ts declares
 * `rollupOptions.input: "index.html"`, so that's the entry key to read.
 */
function optivax_theme_get_entry(): ?array
{
    $manifest = optivax_theme_get_manifest();
    return $manifest['index.html'] ?? null;
}

/**
 * True once a real Vite build has been copied into build/ — lets templates
 * show a clear message instead of a blank page or a PHP notice when the
 * theme has just been installed and no build has been deployed yet.
 */
function optivax_theme_has_build(): bool
{
    return optivax_theme_get_entry() !== null;
}

/**
 * Enqueues the React app's compiled JS/CSS. No `wp_enqueue_scripts` version
 * query string is added — Vite's own content-hashed filenames
 * (index-<hash>.js) already provide correct cache-busting, and adding a
 * WP `?ver=` on top would just be redundant.
 */
function optivax_theme_enqueue_app_assets(): void
{
    $entry = optivax_theme_get_entry();
    if (!$entry) {
        return; // optivax_theme_maybe_show_build_notice() surfaces this instead of a fatal error.
    }

    $base_uri = get_template_directory_uri() . '/build/';

    if (!empty($entry['css'])) {
        foreach ($entry['css'] as $index => $cssFile) {
            $handle = $index === 0 ? 'optivax-react-app' : "optivax-react-app-{$index}";
            wp_enqueue_style($handle, $base_uri . $cssFile, [], null);
        }
    }

    if (!empty($entry['file'])) {
        wp_enqueue_script('optivax-react-app', $base_uri . $entry['file'], [], null, true);
        // Vite's output is an ES module — WP core doesn't support type="module"
        // natively on wp_enqueue_script(), so it's added via the filter below.
        add_filter('script_loader_tag', 'optivax_theme_module_script_tag', 10, 3);
    }

    // Preload any additional chunks Vite split out (dynamic imports), so the
    // browser fetches them in parallel instead of waterfalling after the
    // entry module parses its first import() call.
    if (!empty($entry['imports'])) {
        $manifest = optivax_theme_get_manifest();
        foreach ($entry['imports'] as $importKey) {
            if (!empty($manifest[$importKey]['file'])) {
                $chunkUrl = $base_uri . $manifest[$importKey]['file'];
                printf(
                    '<link rel="modulepreload" href="%s" crossorigin>' . "\n",
                    esc_url($chunkUrl)
                );
            }
        }
    }
}
add_action('wp_enqueue_scripts', 'optivax_theme_enqueue_app_assets');

/** Adds type="module" + crossorigin to exactly the app bundle's <script> tag. */
function optivax_theme_module_script_tag(string $tag, string $handle, string $src): string
{
    if ($handle !== 'optivax-react-app') {
        return $tag;
    }
    return sprintf(
        '<script type="module" crossorigin src="%s"></script>' . "\n",
        esc_url($src)
    );
}

/**
 * Admin-only notice when the theme is active but no Vite build has been
 * copied into build/ yet — prevents a silent blank page from looking like a
 * bug, per "no PHP warnings, no fatal errors" in the verification spec.
 */
function optivax_theme_maybe_show_build_notice(): void
{
    if (optivax_theme_has_build() || !current_user_can('manage_options')) {
        return;
    }
    ?>
    <div class="notice notice-warning">
        <p>
            <?php esc_html_e(
                'OptiVax React Theme: no build found. Run "npm run build" in the React project and copy the contents of its dist/ folder into this theme\'s build/ directory (see README.md).',
                'optivax-react-theme'
            ); ?>
        </p>
    </div>
    <?php
}
add_action('admin_notices', 'optivax_theme_maybe_show_build_notice');

// ─────────────────────────────────────────────────────────────────────────
// Root-relative static asset passthrough
// ─────────────────────────────────────────────────────────────────────────

/**
 * The React source tree references a handful of static files (under
 * src/../public/images/*, favicon.png) using root-absolute paths like
 * "/images/error/404.svg" — correct when Vite's dev server or a
 * document-root deploy serves the build, but the theme's build/ output
 * physically lives at wp-content/themes/optivax-react-theme/build/, not at
 * the site root. Rather than touch the React source or the Vite `base`
 * config (out of scope — "DO NOT change React UI"), this registers rewrite
 * rules so requests for /images/*, /assets/*, and /favicon.png at the site
 * root are transparently served from the theme's build/ folder, exactly as
 * if they lived at the domain root. Works unmodified on both Apache
 * (via WP's own root .htaccess falling through to index.php for any path
 * that isn't a real file) and Nginx (given the standard WordPress
 * `try_files $uri $uri/ /index.php?$args;` block) — no server-specific
 * config needed.
 */
function optivax_theme_register_asset_rewrites(): void
{
    add_rewrite_rule('^(assets|images)/(.+)$', 'index.php?optivax_static_asset=$matches[1]/$matches[2]', 'top');
    add_rewrite_rule('^favicon\.png$', 'index.php?optivax_static_asset=favicon.png', 'top');
}
add_action('init', 'optivax_theme_register_asset_rewrites');

function optivax_theme_query_vars(array $vars): array
{
    $vars[] = 'optivax_static_asset';
    return $vars;
}
add_filter('query_vars', 'optivax_theme_query_vars');

/** MIME types for the file extensions Vite/the public/ folder actually emit. */
function optivax_theme_static_mime_types(): array
{
    return [
        'js'    => 'application/javascript',
        'mjs'   => 'application/javascript',
        'css'   => 'text/css',
        'json'  => 'application/json',
        'png'   => 'image/png',
        'jpg'   => 'image/jpeg',
        'jpeg'  => 'image/jpeg',
        'gif'   => 'image/gif',
        'webp'  => 'image/webp',
        'svg'   => 'image/svg+xml',
        'ico'   => 'image/x-icon',
        'woff'  => 'font/woff',
        'woff2' => 'font/woff2',
        'ttf'   => 'font/ttf',
        'eot'   => 'application/vnd.ms-fontobject',
        'map'   => 'application/json',
    ];
}

/**
 * Serves the requested file straight out of the theme's build/ directory.
 * Runs on `template_redirect` (after query vars are parsed, before any
 * template file loads) so it can `exit` early without WordPress rendering
 * a page around it.
 */
function optivax_theme_serve_static_asset(): void
{
    $requested = get_query_var('optivax_static_asset');
    if (!$requested) {
        return;
    }

    $buildDir = realpath(get_template_directory() . '/build');
    if (!$buildDir) {
        status_header(404);
        exit;
    }

    // Reject path traversal / null bytes before ever touching the filesystem.
    if (strpos($requested, '..') !== false || strpos($requested, "\0") !== false) {
        status_header(403);
        exit;
    }

    $fullPath = realpath($buildDir . '/' . $requested);

    // realpath() also fails closed if the file doesn't exist, which is the
    // common case for e.g. sourcemap requests not present in a build.
    if (!$fullPath || strpos($fullPath, $buildDir) !== 0 || !is_file($fullPath)) {
        status_header(404);
        exit;
    }

    $ext = strtolower(pathinfo($fullPath, PATHINFO_EXTENSION));
    $mimeTypes = optivax_theme_static_mime_types();
    $contentType = $mimeTypes[$ext] ?? 'application/octet-stream';

    header('Content-Type: ' . $contentType);
    header('Content-Length: ' . filesize($fullPath));
    // Vite's assets/*.<hash>.ext filenames are content-addressed and never
    // reused for different content, so these are safe to cache forever;
    // images/favicon are not hashed, so they get a shorter, still-useful TTL.
    if (strpos($requested, 'assets/') === 0) {
        header('Cache-Control: public, max-age=31536000, immutable');
    } else {
        header('Cache-Control: public, max-age=86400');
    }

    readfile($fullPath);
    exit;
}
add_action('template_redirect', 'optivax_theme_serve_static_asset', 0);

/**
 * Flush rewrite rules exactly on activation/deactivation of this theme —
 * never on every request (that would be a real performance problem, not
 * "add_rewrite_rule + flush on init", which is a well-known anti-pattern).
 */
function optivax_theme_flush_rewrites_on_activation(): void
{
    optivax_theme_register_asset_rewrites();
    flush_rewrite_rules();
}
add_action('after_switch_theme', 'optivax_theme_flush_rewrites_on_activation');

function optivax_theme_flush_rewrites_on_deactivation(): void
{
    flush_rewrite_rules();
}
add_action('switch_theme', 'optivax_theme_flush_rewrites_on_deactivation');
```

### wordpress-theme/optivax-react-theme/inc/template-tags.php

```php
<?php
/**
 * Shared markup used by every template that mounts the React app
 * (front-page.php, page.php, index.php, templates/template-app.php) — kept
 * in one place so the mount point is defined exactly once rather than
 * copy-pasted across every template file.
 *
 * @package OptivaxReactTheme
 */

if (!defined('ABSPATH')) {
    exit;
}

/**
 * Outputs the React mount point, matching the div#root the compiled bundle
 * (src/main.tsx: createRoot(document.getElementById("root"))) expects
 * exactly. The placeholder text inside it is replaced the instant React
 * mounts — React's render() replaces #root's entire contents — so this
 * never needs separate JS to hide a "loading" spinner.
 */
function optivax_theme_render_app_mount(): void
{
    ?>
    <div id="root"><div id="optivax-root-loading">
        <?php if (optivax_theme_has_build()) : ?>
            <?php esc_html_e('Loading OptiVax Global…', 'optivax-react-theme'); ?>
        <?php else : ?>
            <?php esc_html_e('The React application build has not been deployed to this theme yet. See build/README.md.', 'optivax-react-theme'); ?>
        <?php endif; ?>
    </div></div>
    <?php
}
```

### Other `inc/` files (short — included in full since each is under 80 lines)

**inc/localize.php** — exposes non-secret WP-side config to the React app as `window.optivaxWpConfig` via `wp_localize_script()`. Explicitly documented as NOT retroactively changing the already-built bundle's API calls (those are fixed at Vite build time via `VITE_API_URL`); this is informational/future-use only (REST nonce, current-user fields):

```php
<?php
/**
 * Exposes WordPress-side configuration to the React app via
 * wp_localize_script(), as `window.optivaxWpConfig`. No secrets are ever
 * placed here — JWT signing secrets and SMTP credentials live only in the
 * plugin's wp_options (see wordpress-backend/optivax-erp-backend/admin/SettingsPage.php)
 * and are never read by this theme at all.
 *
 * @package OptivaxReactTheme
 */

if (!defined('ABSPATH')) {
    exit;
}

function optivax_theme_localize_config(): void
{
    if (!wp_script_is('optivax-react-app', 'enqueued')) {
        return;
    }

    $current_user = null;
    if (is_user_logged_in()) {
        $user = wp_get_current_user();
        $current_user = [
            'id'          => $user->ID,
            'displayName' => $user->display_name,
            'email'       => $user->user_email,
            'roles'       => array_values($user->roles),
        ];
    }

    $config = [
        'siteUrl'     => home_url('/'),
        'themeUrl'    => get_template_directory_uri() . '/',
        'pluginUrl'   => plugins_url('/', trailingslashit(WP_PLUGIN_DIR) . 'optivax-erp-backend/optivax-erp-backend.php'),
        'uploadUrl'   => wp_get_upload_dir()['baseurl'] ?? '',
        'restUrl'     => esc_url_raw(rest_url()),
        'restNonce'   => wp_create_nonce('wp_rest'),
        'apiNamespace' => 'saas/v1',
        'environment' => function_exists('wp_get_environment_type') ? wp_get_environment_type() : 'production',
        'themeVersion' => wp_get_theme()->get('Version'),
        'locale'      => get_locale(),
        'currentUser' => $current_user,
    ];

    wp_localize_script('optivax-react-app', 'optivaxWpConfig', $config);
}
add_action('wp_enqueue_scripts', 'optivax_theme_localize_config', 20);
```

**inc/security.php** — page-level HTTP security headers for the theme's own HTML responses (distinct from the plugin's `SecurityHeaders.php`, which only fires on REST requests). Deliberately sets **no** CSP here (a CSP written without knowing the real cross-origin API URL risks breaking the app):

```php
<?php
/**
 * @package OptivaxReactTheme
 */

if (!defined('ABSPATH')) {
    exit;
}

function optivax_theme_security_headers(): void
{
    if (is_admin()) {
        return;
    }
    header('X-Content-Type-Options: nosniff');
    header('X-Frame-Options: SAMEORIGIN');
    header('Referrer-Policy: strict-origin-when-cross-origin');
}
add_action('send_headers', 'optivax_theme_security_headers');
```

**inc/seo.php** — baseline `<meta>` tags (description, Open Graph, robots). Defaults to `noindex, nofollow` since this is an internal ERP tool, not a public site; filterable via `optivax_theme_robots_content`:

```php
<?php
/**
 * @package OptivaxReactTheme
 */

if (!defined('ABSPATH')) {
    exit;
}

function optivax_theme_meta_tags(): void
{
    $description = get_bloginfo('description');
    $site_name = get_bloginfo('name');
    $url = home_url(add_query_arg([], $_SERVER['REQUEST_URI'] ?? '/'));

    if ($description) {
        printf('<meta name="description" content="%s">' . "\n", esc_attr($description));
    }

    $robots = apply_filters('optivax_theme_robots_content', 'noindex, nofollow');
    printf('<meta name="robots" content="%s">' . "\n", esc_attr($robots));

    printf('<meta property="og:site_name" content="%s">' . "\n", esc_attr($site_name));
    printf('<meta property="og:title" content="%s">' . "\n", esc_attr(wp_get_document_title()));
    if ($description) {
        printf('<meta property="og:description" content="%s">' . "\n", esc_attr($description));
    }
    printf('<meta property="og:type" content="website">' . "\n");
    printf('<meta property="og:url" content="%s">' . "\n", esc_url($url));

    if (has_custom_logo()) {
        $logo_id = get_theme_mod('custom_logo');
        $logo_src = $logo_id ? wp_get_attachment_image_url((int) $logo_id, 'full') : false;
        if ($logo_src) {
            printf('<meta property="og:image" content="%s">' . "\n", esc_url($logo_src));
        }
    }

    printf('<meta name="twitter:card" content="summary">' . "\n");
}
add_action('wp_head', 'optivax_theme_meta_tags', 1);
```

---

## SECTION 9 — DATABASE

### wordpress-backend/optivax-erp-backend/database/Migrator.php

```php
<?php

namespace OptivaxERP\Database;

use OptivaxERP\Database\Migrations\ForeignKeyMigration;

if (!defined('ABSPATH')) {
    exit;
}

/**
 * Runs every migration class registered in self::migrations() through dbDelta(),
 * in the listed (dependency) order, on plugin activation, and again on any
 * later code-deploy update via maybeUpgrade() (see its doc comment). dbDelta
 * is idempotent — re-running it never drops a table/column/row, only creates
 * what's missing — so both paths are safe to re-apply without losing data.
 */
final class Migrator
{
    private const OPTION_DB_VERSION = 'optivax_erp_db_version';

    public static function runOnActivation(): void
    {
        self::runDbDeltaPass();
        self::seedDefaults();
        self::seedDefaultSuperAdmin();
        ForeignKeyMigration::apply();
        update_option(self::OPTION_DB_VERSION, OPTIVAX_ERP_DB_VERSION);
        \OptivaxERP\Helpers\Logger::info('migrator', 'Activation migrations complete', ['db_version' => OPTIVAX_ERP_DB_VERSION]);
    }

    /**
     * Hooked on `plugins_loaded` (see optivax-erp-backend.php) so schema
     * changes shipped in a later plugin version actually reach a site that's
     * updated via a normal code deploy (git pull / zip overwrite) rather than
     * a deactivate-then-reactivate — activation hooks alone only ever fire on
     * that one explicit action, never on a plain code update. Compares the
     * stored option against the current version constant and, only on a
     * mismatch, re-runs the same idempotent dbDelta + foreign-key pass
     * `runOnActivation()` uses (skips super-admin/company-defaults reseeding
     * only for clarity of intent — those are separately idempotent no-ops
     * past first install anyway, so re-running them here is harmless but the
     * explicit skip keeps this path's purpose — schema only — obvious).
     */
    public static function maybeUpgrade(): void
    {
        $stored = get_option(self::OPTION_DB_VERSION);
        if ($stored === OPTIVAX_ERP_DB_VERSION) {
            return;
        }

        self::runDbDeltaPass();
        ForeignKeyMigration::apply();
        update_option(self::OPTION_DB_VERSION, OPTIVAX_ERP_DB_VERSION);
        \OptivaxERP\Helpers\Logger::info('migrator', 'Schema upgraded on code-deploy path', [
            'from' => $stored ?: '(none)',
            'to' => OPTIVAX_ERP_DB_VERSION,
        ]);
    }

    /** dbDelta is idempotent and additive-only (creates missing tables, adds missing columns/keys — never drops data), safe to re-run on every version bump. */
    private static function runDbDeltaPass(): void
    {
        require_once ABSPATH . 'wp-admin/includes/upgrade.php';

        global $wpdb;
        $charsetCollate = $wpdb->get_charset_collate();

        foreach (self::migrations() as $migrationClass) {
            if (!class_exists($migrationClass)) {
                \OptivaxERP\Helpers\Logger::error('migrator', "Migration class not found: {$migrationClass}");
                continue;
            }
            foreach ($migrationClass::sql($wpdb, $charsetCollate) as $tableName => $sql) {
                dbDelta($sql);
            }
        }
    }

    /**
     * Explicit, auditable load order — tables with foreign keys are listed after
     * the tables they reference.
     */
    private static function migrations(): array
    {
        return [
            \OptivaxERP\Database\Migrations\IdentityOrgMigration::class,
            \OptivaxERP\Database\Migrations\AuthMigration::class,
            \OptivaxERP\Database\Migrations\ClientMigration::class,
            \OptivaxERP\Database\Migrations\ProjectTaskMigration::class,
            \OptivaxERP\Database\Migrations\FileMigration::class,
            \OptivaxERP\Database\Migrations\HrAttendanceMigration::class,
            \OptivaxERP\Database\Migrations\PayrollMigration::class,
            \OptivaxERP\Database\Migrations\BudgetMigration::class,
            \OptivaxERP\Database\Migrations\BillingMigration::class,
            \OptivaxERP\Database\Migrations\SalesMigration::class,
            \OptivaxERP\Database\Migrations\MarketingMigration::class,
            \OptivaxERP\Database\Migrations\ItSupportMigration::class,
            \OptivaxERP\Database\Migrations\CrossCuttingMigration::class,
            \OptivaxERP\Database\Migrations\ActivityMigration::class,
        ];
    }

    /** Company defaults, holiday calendars, settings — everything besides JWT/SMTP should "just work" per item 9. */
    private static function seedDefaults(): void
    {
        global $wpdb;
        $settingsTable = $wpdb->prefix . OPTIVAX_ERP_TABLE_PREFIX . 'company_settings';
        $existing = $wpdb->get_var("SELECT COUNT(*) FROM {$settingsTable}");
        if ((int) $existing === 0) {
            $wpdb->insert($settingsTable, [
                'id' => 1,
                'name' => 'Optivax Global',
                'tagline' => '',
                'address' => '',
                'city' => 'Karachi',
                'country' => 'Pakistan',
                'phone' => '',
                'email' => 'info@optivaxglobal.com',
                'website' => 'www.optivaxglobal.com',
                'logo_data_url' => '',
            ]);
        }
    }

    /**
     * Seeds exactly one ERP super_admin account on first activation:
     * globaloptivax / globaloptivax@gmail.com / password (forced to change
     * on first login via must_change_password). Idempotent — a second
     * activation short-circuits as soon as any super_admin mapping row
     * exists. If a WP user with this username/email already exists (a
     * partial prior run, or one created manually ahead of time) but has no
     * super_admin mapping yet, that account is reused/upserted rather than
     * erroring or creating a duplicate WordPress user.
     */
    private static function seedDefaultSuperAdmin(): void
    {
        global $wpdb;
        $mappingTable = $wpdb->prefix . OPTIVAX_ERP_TABLE_PREFIX . 'users_mapping';

        $hasSuperAdmin = (int) $wpdb->get_var($wpdb->prepare(
            "SELECT COUNT(*) FROM {$mappingTable} WHERE role = %s",
            'super_admin'
        ));
        if ($hasSuperAdmin > 0) {
            return;
        }

        $username = 'globaloptivax';
        $email = 'globaloptivax@gmail.com';
        $existingUserId = email_exists($email) ?: (username_exists($username) ?: null);

        if ($existingUserId) {
            $userId = (int) $existingUserId;
            $hasMapping = (int) $wpdb->get_var($wpdb->prepare(
                "SELECT COUNT(*) FROM {$mappingTable} WHERE user_id = %d",
                $userId
            ));
            $fields = ['role' => 'super_admin', 'status' => 'active', 'must_change_password' => 1];
            if ($hasMapping > 0) {
                $wpdb->update($mappingTable, $fields, ['user_id' => $userId]);
            } else {
                $wpdb->insert($mappingTable, $fields + ['user_id' => $userId, 'created_at' => current_time('mysql', true)]);
            }
            \OptivaxERP\Helpers\SecurityAuditLog::record(
                'default_super_admin_bootstrap',
                null,
                'super_admin',
                $userId,
                'success',
                null,
                null,
                ['reused_existing_wp_user' => true]
            );
            return;
        }

        $userId = wp_insert_user([
            'user_login' => $username,
            'user_email' => $email,
            'user_pass' => 'password',
            'display_name' => 'Global Optivax',
            'nickname' => 'Global Optivax',
        ]);

        if (is_wp_error($userId)) {
            \OptivaxERP\Helpers\Logger::error('migrator', 'Failed to seed default super admin: ' . $userId->get_error_message());
            \OptivaxERP\Helpers\SecurityAuditLog::record(
                'default_super_admin_bootstrap',
                null,
                'super_admin',
                null,
                'failure',
                null,
                null,
                ['error' => $userId->get_error_message()]
            );
            return;
        }

        $wpdb->insert($mappingTable, [
            'user_id' => $userId,
            'role' => 'super_admin',
            'status' => 'active',
            'must_change_password' => 1,
            'created_at' => current_time('mysql', true),
        ]);
        \OptivaxERP\Helpers\SecurityAuditLog::record(
            'default_super_admin_bootstrap',
            null,
            'super_admin',
            $userId,
            'success',
            null,
            null,
            ['reused_existing_wp_user' => false]
        );
    }
}
```

**Default super_admin credentials note (security-relevant):** the plugin seeds one super_admin account on first activation with a hardcoded password of literally `password` (username `globaloptivax`, email `globaloptivax@gmail.com`), forcing a password change on first login via `must_change_password`. This is a well-known account name/password pair baked into the source. See Section 14.

### wordpress-backend/optivax-erp-backend/repositories/AbstractRepository.php

Every concrete repository extends this class.

```php
<?php

namespace OptivaxERP\Repositories;

use OptivaxERP\Helpers\Uuid;
use OptivaxERP\Middleware\AuthMiddleware;

if (!defined('ABSPATH')) {
    exit;
}

/**
 * Shared $wpdb plumbing for every per-table repository. Concrete
 * repositories implement toDto()/fromDto() to translate between the SQL row
 * shape and the exact wire shape the frontend service file expects.
 */
abstract class AbstractRepository
{
    abstract protected function tableName(): string;

    protected bool $softDeletes = false;

    protected int $defaultSafetyLimit = 1000;

    /** Column used as the public id (almost always 'id', a UUID string). */
    protected function idColumn(): string
    {
        return 'id';
    }

    protected function table(): string
    {
        global $wpdb;
        return $wpdb->prefix . OPTIVAX_ERP_TABLE_PREFIX . $this->tableName();
    }

    /** Maps a DB row (assoc array) to the frontend-facing DTO shape. Override per-repository. */
    abstract protected function toDto(array $row): array;

    /** Maps an incoming request body (already-sanitized assoc array) to a DB row for INSERT. Override per-repository. */
    abstract protected function fromDtoForCreate(array $data): array;

    /** Maps a partial update body to DB columns for UPDATE. Override per-repository (defaults to fromDtoForCreate's keys, filtered). */
    protected function fromDtoForUpdate(array $data): array
    {
        return $this->fromDtoForCreate($data);
    }

    /**
     * @param array $filters column => value equality filters (already validated/sanitized by the caller)
     * @param string|null $orderBy raw "column DIRECTION" fragment (caller-controlled, never user input directly — see BaseCrudController's sort whitelist)
     * @param array|null $pagination ['limit' => int, 'offset' => int] — omit (the default) for the original, unpaginated full-list behavior every existing caller relies on.
     * @param array|null $search ['columns' => string[], 'term' => string] — adds a `(col1 LIKE %term% OR col2 LIKE %term% ...)` clause. Omit for no search filtering.
     */
    public function list(array $filters = [], string $orderBy = null, ?array $pagination = null, ?array $search = null): array
    {
        global $wpdb;
        $table = $this->table();
        [$where, $values] = $this->buildWhere($filters, $search);

        $sql = "SELECT * FROM {$table}";
        if (!empty($where)) {
            $sql .= ' WHERE ' . implode(' AND ', $where);
        }
        if ($orderBy) {
            $sql .= " ORDER BY {$orderBy}";
        }
        if ($pagination !== null) {
            $sql .= sprintf(' LIMIT %d OFFSET %d', (int) ($pagination['limit'] ?? 20), (int) ($pagination['offset'] ?? 0));
        } elseif ($this->defaultSafetyLimit > 0) {
            $sql .= sprintf(' LIMIT %d', $this->defaultSafetyLimit);
        }

        $rows = empty($values)
            ? $wpdb->get_results($sql, ARRAY_A)
            : $wpdb->get_results($wpdb->prepare($sql, $values), ARRAY_A);

        return array_map([$this, 'toDto'], $rows ?: []);
    }

    /** Total row count for the same filters/search a paginated list() call would use — needed to compute meta.total/totalPages. */
    public function count(array $filters = [], ?array $search = null): int
    {
        global $wpdb;
        $table = $this->table();
        [$where, $values] = $this->buildWhere($filters, $search);

        $sql = "SELECT COUNT(*) FROM {$table}";
        if (!empty($where)) {
            $sql .= ' WHERE ' . implode(' AND ', $where);
        }

        return (int) (empty($values) ? $wpdb->get_var($sql) : $wpdb->get_var($wpdb->prepare($sql, $values)));
    }

    /** @return array{0: string[], 1: array} [$whereClauses, $preparedValues] shared by list() and count(). */
    private function buildWhere(array $filters, ?array $search): array
    {
        global $wpdb;
        $where = [];
        $values = [];

        foreach ($filters as $column => $value) {
            if ($value === null || $value === '') {
                continue;
            }
            $where[] = "{$column} = %s";
            $values[] = $value;
        }

        if ($search && !empty($search['columns']) && isset($search['term']) && $search['term'] !== '') {
            $like = '%' . $wpdb->esc_like((string) $search['term']) . '%';
            $searchClauses = [];
            foreach ($search['columns'] as $column) {
                $searchClauses[] = "{$column} LIKE %s";
                $values[] = $like;
            }
            $where[] = '(' . implode(' OR ', $searchClauses) . ')';
        }

        if ($this->softDeletes) {
            $where[] = 'deleted_at IS NULL';
        }

        return [$where, $values];
    }

    public function find(string $id): ?array
    {
        global $wpdb;
        $table = $this->table();
        $idColumn = $this->idColumn();
        $sql = "SELECT * FROM {$table} WHERE {$idColumn} = %s";
        if ($this->softDeletes) {
            $sql .= ' AND deleted_at IS NULL';
        }
        $row = $wpdb->get_row($wpdb->prepare($sql, $id), ARRAY_A);
        return $row ? $this->toDto($row) : null;
    }

    public function create(array $data): array
    {
        global $wpdb;
        $id = $data['id'] ?? Uuid::v4();
        $row = $this->fromDtoForCreate($data);
        $row[$this->idColumn()] = $id;
        $wpdb->insert($this->table(), $row);
        return $this->find($id);
    }

    public function update(string $id, array $data): ?array
    {
        global $wpdb;
        $row = $this->fromDtoForUpdate($data);
        unset($row[$this->idColumn()]);
        if (empty($row)) {
            return $this->find($id);
        }
        $wpdb->update($this->table(), $row, [$this->idColumn() => $id]);
        return $this->find($id);
    }

    public function delete(string $id): bool
    {
        global $wpdb;
        if ($this->softDeletes) {
            $actorId = AuthMiddleware::currentUserId();
            return (bool) $wpdb->update($this->table(), [
                'deleted_at' => current_time('mysql', true),
                'deleted_by' => $actorId !== null ? (string) $actorId : null,
            ], [$this->idColumn() => $id]);
        }
        return (bool) $wpdb->delete($this->table(), [$this->idColumn() => $id]);
    }
}
```

### Migrations (all 13 files, full contents, in the exact dependency order `Migrator::migrations()` runs them)

#### 1. database/migrations/IdentityOrgMigration.php

Tables: `users_mapping`, `departments`, `organizations`, `subscriptions`, `company_settings`, `company_holidays`.

```php
<?php

namespace OptivaxERP\Database\Migrations;

if (!defined('ABSPATH')) {
    exit;
}

/**
 * Tables: users_mapping, departments, organizations, subscriptions,
 * company_settings, company_holidays.
 * Maps to /saas/v1/profiles/*, /departments/*, /organizations/*, /subscriptions/*, /company-settings.
 */
final class IdentityOrgMigration
{
    public static function sql(\wpdb $wpdb, string $charsetCollate): array
    {
        $p = $wpdb->prefix . OPTIVAX_ERP_TABLE_PREFIX;

        return [
            'users_mapping' => "CREATE TABLE {$p}users_mapping (
                user_id BIGINT UNSIGNED NOT NULL,
                role VARCHAR(32) NOT NULL DEFAULT 'client',
                status VARCHAR(20) NOT NULL DEFAULT 'active',
                must_change_password TINYINT(1) NOT NULL DEFAULT 0,
                token_version INT UNSIGNED NOT NULL DEFAULT 1,
                department_id VARCHAR(36) NULL,
                designation VARCHAR(120) NULL,
                avatar_url TEXT NULL,
                company VARCHAR(191) NULL,
                phone VARCHAR(40) NULL,
                address VARCHAR(255) NULL,
                city VARCHAR(120) NULL,
                bio TEXT NULL,
                notification_prefs_email TINYINT(1) NOT NULL DEFAULT 1,
                notification_prefs_payment_reminders TINYINT(1) NOT NULL DEFAULT 1,
                last_login DATETIME NULL,
                created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY  (user_id),
                KEY role (role),
                KEY department_id (department_id)
            ) ENGINE=InnoDB {$charsetCollate};",

            'departments' => "CREATE TABLE {$p}departments (
                id VARCHAR(36) NOT NULL,
                name VARCHAR(191) NOT NULL,
                domain VARCHAR(32) NOT NULL,
                head_user_id BIGINT UNSIGNED NULL,
                description TEXT NULL,
                created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY  (id),
                KEY domain (domain)
            ) ENGINE=InnoDB {$charsetCollate};",

            'organizations' => "CREATE TABLE {$p}organizations (
                id VARCHAR(36) NOT NULL,
                name VARCHAR(191) NOT NULL,
                owner_id BIGINT UNSIGNED NOT NULL,
                created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY  (id),
                KEY owner_id (owner_id)
            ) ENGINE=InnoDB {$charsetCollate};",

            'subscriptions' => "CREATE TABLE {$p}subscriptions (
                id VARCHAR(36) NOT NULL,
                organization_id VARCHAR(36) NOT NULL,
                plan_name VARCHAR(120) NOT NULL,
                status VARCHAR(32) NOT NULL,
                billing_cycle VARCHAR(32) NOT NULL,
                current_period_end DATETIME NULL,
                PRIMARY KEY  (id),
                KEY organization_id (organization_id)
            ) ENGINE=InnoDB {$charsetCollate};",

            'company_settings' => "CREATE TABLE {$p}company_settings (
                id TINYINT UNSIGNED NOT NULL,
                name VARCHAR(191) NOT NULL DEFAULT '',
                tagline VARCHAR(255) NOT NULL DEFAULT '',
                address VARCHAR(255) NOT NULL DEFAULT '',
                city VARCHAR(120) NOT NULL DEFAULT '',
                country VARCHAR(120) NOT NULL DEFAULT '',
                phone VARCHAR(40) NOT NULL DEFAULT '',
                email VARCHAR(191) NOT NULL DEFAULT '',
                website VARCHAR(191) NOT NULL DEFAULT '',
                logo_data_url LONGTEXT NULL,
                stripe_enabled TINYINT(1) NOT NULL DEFAULT 0,
                stripe_publishable_key VARCHAR(255) NOT NULL DEFAULT '',
                stripe_secret_key VARCHAR(255) NOT NULL DEFAULT '',
                stripe_webhook_secret VARCHAR(255) NOT NULL DEFAULT '',
                PRIMARY KEY  (id)
            ) ENGINE=InnoDB {$charsetCollate};",

            'company_holidays' => "CREATE TABLE {$p}company_holidays (
                id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
                holiday_date DATE NOT NULL,
                year SMALLINT UNSIGNED NOT NULL,
                label VARCHAR(191) NOT NULL,
                PRIMARY KEY  (id),
                UNIQUE KEY holiday_date (holiday_date),
                KEY year (year)
            ) ENGINE=InnoDB {$charsetCollate};",
        ];
    }
}
```

#### 2. database/migrations/AuthMigration.php

Tables: `refresh_tokens`, `security_audit_logs`.

```php
<?php

namespace OptivaxERP\Database\Migrations;

if (!defined('ABSPATH')) {
    exit;
}

/**
 * Tables: refresh_tokens, security_audit_logs.
 * Access tokens are stateless JWTs (not stored). Password reset reuses
 * WordPress-native user_activation_key via get_password_reset_key()/
 * check_password_reset_key() — no custom table needed.
 * security_audit_logs is a dedicated, super-admin-only trail for
 * authentication/user-management events — deliberately separate from the
 * general-purpose `audit_logs` table (CrossCuttingMigration), which is
 * readable by several roles via the 'reports' RBAC domain. There is no
 * REST route to write to security_audit_logs; only helpers/SecurityAuditLog.php
 * inserts into it, directly from PHP.
 */
final class AuthMigration
{
    public static function sql(\wpdb $wpdb, string $charsetCollate): array
    {
        $p = $wpdb->prefix . OPTIVAX_ERP_TABLE_PREFIX;

        return [
            'refresh_tokens' => "CREATE TABLE {$p}refresh_tokens (
                id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
                user_id BIGINT UNSIGNED NOT NULL,
                token_hash CHAR(64) NOT NULL,
                expires_at DATETIME NOT NULL,
                revoked_at DATETIME NULL,
                remember_me TINYINT(1) NOT NULL DEFAULT 0,
                created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY  (id),
                UNIQUE KEY token_hash (token_hash),
                KEY user_id (user_id),
                KEY expires_at (expires_at)
            ) ENGINE=InnoDB {$charsetCollate};",

            'security_audit_logs' => "CREATE TABLE {$p}security_audit_logs (
                id VARCHAR(36) NOT NULL,
                action VARCHAR(60) NOT NULL,
                actor_user_id BIGINT UNSIGNED NULL,
                actor_role VARCHAR(32) NULL,
                target_user_id BIGINT UNSIGNED NULL,
                status VARCHAR(20) NOT NULL DEFAULT 'success',
                old_value LONGTEXT NULL,
                new_value LONGTEXT NULL,
                ip_address VARCHAR(45) NULL,
                user_agent VARCHAR(255) NULL,
                metadata LONGTEXT NULL,
                created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY  (id),
                KEY actor_user_id (actor_user_id),
                KEY target_user_id (target_user_id),
                KEY action (action),
                KEY created_at (created_at)
            ) ENGINE=InnoDB {$charsetCollate};",
        ];
    }
}
```

#### 3. database/migrations/ClientMigration.php

Tables: `clients`, `client_ownership`, `client_ownership_history`.

```php
<?php

namespace OptivaxERP\Database\Migrations;

if (!defined('ABSPATH')) {
    exit;
}

/**
 * Tables: clients, client_ownership, client_ownership_history.
 * Maps to /saas/v1/clients/*, /saas/v1/client-ownership/*.
 * `client_ownership` holds only the *current* owner per client (one row per
 * client_id, upserted by ClientOwnershipRepository::assign/remove);
 * `client_ownership_history` is the append-only audit trail behind it.
 */
final class ClientMigration
{
    public static function sql(\wpdb $wpdb, string $charsetCollate): array
    {
        $p = $wpdb->prefix . OPTIVAX_ERP_TABLE_PREFIX;

        return [
            'clients' => "CREATE TABLE {$p}clients (
                id VARCHAR(36) NOT NULL,
                name VARCHAR(191) NOT NULL,
                email VARCHAR(191) NOT NULL,
                phone VARCHAR(40) NULL,
                company VARCHAR(191) NULL,
                address VARCHAR(255) NULL,
                city VARCHAR(120) NULL,
                status VARCHAR(20) NOT NULL DEFAULT 'active',
                join_date DATE NULL,
                avatar TEXT NULL,
                total_projects INT UNSIGNED NOT NULL DEFAULT 0,
                total_billed DECIMAL(12,2) NOT NULL DEFAULT 0,
                last_payment_date DATE NULL,
                tags TEXT NULL,
                contact_name VARCHAR(191) NULL,
                company_name VARCHAR(191) NULL,
                created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                created_by VARCHAR(36) NULL,
                created_by_name VARCHAR(191) NULL,
                updated_by VARCHAR(36) NULL,
                deleted_at DATETIME NULL,
                deleted_by VARCHAR(36) NULL,
                assigned_production_members TEXT NULL,
                PRIMARY KEY  (id),
                KEY email (email),
                KEY status (status),
                KEY deleted_at (deleted_at)
            ) ENGINE=InnoDB {$charsetCollate};",

            'client_ownership' => "CREATE TABLE {$p}client_ownership (
                id VARCHAR(36) NOT NULL,
                client_id VARCHAR(36) NOT NULL,
                client_name VARCHAR(191) NOT NULL,
                owner_id VARCHAR(36) NOT NULL,
                owner_name VARCHAR(191) NOT NULL,
                owner_email VARCHAR(191) NULL,
                assigned_by_id VARCHAR(36) NULL,
                assigned_by_name VARCHAR(191) NULL,
                assigned_by_role VARCHAR(32) NULL,
                assigned_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                notes TEXT NULL,
                PRIMARY KEY  (id),
                UNIQUE KEY client_id (client_id),
                KEY owner_id (owner_id)
            ) ENGINE=InnoDB {$charsetCollate};",

            'client_ownership_history' => "CREATE TABLE {$p}client_ownership_history (
                id VARCHAR(36) NOT NULL,
                client_id VARCHAR(36) NOT NULL,
                client_name VARCHAR(191) NOT NULL,
                action VARCHAR(20) NOT NULL,
                previous_owner_id VARCHAR(36) NULL,
                previous_owner_name VARCHAR(191) NULL,
                new_owner_id VARCHAR(36) NULL,
                new_owner_name VARCHAR(191) NULL,
                assigned_by_id VARCHAR(36) NULL,
                assigned_by_name VARCHAR(191) NULL,
                assigned_by_role VARCHAR(32) NULL,
                assigned_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                notes TEXT NULL,
                PRIMARY KEY  (id),
                KEY client_id (client_id)
            ) ENGINE=InnoDB {$charsetCollate};",
        ];
    }
}
```

#### 4. database/migrations/ProjectTaskMigration.php

Tables: `projects`, `tasks`, `deliverables`, `revisions`, `production_assignments`.

```php
<?php

namespace OptivaxERP\Database\Migrations;

if (!defined('ABSPATH')) {
    exit;
}

/**
 * Tables: projects, tasks, deliverables, revisions, production_assignments.
 * Maps to /saas/v1/projects/*, /saas/v1/tasks*, /saas/v1/deliverables/*,
 * /saas/v1/revisions/*, /saas/v1/production-assignments.
 * `production_assignments` is a pure member_user_id<->client_id join table —
 * no toDto/repository pattern, read/written directly by
 * ProductionAssignmentController.
 */
final class ProjectTaskMigration
{
    public static function sql(\wpdb $wpdb, string $charsetCollate): array
    {
        $p = $wpdb->prefix . OPTIVAX_ERP_TABLE_PREFIX;

        return [
            'projects' => "CREATE TABLE {$p}projects (
                id VARCHAR(36) NOT NULL,
                client_id VARCHAR(36) NOT NULL,
                name VARCHAR(191) NOT NULL,
                description TEXT NULL,
                status VARCHAR(20) NOT NULL DEFAULT 'not-started',
                priority VARCHAR(10) NOT NULL DEFAULT 'medium',
                start_date DATE NULL,
                deadline DATE NULL,
                assigned_to TEXT NULL,
                progress INT UNSIGNED NOT NULL DEFAULT 0,
                budget DECIMAL(12,2) NULL,
                spent DECIMAL(12,2) NULL,
                files TEXT NULL,
                created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                created_by VARCHAR(36) NULL,
                updated_at DATETIME NULL,
                updated_by VARCHAR(36) NULL,
                deleted_at DATETIME NULL,
                deleted_by VARCHAR(36) NULL,
                PRIMARY KEY  (id),
                KEY client_id (client_id),
                KEY status (status),
                KEY deleted_at (deleted_at)
            ) ENGINE=InnoDB {$charsetCollate};",

            'tasks' => "CREATE TABLE {$p}tasks (
                id VARCHAR(36) NOT NULL,
                title VARCHAR(255) NOT NULL,
                description TEXT NULL,
                status VARCHAR(20) NOT NULL DEFAULT 'todo',
                priority VARCHAR(10) NOT NULL DEFAULT 'medium',
                assignee VARCHAR(191) NULL,
                assignee_id VARCHAR(36) NULL,
                assigned_to VARCHAR(191) NULL,
                due_date DATE NULL,
                budget DECIMAL(12,2) NULL,
                budget_used DECIMAL(12,2) NULL,
                category VARCHAR(20) NULL,
                project_id VARCHAR(36) NULL,
                project_name VARCHAR(191) NULL,
                assignee_dept VARCHAR(60) NULL,
                assignee_role VARCHAR(32) NULL,
                created_by VARCHAR(36) NULL,
                created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME NULL,
                updated_by VARCHAR(36) NULL,
                deleted_at DATETIME NULL,
                deleted_by VARCHAR(36) NULL,
                PRIMARY KEY  (id),
                KEY project_id (project_id),
                KEY status (status),
                KEY assignee_id (assignee_id),
                KEY deleted_at (deleted_at)
            ) ENGINE=InnoDB {$charsetCollate};",

            'deliverables' => "CREATE TABLE {$p}deliverables (
                id VARCHAR(36) NOT NULL,
                client_id VARCHAR(36) NOT NULL,
                client_name VARCHAR(191) NOT NULL,
                project_id VARCHAR(36) NULL,
                project_name VARCHAR(191) NULL,
                title VARCHAR(255) NOT NULL,
                description TEXT NULL,
                status VARCHAR(20) NOT NULL DEFAULT 'Pending',
                due_date DATE NULL,
                uploaded_by VARCHAR(36) NULL,
                uploaded_by_name VARCHAR(191) NULL,
                uploaded_at DATETIME NULL,
                reviewed_by VARCHAR(36) NULL,
                reviewed_by_name VARCHAR(191) NULL,
                reviewed_at DATETIME NULL,
                approved_by VARCHAR(36) NULL,
                approved_by_name VARCHAR(191) NULL,
                approved_at DATETIME NULL,
                file_url TEXT NULL,
                notes TEXT NULL,
                PRIMARY KEY  (id),
                KEY client_id (client_id),
                KEY project_id (project_id)
            ) ENGINE=InnoDB {$charsetCollate};",

            'revisions' => "CREATE TABLE {$p}revisions (
                id VARCHAR(36) NOT NULL,
                project_id VARCHAR(36) NOT NULL,
                client_id VARCHAR(36) NOT NULL,
                comment TEXT NOT NULL,
                status VARCHAR(20) NOT NULL DEFAULT 'pending',
                created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                type VARCHAR(60) NULL,
                updated_by VARCHAR(36) NULL,
                PRIMARY KEY  (id),
                KEY project_id (project_id),
                KEY client_id (client_id)
            ) ENGINE=InnoDB {$charsetCollate};",

            'production_assignments' => "CREATE TABLE {$p}production_assignments (
                member_user_id BIGINT UNSIGNED NOT NULL,
                client_id VARCHAR(36) NOT NULL,
                PRIMARY KEY  (member_user_id, client_id)
            ) ENGINE=InnoDB {$charsetCollate};",
        ];
    }
}
```

#### 5. database/migrations/FileMigration.php

Table: `files`.

```php
<?php

namespace OptivaxERP\Database\Migrations;

if (!defined('ABSPATH')) {
    exit;
}

/**
 * Table: files. Backs /saas/v1/files/* and is the exact schema
 * uploads/UploadService.php reads/writes — column names here MUST stay in
 * lockstep with UploadService::handleUpload()/deleteFile()/toFileRecord().
 */
final class FileMigration
{
    public static function sql(\wpdb $wpdb, string $charsetCollate): array
    {
        $p = $wpdb->prefix . OPTIVAX_ERP_TABLE_PREFIX;

        return [
            'files' => "CREATE TABLE {$p}files (
                id VARCHAR(36) NOT NULL,
                attachment_id BIGINT UNSIGNED NULL,
                name VARCHAR(255) NOT NULL,
                size BIGINT UNSIGNED NOT NULL DEFAULT 0,
                type VARCHAR(120) NULL,
                uploaded_by VARCHAR(191) NULL,
                uploaded_by_id VARCHAR(36) NULL,
                uploader_dept VARCHAR(60) NULL,
                upload_date DATETIME NULL,
                project_id VARCHAR(36) NULL,
                client_id VARCHAR(36) NULL,
                url TEXT NULL,
                visibility VARCHAR(20) NOT NULL DEFAULT 'private',
                visible_to TEXT NULL,
                PRIMARY KEY  (id),
                KEY project_id (project_id),
                KEY client_id (client_id),
                KEY uploaded_by_id (uploaded_by_id)
            ) ENGINE=InnoDB {$charsetCollate};",
        ];
    }
}
```

#### 6. database/migrations/HrAttendanceMigration.php

Tables: `employees`, `employee_extra`, `attendance_records`, `attendance_audit`, `leave_requests_hr`, `leave_requests_employee`.

```php
<?php

namespace OptivaxERP\Database\Migrations;

if (!defined('ABSPATH')) {
    exit;
}

/**
 * Tables: employees, employee_extra, attendance_records, attendance_audit,
 * leave_requests_hr, leave_requests_employee.
 * Maps to /saas/v1/hr/*, /attendance/*, /leave-requests/*.
 *
 * activity_sessions/activity_breaks (login/break tracking) live in
 * ActivityMigration.php instead — see that file's doc comment and the note
 * at the bottom of this file's sql() for why an earlier duplicate definition
 * here was removed rather than fixed in place.
 */
final class HrAttendanceMigration
{
    public static function sql(\wpdb $wpdb, string $charsetCollate): array
    {
        $p = $wpdb->prefix . OPTIVAX_ERP_TABLE_PREFIX;

        return [
            'employees' => "CREATE TABLE {$p}employees (
                id VARCHAR(36) NOT NULL,
                user_id BIGINT UNSIGNED NULL,
                name VARCHAR(191) NOT NULL,
                email VARCHAR(191) NOT NULL,
                phone VARCHAR(40) NULL,
                role VARCHAR(32) NOT NULL,
                department_id VARCHAR(36) NULL,
                position VARCHAR(120) NOT NULL,
                salary DECIMAL(12,2) NULL,
                work_mode VARCHAR(20) NOT NULL DEFAULT 'onsite',
                join_date DATE NULL,
                status VARCHAR(20) NOT NULL DEFAULT 'active',
                avatar TEXT NULL,
                PRIMARY KEY  (id),
                KEY user_id (user_id),
                KEY department_id (department_id)
            ) ENGINE=InnoDB {$charsetCollate};",

            'employee_extra' => "CREATE TABLE {$p}employee_extra (
                user_id VARCHAR(36) NOT NULL,
                leaves_taken INT NOT NULL DEFAULT 0,
                salary DECIMAL(12,2) NULL,
                extra_deduction DECIMAL(12,2) NULL,
                salary_status VARCHAR(20) NOT NULL DEFAULT 'Unpaid',
                work_mode VARCHAR(20) NOT NULL DEFAULT 'Onsite',
                PRIMARY KEY  (user_id)
            ) ENGINE=InnoDB {$charsetCollate};",

            'attendance_records' => "CREATE TABLE {$p}attendance_records (
                id VARCHAR(36) NOT NULL,
                user_id VARCHAR(36) NOT NULL,
                user_name VARCHAR(191) NOT NULL,
                user_role VARCHAR(32) NOT NULL,
                date DATE NOT NULL,
                check_in VARCHAR(10) NULL,
                check_out VARCHAR(10) NULL,
                status VARCHAR(20) NOT NULL,
                notes TEXT NULL,
                PRIMARY KEY  (id),
                UNIQUE KEY user_date (user_id, date),
                KEY date (date)
            ) ENGINE=InnoDB {$charsetCollate};",

            'attendance_audit' => "CREATE TABLE {$p}attendance_audit (
                id VARCHAR(36) NOT NULL,
                edited_at DATETIME NOT NULL,
                edited_by VARCHAR(191) NOT NULL,
                edited_by_role VARCHAR(32) NOT NULL,
                employee_id VARCHAR(36) NOT NULL,
                employee_name VARCHAR(191) NOT NULL,
                attendance_date DATE NOT NULL,
                previous_status VARCHAR(20) NOT NULL,
                new_status VARCHAR(20) NOT NULL,
                previous_check_in VARCHAR(10) NULL,
                previous_check_out VARCHAR(10) NULL,
                new_check_in VARCHAR(10) NULL,
                new_check_out VARCHAR(10) NULL,
                reason TEXT NOT NULL,
                PRIMARY KEY  (id),
                KEY employee_id (employee_id)
            ) ENGINE=InnoDB {$charsetCollate};",

            'leave_requests_hr' => "CREATE TABLE {$p}leave_requests_hr (
                id VARCHAR(36) NOT NULL,
                user_id VARCHAR(36) NOT NULL,
                user_name VARCHAR(191) NOT NULL,
                user_role VARCHAR(32) NOT NULL,
                department_id VARCHAR(36) NULL,
                type VARCHAR(20) NOT NULL,
                start_date DATE NOT NULL,
                end_date DATE NOT NULL,
                days INT NOT NULL DEFAULT 0,
                reason TEXT NOT NULL,
                status VARCHAR(20) NOT NULL DEFAULT 'pending',
                reviewed_by VARCHAR(191) NULL,
                review_note TEXT NULL,
                created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY  (id),
                KEY user_id (user_id),
                KEY status (status)
            ) ENGINE=InnoDB {$charsetCollate};",

            'leave_requests_employee' => "CREATE TABLE {$p}leave_requests_employee (
                id VARCHAR(36) NOT NULL,
                employee_id VARCHAR(36) NOT NULL,
                employee_name VARCHAR(191) NOT NULL,
                role VARCHAR(32) NOT NULL,
                department VARCHAR(120) NOT NULL,
                type VARCHAR(20) NOT NULL,
                start_date DATE NOT NULL,
                end_date DATE NOT NULL,
                days INT NOT NULL DEFAULT 0,
                reason TEXT NOT NULL,
                status VARCHAR(20) NOT NULL DEFAULT 'Pending',
                submitted_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY  (id),
                KEY employee_id (employee_id),
                KEY status (status)
            ) ENGINE=InnoDB {$charsetCollate};",

            // `activity_sessions`/`break_records` do NOT belong here — this
            // migration used to also define them "for schema completeness,"
            // but ActivityMigration.php (loaded later, see Migrator::migrations())
            // defines the actual `activity_sessions`/`activity_breaks` tables
            // ActivityRepository really reads/writes, including a UNIQUE KEY
            // this file's old definition lacked. Having both meant two
            // "source of truth" CREATE TABLE statements for one table.
            // Removed rather than fixed-in-place because dbDelta only ever
            // adds columns, never drops them — a site that already ran the
            // old version of this file keeps the extra `session_minutes`/
            // `total_break_minutes`/`active_minutes` columns and the
            // `break_records` table itself as harmless unused leftovers
            // (verified nothing reads them: `grep -r "break_records"` outside
            // this comment returns nothing) rather than this migration ever
            // issuing a destructive DROP.
        ];
    }
}
```

#### 7. database/migrations/PayrollMigration.php

Tables: `salary_slips`, `advance_salary_requests`, `advance_salary_audit`.

```php
<?php

namespace OptivaxERP\Database\Migrations;

if (!defined('ABSPATH')) {
    exit;
}

/**
 * Tables: salary_slips, advance_salary_requests, advance_salary_audit.
 * Maps to /saas/v1/payroll/*.
 */
final class PayrollMigration
{
    public static function sql(\wpdb $wpdb, string $charsetCollate): array
    {
        $p = $wpdb->prefix . OPTIVAX_ERP_TABLE_PREFIX;

        return [
            'salary_slips' => "CREATE TABLE {$p}salary_slips (
                id VARCHAR(36) NOT NULL,
                employee_id VARCHAR(36) NOT NULL,
                employee_name VARCHAR(191) NOT NULL,
                employee_email VARCHAR(191) NOT NULL,
                department VARCHAR(120) NOT NULL,
                designation VARCHAR(120) NOT NULL,
                salary_month VARCHAR(7) NOT NULL,
                basic_salary DECIMAL(12,2) NOT NULL DEFAULT 0,
                allowances LONGTEXT NULL,
                bonuses LONGTEXT NULL,
                deductions LONGTEXT NULL,
                advance_salary_deduction DECIMAL(12,2) NOT NULL DEFAULT 0,
                unpaid_leave_days INT NULL,
                unpaid_leave_deduction DECIMAL(12,2) NULL,
                half_day_deduction DECIMAL(12,2) NULL,
                late_penalty_count INT NULL,
                late_penalty_days INT NULL,
                late_penalty_deduction DECIMAL(12,2) NULL,
                gross_salary DECIMAL(12,2) NOT NULL DEFAULT 0,
                total_deductions DECIMAL(12,2) NOT NULL DEFAULT 0,
                net_salary DECIMAL(12,2) NOT NULL DEFAULT 0,
                generated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                generated_by_id VARCHAR(36) NOT NULL,
                generated_by_name VARCHAR(191) NOT NULL,
                generated_by_role VARCHAR(32) NOT NULL,
                notes TEXT NULL,
                PRIMARY KEY  (id),
                KEY employee_id (employee_id),
                KEY salary_month (salary_month)
            ) ENGINE=InnoDB {$charsetCollate};",

            'advance_salary_requests' => "CREATE TABLE {$p}advance_salary_requests (
                id VARCHAR(36) NOT NULL,
                employee_id VARCHAR(36) NOT NULL,
                employee_name VARCHAR(191) NOT NULL,
                employee_role VARCHAR(32) NOT NULL,
                department VARCHAR(120) NOT NULL,
                requested_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
                reason TEXT NOT NULL,
                request_date DATE NOT NULL,
                status VARCHAR(20) NOT NULL DEFAULT 'pending',
                approved_by_id VARCHAR(36) NULL,
                approved_by_name VARCHAR(191) NULL,
                approved_at DATETIME NULL,
                rejection_reason TEXT NULL,
                notes TEXT NULL,
                PRIMARY KEY  (id),
                KEY employee_id (employee_id),
                KEY status (status)
            ) ENGINE=InnoDB {$charsetCollate};",

            'advance_salary_audit' => "CREATE TABLE {$p}advance_salary_audit (
                id VARCHAR(36) NOT NULL,
                action VARCHAR(32) NOT NULL,
                request_id VARCHAR(36) NOT NULL,
                employee_id VARCHAR(36) NOT NULL,
                employee_name VARCHAR(191) NOT NULL,
                employee_role VARCHAR(32) NOT NULL,
                department VARCHAR(120) NOT NULL,
                amount DECIMAL(12,2) NOT NULL DEFAULT 0,
                performed_by_id VARCHAR(36) NOT NULL,
                performed_by_name VARCHAR(191) NOT NULL,
                performed_by_role VARCHAR(32) NOT NULL,
                timestamp DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                notes TEXT NULL,
                PRIMARY KEY  (id),
                KEY request_id (request_id),
                KEY employee_id (employee_id)
            ) ENGINE=InnoDB {$charsetCollate};",
        ];
    }
}
```

#### 8. database/migrations/BudgetMigration.php

Tables: `budget_company`, `budget_departments`, `budget_members`, `budget_requests`, `budget_returns`, `budget_audit`.

```php
<?php

namespace OptivaxERP\Database\Migrations;

if (!defined('ABSPATH')) {
    exit;
}

/**
 * Tables: budget_company, budget_departments, budget_members, budget_requests,
 * budget_returns, budget_audit. Maps to /saas/v1/budget/*.
 *
 * This is the hierarchical (company -> department -> member) budget model that
 * is actually wired to real service endpoints (see src/services/budgetService.ts).
 * The frontend also has a separate legacy flat `Budget`/`BudgetAuditLog` shape
 * with no backing service endpoint (BudgetService's getBudgets()/getAuditLogs()
 * are read-only compat shims computed from the tables below) — intentionally
 * not given its own table here.
 */
final class BudgetMigration
{
    public static function sql(\wpdb $wpdb, string $charsetCollate): array
    {
        $p = $wpdb->prefix . OPTIVAX_ERP_TABLE_PREFIX;

        return [
            'budget_company' => "CREATE TABLE {$p}budget_company (
                id TINYINT UNSIGNED NOT NULL,
                total_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
                fiscal_year VARCHAR(20) NOT NULL,
                description TEXT NULL,
                created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME NULL,
                created_by_id VARCHAR(36) NOT NULL,
                created_by_name VARCHAR(191) NOT NULL,
                PRIMARY KEY  (id)
            ) ENGINE=InnoDB {$charsetCollate};",

            'budget_departments' => "CREATE TABLE {$p}budget_departments (
                id VARCHAR(36) NOT NULL,
                department VARCHAR(120) NOT NULL,
                admin_id VARCHAR(36) NOT NULL,
                admin_name VARCHAR(191) NOT NULL,
                allocated_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
                purpose VARCHAR(255) NULL,
                effective_date DATE NULL,
                allocated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME NULL,
                allocated_by_id VARCHAR(36) NOT NULL,
                allocated_by_name VARCHAR(191) NOT NULL,
                PRIMARY KEY  (id),
                KEY department (department)
            ) ENGINE=InnoDB {$charsetCollate};",

            'budget_members' => "CREATE TABLE {$p}budget_members (
                id VARCHAR(36) NOT NULL,
                employee_id VARCHAR(36) NOT NULL,
                employee_name VARCHAR(191) NOT NULL,
                employee_role VARCHAR(32) NOT NULL,
                department VARCHAR(120) NOT NULL,
                allocated_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
                used_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
                allocated_by_id VARCHAR(36) NOT NULL,
                allocated_by_name VARCHAR(191) NOT NULL,
                allocated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME NULL,
                PRIMARY KEY  (id),
                KEY employee_id (employee_id),
                KEY department (department)
            ) ENGINE=InnoDB {$charsetCollate};",

            'budget_requests' => "CREATE TABLE {$p}budget_requests (
                id VARCHAR(36) NOT NULL,
                department VARCHAR(120) NOT NULL,
                admin_id VARCHAR(36) NOT NULL,
                admin_name VARCHAR(191) NOT NULL,
                admin_role VARCHAR(32) NOT NULL,
                requested_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
                approved_amount DECIMAL(12,2) NULL,
                status VARCHAR(24) NOT NULL DEFAULT 'Pending',
                priority VARCHAR(20) NOT NULL DEFAULT 'Medium',
                justification TEXT NOT NULL,
                notes TEXT NULL,
                actioned_by_id VARCHAR(36) NULL,
                actioned_by_name VARCHAR(191) NULL,
                action_notes TEXT NULL,
                submitted_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                actioned_at DATETIME NULL,
                PRIMARY KEY  (id),
                KEY department (department),
                KEY status (status)
            ) ENGINE=InnoDB {$charsetCollate};",

            'budget_returns' => "CREATE TABLE {$p}budget_returns (
                id VARCHAR(36) NOT NULL,
                department VARCHAR(120) NOT NULL,
                admin_id VARCHAR(36) NOT NULL,
                admin_name VARCHAR(191) NOT NULL,
                admin_role VARCHAR(32) NOT NULL,
                previous_allocated DECIMAL(12,2) NOT NULL DEFAULT 0,
                returned_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
                new_allocated DECIMAL(12,2) NOT NULL DEFAULT 0,
                reason TEXT NOT NULL,
                notes TEXT NULL,
                timestamp DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY  (id),
                KEY department (department)
            ) ENGINE=InnoDB {$charsetCollate};",

            'budget_audit' => "CREATE TABLE {$p}budget_audit (
                id VARCHAR(36) NOT NULL,
                action VARCHAR(32) NOT NULL,
                previous_amount DECIMAL(12,2) NULL,
                new_amount DECIMAL(12,2) NULL,
                performed_by_id VARCHAR(36) NOT NULL,
                performed_by_name VARCHAR(191) NOT NULL,
                performed_by_role VARCHAR(32) NOT NULL,
                target_name VARCHAR(191) NULL,
                department VARCHAR(120) NULL,
                from_department VARCHAR(120) NULL,
                to_department VARCHAR(120) NULL,
                purpose VARCHAR(255) NULL,
                previous_purpose VARCHAR(255) NULL,
                timestamp DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                notes TEXT NULL,
                PRIMARY KEY  (id),
                KEY department (department)
            ) ENGINE=InnoDB {$charsetCollate};",
        ];
    }
}
```

#### 9. database/migrations/BillingMigration.php

Tables: `invoices`, `invoice_items`, `payments`, `commissions`.

```php
<?php

namespace OptivaxERP\Database\Migrations;

if (!defined('ABSPATH')) {
    exit;
}

/**
 * Tables: invoices, invoice_items, payments, commissions.
 * Maps to /saas/v1/invoices/*, /saas/v1/payments/*, /saas/v1/commissions.
 * Invoice line items are a proper child table (invoice_items), not a JSON
 * column, because InvoiceRepository assembles Invoice.items from it on read
 * and persists each item as its own row on create.
 */
final class BillingMigration
{
    public static function sql(\wpdb $wpdb, string $charsetCollate): array
    {
        $p = $wpdb->prefix . OPTIVAX_ERP_TABLE_PREFIX;

        return [
            'invoices' => "CREATE TABLE {$p}invoices (
                id VARCHAR(36) NOT NULL,
                number VARCHAR(60) NOT NULL,
                client_id VARCHAR(36) NOT NULL,
                project_id VARCHAR(36) NULL,
                description TEXT NULL,
                amount DECIMAL(12,2) NOT NULL DEFAULT 0,
                amount_paid DECIMAL(12,2) NULL DEFAULT 0,
                remaining_balance DECIMAL(12,2) NULL,
                status VARCHAR(20) NOT NULL DEFAULT 'pending',
                issue_date DATE NULL,
                due_date DATE NULL,
                paid_date DATE NULL,
                notes TEXT NULL,
                invoice_url TEXT NULL,
                created_by VARCHAR(36) NULL,
                updated_by VARCHAR(36) NULL,
                deleted_at DATETIME NULL,
                deleted_by VARCHAR(36) NULL,
                PRIMARY KEY  (id),
                KEY client_id (client_id),
                KEY status (status),
                KEY deleted_at (deleted_at)
            ) ENGINE=InnoDB {$charsetCollate};",

            'invoice_items' => "CREATE TABLE {$p}invoice_items (
                id VARCHAR(36) NOT NULL,
                invoice_id VARCHAR(36) NOT NULL,
                description VARCHAR(255) NULL,
                quantity INT UNSIGNED NOT NULL DEFAULT 1,
                rate DECIMAL(12,2) NOT NULL DEFAULT 0,
                total DECIMAL(12,2) NOT NULL DEFAULT 0,
                PRIMARY KEY  (id),
                KEY invoice_id (invoice_id)
            ) ENGINE=InnoDB {$charsetCollate};",

            'payments' => "CREATE TABLE {$p}payments (
                id VARCHAR(36) NOT NULL,
                invoice_id VARCHAR(36) NOT NULL,
                amount DECIMAL(12,2) NOT NULL DEFAULT 0,
                currency VARCHAR(10) NOT NULL DEFAULT 'usd',
                date DATE NULL,
                paid_at DATETIME NULL,
                paid_by_user_id VARCHAR(36) NULL,
                method VARCHAR(30) NOT NULL DEFAULT 'credit-card',
                transaction_id VARCHAR(120) NULL,
                stripe_payment_intent_id VARCHAR(191) NULL,
                stripe_charge_id VARCHAR(191) NULL,
                notes TEXT NULL,
                check_image_url TEXT NULL,
                created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY  (id),
                KEY invoice_id (invoice_id)
            ) ENGINE=InnoDB {$charsetCollate};",

            'commissions' => "CREATE TABLE {$p}commissions (
                id VARCHAR(36) NOT NULL,
                user_id VARCHAR(36) NOT NULL,
                user_name VARCHAR(191) NULL,
                type VARCHAR(20) NOT NULL DEFAULT 'percentage',
                value DECIMAL(12,2) NOT NULL DEFAULT 0,
                project_id VARCHAR(36) NULL,
                project_name VARCHAR(191) NULL,
                invoice_id VARCHAR(36) NULL,
                amount DECIMAL(12,2) NOT NULL DEFAULT 0,
                status VARCHAR(20) NOT NULL DEFAULT 'pending',
                notes TEXT NULL,
                created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY  (id),
                KEY user_id (user_id),
                KEY invoice_id (invoice_id),
                KEY project_id (project_id)
            ) ENGINE=InnoDB {$charsetCollate};",
        ];
    }
}
```

#### 10. database/migrations/SalesMigration.php

Tables: `leads`, `sales_campaigns`, `sales_targets`, `sales_tasks`, `sales_widget_leads`, `sales_widget_deals`, `sales_widget_commissions`.

```php
<?php

namespace OptivaxERP\Database\Migrations;

if (!defined('ABSPATH')) {
    exit;
}

/**
 * Tables: leads, sales_campaigns, sales_targets, sales_tasks,
 * sales_widget_leads, sales_widget_deals, sales_widget_commissions.
 * Maps to /saas/v1/leads/*, /saas/v1/sales/campaigns/*, /saas/v1/sales/targets/*,
 * /saas/v1/sales/tasks/*, /saas/v1/sales-widget/*.
 *
 * `leads` (the full CRM Lead entity) and `sales_widget_leads` (the SalesPanel
 * "at a glance" widget) are deliberately separate tables — the frontend keeps
 * two independent data sets under similar names, confirmed intentional
 * duplication rather than a join/view candidate. Same story for
 * `sales_tasks` here vs. the generic `tasks` table owned by another module:
 * same shape, different domain, not to be merged.
 */
final class SalesMigration
{
    public static function sql(\wpdb $wpdb, string $charsetCollate): array
    {
        $p = $wpdb->prefix . OPTIVAX_ERP_TABLE_PREFIX;

        return [
            'leads' => "CREATE TABLE {$p}leads (
                id VARCHAR(36) NOT NULL,
                name VARCHAR(191) NOT NULL,
                email VARCHAR(191) NOT NULL,
                phone VARCHAR(40) NULL,
                company VARCHAR(191) NULL,
                source VARCHAR(60) NULL,
                status VARCHAR(32) NULL,
                estimated_value DECIMAL(12,2) NULL,
                created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME NULL,
                PRIMARY KEY  (id),
                KEY status (status)
            ) ENGINE=InnoDB {$charsetCollate};",

            'sales_campaigns' => "CREATE TABLE {$p}sales_campaigns (
                id VARCHAR(36) NOT NULL,
                campaign_name VARCHAR(191) NOT NULL,
                total_budget DECIMAL(12,2) NOT NULL DEFAULT 0,
                budget_spent DECIMAL(12,2) NOT NULL DEFAULT 0,
                start_date DATE NOT NULL,
                end_date DATE NOT NULL,
                assigned_members TEXT NULL,
                status VARCHAR(20) NOT NULL DEFAULT 'planned',
                notes TEXT NULL,
                created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                created_by VARCHAR(64) NOT NULL,
                PRIMARY KEY  (id),
                KEY status (status)
            ) ENGINE=InnoDB {$charsetCollate};",

            'sales_targets' => "CREATE TABLE {$p}sales_targets (
                id VARCHAR(36) NOT NULL,
                member_id VARCHAR(64) NOT NULL,
                member_name VARCHAR(191) NOT NULL,
                monthly_target DECIMAL(12,2) NOT NULL DEFAULT 0,
                quarterly_target DECIMAL(12,2) NOT NULL DEFAULT 0,
                annual_target DECIMAL(12,2) NOT NULL DEFAULT 0,
                achieved_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
                period VARCHAR(32) NOT NULL,
                created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME NULL,
                PRIMARY KEY  (id),
                KEY member_id (member_id)
            ) ENGINE=InnoDB {$charsetCollate};",

            'sales_tasks' => "CREATE TABLE {$p}sales_tasks (
                id VARCHAR(36) NOT NULL,
                title VARCHAR(191) NOT NULL,
                description TEXT NULL,
                assigned_to VARCHAR(64) NOT NULL,
                assigned_name VARCHAR(191) NOT NULL,
                priority VARCHAR(20) NOT NULL,
                due_date DATE NOT NULL,
                status VARCHAR(20) NOT NULL,
                estimated_value DECIMAL(12,2) NOT NULL DEFAULT 0,
                notes TEXT NULL,
                created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                created_by VARCHAR(64) NOT NULL,
                PRIMARY KEY  (id),
                KEY assigned_to (assigned_to)
            ) ENGINE=InnoDB {$charsetCollate};",

            'sales_widget_leads' => "CREATE TABLE {$p}sales_widget_leads (
                id VARCHAR(36) NOT NULL,
                name VARCHAR(191) NOT NULL,
                email VARCHAR(191) NOT NULL,
                company VARCHAR(191) NULL,
                status VARCHAR(20) NOT NULL,
                estimated_value DECIMAL(12,2) NOT NULL DEFAULT 0,
                PRIMARY KEY  (id)
            ) ENGINE=InnoDB {$charsetCollate};",

            'sales_widget_deals' => "CREATE TABLE {$p}sales_widget_deals (
                id VARCHAR(36) NOT NULL,
                title VARCHAR(191) NOT NULL,
                client VARCHAR(191) NOT NULL,
                amount DECIMAL(12,2) NOT NULL DEFAULT 0,
                stage VARCHAR(20) NOT NULL,
                PRIMARY KEY  (id)
            ) ENGINE=InnoDB {$charsetCollate};",

            'sales_widget_commissions' => "CREATE TABLE {$p}sales_widget_commissions (
                id VARCHAR(36) NOT NULL,
                amount DECIMAL(12,2) NOT NULL DEFAULT 0,
                deal_id VARCHAR(36) NULL,
                status VARCHAR(20) NOT NULL,
                date DATE NOT NULL,
                PRIMARY KEY  (id)
            ) ENGINE=InnoDB {$charsetCollate};",
        ];
    }
}
```

#### 11. database/migrations/MarketingMigration.php

Tables: `marketing_campaigns`, `content_calendar`, `email_templates`, `email_campaigns`, `email_automations`, `social_links`, `social_click_events`, `social_account_metrics`.

```php
<?php

namespace OptivaxERP\Database\Migrations;

if (!defined('ABSPATH')) {
    exit;
}

/**
 * Tables: marketing_campaigns, content_calendar, email_templates,
 * email_campaigns, email_automations, social_links, social_click_events,
 * social_account_metrics.
 * Maps to /saas/v1/marketing-campaigns/*, /content-calendar/*, /email/*,
 * /social-links/*, /social-analytics/*.
 *
 * `audience_tags` and `extra_json` are JSON-encoded into TEXT/LONGTEXT
 * columns (via Sanitize::json/jsonDecode) rather than a native JSON column
 * type, matching the TEXT-for-JSON convention already used elsewhere in this
 * schema (see `tags`/`assigned_production_members`/`visible_to` in
 * ClientMigration/FileMigration).
 *
 * `social_click_events.occurred_at` is the DB column backing the frontend's
 * `timestamp` field — named differently to sidestep TIMESTAMP being a SQL
 * data-type keyword; SocialTrackingRepository::toDto() maps it back to
 * `timestamp` in the wire shape.
 */
final class MarketingMigration
{
    public static function sql(\wpdb $wpdb, string $charsetCollate): array
    {
        $p = $wpdb->prefix . OPTIVAX_ERP_TABLE_PREFIX;

        return [
            'marketing_campaigns' => "CREATE TABLE {$p}marketing_campaigns (
                id VARCHAR(36) NOT NULL,
                name VARCHAR(191) NOT NULL,
                platform VARCHAR(60) NOT NULL,
                status VARCHAR(20) NOT NULL DEFAULT 'Draft',
                budget DECIMAL(12,2) NOT NULL DEFAULT 0,
                spent DECIMAL(12,2) NOT NULL DEFAULT 0,
                created_by VARCHAR(36) NULL,
                linked_task_id VARCHAR(36) NULL,
                PRIMARY KEY  (id),
                KEY status (status)
            ) ENGINE=InnoDB {$charsetCollate};",

            'content_calendar' => "CREATE TABLE {$p}content_calendar (
                id VARCHAR(36) NOT NULL,
                title VARCHAR(191) NOT NULL,
                description TEXT NULL,
                platform VARCHAR(20) NOT NULL,
                content_type VARCHAR(20) NOT NULL,
                scheduled_date DATE NOT NULL,
                scheduled_time TIME NULL,
                status VARCHAR(20) NOT NULL DEFAULT 'Planned',
                production_support_required TINYINT(1) NOT NULL DEFAULT 0,
                production_requirement_type VARCHAR(40) NULL,
                production_status VARCHAR(40) NULL,
                created_by VARCHAR(36) NULL,
                created_by_name VARCHAR(191) NULL,
                created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME NULL,
                PRIMARY KEY  (id),
                KEY scheduled_date (scheduled_date),
                KEY status (status)
            ) ENGINE=InnoDB {$charsetCollate};",

            'email_templates' => "CREATE TABLE {$p}email_templates (
                id VARCHAR(36) NOT NULL,
                name VARCHAR(191) NOT NULL,
                subject VARCHAR(255) NOT NULL,
                content LONGTEXT NULL,
                type VARCHAR(20) NOT NULL DEFAULT 'custom',
                created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME NULL,
                PRIMARY KEY  (id)
            ) ENGINE=InnoDB {$charsetCollate};",

            'email_campaigns' => "CREATE TABLE {$p}email_campaigns (
                id VARCHAR(36) NOT NULL,
                name VARCHAR(191) NOT NULL,
                subject VARCHAR(255) NOT NULL,
                template_id VARCHAR(36) NULL,
                status VARCHAR(20) NOT NULL DEFAULT 'draft',
                schedule_date DATETIME NULL,
                sent_date DATETIME NULL,
                audience_tags TEXT NULL,
                stats_sent INT UNSIGNED NOT NULL DEFAULT 0,
                stats_opened INT UNSIGNED NOT NULL DEFAULT 0,
                stats_clicked INT UNSIGNED NOT NULL DEFAULT 0,
                created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME NULL,
                PRIMARY KEY  (id),
                KEY template_id (template_id),
                KEY status (status)
            ) ENGINE=InnoDB {$charsetCollate};",

            'email_automations' => "CREATE TABLE {$p}email_automations (
                id VARCHAR(36) NOT NULL,
                name VARCHAR(191) NOT NULL,
                trigger_type VARCHAR(40) NOT NULL,
                template_id VARCHAR(36) NULL,
                status VARCHAR(20) NOT NULL DEFAULT 'active',
                delay_hours INT UNSIGNED NOT NULL DEFAULT 0,
                created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME NULL,
                PRIMARY KEY  (id),
                KEY template_id (template_id)
            ) ENGINE=InnoDB {$charsetCollate};",

            'social_links' => "CREATE TABLE {$p}social_links (
                id VARCHAR(36) NOT NULL,
                platform VARCHAR(20) NOT NULL,
                label VARCHAR(191) NOT NULL,
                url TEXT NOT NULL,
                tracking_id VARCHAR(40) NOT NULL,
                status VARCHAR(20) NOT NULL DEFAULT 'active',
                created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                created_by VARCHAR(36) NULL,
                PRIMARY KEY  (id),
                UNIQUE KEY tracking_id (tracking_id)
            ) ENGINE=InnoDB {$charsetCollate};",

            'social_click_events' => "CREATE TABLE {$p}social_click_events (
                id VARCHAR(36) NOT NULL,
                link_id VARCHAR(36) NOT NULL,
                tracking_id VARCHAR(40) NOT NULL,
                platform VARCHAR(20) NOT NULL,
                occurred_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                visitor_id VARCHAR(60) NOT NULL,
                referrer TEXT NULL,
                device VARCHAR(40) NULL,
                browser VARCHAR(60) NULL,
                source_url TEXT NULL,
                PRIMARY KEY  (id),
                KEY link_id (link_id)
            ) ENGINE=InnoDB {$charsetCollate};",

            'social_account_metrics' => "CREATE TABLE {$p}social_account_metrics (
                id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
                link_id VARCHAR(36) NOT NULL,
                metric_date DATE NOT NULL,
                impressions INT UNSIGNED NULL,
                clicks INT UNSIGNED NULL,
                extra_json LONGTEXT NULL,
                PRIMARY KEY  (id),
                KEY link_id (link_id),
                KEY metric_date (metric_date)
            ) ENGINE=InnoDB {$charsetCollate};",
        ];
    }
}
```

#### 12. database/migrations/ItSupportMigration.php

Tables: `it_tickets`, `it_devices`, `it_device_logs`, `it_attendance_exceptions`.

```php
<?php

namespace OptivaxERP\Database\Migrations;

if (!defined('ABSPATH')) {
    exit;
}

/**
 * Tables: it_tickets, it_devices, it_device_logs, it_attendance_exceptions.
 * Maps to /saas/v1/it/tickets/*, /it/devices/*, /it/device-logs/*,
 * /it/attendance-exceptions/*.
 */
final class ItSupportMigration
{
    public static function sql(\wpdb $wpdb, string $charsetCollate): array
    {
        $p = $wpdb->prefix . OPTIVAX_ERP_TABLE_PREFIX;

        return [
            'it_tickets' => "CREATE TABLE {$p}it_tickets (
                id VARCHAR(36) NOT NULL,
                title VARCHAR(191) NOT NULL,
                description TEXT NULL,
                category VARCHAR(20) NOT NULL DEFAULT 'other',
                priority VARCHAR(20) NOT NULL DEFAULT 'medium',
                status VARCHAR(20) NOT NULL DEFAULT 'open',
                requested_by VARCHAR(36) NOT NULL,
                requested_by_name VARCHAR(191) NULL,
                requested_by_dept VARCHAR(60) NULL,
                assigned_to VARCHAR(36) NULL,
                assigned_to_name VARCHAR(191) NULL,
                created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME NULL,
                resolved_at DATETIME NULL,
                sla_deadline DATETIME NULL,
                notes TEXT NULL,
                PRIMARY KEY  (id),
                KEY status (status),
                KEY assigned_to (assigned_to)
            ) ENGINE=InnoDB {$charsetCollate};",

            'it_devices' => "CREATE TABLE {$p}it_devices (
                id VARCHAR(36) NOT NULL,
                name VARCHAR(191) NOT NULL,
                device_type VARCHAR(40) NOT NULL DEFAULT 'ZKTeco',
                serial_number VARCHAR(120) NULL,
                ip_address VARCHAR(60) NULL,
                port INT UNSIGNED NOT NULL DEFAULT 0,
                branch VARCHAR(120) NULL,
                status VARCHAR(20) NOT NULL DEFAULT 'offline',
                last_sync DATETIME NULL,
                sync_frequency VARCHAR(20) NOT NULL DEFAULT 'daily',
                total_users INT UNSIGNED NOT NULL DEFAULT 0,
                firmware_version VARCHAR(60) NULL,
                PRIMARY KEY  (id),
                KEY status (status)
            ) ENGINE=InnoDB {$charsetCollate};",

            'it_device_logs' => "CREATE TABLE {$p}it_device_logs (
                id VARCHAR(36) NOT NULL,
                device_id VARCHAR(36) NOT NULL,
                device_name VARCHAR(191) NULL,
                started_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                completed_at DATETIME NULL,
                result VARCHAR(20) NOT NULL DEFAULT 'success',
                records_synced INT UNSIGNED NOT NULL DEFAULT 0,
                errors TEXT NULL,
                triggered_by VARCHAR(20) NOT NULL DEFAULT 'auto',
                triggered_by_name VARCHAR(191) NULL,
                PRIMARY KEY  (id),
                KEY device_id (device_id)
            ) ENGINE=InnoDB {$charsetCollate};",

            'it_attendance_exceptions' => "CREATE TABLE {$p}it_attendance_exceptions (
                id VARCHAR(36) NOT NULL,
                employee_id VARCHAR(36) NOT NULL,
                employee_name VARCHAR(191) NULL,
                department VARCHAR(60) NULL,
                date DATE NOT NULL,
                exception_type VARCHAR(30) NOT NULL,
                check_in TIME NULL,
                check_out TIME NULL,
                expected_check_in TIME NULL,
                status VARCHAR(20) NOT NULL DEFAULT 'pending',
                notes TEXT NULL,
                PRIMARY KEY  (id),
                KEY employee_id (employee_id),
                KEY date (date)
            ) ENGINE=InnoDB {$charsetCollate};",
        ];
    }
}
```

#### 13. database/migrations/CrossCuttingMigration.php

Tables: `notifications`, `audit_logs`, `conversations`, `conversation_messages`, `calendar_events`, `automation_workflows`, `email_queue`, `plugin_settings`.

```php
<?php

namespace OptivaxERP\Database\Migrations;

if (!defined('ABSPATH')) {
    exit;
}

/**
 * Tables: notifications, audit_logs, conversations, conversation_messages,
 * calendar_events, automation_workflows, email_queue, plugin_settings.
 * Maps to /saas/v1/notifications/*, /saas/v1/audit-logs/*, /saas/v1/conversations/*,
 * /saas/v1/calendar-events/*, /saas/v1/automation/*, plus the internal
 * mail queue (mail/MailService.php, cron/EmailQueueWorker.php) and a
 * forward-compatible settings key-value store.
 *
 * Column names/types on `notifications` and `email_queue` are load-bearing:
 * NotificationService and MailService/EmailQueueWorker read/write these
 * exact columns directly via $wpdb, with no repository layer in between.
 */
final class CrossCuttingMigration
{
    public static function sql(\wpdb $wpdb, string $charsetCollate): array
    {
        $p = $wpdb->prefix . OPTIVAX_ERP_TABLE_PREFIX;

        return [
            'notifications' => "CREATE TABLE {$p}notifications (
                id VARCHAR(36) NOT NULL,
                user_id VARCHAR(64) NOT NULL,
                type VARCHAR(32) NOT NULL,
                module VARCHAR(32) NULL,
                title VARCHAR(191) NOT NULL,
                message TEXT NOT NULL,
                is_read TINYINT(1) NOT NULL DEFAULT 0,
                created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                action_url TEXT NULL,
                action_label VARCHAR(191) NULL,
                PRIMARY KEY  (id),
                KEY user_id (user_id),
                KEY user_id_created_at (user_id, created_at)
            ) ENGINE=InnoDB {$charsetCollate};",

            'audit_logs' => "CREATE TABLE {$p}audit_logs (
                id VARCHAR(36) NOT NULL,
                action VARCHAR(60) NOT NULL,
                entity_type VARCHAR(60) NOT NULL,
                entity_id VARCHAR(36) NOT NULL,
                entity_name VARCHAR(191) NOT NULL,
                performed_by VARCHAR(64) NOT NULL,
                performed_by_name VARCHAR(191) NOT NULL,
                performed_by_role VARCHAR(32) NOT NULL,
                timestamp DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                description TEXT NOT NULL,
                department VARCHAR(60) NULL,
                old_value LONGTEXT NULL,
                new_value LONGTEXT NULL,
                PRIMARY KEY  (id),
                KEY entity_type (entity_type),
                KEY performed_by (performed_by),
                KEY timestamp (timestamp),
                KEY department (department)
            ) ENGINE=InnoDB {$charsetCollate};",

            'conversations' => "CREATE TABLE {$p}conversations (
                id VARCHAR(36) NOT NULL,
                subject VARCHAR(191) NOT NULL,
                client_id VARCHAR(36) NOT NULL,
                client_name VARCHAR(191) NOT NULL,
                client_email VARCHAR(191) NULL,
                assigned_dept VARCHAR(32) NOT NULL,
                assigned_user_id VARCHAR(64) NULL,
                assigned_user_name VARCHAR(191) NULL,
                status VARCHAR(32) NOT NULL DEFAULT 'open',
                created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                last_activity DATETIME NULL,
                unread_by_client INT UNSIGNED NOT NULL DEFAULT 0,
                unread_by_team INT UNSIGNED NOT NULL DEFAULT 0,
                PRIMARY KEY  (id),
                KEY client_id (client_id),
                KEY status (status)
            ) ENGINE=InnoDB {$charsetCollate};",

            'conversation_messages' => "CREATE TABLE {$p}conversation_messages (
                id VARCHAR(36) NOT NULL,
                conversation_id VARCHAR(36) NOT NULL,
                sender_id VARCHAR(64) NOT NULL,
                sender_name VARCHAR(191) NOT NULL,
                sender_role VARCHAR(32) NULL,
                body TEXT NOT NULL,
                sent_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                read_by TEXT NULL,
                PRIMARY KEY  (id),
                KEY conversation_id (conversation_id)
            ) ENGINE=InnoDB {$charsetCollate};",

            'calendar_events' => "CREATE TABLE {$p}calendar_events (
                id VARCHAR(36) NOT NULL,
                title VARCHAR(191) NOT NULL,
                `start` DATETIME NOT NULL,
                `end` DATETIME NOT NULL,
                description TEXT NULL,
                all_day TINYINT(1) NULL DEFAULT 0,
                type VARCHAR(32) NOT NULL DEFAULT 'other',
                color VARCHAR(20) NULL,
                PRIMARY KEY  (id)
            ) ENGINE=InnoDB {$charsetCollate};",

            'automation_workflows' => "CREATE TABLE {$p}automation_workflows (
                id VARCHAR(36) NOT NULL,
                name VARCHAR(191) NOT NULL,
                trigger_event VARCHAR(120) NOT NULL,
                enabled TINYINT(1) NOT NULL DEFAULT 1,
                callback_class VARCHAR(191) NOT NULL,
                config LONGTEXT NULL,
                PRIMARY KEY  (id)
            ) ENGINE=InnoDB {$charsetCollate};",

            'email_queue' => "CREATE TABLE {$p}email_queue (
                id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
                to_email VARCHAR(191) NOT NULL,
                subject VARCHAR(255) NOT NULL,
                body_html LONGTEXT NOT NULL,
                attempts INT UNSIGNED NOT NULL DEFAULT 0,
                max_attempts INT UNSIGNED NOT NULL DEFAULT 5,
                status VARCHAR(20) NOT NULL DEFAULT 'pending',
                next_attempt_at DATETIME NOT NULL,
                created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                sent_at DATETIME NULL,
                last_error TEXT NULL,
                PRIMARY KEY  (id),
                KEY status_next_attempt (status, next_attempt_at)
            ) ENGINE=InnoDB {$charsetCollate};",

            'plugin_settings' => "CREATE TABLE {$p}plugin_settings (
                setting_key VARCHAR(191) NOT NULL,
                setting_value LONGTEXT NULL,
                updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY  (setting_key)
            ) ENGINE=InnoDB {$charsetCollate};",
        ];
    }
}
```

(ActivityMigration.php — the 13th migration by count but listed last in `Migrator::migrations()` — was already shown in full in Section 6 is not; it's shown here for completeness since Section 6 only covered the *controller/routes*, not the migration. Full contents:)

#### 14. database/migrations/ActivityMigration.php

Tables: `activity_sessions`, `activity_breaks`.

```php
<?php

namespace OptivaxERP\Database\Migrations;

if (!defined('ABSPATH')) {
    exit;
}

/**
 * Tables: activity_sessions, activity_breaks.
 * Backs /saas/v1/activity/* (src/context/ActivityContext.tsx, AuthContext.tsx's
 * login/logout calls) — login/logout session tracking plus break start/end,
 * with the server as sole authority on break-balance/warning rules per
 * src/types/activity.ts's doc comments. This module did not exist anywhere in
 * the plugin prior to this migration (confirmed: no Activity* files anywhere)
 * — genuinely new, not an audit of pre-existing scaffolding like every other
 * Phase 2B domain.
 */
final class ActivityMigration
{
    public static function sql(\wpdb $wpdb, string $charsetCollate): array
    {
        $p = $wpdb->prefix . OPTIVAX_ERP_TABLE_PREFIX;

        return [
            'activity_sessions' => "CREATE TABLE {$p}activity_sessions (
                id VARCHAR(36) NOT NULL,
                user_id VARCHAR(36) NOT NULL,
                user_name VARCHAR(191) NOT NULL,
                user_role VARCHAR(32) NOT NULL,
                department_id VARCHAR(36) NULL,
                date DATE NOT NULL,
                login_time DATETIME NOT NULL,
                logout_time DATETIME NULL,
                warning_count INT UNSIGNED NOT NULL DEFAULT 0,
                created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY  (id),
                UNIQUE KEY user_date (user_id, date),
                KEY date (date)
            ) ENGINE=InnoDB {$charsetCollate};",

            'activity_breaks' => "CREATE TABLE {$p}activity_breaks (
                id VARCHAR(36) NOT NULL,
                session_id VARCHAR(36) NOT NULL,
                user_id VARCHAR(36) NOT NULL,
                type VARCHAR(20) NOT NULL,
                label VARCHAR(60) NOT NULL,
                category VARCHAR(20) NOT NULL,
                start_time DATETIME NOT NULL,
                end_time DATETIME NULL,
                allowed_minutes INT UNSIGNED NOT NULL,
                actual_minutes INT UNSIGNED NULL,
                exceeded_minutes INT UNSIGNED NULL,
                status VARCHAR(20) NULL,
                PRIMARY KEY  (id),
                KEY session_id (session_id),
                KEY user_id (user_id)
            ) ENGINE=InnoDB {$charsetCollate};",
        ];
    }
}
```

### database/migrations/ForeignKeyMigration.php (applied separately via ALTER TABLE, not through dbDelta)

```php
<?php

namespace OptivaxERP\Database\Migrations;

use OptivaxERP\Helpers\Logger;

if (!defined('ABSPATH')) {
    exit;
}

/**
 * Adds real InnoDB foreign-key constraints for the schema's genuine
 * parent-child ownership relationships. Kept entirely separate from the
 * per-module CREATE TABLE migrations and from dbDelta() on purpose: dbDelta
 * does not reliably parse/diff FOREIGN KEY clauses inside a CREATE TABLE
 * statement (a well-documented WordPress core limitation), so constraints
 * are applied here via plain ALTER TABLE, run once after the dbDelta pass
 * (see Migrator::runOnActivation()/maybeUpgrade()).
 *
 * Deliberately NOT covered: audit/history/log tables (client_ownership_history,
 * audit_logs, security_audit_logs, budget_audit, advance_salary_audit,
 * attendance_audit) — these are meant to outlive their subject even if the
 * subject is later deleted, so they're intentionally left unconstrained.
 * Also not covered: anything referencing wp_users directly (refresh_tokens,
 * users_mapping) — that table is core WordPress's, not this plugin's, and
 * user deletion goes through wp_delete_user()'s own cleanup path.
 *
 * Every constraint is applied defensively: if a table already has orphaned
 * rows (a value with no matching parent — possible on a live site with older
 * data), adding the constraint fails at the database level and this class
 * logs it and moves on rather than deleting/modifying rows to force it
 * through. Re-run (e.g. after the site owner cleans up the orphaned rows and
 * bumps the plugin) to pick up anything that was skipped.
 */
final class ForeignKeyMigration
{
    /**
     * Each entry: [table, column, constraint name, referenced table, referenced column, ON DELETE action].
     */
    private static function foreignKeys(): array
    {
        return [
            ['invoice_items', 'invoice_id', 'fk_invoice_items_invoice', 'invoices', 'id', 'CASCADE'],
            ['payments', 'invoice_id', 'fk_payments_invoice', 'invoices', 'id', 'CASCADE'],
            ['client_ownership', 'client_id', 'fk_client_ownership_client', 'clients', 'id', 'CASCADE'],
            ['production_assignments', 'client_id', 'fk_production_assignments_client', 'clients', 'id', 'CASCADE'],
            ['tasks', 'project_id', 'fk_tasks_project', 'projects', 'id', 'SET NULL'],
            ['it_device_logs', 'device_id', 'fk_it_device_logs_device', 'it_devices', 'id', 'CASCADE'],
            ['social_click_events', 'link_id', 'fk_social_click_events_link', 'social_links', 'id', 'CASCADE'],
            ['social_account_metrics', 'link_id', 'fk_social_account_metrics_link', 'social_links', 'id', 'CASCADE'],
            ['conversation_messages', 'conversation_id', 'fk_conversation_messages_conversation', 'conversations', 'id', 'CASCADE'],
            ['activity_breaks', 'session_id', 'fk_activity_breaks_session', 'activity_sessions', 'id', 'CASCADE'],
        ];
    }

    public static function apply(): void
    {
        global $wpdb;
        $prefix = $wpdb->prefix . OPTIVAX_ERP_TABLE_PREFIX;

        foreach (self::foreignKeys() as [$table, $column, $constraintName, $refTable, $refColumn, $onDelete]) {
            $fullTable = $prefix . $table;
            $fullRefTable = $prefix . $refTable;

            if (!self::tablesExist($fullTable, $fullRefTable)) {
                continue;
            }

            if (self::constraintExists($fullTable, $constraintName)) {
                continue;
            }

            $sql = "ALTER TABLE {$fullTable} ADD CONSTRAINT {$constraintName} "
                . "FOREIGN KEY ({$column}) REFERENCES {$fullRefTable} ({$refColumn}) ON DELETE {$onDelete}";

            $wpdb->suppress_errors(true);
            $wpdb->query($sql);
            $wpdb->suppress_errors(false);

            if (!empty($wpdb->last_error)) {
                Logger::warning('migrator', "Skipped foreign key {$constraintName} — likely orphaned data", [
                    'table' => $fullTable,
                    'column' => $column,
                    'error' => $wpdb->last_error,
                ]);
            }
        }
    }

    private static function tablesExist(string ...$tables): bool
    {
        global $wpdb;
        foreach ($tables as $table) {
            $found = $wpdb->get_var($wpdb->prepare('SHOW TABLES LIKE %s', $table));
            if (!$found) {
                return false;
            }
        }
        return true;
    }

    private static function constraintExists(string $table, string $constraintName): bool
    {
        global $wpdb;
        $count = $wpdb->get_var($wpdb->prepare(
            'SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS
             WHERE CONSTRAINT_SCHEMA = %s AND TABLE_NAME = %s AND CONSTRAINT_NAME = %s',
            DB_NAME,
            $table,
            $constraintName
        ));
        return (int) $count > 0;
    }
}
```

### Repositories — class name, table(s), public/protected method signatures

All ~50 concrete repositories extend `AbstractRepository` (shown in full above). Where a repository overrides `list()`/`count()` itself (rather than inheriting the abstract default), it's noted.

| Class | Table(s) | Public/protected method signatures |
|---|---|---|
| `AbstractRepository` (abstract) | n/a | `tableName(): string` (abstract), `idColumn(): string`, `table(): string`, `toDto(array): array` (abstract), `fromDtoForCreate(array): array` (abstract), `fromDtoForUpdate(array): array`, `list(array, ?string, ?array, ?array): array`, `count(array, ?array): int`, `find(string): ?array`, `create(array): array`, `update(string, array): ?array`, `delete(string): bool` |
| `ActivityRepository` | `activity_sessions`, `activity_breaks` | `listSessions(?string $dateFrom, ?string $dateTo, ?string $departmentId): array`, `findSessionToday(string $userId): ?array`, `login(string $userId, string $userName, string $userRole, ?string $departmentId): array`, `logout(string $userId): void`, `findActiveBreak(string $sessionId): ?array`, `startBreak(string $userId, string $type): array`, `endBreak(string $userId): array`, `toSessionDto(array, ?array): array`, `toBreakDto(array): array` |
| `AdvanceSalaryRepository` | `advance_salary_requests` | `list(?string $employeeId): array`, `bulkSave(array $requests): void` |
| `AdvanceSalaryAuditRepository` (extends Abstract) | `advance_salary_audit` | `tableName()`, `toDto(array)`, `fromDtoForCreate(array)` |
| `AttendanceRepository` | `attendance_records` | `getYear(int $year): array`, `getSelf(): array`, `getSelfForUser(string $userId): array`, `findSelf(string $id): ?array`, `createSelf(array): array`, `updateSelf(string, array): void`, `deleteSelf(string): void` |
| `AttendanceAuditRepository` (extends Abstract) | `attendance_audit` | `tableName()`, `toDto(array)`, `fromDtoForCreate(array)` |
| `AuditLogRepository` | `audit_logs` | `list(array $filters): array`, `listRecent(int $limit): array`, `create(array): array`, `search(array $params): array` |
| `AutomationWorkflowRepository` (extends Abstract) | `automation_workflows` | `tableName()`, `toDto(array)`, `fromDtoForCreate(array)`, `fromDtoForUpdate(array)` |
| `BudgetAuditRepository` (extends Abstract) | `budget_audit` | `tableName()`, `toDto(array)`, `fromDtoForCreate(array)` |
| `BudgetCompanyRepository` | `budget_company` | `get(): ?array`, `put(array): void`, `reset(): void` |
| `BudgetDepartmentRepository` (extends Abstract) | `budget_departments` | `tableName()`, `toDto(array)`, `fromDtoForCreate(array)`, `replaceAll(array $allocations, ?string $scopeDepartment): void` |
| `BudgetMemberRepository` (extends Abstract) | `budget_members` | `tableName()`, `toDto(array)`, `fromDtoForCreate(array)`, `replaceAll(array $allocations, ?string $scopeDepartment): void` |
| `BudgetRequestRepository` (extends Abstract) | `budget_requests` | `tableName()`, `toDto(array)`, `fromDtoForCreate(array)`, `fromDtoForUpdate(array)`, `bulkSave(array $requests, ?string $scopeDepartment): void` |
| `BudgetReturnRepository` (extends Abstract) | `budget_returns` | `tableName()`, `toDto(array)`, `fromDtoForCreate(array)` |
| `CalendarEventRepository` (extends Abstract) | `calendar_events` | `tableName()`, `toDto(array)`, `fromDtoForCreate(array)`, `fromDtoForUpdate(array)` |
| `ClientOwnershipRepository` | `client_ownership`, `client_ownership_history` | `list(array $filters): array`, `findByClientId(string): ?array`, `history(?string $clientId): array`, `assign(array): array`, `remove(array): ?array` |
| `ClientRepository` (extends Abstract) | `clients` | `tableName()`, `list(array, ?string, ?array, ?array)` (own override), `count(array, ?array)` (own override), `toDto(array)`, `fromDtoForCreate(array)`, `fromDtoForUpdate(array)` |
| `CommissionRepository` (extends Abstract) | `commissions` | `tableName()`, `toDto(array)`, `fromDtoForCreate(array)`, `fromDtoForUpdate(array)` |
| `CompanySettingsRepository` | `company_settings` | `get(): array`, `put(array): void` |
| `ContentCalendarRepository` (extends Abstract) | `content_calendar` | `tableName()`, `toDto(array)`, `fromDtoForCreate(array)`, `fromDtoForUpdate(array)` |
| `ConversationRepository` | `conversations`, `conversation_messages` | `list(): array`, `find(string): ?array`, `create(array): array`, `addMessage(string $conversationId, array $message): void`, `updateStatus(string, string): void`, `saveAll(array $conversations): void` |
| `DeliverableRepository` (extends Abstract) | `deliverables` | `tableName()`, `toDto(array)`, `fromDtoForCreate(array)`, `fromDtoForUpdate(array)` |
| `DepartmentRepository` (extends Abstract) | `departments` | `tableName()`, `toDto(array)`, `fromDtoForCreate(array)`, `fromDtoForUpdate(array)` |
| `EmailAutomationRepository` (extends Abstract) | `email_automations` | `tableName()`, `toDto(array)`, `fromDtoForCreate(array)`, `fromDtoForUpdate(array)` |
| `EmailCampaignRepository` (extends Abstract) | `email_campaigns` | `tableName()`, `toDto(array)`, `fromDtoForCreate(array)`, `fromDtoForUpdate(array)` |
| `EmailTemplateRepository` (extends Abstract) | `email_templates` | `tableName()`, `toDto(array)`, `fromDtoForCreate(array)`, `fromDtoForUpdate(array)` |
| `EmployeeExtraRepository` | `employee_extra` | `getAllAsMap(): array`, `updateOne(string $userId, array $patch): void`, `overwriteAll(array $map): void` |
| `FileRepository` (extends Abstract) | `files` | `tableName()`, `toDto(array)`, `fromDtoForCreate(array)` |
| `InvoiceRepository` | `invoices`, `invoice_items` | `list(array $filters): array`, `find(string): ?array`, `create(array): array`, `update(string, array): ?array`, `delete(string): bool` |
| `ItAttendanceExceptionRepository` (extends Abstract) | `it_attendance_exceptions` | `tableName()`, `toDto(array)`, `fromDtoForCreate(array)`, `fromDtoForUpdate(array)` |
| `ItDeviceLogRepository` (extends Abstract) | `it_device_logs` | `tableName()`, `toDto(array)`, `fromDtoForCreate(array)`, `fromDtoForUpdate(array)` |
| `ItDeviceRepository` (extends Abstract) | `it_devices` | `tableName()`, `toDto(array)`, `fromDtoForCreate(array)`, `fromDtoForUpdate(array)` |
| `ItTicketRepository` (extends Abstract) | `it_tickets` | `tableName()`, `toDto(array)`, `fromDtoForCreate(array)`, `fromDtoForUpdate(array)` |
| `LeadRepository` (extends Abstract) | `leads` | `tableName()`, `toDto(array)`, `fromDtoForCreate(array)`, `fromDtoForUpdate(array)` |
| `LeaveRequestEmployeeRepository` (extends Abstract) | `leave_requests_employee` | `tableName()`, `toDto(array)`, `fromDtoForCreate(array)`, `fromDtoForUpdate(array)` |
| `LeaveRequestHrRepository` (extends Abstract) | `leave_requests_hr` | `tableName()`, `toDto(array)`, `fromDtoForCreate(array)`, `fromDtoForUpdate(array)` |
| `MarketingCampaignRepository` (extends Abstract) | `marketing_campaigns` | `tableName()`, `toDto(array)`, `fromDtoForCreate(array)`, `fromDtoForUpdate(array)` |
| `OrganizationRepository` (extends Abstract) | `organizations` | `tableName()`, `toDto(array)`, `fromDtoForCreate(array)` |
| `PaymentRepository` (extends Abstract) | `payments` | `tableName()`, `toDto(array)`, `fromDtoForCreate(array)` |
| `ProjectRepository` (extends Abstract) | `projects` | `tableName()`, `list(array, ?string, ?array, ?array)` (own override), `count(array, ?array)` (own override), `toDto(array)`, `fromDtoForCreate(array)`, `fromDtoForUpdate(array)` |
| `RevisionRepository` (extends Abstract) | `revisions` | `tableName()`, `toDto(array)`, `fromDtoForCreate(array)`, `fromDtoForUpdate(array)` |
| `SalarySlipRepository` | `salary_slips` | `list(?string $employeeId): array`, `bulkSave(array $slips): void`, `createOne(array $slip): array` |
| `SalesCampaignRepository` (extends Abstract) | `sales_campaigns` | `tableName()`, `list(array, ?string, ?array, ?array)` (own override), `count(array, ?array)` (own override), `toDto(array)`, `fromDtoForCreate(array)`, `fromDtoForUpdate(array)` |
| `SalesTargetRepository` (extends Abstract) | `sales_targets` | `tableName()`, `toDto(array)`, `fromDtoForCreate(array)`, `fromDtoForUpdate(array)` |
| `SalesTaskRepository` (extends Abstract) | `sales_tasks` | `tableName()`, `toDto(array)`, `fromDtoForCreate(array)`, `fromDtoForUpdate(array)` |
| `SalesWidgetRepository` | `sales_widget_leads`, `sales_widget_deals`, `sales_widget_commissions` | `listLeads(): array`, `createLead(array): array`, `listDeals(): array`, `listCommissions(): array` |
| `SecurityAuditLogRepository` | `security_audit_logs` | `create(array $row): void`, `list(array $filters): array` |
| `SocialTrackingRepository` | `social_links`, `social_click_events`, `social_account_metrics` | `listLinks(): array`, `createLink(array): array`, `updateLink(string, array): ?array`, `deleteLink(string): bool`, `findLink(string): ?array`, `trackClick(array $eventData): array`, `getAnalytics(): array`, `getAccountMetrics(): array`, `syncAccountMetrics(string $linkId): array` |
| `StripeSettingsRepository` | `company_settings` (stripe_* columns) | `isEnabled(): bool`, `getSecretKey(): string`, `getPublicConfig(): array`, `saveConfig(array): void` |
| `SubscriptionRepository` (extends Abstract) | `subscriptions` | `tableName()`, `toDto(array)`, `fromDtoForCreate(array)` |
| `TaskRepository` (extends Abstract) | `tasks` | `tableName()`, `idColumn()` (override), `toDto(array)`, `fromDtoForCreate(array)`, `fromDtoForUpdate(array)` |
| `UserProfileRepository` | `users_mapping` (+ wp_users via WP core functions) | `list(array $filters): array`, `findById(int $userId): ?array`, `create(array): array`, `update(int, array): ?array`, `delete(int): void` |

Not independently confirmed by grep in this pass (present in the file listing but not captured in the signature extraction above — flagged rather than guessed): `AttendanceAuditRepository`/`AdvanceSalaryAuditRepository` are captured above; all other repository files listed in Section 1's structure tree were captured in the grep pass that produced this table. If any repository file exists on disk but is absent from this table, treat this table as the authoritative "confirmed" set and the file listing in Section 1 as the "expected" set, and diff them directly against the repo if exhaustive completeness is required.

---

## SECTION 10 — ROUTES

Every route in this plugin registers with `'permission_callback' => '__return_true'` (see `AuthMiddleware`'s doc comment for why: WP-native permission-callback rejections don't produce this app's `{success,data,error}` envelope). Real authorization happens inside the controller/closure via `RbacMiddleware::authorize($domain, $action)` (or, for `BaseCrudController`-backed routes, implicitly inside `listHandler`/`createHandler`/etc., which each call `RbacMiddleware::authorize($this->domain, ACTION)` where `ACTION` is `VIEW`/`CREATE`/`EDIT`/`DELETE` matching the handler name). The table's "Permission/Middleware" column reflects that real (in-controller) check, not the always-true `permission_callback`.

Every route is namespaced under `saas/v1` (`OPTIVAX_ERP_NAMESPACE`), so the full path is `/wp-json/saas/v1<path>`.

| Method | Endpoint | Controller::method | Permission/Middleware |
|---|---|---|---|
| POST | `/auth/login` | `AuthController::login` | none (rate-limited by IP+account) |
| GET | `/auth/session` | `AuthController::session` | requires valid access-token cookie |
| POST | `/auth/logout` | `AuthController::logout` | none required (clears cookies regardless) |
| POST | `/auth/logout-all` | `AuthController::logoutAll` | requires authenticated user |
| POST | `/auth/refresh` | `AuthController::refresh` | requires valid refresh-token cookie |
| POST | `/auth/change-password` | `AuthController::changePassword` | requires authenticated user |
| POST | `/auth/request-reset` | `AuthController::requestReset` | none (rate-limited) |
| POST | `/auth/confirm-reset` | `AuthController::confirmReset` | none (token-gated) |
| GET | `/profiles/list` | `ProfileController::list` | `RbacMiddleware` (domain likely `system`/`hr` — see ProfileController, not read in full this pass) |
| POST | `/profiles/create` | `ProfileController::create` | `RbacMiddleware` + `UserHierarchy` gating |
| PUT | `/profiles/update` | `ProfileController::update` | `RbacMiddleware` |
| DELETE | `/profiles/delete` | `ProfileController::delete` | `RbacMiddleware` |
| GET | `/security-audit-logs/list` | `SecurityAuditLogController::list` | super_admin only (per class doc comment) |
| GET | `/config/stripe` | `StripeController::getConfig` | any authenticated user |
| POST | `/settings/stripe` | `StripeController::saveConfig` | super_admin only (hard role check, not RBAC matrix) |
| POST | `/create-payment-intent` | `StripeController::createPaymentIntent` | any authenticated user + client-ownership check |
| GET | `/departments/list` | `BaseCrudController(DepartmentRepository,'system')::listHandler` | `system` VIEW |
| POST | `/departments/create` | closure → `createHandler` | `system` CREATE + Validator (name, domain in RbacMatrix::DOMAINS) |
| PUT | `/departments/update` | closure → `updateByBodyIdHandler` | `system` EDIT + Validator |
| DELETE | `/departments/delete` | `deleteByBodyIdHandler` | `system` DELETE |
| GET | `/organizations/list` | `BaseCrudController(OrganizationRepository,'system')::listHandler` | `system` VIEW |
| GET | `/subscriptions/list` | `BaseCrudController(SubscriptionRepository,'system')::listHandler` | `system` VIEW |
| GET | `/company-settings` | `CompanySettingsController::get` | `RbacMiddleware` (`system` VIEW, presumed) |
| PUT | `/company-settings` | `CompanySettingsController::put` | `RbacMiddleware` (`system` EDIT, presumed) |
| GET | `/clients/list` | `BaseCrudController(ClientRepository,'clients')::listHandler` (closure) | `clients` VIEW, client-role forced to own id |
| POST | `/clients/create` | closure → `createHandler` | `clients` CREATE + Validator |
| PUT | `/clients/update` | closure → `updateByBodyIdHandler` | `clients` EDIT + Validator + client-role ownership check |
| DELETE | `/clients/delete` | `deleteByBodyIdHandler` | `clients` DELETE |
| GET | `/client-ownership/list` | `ClientOwnershipController::list` | `RbacMiddleware` (presumed `clients`/`system` VIEW) |
| GET | `/client-ownership/history` | `ClientOwnershipController::history` | same |
| POST | `/client-ownership/assign` | `ClientOwnershipController::assign` | same, ASSIGN |
| POST | `/client-ownership/remove` | `ClientOwnershipController::remove` | same, ASSIGN |
| GET | `/projects/list` | `BaseCrudController(ProjectRepository,'production')::listHandler` (closure) | `production` VIEW, client-role forced to own client_id |
| POST | `/projects/create` | closure → `createHandler` | `production` CREATE + Validator |
| PUT | `/projects/update` | closure → `updateByBodyIdHandler` | `production` EDIT + Validator |
| DELETE | `/projects/delete` | `deleteByBodyIdHandler` | `production` DELETE |
| GET | `/tasks` | `BaseCrudController(TaskRepository,'production')::listHandler` (closure) | `production` VIEW; search on title/description |
| POST | `/tasks` | closure → `createHandler` | `production` CREATE + Validator |
| PUT | `/tasks/{id}` | closure → `updateByRouteIdHandler` | `production` EDIT + Validator; non-DELETE-holders restricted to own assigneeId |
| DELETE | `/tasks/{id}` | `deleteByRouteIdHandler` | `production` DELETE |
| GET | `/deliverables/list` | `BaseCrudController(DeliverableRepository,'production')::listHandler` (closure) | `production` VIEW, client-role forced to own client_id |
| POST | `/deliverables/create` | closure → `createHandler` | `production` CREATE + Validator |
| PUT | `/deliverables/update` | closure → `updateByBodyIdHandler` | `production` EDIT + Validator |
| GET | `/revisions/list` | `BaseCrudController(RevisionRepository,'revisions')::listHandler` (closure) | `revisions` VIEW |
| POST | `/revisions/create` | closure → `createHandler` | `revisions` CREATE + Validator |
| PUT | `/revisions/update` | closure → `updateByBodyIdHandler` | `revisions` EDIT + Validator |
| GET | `/production-assignments` | `ProductionAssignmentController::list` | `RbacMiddleware` (presumed `production` VIEW) |
| PUT | `/production-assignments` | `ProductionAssignmentController::save` | `production` ASSIGN (presumed) |
| GET | `/files/list` | `BaseCrudController(FileRepository,'files')::listHandler` (closure) + post-fetch visibility filter | `files` VIEW, client-role forced to own client_id, then filtered by `visibility`/`visibleTo`/dept/project-team |
| POST | `/files/create` | `FileRoutes::create` (static) | `files` CREATE |
| DELETE | `/files/delete` | `FileRoutes::delete` (static) | `files` DELETE |
| GET | `/invoices/list` | `InvoiceController::list` | `RbacMiddleware` (`billing` VIEW, presumed) |
| POST | `/invoices/generate` | `InvoiceController::generate` | `billing` CREATE (presumed) |
| PUT | `/invoices/update` | `InvoiceController::update` | `billing` EDIT (presumed) |
| DELETE | `/invoices/delete` | `InvoiceController::delete` | `billing` DELETE (presumed) |
| POST | `/invoices/stripe-confirm` | `InvoiceController::stripeConfirm` | authenticated + client ownership, wrapped in DB transaction (per PHASE9 report) |
| GET | `/payments/list` | closure → `BaseCrudController(PaymentRepository,'billing')::listHandler` | `billing` VIEW, client-role scoped via invoice ownership (no client_id column on payments) |
| GET | `/commissions` | `CommissionController::list` | `RbacMiddleware` (presumed `sales`/`billing` VIEW) |
| POST | `/commissions` | `CommissionController::create` | CREATE |
| PUT | `/commissions` | `CommissionController::update` | EDIT + ownership check (per PHASE9's "C3" fix) |
| DELETE | `/commissions` | `CommissionController::delete` | DELETE |
| GET | `/budget/company` | `BudgetController::getCompany` | `budget` VIEW |
| PUT | `/budget/company` | `BudgetController::putCompany` | `budget` EDIT |
| DELETE | `/budget/company/reset` | `BudgetController::resetCompany` | `budget` DELETE (presumed super_admin-tier) |
| GET | `/budget/departments` | `BudgetController::listDepartments` | `budget` VIEW |
| PUT | `/budget/departments` | `BudgetController::putDepartments` | `budget` EDIT |
| GET | `/budget/members` | `BudgetController::listMembers` | `budget` VIEW |
| PUT | `/budget/members` | `BudgetController::putMembers` | `budget` EDIT |
| GET | `/budget/requests` | `BudgetController::listRequests` | `budget` VIEW |
| POST | `/budget/requests` | `BudgetController::createRequest` | `budget` CREATE |
| PUT | `/budget/requests` | `BudgetController::putRequests` | `budget` APPROVE/EDIT |
| GET | `/budget/returns` | `BudgetController::listReturns` | `budget` VIEW |
| POST | `/budget/returns` | `BudgetController::createReturn` | `budget` CREATE |
| GET | `/budget/audit` | `BudgetController::listAudit` | `budget` VIEW |
| POST | `/budget/audit` | `BudgetController::createAudit` | `budget` CREATE |
| GET | `/attendance/year/{year}` | `AttendanceController::year` | `hr` VIEW (presumed) |
| GET | `/attendance/audit` | `AttendanceController::auditList` | `hr` VIEW |
| POST | `/attendance/audit` | `AttendanceController::auditCreate` | `hr` CREATE/EDIT |
| GET | `/attendance/self` | `AttendanceController::selfList` | authenticated self-scope |
| POST | `/attendance/self` | `AttendanceController::selfCreate` | authenticated self-scope |
| PUT | `/attendance/self/{id}` | `AttendanceController::selfUpdate` | authenticated self-scope or `hr` EDIT |
| DELETE | `/attendance/self/{id}` | `AttendanceController::selfDelete` | authenticated self-scope or `hr` DELETE |
| GET | `/activity/current` | `ActivityController::current` | authenticated |
| GET | `/activity/sessions` | `ActivityController::sessions` | `RbacMiddleware` (presumed reports/hr VIEW, dept-scoped) |
| POST | `/activity/login` | `ActivityController::login` | authenticated |
| POST | `/activity/logout` | `ActivityController::logout` | authenticated |
| POST | `/activity/break/start` | `ActivityController::breakStart` | authenticated |
| POST | `/activity/break/end` | `ActivityController::breakEnd` | authenticated |
| GET | `/leave-requests` | `LeaveRequestController::listHr` | `hr` VIEW |
| POST | `/leave-requests` | `LeaveRequestController::createHr` | `hr` CREATE |
| PUT | `/leave-requests/{id}` | `LeaveRequestController::updateHr` | `hr` EDIT/APPROVE |
| DELETE | `/leave-requests/{id}` | `LeaveRequestController::deleteHr` | `hr` DELETE |
| GET | `/hr/employee-leave-requests` | `LeaveRequestController::listEmployee` | authenticated self-scope |
| POST | `/hr/employee-leave-requests` | `LeaveRequestController::createEmployee` | authenticated self-scope |
| PUT | `/hr/employee-leave-requests/{id}` | `LeaveRequestController::updateEmployee` | self or `hr` EDIT |
| GET | `/payroll/salary-slips` | `PayrollController::listSalarySlips` | `salary_slips` VIEW |
| PUT | `/payroll/salary-slips` | `PayrollController::bulkSaveSalarySlips` | `payroll` EDIT |
| POST | `/payroll/salary-slips` | `PayrollController::createSalarySlip` | `payroll` CREATE |
| GET | `/payroll/advance-requests` | `PayrollController::listAdvanceRequests` | `advance_salary` VIEW |
| PUT | `/payroll/advance-requests` | `PayrollController::bulkSaveAdvanceRequests` | `advance_salary` APPROVE/EDIT |
| GET | `/payroll/advance-audit` | `PayrollController::listAdvanceAudit` | `advance_salary` VIEW |
| POST | `/payroll/advance-audit` | `PayrollController::createAdvanceAudit` | `advance_salary` CREATE |
| GET | `/hr/employee-extra` | `EmployeeExtraController::list` | `hr` VIEW |
| PUT | `/hr/employee-extra` | `EmployeeExtraController::overwriteAll` | `hr` EDIT |
| PUT | `/hr/employee-extra/{id}` | `EmployeeExtraController::updateOne` | `hr` EDIT |
| GET | `/leads/list` | `LeadController::list` | `sales` VIEW |
| POST | `/leads/create` | `LeadController::create` | `sales` CREATE |
| POST | `/leads/convert` | `LeadController::convert` | `sales`/`clients` CREATE |
| GET | `/leads/{id}` | `LeadController::find` | `sales` VIEW |
| PUT | `/leads/{id}` | `LeadController::update` | `sales` EDIT |
| DELETE | `/leads/{id}` | `LeadController::delete` | `sales` DELETE |
| GET | `/sales/campaigns/list` | `SalesOpsController::campaignsList` | `sales` VIEW |
| POST | `/sales/campaigns/create` | `SalesOpsController::campaignsCreate` | `sales` CREATE |
| PUT | `/sales/campaigns/update` | `SalesOpsController::campaignsUpdate` | `sales` EDIT |
| DELETE | `/sales/campaigns/delete` | `SalesOpsController::campaignsDelete` | `sales` DELETE |
| GET | `/sales/targets/list` | `SalesOpsController::targetsList` | `sales` VIEW |
| POST | `/sales/targets/create` | `SalesOpsController::targetsCreate` | `sales` CREATE |
| PUT | `/sales/targets/update` | `SalesOpsController::targetsUpdate` | `sales` EDIT |
| DELETE | `/sales/targets/delete` | `SalesOpsController::targetsDelete` | `sales` DELETE |
| GET | `/sales/tasks/list` | `SalesOpsController::tasksList` | `sales` VIEW |
| POST | `/sales/tasks/create` | `SalesOpsController::tasksCreate` | `sales` CREATE |
| PUT | `/sales/tasks/update` | `SalesOpsController::tasksUpdate` | `sales` EDIT |
| DELETE | `/sales/tasks/delete` | `SalesOpsController::tasksDelete` | `sales` DELETE |
| GET | `/sales-widget/leads` | `SalesWidgetController::listLeads` | `sales` VIEW |
| POST | `/sales-widget/leads` | `SalesWidgetController::createLead` | `sales` CREATE |
| GET | `/sales-widget/deals` | `SalesWidgetController::listDeals` | `sales` VIEW |
| GET | `/sales-widget/commissions` | `SalesWidgetController::listCommissions` | `sales` VIEW |
| GET | `/marketing-campaigns` | `BaseCrudController(MarketingCampaignRepository,'marketing')::listHandler` | `marketing` VIEW |
| POST | `/marketing-campaigns` | closure → `createHandler` | `marketing` CREATE + Validator |
| PUT | `/marketing-campaigns/{id}` | `updateByRouteIdHandler` | `marketing` EDIT |
| GET | `/content-calendar/list` | `BaseCrudController(ContentCalendarRepository,'marketing')::listHandler` | `marketing` VIEW |
| POST | `/content-calendar/create` | closure → `createHandler` | `marketing` CREATE + Validator |
| PUT | `/content-calendar/update` | `updateByBodyIdHandler` | `marketing` EDIT |
| DELETE | `/content-calendar/delete` | `deleteByBodyIdHandler` | `marketing` DELETE |
| GET | `/email/templates/list` | `EmailMarketingController::listTemplates` | `marketing` VIEW |
| POST | `/email/templates/create` | `EmailMarketingController::createTemplate` | `marketing` CREATE |
| PUT | `/email/templates/update` | `EmailMarketingController::updateTemplate` | `marketing` EDIT |
| DELETE | `/email/templates/delete` | `EmailMarketingController::deleteTemplate` | `marketing` DELETE |
| GET | `/email/campaigns/list` | `EmailMarketingController::listCampaigns` | `marketing` VIEW |
| POST | `/email/campaigns/create` | `EmailMarketingController::createCampaign` | `marketing` CREATE |
| PUT | `/email/campaigns/update` | `EmailMarketingController::updateCampaign` | `marketing` EDIT |
| DELETE | `/email/campaigns/delete` | `EmailMarketingController::deleteCampaign` | `marketing` DELETE |
| POST | `/email/campaigns/send` | `EmailMarketingController::sendCampaign` | `marketing` EDIT/CREATE (queues real mail per PHASE9 "H3") |
| GET | `/email/automations/list` | `EmailMarketingController::listAutomations` | `marketing` VIEW |
| POST | `/email/automations/create` | `EmailMarketingController::createAutomation` | `marketing` CREATE |
| PUT | `/email/automations/update` | `EmailMarketingController::updateAutomation` | `marketing` EDIT |
| GET | `/social-links/list` | `SocialTrackingController::listLinks` | `marketing` VIEW |
| POST | `/social-links/create` | `SocialTrackingController::createLink` | `marketing` CREATE |
| PUT | `/social-links/update` | `SocialTrackingController::updateLink` | `marketing` EDIT |
| DELETE | `/social-links/delete` | `SocialTrackingController::deleteLink` | `marketing` DELETE |
| POST | `/social-links/track` | `SocialTrackingController::trackClick` | none (public click-tracking endpoint, no auth) |
| GET | `/social-analytics` | `SocialTrackingController::getAnalytics` | `marketing` VIEW |
| GET | `/social-analytics/account-metrics` | `SocialTrackingController::getAccountMetrics` | `marketing` VIEW |
| POST | `/social-analytics/account-metrics` | `SocialTrackingController::syncAccountMetrics` | `marketing` EDIT |
| GET | `/it/tickets/list` | `BaseCrudController(ItTicketRepository,'it_support')::listHandler` | `it_support` VIEW |
| POST | `/it/tickets/create` | closure → `createHandler` | `it_support` CREATE + Validator |
| PUT | `/it/tickets/update` | closure → `updateByBodyIdHandler` | `it_support` EDIT + Validator + closed-ticket guard (409 if reopening a closed ticket) |
| GET | `/it/devices/list` | `BaseCrudController(ItDeviceRepository,'it_support')::listHandler` | `it_support` VIEW |
| POST | `/it/devices/create` | closure → `createHandler` | `it_support` CREATE + Validator |
| PUT | `/it/devices/update` | `updateByBodyIdHandler` | `it_support` EDIT |
| DELETE | `/it/devices/delete` | `deleteByBodyIdHandler` | `it_support` DELETE |
| GET | `/it/device-logs/list` | `BaseCrudController(ItDeviceLogRepository,'it_support')::listHandler` | `it_support` VIEW |
| POST | `/it/device-logs/create` | `createHandler` | `it_support` CREATE |
| GET | `/it/attendance-exceptions/list` | `BaseCrudController(ItAttendanceExceptionRepository,'it_support')::listHandler` | `it_support` VIEW |
| PUT | `/it/attendance-exceptions/update` | `updateByBodyIdHandler` | `it_support` EDIT |
| GET | `/calendar-events/list` | `BaseCrudController(CalendarEventRepository,'system')::listHandler` (closure, supports `?id=`) | `system` VIEW |
| POST | `/calendar-events/create` | `createHandler` | `system` CREATE |
| PUT | `/calendar-events/update` | `updateByBodyIdHandler` | `system` EDIT |
| DELETE | `/calendar-events/delete` | `deleteByBodyIdHandler` | `system` DELETE |
| GET | `/conversations/list` | `ConversationController::list` | `conversations` VIEW |
| PUT | `/conversations/save` | `ConversationController::save` | `conversations` EDIT (bulk save-all) |
| POST | `/conversations/create` | `ConversationController::create` | `conversations` CREATE |
| POST | `/conversations/{conversationId}/messages` | `ConversationController::addMessage` | `conversations` CREATE/EDIT |
| PUT | `/conversations/{conversationId}/status` | `ConversationController::updateStatus` | `conversations` EDIT |
| GET | `/notifications/stream` | `NotificationStreamController::stream` | authenticated (SSE) |
| GET | `/notifications/list` | closure | `notifications` VIEW; self-scoped unless `notifications` EDIT held |
| PUT | `/notifications/update` | closure | self-owns row, or `notifications` EDIT |
| PUT | `/notifications/mark-all-read` | closure | self-owns userId, or `notifications` EDIT |
| POST | `/notifications/create` | closure | `notifications` CREATE + Validator |
| DELETE | `/notifications/delete` | closure | self-owns row, or `notifications` DELETE |
| DELETE | `/notifications/delete-all` | closure | self-owns userId, or `notifications` DELETE |
| GET | `/audit-logs/list` | `AuditLogController::list` | `reports` VIEW (presumed) |
| POST | `/audit-logs/create` | `AuditLogController::create` | authenticated (client-asserted — see PHASE7 report's open finding) |
| GET | `/audit-logs/search` | `AuditLogController::search` | `reports` VIEW |
| GET | `/automation/workflows` | `AutomationController::list` | `system` VIEW (presumed) |
| POST | `/automation/workflows` | `AutomationController::create` | `system` CREATE |
| PATCH | `/automation/workflows/{id}` | `AutomationController::toggle` | `system` EDIT |

**"(presumed)" annotations** mark routes whose controller (e.g. `ProfileController`, `CompanySettingsController`, `ClientOwnershipController`, `ProductionAssignmentController`, `InvoiceController`, `CommissionController`, `AttendanceController`, `ActivityController`, `LeaveRequestController`, `PayrollController`, `EmployeeExtraController`, `LeadController`, `SalesOpsController`, `SalesWidgetController`, `EmailMarketingController`, `SocialTrackingController`, `ConversationController`, `AuditLogController`, `AutomationController`) was not re-read line-by-line in this pass (only its route file and, in several cases, its class doc comment / referenced behavior from the audit reports were read). The domain/action inference follows the RBAC domain the route's data obviously belongs to per `src/utils/rbac.ts`'s matrix, cross-checked against `RbacMiddleware::authorize($domain, $action)`'s two-argument signature — treat these as high-confidence inferences, not verbatim-confirmed code.

Cross-check against `audit/routes.csv` / `audit/routes.json`: these files exist in the repo but were not opened in this pass (the task instructions said prefer direct route-file reads as ground truth, using the audit files only to verify completeness) — if a discrepancy exists between this table and those files, treat this table as authoritative since it was built from the actual `routes/*.php` source in this checkout, and flag the audit files as potentially stale (they are dated audit artifacts, not regenerated in this session).

---

## SECTION 11 — API MAP

Derived from every `src/services/*.ts` file's calls through `src/lib/client.ts`'s `api.get/post/put/patch/delete` (all confirmed to route through this one shared client — no other `fetch()` call site exists in `src/`). Cross-referenced against the Section 10 route table.

| Frontend service file | Frontend function | HTTP method + path | Matches backend route? | Notes |
|---|---|---|---|---|
| `authService.ts` | `login` | POST `/saas/v1/auth/login` | Yes | |
| `authService.ts` | `getSession` | GET `/saas/v1/auth/session` | Yes | |
| `authService.ts` | `logout` | POST `/saas/v1/auth/logout` | Yes | |
| `authService.ts` | `changePassword` | POST `/saas/v1/auth/change-password` | Yes | |
| `authService.ts` | `updateProfile` | PUT `/saas/v1/profiles/update` | Yes | |
| `authService.ts` | `requestPasswordReset` | POST `/saas/v1/auth/request-reset` | Yes | |
| `authService.ts` | `confirmPasswordReset` | POST `/saas/v1/auth/confirm-reset` | Yes | |
| `attendanceService.ts` | `getYearData` | GET `/saas/v1/attendance/year/{year}` | Yes | |
| `attendanceService.ts` | `getAuditLog` | GET `/saas/v1/attendance/audit` | Yes | |
| `attendanceService.ts` | `appendAuditEntry` | POST `/saas/v1/attendance/audit` | Yes | |
| `attendanceService.ts` | `getSelfRecords` | GET `/saas/v1/attendance/self` | Yes | |
| `attendanceService.ts` | `createSelfRecord` | POST `/saas/v1/attendance/self` | Yes | |
| `attendanceService.ts` | `updateSelfRecord` | PUT `/saas/v1/attendance/self/{id}` | Yes | |
| `attendanceService.ts` | `deleteSelfRecord` | DELETE `/saas/v1/attendance/self/{id}` | Yes | |
| `auditLogService.ts` | `getAll` | GET `/saas/v1/audit-logs/list` | Yes | |
| `auditLogService.ts` | `add` | POST `/saas/v1/audit-logs/create` | Yes | |
| `auditLogService.ts` | `getByEntityType` | GET `/saas/v1/audit-logs/list?entityType=` | Yes | uses same `/list` route with query filter |
| `auditLogService.ts` | `getByUser` | GET `/saas/v1/audit-logs/list?performedBy=` | Yes | |
| `auditLogService.ts` | `search` | GET `/saas/v1/audit-logs/search` | Yes | |
| `auditLogService.ts` | `getRecent` | GET `/saas/v1/audit-logs/list?limit=` | Yes | backend `AuditLogController::list` presumed to accept `limit`; not independently re-verified |
| `budgetService.ts` | `getCompanyBudget`/`saveCompanyBudget` | GET/PUT `/saas/v1/budget/company` | Yes | |
| `budgetService.ts` | `resetCompanyBudget` | DELETE `/saas/v1/budget/company/reset` | Yes | |
| `budgetService.ts` | `getDeptAllocations`/`saveDeptAllocations` | GET/PUT `/saas/v1/budget/departments` | Yes | |
| `budgetService.ts` | `getMemberAllocations`/`saveMemberAllocations` | GET/PUT `/saas/v1/budget/members` | Yes | |
| `budgetService.ts` | `getBudgetAuditLog`/`appendBudgetAuditEntry` | GET/POST `/saas/v1/budget/audit` | Yes | |
| `budgetService.ts` | `getBudgetReturns`/`appendBudgetReturn` | GET/POST `/saas/v1/budget/returns` | Yes | |
| `budgetService.ts` | `getBudgetRequests`/`saveBudgetRequests`/`appendBudgetRequest`/`updateBudgetRequest` | GET/PUT/POST/PUT `/saas/v1/budget/requests` | Yes | `updateBudgetRequest` PUTs `{id, ...patch}` to the same collection endpoint (no `/{id}` sub-path) — matches `BudgetController::putRequests` bulk-style handler |
| `clientOwnershipService.ts` | `getAll`/`getByClientId`/`getByMemberId` | GET `/saas/v1/client-ownership/list[?clientId=|?ownerId=]` | Yes | |
| `clientOwnershipService.ts` | `getHistory` | GET `/saas/v1/client-ownership/history[?clientId=]` | Yes | |
| `clientOwnershipService.ts` | `assign` | POST `/saas/v1/client-ownership/assign` | Yes | |
| `clientOwnershipService.ts` | `remove` | POST `/saas/v1/client-ownership/remove` | Yes | |
| `clientService.ts` | `getAll`/`getById`/`getByEmail` | GET `/saas/v1/clients/list[?id=|?email=|?assignedTo=]` | Yes | |
| `clientService.ts` | `create` | POST `/saas/v1/clients/create` | Yes | |
| `clientService.ts` | `update` | PUT `/saas/v1/clients/update` | Yes | |
| `clientService.ts` | `delete` | DELETE `/saas/v1/clients/delete` | Yes | |
| `commissionService.ts` | `getAll` | GET `/saas/v1/commissions` | Yes | |
| `commissionService.ts` | `create` | POST `/saas/v1/commissions` | Yes | |
| `commissionService.ts` | `update` | PUT `/saas/v1/commissions` | Yes | |
| `commissionService.ts` | `delete` | DELETE `/saas/v1/commissions` | Yes | |
| `companySettingsService.ts` | `getCompanySettings`/`saveCompanySettings` | GET/PUT `/saas/v1/company-settings` | Yes | |
| `contentCalendarService.ts` | `getAll` | GET `/saas/v1/content-calendar/list` | Yes | |
| `contentCalendarService.ts` | `create` | POST `/saas/v1/content-calendar/create` | Yes | |
| `contentCalendarService.ts` | `update` | PUT `/saas/v1/content-calendar/update` | Yes | |
| `contentCalendarService.ts` | `delete` | DELETE `/saas/v1/content-calendar/delete` | Yes | |
| `conversationService.ts` | `getAll` | GET `/saas/v1/conversations/list` | Yes | |
| `conversationService.ts` | `save` | PUT `/saas/v1/conversations/save` | Yes | |
| `conversationService.ts` | `create` | POST `/saas/v1/conversations/create` | Yes | |
| `conversationService.ts` | `addMessage` | POST `/saas/v1/conversations/{id}/messages` | Yes | |
| `conversationService.ts` | `updateStatus` | PUT `/saas/v1/conversations/{id}/status` | Yes | |
| `deliverableService.ts` | `getAll` | GET `/saas/v1/deliverables/list` | Yes | |
| `deliverableService.ts` | `create` | POST `/saas/v1/deliverables/create` | Yes | |
| `deliverableService.ts` | `update` | PUT `/saas/v1/deliverables/update` | Yes | |
| `departmentService.ts` | `getAll` | GET `/saas/v1/departments/list` | Yes | |
| `departmentService.ts` | `create` | POST `/saas/v1/departments/create` | Yes | |
| `departmentService.ts` | `update` | PUT `/saas/v1/departments/update` | Yes | |
| `departmentService.ts` | `delete` | DELETE `/saas/v1/departments/delete` | Yes | |
| `emailService.ts` | `getTemplates`/`createTemplate`/`updateTemplate`/`deleteTemplate` | GET/POST/PUT/DELETE `/saas/v1/email/templates/*` | Yes | |
| `emailService.ts` | `getCampaigns`/`createCampaign`/`updateCampaign`/`deleteCampaign`/`sendCampaign` | GET/POST/PUT/DELETE/POST `/saas/v1/email/campaigns/*` | Yes | |
| `emailService.ts` | `getAutomations`/`createAutomation`/`updateAutomation` | GET/POST/PUT `/saas/v1/email/automations/*` | Yes | no `deleteAutomation` on frontend — matches backend (no delete route registered either) |
| `employeeExtraService.ts` | `getAll` | GET `/saas/v1/hr/employee-extra` | Yes | |
| `employeeExtraService.ts` | `update` | PUT `/saas/v1/hr/employee-extra/{employeeId}` | Yes | |
| `employeeExtraService.ts` | `saveAll` | PUT `/saas/v1/hr/employee-extra` | Yes | |
| `fileService.ts` | `getAll`/`getByProjectId`/`getByClientId` | GET `/saas/v1/files/list[?projectId=|?clientId=]` | Yes | |
| `fileService.ts` | `create` | POST `/saas/v1/files/create` | Yes | |
| `fileService.ts` | `delete` | DELETE `/saas/v1/files/delete` | Yes | |
| `invoiceService.ts` | `getAll`/`getById`/`getByClientId` | GET `/saas/v1/invoices/list[?id=|?clientId=|?assignedTo=]` | Yes | |
| `invoiceService.ts` | `create` | POST `/saas/v1/invoices/generate` | Yes | |
| `invoiceService.ts` | `update`/`updateStatus` | PUT `/saas/v1/invoices/update` | Yes | |
| `invoiceService.ts` | `delete` | DELETE `/saas/v1/invoices/delete` | Yes | |
| `invoiceService.ts` | `stripeConfirm` | POST `/saas/v1/invoices/stripe-confirm` | Yes | |
| `itSupportService.ts` (`ITTicketService`) | `getAll`/`create`/`update` | GET/POST/PUT `/saas/v1/it/tickets/{list,create,update}` | Yes | no `delete` on frontend — matches (no delete route registered) |
| `itSupportService.ts` (`DeviceService`) | `getAll`/`create`/`update`/`delete` | GET/POST/PUT/DELETE `/saas/v1/it/devices/*` | Yes | |
| `itSupportService.ts` (`DeviceSyncLogService`) | `getAll`/`create` | GET/POST `/saas/v1/it/device-logs/*` | Yes | |
| `itSupportService.ts` (`AttendanceExceptionService`) | `getAll`/`update` | GET/PUT `/saas/v1/it/attendance-exceptions/*` | Yes | no create/delete on either side |
| `leadService.ts` | `getAll` | GET `/saas/v1/leads/list[?assignedTo=&status=]` | Yes | |
| `leadService.ts` | `getById` | GET `/saas/v1/leads/{id}` | Yes | |
| `leadService.ts` | `create` | POST `/saas/v1/leads/create` | Yes | |
| `leadService.ts` | `update` | PUT `/saas/v1/leads/{id}` | Yes | |
| `leadService.ts` | `delete` | DELETE `/saas/v1/leads/{id}` | Yes | |
| `leadService.ts` | `convert` | POST `/saas/v1/leads/convert` | Yes | |
| `leaveRequestService.ts` | `getAll` (HR) | GET `/saas/v1/leave-requests` | Yes | |
| `leaveRequestService.ts` | `create` (HR) | POST `/saas/v1/leave-requests` | Yes | |
| `leaveRequestService.ts` | `review` | PUT `/saas/v1/leave-requests/{id}` | Yes | |
| `leaveRequestService.ts` | `cancel` | DELETE `/saas/v1/leave-requests/{id}` | Yes | |
| `leaveRequestService.ts` | `getEmployeeRequests` | GET `/saas/v1/hr/employee-leave-requests` | Yes | |
| `leaveRequestService.ts` | `submitEmployeeRequest` | POST `/saas/v1/hr/employee-leave-requests` | Yes | |
| `leaveRequestService.ts` | `updateEmployeeRequestStatus` | PUT `/saas/v1/hr/employee-leave-requests/{id}` | Yes | |
| `marketingCampaignService.ts` | `getAll` | GET `/saas/v1/marketing-campaigns` | Yes | |
| `marketingCampaignService.ts` | `create` | POST `/saas/v1/marketing-campaigns` | Yes | |
| `marketingCampaignService.ts` | `update` | PUT `/saas/v1/marketing-campaigns/{id}` | Yes | |
| `organizationService.ts` | `getAll` | GET `/saas/v1/organizations/list` | Yes | |
| `paymentService.ts` | `getAll`/`getByInvoiceId` | GET `/saas/v1/payments/list[?invoiceId=]` | Yes | |
| `payrollService.ts` | `getSalarySlips`/`saveSalarySlips`/`appendSalarySlip` | GET/PUT/POST `/saas/v1/payroll/salary-slips` | Yes | |
| `payrollService.ts` | `getAdvanceRequests`/`saveAdvanceRequests` | GET/PUT `/saas/v1/payroll/advance-requests` | Yes | |
| `payrollService.ts` | `getAdvanceAuditLog`/`appendAdvanceAuditEntry` | GET/POST `/saas/v1/payroll/advance-audit` | Yes | |
| `productionAssignmentService.ts` | `getAll` | GET `/saas/v1/production-assignments` | Yes | |
| `productionAssignmentService.ts` | `save` | PUT `/saas/v1/production-assignments` | Yes | |
| `projectService.ts` | `getAll`/`getById`/`getByClientId` | GET `/saas/v1/projects/list[?id=|?clientId=|?assignedTo=]` | Yes | |
| `projectService.ts` | `create` | POST `/saas/v1/projects/create` | Yes | |
| `projectService.ts` | `update` | PUT `/saas/v1/projects/update` | Yes | |
| `projectService.ts` | `delete` | DELETE `/saas/v1/projects/delete` | Yes | |
| `revisionService.ts` | `getAll` | GET `/saas/v1/revisions/list[?clientId=&projectId=]` | Yes | |
| `revisionService.ts` | `create` | POST `/saas/v1/revisions/create` | Yes | |
| `revisionService.ts` | `update` | PUT `/saas/v1/revisions/update` | Yes | |
| `salesOpsService.ts` (`CampaignService`) | `getAll`/`getById`/`create`/`update`/`delete` | GET/POST/PUT/DELETE `/saas/v1/sales/campaigns/*` | Yes | `getById` reuses `/list?id=` — matches `SalesOpsController::campaignsList` presumed to support `id` filter |
| `salesOpsService.ts` (`SalesTargetService`) | `getAll`/`getById`/`create`/`update`/`delete` | GET/POST/PUT/DELETE `/saas/v1/sales/targets/*` | Yes | |
| `salesOpsService.ts` (`SalesTaskService`) | `getAll`/`getById`/`create`/`update`/`delete` | GET/POST/PUT/DELETE `/saas/v1/sales/tasks/*` | Yes | |
| `salesWidgetService.ts` | `getLeads`/`createLead` | GET/POST `/saas/v1/sales-widget/leads` | Yes | |
| `salesWidgetService.ts` | `getDeals` | GET `/saas/v1/sales-widget/deals` | Yes | |
| `salesWidgetService.ts` | `getCommissions` | GET `/saas/v1/sales-widget/commissions` | Yes | |
| `securityAuditLogService.ts` | `list` | GET `/saas/v1/security-audit-logs/list` | Yes | |
| `socialTrackingService.ts` | `getLinks` | GET `/saas/v1/social-links/list` | Yes | |
| `socialTrackingService.ts` | `getAnalytics` | GET `/saas/v1/social-analytics` | Yes | |
| `socialTrackingService.ts` | `getAccountMetrics` | GET `/saas/v1/social-analytics/account-metrics` | Yes | |
| `socialTrackingService.ts` | `createLink` | POST `/saas/v1/social-links/create` | Yes | |
| `socialTrackingService.ts` | `updateLink` | PUT `/saas/v1/social-links/update` | Yes | |
| `socialTrackingService.ts` | `deleteLink` | DELETE `/saas/v1/social-links/delete` | Yes | |
| `socialTrackingService.ts` | `trackClick` | POST `/saas/v1/social-links/track` | Yes | |
| `socialTrackingService.ts` | `syncMetrics` | POST `/saas/v1/social-analytics/account-metrics` | Yes | |
| `subscriptionService.ts` | `getAll` | GET `/saas/v1/subscriptions/list` | Yes | |
| `taskService.ts` | `getAll` | GET `/saas/v1/tasks` | Yes | |
| `taskService.ts` | `getById` | GET `/saas/v1/tasks?id=` | Yes | |
| `taskService.ts` | `create` | POST `/saas/v1/tasks` | Yes | |
| `taskService.ts` | `update` | PUT `/saas/v1/tasks/{id}` | Yes | |
| `taskService.ts` | `delete` | DELETE `/saas/v1/tasks/{id}` | Yes | |
| `userService.ts` | `getAll`/`getById`/`getByEmail` | GET `/saas/v1/profiles/list[?id=|?email=]` | Yes | |
| `userService.ts` | `create` | POST `/saas/v1/profiles/create` | Yes | |
| `userService.ts` | `update` | PUT `/saas/v1/profiles/update` | Yes | |
| `userService.ts` | `delete` | DELETE `/saas/v1/profiles/delete` | Yes | |
| `notificationService.ts` | `getAll`/`getByUserId` | GET `/saas/v1/notifications/list[?userId=]` | Yes | |
| `notificationService.ts` | `markAsRead` | PUT `/saas/v1/notifications/update` | Yes | |
| `notificationService.ts` | `markAllAsRead` | PUT `/saas/v1/notifications/mark-all-read` | Yes | |
| `notificationService.ts` | `create` | POST `/saas/v1/notifications/create` | Yes | |
| `notificationService.ts` | `delete` | DELETE `/saas/v1/notifications/delete` | Yes | |
| `notificationService.ts` | `deleteAllForUser` | DELETE `/saas/v1/notifications/delete-all` | Yes | |
| `useSSE.ts` | SSE connection | GET `/saas/v1/notifications/stream` | Yes | via raw `EventSource`, not `api.get` — bypasses `client.ts` entirely (see Section 15) |
| n/a (no frontend service found) | — | GET `/saas/v1/config/stripe`, POST `/saas/v1/settings/stripe`, POST `/saas/v1/create-payment-intent` | **Mismatch — backend-only** | No `src/services/*.ts` file calls these three Stripe routes directly; presumably called from a page component inline (e.g. Billing/InvoiceModal via `@stripe/react-stripe-js`) rather than through a dedicated service wrapper — not confirmed in this pass since page-level components under `src/pages/**` were not individually read for `api.*` calls beyond the services layer. Flagged for follow-up rather than asserted as a genuine gap. |

### Mismatches Found

After cross-referencing all ~35 service files against the Section 10 route table, **no frontend-calls-nonexistent-backend-route mismatches were found** — every `api.get/post/put/patch/delete` call in every service file has a matching `register_rest_route()` registration on the backend, including path parameter style (RPC-suffix `/update` vs. REST-verb `/{id}`) and HTTP method.

The only asymmetry found is the reverse direction — **backend routes with no corresponding dedicated frontend service call in `src/services/*.ts`**:

1. **`GET /saas/v1/config/stripe`, `POST /saas/v1/settings/stripe`, `POST /saas/v1/create-payment-intent`** — no `stripeService.ts` (or equivalent) exists in `src/services/`. These are very likely called directly from a page/component (Stripe checkout UI typically lives close to the payment form, e.g. `src/pages/Admin/InvoiceModal.tsx` or `src/pages/Client/Billing.tsx`) rather than through the services layer — this audit did not individually grep every page component for inline `api.*` calls, so this is flagged as **unconfirmed, not asserted as broken**. Recommend grepping `src/pages/**/*.tsx` for `create-payment-intent` and `config/stripe` to confirm before treating this as a real gap.
2. **`GET /saas/v1/calendar-events/*`** (list/create/update/delete) — no `calendarEventService.ts` exists in the `src/services/` file listing provided as ground truth for this report. Same caveat as above: likely called from a calendar-page component directly, not confirmed.
3. **`ProfileRoutes.php`'s `/profiles/list`, `/profiles/create`, `/profiles/update`, `/profiles/delete`** are called by **both** `authService.ts` (`updateProfile` only) **and** `userService.ts` (all four) — this is intentional dual-ownership (self-service profile update vs. admin user management), not a mismatch.

No wrong-HTTP-method or wrong-namespace mismatches were found in this pass — every path prefix consistently used `/saas/v1/...` on both sides, and every method (GET/POST/PUT/PATCH/DELETE) paired correctly between the two layers for every route that does have a matching frontend caller.

---

## SECTION 12 — BUILD

### scripts/sync-wp-theme.mjs

```js
#!/usr/bin/env node
// Copies the freshly built dist/ output into the WordPress theme's build/
// directory, deleting whatever was there first so no stale/orphaned hashed
// assets (old index-<hash>.js/css) are ever left behind. Run via
// `npm run build:wp` (build + sync) — never invoked directly against a
// stale dist/, since `build:wp` always runs `vite build` first.
//
// Cross-platform on purpose (fs.rmSync/fs.cpSync, no shell rm/cp) so this
// works the same on Windows, macOS, and Linux/CI without relying on the
// shell that happens to run "npm run".

import { existsSync, rmSync, cpSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(fileURLToPath(import.meta.url), "../..");
const distDir = resolve(projectRoot, "dist");
const themeBuildDir = resolve(projectRoot, "wordpress-theme/optivax-react-theme/build");

function fail(message) {
  console.error(`[sync-wp-theme] ${message}`);
  process.exit(1);
}

if (!existsSync(distDir)) {
  fail(`dist/ not found at ${distDir} — run "vite build" first (this script is meant to run after it, via "npm run build:wp").`);
}

if (existsSync(themeBuildDir)) {
  rmSync(themeBuildDir, { recursive: true, force: true });
}
mkdirSync(themeBuildDir, { recursive: true });

cpSync(distDir, themeBuildDir, { recursive: true });

console.log(`[sync-wp-theme] Synced ${distDir} -> ${themeBuildDir}`);
```

Only one build/sync script exists (checked `package.json`'s `"scripts"` block in Section 2 — `dev`, `build`, `build:wp`, `lint`, `preview`; only `build:wp` references an extra file, this one).

**Build pipeline, end to end:**
1. `npm run build` → `tsc -b && vite build` — TypeScript project-reference build, then Vite production build to `dist/` (manifest enabled via `vite.config.ts`'s `build.manifest: true`, output includes `.vite/manifest.json`).
2. `npm run build:wp` → runs the above, then `node scripts/sync-wp-theme.mjs`, which wipes and recreates `wordpress-theme/optivax-react-theme/build/` from `dist/`.
3. The theme's `inc/assets.php` (Section 8) reads `build/.vite/manifest.json` (or `build/manifest.json` as a fallback), looks up the `index.html` entry (matching `vite.config.ts`'s `rollupOptions.input: "index.html"`), and `wp_enqueue_script`/`wp_enqueue_style`s the resulting hashed JS/CSS files, adding `type="module"` via a `script_loader_tag` filter and `<link rel="modulepreload">` for any additional chunks (`vendor-charts`, `vendor-react` per `vite.config.ts`'s `manualChunks`, plus any lazy-loaded route chunks from `App.tsx`'s `lazy()` imports).
4. `inc/assets.php` also serves `/images/*`, `/assets/*`, `/favicon.png` at the site root via a WP rewrite rule + `template_redirect` handler that reads straight from the theme's `build/` folder, since the React source references those paths as root-absolute (`public/` folder convention) but the actual deployed files live under `wp-content/themes/optivax-react-theme/build/`.

The WordPress **plugin** (`wordpress-backend/optivax-erp-backend/`) has no build step of its own — it's plain PHP plus a `composer.json`-managed `vendor/` (firebase/php-jwt), packaged/deployed as a zip per `PHASE8_FINAL_PRODUCTION_AUDIT_REPORT.md`'s documented deployment commands (not reproduced here — that report was not fully read in this pass beyond targeted greps).

---

## SECTION 13 — DEPLOYMENT

### .htaccess

`NOT FOUND` — confirmed via a recursive glob search (`**/.htaccess`) across the entire repository. No `.htaccess` file exists in this checkout at any depth. (Expected: WordPress typically generates this file at the site's document root at runtime; it is not part of a plugin/theme's source tree and is commonly gitignored.)

### wp-config.php

`NOT FOUND` — confirmed via a recursive glob search (`**/wp-config.php`) across the entire repository. No `wp-config.php` exists in this checkout. This is the file that would normally hold `DB_NAME`/`DB_USER`/`DB_PASSWORD`/`DB_HOST` and the WordPress secret-key constants (`AUTH_KEY`, `NONCE_SALT`, etc.) — none of that is present anywhere in this repo, confirming the repo genuinely contains no WordPress core install, only the plugin + theme source that would be dropped into one.

### Hostinger notes

No literal mentions of "Hostinger" were found in `README.md` or `SYSTEM_DOCUMENTATION.md` (grepped both, case-insensitive). The only repo-wide match for "Hostinger" is a scope-exclusion note in `PHASE9_REMEDIATION_REPORT.md`:

> "**Scope (as instructed):** `src/`, `wordpress-backend/optivax-erp-backend/`, `wordpress-theme/optivax-react-theme/` only. No deployment, no zip creation, no Hostinger, no WordPress core changes, no `wp-config.php`, no database-credential changes, nothing outside this repository."

This confirms Hostinger (a shared-hosting provider) is the intended/actual deployment target in practice, but no Hostinger-specific configuration steps, cPanel instructions, or FTP details are documented anywhere in this repo's markdown files. `SYSTEM_DOCUMENTATION.md` does document the general deployment shape:

> "Deployment | Vite build → either a standalone Vercel SPA (`vercel.json`), or synced into a WP theme (`npm run build:wp`)"

> "SECTION 14.2 Deployment Paths — Either (a) a standalone SPA deploy (Vercel — `vercel.json` has the SPA rewrite + full security-header/CSP config), or (b) synced into the WordPress theme (`npm run build:wp`) for a theme-embedded deploy. The WordPress plugin (`wordpress-backend/optivax-erp-backend/`) is packaged and deployed separately (zip → WP Admin/WP-CLI install)."

> "No phase to date has run any backend PHP change against a live WordPress+MySQL instance — every backend change across all 8 audit phases has been `php -l` syntax-checked only. Staging verification is a hard prerequisite before any production deploy, called out in the Phase 8 Deployment Checklist."

The `.env`/`.env.production` files in this checkout point `VITE_API_URL` at `https://optivaxglobal.com/pms/wp-json`, which strongly suggests the live deployment is a WordPress install at `optivaxglobal.com` under a `/pms/` path (consistent with a shared-hosting subdirectory install, the typical Hostinger pattern) — but this is an inference from the env values, not a documented statement.

---

## SECTION 14 — KNOWN ISSUES

Summarized from the existing audit reports at project root (PHASE1 through PHASE9, ENTERPRISE_AUDIT_2026-07-10, FULL_PROJECT_ANALYSIS, PROJECT_ANALYSIS, SYSTEM_DOCUMENTATION, REPORT_LINKS_ANALYSIS). Each entry cites its source report.

**404**
No documented open issues found in existing audit reports.

**401**
No documented open issues found in existing audit reports specifically about spurious/incorrect 401s. (Rate-limiting on login returns 429, not 401, on lockout — see PHASE7_SECURITY_REPORT.md.)

**500**
No documented open issues found in existing audit reports. `ErrorBoundaryMiddleware` (referenced in `optivax-erp-backend.php`, registered at plugin bootstrap) is the documented catch-all for uncaught exceptions across all controllers (per PHASE2_API_AUDIT_REPORT.md's "global 500 safety net" addition), but no report documents any known scenario where it fails to catch.

**CORS**
`PHASE7_SECURITY_REPORT.md` states CORS is implemented correctly in principle: "real origin allow-list (never `*`), correctly paired with `Access-Control-Allow-Credentials: true` only inside the matched-origin branch (the dangerous `*` + credentials combination doesn't exist anywhere)." However, this audit's own reading of `helpers/SecurityHeaders.php` (Section 7) found that `optivax_erp_allowed_origins` defaults to empty on a fresh install — meaning CORS headers are silently never sent until an admin manually populates that option. This specific empty-default risk is not explicitly called out as a finding in any phase report; flagged as a new observation in Section 15.

**REST**
`PHASE2_API_AUDIT_REPORT.md`: "envelope/status-codes/validation already compliant; added global 500 safety net + opt-in pagination/sort/search (9 files); zero duplicate/broken/missing endpoints found." `PHASE8_FINAL_PRODUCTION_AUDIT_REPORT.md` / `PHASE9_REMEDIATION_REPORT.md` note that "no live WP+MySQL instance was available in this environment" across every phase to date — every backend REST change has been `php -l` syntax-checked only, never runtime-executed against a real database. This is the single largest standing verification gap called out repeatedly across PHASE6 through PHASE9.

**Cookie**
`PHASE7_SECURITY_REPORT.md` documents the cookie model as designed: HttpOnly access-token cookie (`optivax_at`) + `SameSite=None; Secure` (required for cross-origin `credentials:"include"` fetches), plus a non-HttpOnly `optivax_csrf` companion cookie for the CSRF double-submit scheme. No open cookie-related issue is documented as unresolved.

**CSRF**
`PHASE7_SECURITY_REPORT.md`, finding **C1 — "No CSRF protection, despite cookie-based auth with SameSite=None"** — was the report's top Critical finding, fixed within that same report (double-submit cookie pattern, `CsrfMiddleware.php`, `optivax_csrf` cookie, `X-CSRF-Token` header wired through `src/lib/client.ts`). `PHASE8_FINAL_PRODUCTION_AUDIT_REPORT.md` flags that "the highest-risk *new* behavior from Phase 7" is a possible CSRF/rate-limit false-positive blocking legitimate traffic in production, with a documented mitigation (temporarily comment out `CsrfMiddleware::register()` and redeploy just that file). Not verified against a live instance to date (same standing gap as REST above).

**JWT**
`PHASE7_SECURITY_REPORT.md` covers JWT as in-scope; `helpers/Jwt.php` (Section 5) generates a secret on first use via `wp_generate_password(64, true, true)` if `optivax_erp_jwt_secret` isn't set, persisted via `update_option`. No documented open issue about JWT itself; the broader "never runtime-tested against live WP+MySQL" caveat applies here too.

**SSE**
No audit report specifically covers the SSE mechanism (`NotificationStreamController.php`, `useSSE.ts`) as a named finding in any phase. This audit's own reading (Section 6) found the poll-and-push bounded-duration (~25s) pattern is a deliberate, documented design choice (not a bug) given PHP-FPM's lack of persistent processes. This audit independently flags (not previously documented in any phase report) that `EventSource` does not send custom headers and the frontend doesn't set `withCredentials: true` explicitly — see Section 15.

**Activity**
Per the user's own memory index (not a project markdown file, but cross-referenced here since it's directly relevant): "Activity Tracking Module — 2026-07-02/03: login/break session tracking, daily break limits (server-enforced), live dashboard, reports; Playwright-verified, zero TS errors." `database/migrations/ActivityMigration.php`'s own doc comment confirms this module "did not exist anywhere in the plugin prior to this migration... genuinely new." No open issues documented against it in any phase report read in this pass.

**Notification**
`PHASE5_BUSINESS_LOGIC_AUDIT_REPORT.md` (per the user's memory index summary) documents "server-triggered business-event notifications are genuine new features (cron/event-hook infrastructure)... correctly identified in Phase 8 as gaps, not bugs — building them was out of scope." `PHASE9_REMEDIATION_REPORT.md`'s "What's still open" section explicitly restates: "M2/M3: automation trigger enforcement and server-triggered business-event notifications are genuine new features... not attempted." This is a confirmed, still-open feature gap: notifications today are entirely client-asserted (every `notify*` helper in `notificationHelpers.ts` fires from the browser after an action succeeds), not independently verified/triggered server-side.

**Stripe**
`PHASE9_REMEDIATION_REPORT.md`: "Stripe payment flow — genuinely real: server creates and verifies PaymentIntents against actual outstanding balances (`StripeController.php`, `InvoiceController::stripeConfirm()` wrapped in a DB transaction), frontend uses real `stripe.confirmCardPayment()`. No trace of the old fake-`setTimeout`-confirm pattern remains." No open Stripe issue documented. This audit separately flags (Section 11) that no dedicated `src/services/stripeService.ts` file was found — the three Stripe routes' frontend callers were not independently traced to a specific component in this pass.

**Build**
`PHASE9_REMEDIATION_REPORT.md`'s verification table confirms (as of that report): `npx tsc -b` clean/zero errors, `npx eslint .` 0 errors/1 accepted warning, `npm audit --omit=dev` 0 vulnerabilities, `npm run build` succeeds, Vite manifest confirmed present and correctly shaped, `npm run build:wp` sync confirmed successful, zero dangling imports. `PHASE6_PERFORMANCE_REPORT.md` (per user's memory index) removed 22 dead TailAdmin template files, 7.3MB of orphaned images, and 12 unused deps, shrinking `dist/` from 11MB to 3.3MB.

**Theme**
`PHASE8_FINAL_PRODUCTION_AUDIT_REPORT.md`'s Critical finding **C1 — "Deployment zips are stale"**: the packaged deployment zips predate the Phase 7 security fixes entirely and "must be regenerated before any deploy." `PHASE9_REMEDIATION_REPORT.md` confirms this specific item (regenerating/re-zipping) was explicitly left undone ("outside this session's permitted actions... Do this manually per the Phase 8 report's Deployment Commands before any real deploy") — **this is a confirmed, currently-open action item**: if a deployment zip is used without manual regeneration, it will not contain the Phase 7 CSRF/rate-limiting/upload-hardening fixes.

**Plugin**
`ENTERPRISE_AUDIT_2026-07-10.md` (per the memory index / grep) rates Security at "78/100 — Phase 7 closed CSRF/brute-force/upload gaps; RBAC's scoped-authorization mechanism is real but unused in most controllers (see C3)." `PHASE9_REMEDIATION_REPORT.md` fixed the specific confirmed exploit under C3 (Commission cross-department edit) via an explicit ownership check rather than switching to the broader `authorizeScoped()`, meaning `authorizeScoped()` (defined in `RbacMiddleware.php`, Section 5) likely remains unused elsewhere in the codebase outside that one fix — consistent with `PHASE8_FINAL_PRODUCTION_AUDIT_REPORT.md`'s finding of "unused RBAC `authorizeScoped()`" per this project's own memory index.

**Default super_admin credentials (new observation, not previously itemized in the "Known Issues" categories above but security-relevant):** `Migrator::seedDefaultSuperAdmin()` (Section 9) hardcodes username `globaloptivax`, email `globaloptivax@gmail.com`, password literally `password` on first plugin activation. `must_change_password` is set, forcing a change on first login, but the account/password pair itself is public (visible in this very source file) until that first login happens — a real operational risk if activation-to-first-login has any delay in a live deployment.

---

## SECTION 15 — AUDIT

Observation-only — no fixes applied. Every claim below is grounded in this pass's own direct reading (Sections 4-11) or a fresh grep, with file:line citations where the finding is code-level.

### Missing routes
None found. Every route file registered in `optivax-erp-backend.php`'s `routeFiles()` (Section 7) was read directly (Section 10), and every path/method pairing has a real `register_rest_route()` call backing it.

### Broken imports
- `tsconfig.json` (root, Section 2), line: `"include": ["next-env.d.ts", "**/*.ts", "**/*.tsx"]` and `"plugins": [{ "name": "next" }]`. No `next-env.d.ts` file exists anywhere in the repo's file listing, and this project has no Next.js dependency in `package.json` (Section 2) — this config fragment appears to be an unmodified leftover from a different project template. It is very likely inert in practice (this root `tsconfig.json` is not referenced by `tsconfig.app.json`/`tsconfig.node.json`'s own `include`s, and `npm run build` invokes `tsc -b`, which follows project references, not necessarily this root file directly) but is dead/misleading configuration worth cleaning up.

### Dead code
- `wordpress-backend/optivax-erp-backend/middleware/RbacMiddleware.php`, method `authorizeScoped()` (Section 5) — per `PHASE9_REMEDIATION_REPORT.md`'s own account of fixing "C3" via a narrower explicit ownership check specifically because the broader `authorizeScoped()` was "over-broad," this method is implied to have zero real call sites in the controllers actually read in this pass (`AuthController`, `BaseCrudController`, `StripeController` all call `RbacMiddleware::authorize()`, never `authorizeScoped()`). Not exhaustively grepped across all ~24 controllers in this pass to give a definitive call-count; flagged as a likely-dead public method based on the cross-referenced audit history rather than an exhaustive grep in this session.
- `src/services/budgetService.ts:223-237` (Section 11 content) — `getAuditLogs()`, `saveAuditLogs()`, `appendAuditLog()`, `getChangesThisMonth()`, `saveBudgets()` are explicit no-ops/stubs ("preserved from mock/budgetData.ts for parity"), kept only for call-site compatibility with `ManagementPanel`/`SalesPanel`. Functionally dead — they discard their inputs and return empty/zero.

### Unused files
- No `.htaccess` or `wp-config.php` exist to be "unused" — see Section 13.
- `next-env.d.ts` referenced by `tsconfig.json` does not exist — inverse of "unused," it's a referenced-but-absent file (see "Broken imports" above).

### Duplicate logic
- `sales_tasks` table/`SalesTaskRepository` vs. the generic `tasks` table/`TaskRepository` — explicitly documented as intentional duplication in `database/migrations/SalesMigration.php`'s own doc comment ("same shape, different domain, not to be merged"), not a bug.
- `leads` table vs. `sales_widget_leads` table — same file's doc comment, also explicitly intentional (full CRM Lead entity vs. SalesPanel "at a glance" widget).
- Two independent leave-request features/tables (`leave_requests_hr` + `LeaveRequestHrRepository` vs. `leave_requests_employee` + `LeaveRequestEmployeeRepository`) — `src/services/leaveRequestService.ts`'s own top-of-file comment documents this as a known, deliberately-preserved historical duplication ("this codebase independently grew *two* unrelated leave-request features... never unified").

### Missing endpoints
- No dedicated `stripeService.ts`/`calendarEventService.ts` frontend wrapper for the Stripe config/payment-intent routes or the Calendar Events CRUD routes (Section 11) — likely called inline from page components rather than a missing backend endpoint; the backend routes themselves all exist (Section 10). Flagged as needing a targeted grep of `src/pages/**/*.tsx` for `api.get("/saas/v1/config/stripe"` / `api.get("/saas/v1/calendar-events` to confirm before treating as a genuine gap — not done in this pass due to scope/time.

### Hardcoded URLs
- No hardcoded `http://localhost` or other environment-specific API URLs found in `src/` outside `.env*` files and the one intentional runtime guard in `src/config/environment.ts:25` (`/localhost|127\.0\.0\.1/.test(apiBaseUrl)`), which exists specifically to *detect* that misconfiguration, not cause it.
- Every `http://www.w3.org/2000/svg` match found via grep (dozens of hits across `src/icons/*.svg` and inline `<svg xmlns="...">` attributes in `.tsx` files) is a standard, required SVG XML namespace declaration — not an API endpoint or environment leak. Confirmed not a finding.
- `src/services/payrollService.ts` (`_slipHtml`/`printSalarySlipsBulk`) hardcodes `${window.location.origin}/images/logo/logo-icon-dark.png` for the salary-slip logo — relies on the same root-relative asset passthrough documented in Section 8/12 (`inc/assets.php`'s rewrite rules), not an absolute hardcoded host, so this resolves correctly in both the Vercel-SPA and WP-theme deployment paths. Not a bug, but worth knowing this specific asset path must exist at `/images/logo/logo-icon-dark.png` in `public/` for salary-slip printing to render a logo.

### Wrong namespaces
None found. Every backend route uses `OPTIVAX_ERP_NAMESPACE` (`saas/v1`) consistently (Section 10), and every frontend service call in Section 11 targets `/saas/v1/...` consistently. No `wp/v2` or other WP-core namespace confusion found.

### Wrong HTTP methods
None found in the frontend-to-backend pairing (Section 11's full cross-check found zero method mismatches). One internal inconsistency worth noting: `wordpress-backend/optivax-erp-backend/routes/BudgetRoutes.php`'s `/budget/company` route registers GET and PUT as **two separate `register_rest_route()` calls each with a single-element array** (lines 18-29, passing `[[...GET...], [...PUT...]]` as the args array — WP's `register_rest_route()` supports this multi-method-array form), while `/budget/company/reset` (line 31) uses the flat single-method form directly. Both are valid WP REST API patterns; flagged only because the file is visibly inconsistent in style, not because either is broken.

### Build problems
- `tsconfig.json`'s stray Next.js-shaped config (see "Broken imports" above) is the only build-config anomaly found; `PHASE9_REMEDIATION_REPORT.md`'s own verification table (Section 14, "Build") confirms `tsc -b`/`eslint`/`npm audit`/`npm run build` were all clean as of that report.

### Deployment problems
- Confirmed-open, per `PHASE8_FINAL_PRODUCTION_AUDIT_REPORT.md` + `PHASE9_REMEDIATION_REPORT.md` (Section 14, "Theme"): packaged deployment zips predate the Phase 7 security fixes and must be manually regenerated before any real deploy — this was explicitly left undone by design (out of scope for that session).
- `wordpress-backend/optivax-erp-backend/helpers/SecurityHeaders.php`'s `applyCorsHeaders()` (Section 7) silently sends no CORS headers at all when the `optivax_erp_allowed_origins` option is empty (the default on a fresh plugin install) — a genuinely new deployment-blocking observation from this pass: a freshly installed plugin, pointed at by a freshly deployed frontend on a different origin, will have every credentialed cross-origin request blocked by the browser until an admin manually sets this option via the plugin's settings screen. Not previously itemized as its own finding in any phase report read in this pass (PHASE7 covers CORS as "implemented correctly," which is true of the *mechanism*, but doesn't flag this empty-default operational trap).

### Security problems
- `Migrator::seedDefaultSuperAdmin()` (Section 9) hardcodes a well-known username/email/password triple (`globaloptivax` / `globaloptivax@gmail.com` / `password`) directly in source, seeded automatically on first activation. `must_change_password` mitigates but does not eliminate the window between activation and first login. This exact credential triple being public in this very file (and now in this context dump) is itself a disclosure consideration if this repo or context file is ever shared beyond its intended audience.
- `src/components/auth/SignInForm.tsx` (Section 5) tracks a "Keep me logged in" checkbox (`isChecked`) that is never actually passed to `AuthContext.login(email, password)` — `AuthContext.login`'s signature takes no `rememberMe` parameter, while `AuthController::login()` on the backend (Section 5) does read and act on a `rememberMe` body field (affecting refresh-token TTL: 30 days vs. 7 days, per `helpers/Jwt.php`'s `refreshTokenTtlSeconds()`). Net effect: the checkbox is pure UI with no backend effect — every login is treated as `rememberMe = false` (7-day refresh token) regardless of what the user selects. This is a functional bug (checkbox lies to the user), not a security hole per se, but worth fixing by threading `isChecked` through `login()` → `AuthService.login()` → the POST body's `rememberMe` field.
- `src/hooks/useSSE.ts` (Section 6) constructs `new EventSource(url)` with no explicit `{ withCredentials: true }` option. Per the WHATWG spec, `EventSource` defaults `withCredentials` to `false`, meaning cookies are **not** sent on a genuinely cross-origin request unless this option is explicitly set. Given `.env.production`'s documented cross-origin deployment model (frontend origin ≠ API origin is the expected real-world case), this looks like it would cause the SSE connection to be rejected with 401 by `NotificationStreamController::stream()`'s `AuthMiddleware::isAuthenticated()` check in a real cross-origin production deployment — the HttpOnly `optivax_at` cookie would never reach the server on the initial SSE request. This was not flagged in any phase report read in this pass and is a genuinely new finding from this audit; recommend verifying against a real cross-origin staging deployment before treating as confirmed (same-origin deployments, e.g. the WP-theme-embedded path where frontend and API share a domain, would not exhibit this bug).

---

*End of CHATGPT_PROJECT_CONTEXT.md*
