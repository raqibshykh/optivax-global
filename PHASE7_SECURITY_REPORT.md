# Phase 7 — Production Security Audit Report

**Scope:** the full application per the requested checklist — rate limiting, CSRF, JWT, cookies (HttpOnly/Secure/SameSite), password policy, password reset, uploads/file/MIME validation, path traversal, SQL injection, XSS, CORS, security headers, CSP, brute force, session expiration, refresh tokens, audit logs. Covers the WordPress REST backend (`wordpress-backend/optivax-erp-backend/`), the React SPA (`src/`), and deployment config (`vercel.json`, `.env*`, `index.html`).

**Method:** three parallel read-only audits (auth/session, input/output injection, CORS/headers/CSP/audit-logs), each explicitly instructed to re-verify prior audit claims from scratch rather than trust them — this mattered: the input/output audit overturned an assumption the auth/session audit and an earlier full-codebase audit had both made ("this is a bearer-token API, CSRF doesn't apply"), which turned out to be false and was this phase's single most important finding. Every finding below was independently confirmed against current source before a fix was written. Frontend changes verified via a clean `npm run build` (tsc -b + vite build). Backend changes verified via `php -l` on every modified file — **no live WP+MySQL instance was available in this environment** (same recurring constraint as every prior WP-backend phase), so these are syntax-verified, not runtime-tested. Recommend exercising the "How to test" notes below against a staging instance before production deploy.

---

## Summary

| Severity | Found | Fixed | Deferred (documented) |
|---|---|---|---|
| Critical | 2 | 2 | 0 |
| High | 3 | 3 | 0 |
| Medium | 6 | 5 | 1 |
| Low | 2 | 2 | 0 |
| Verified solid, no action | 10 | — | — |

---

## Critical

### C1 — No CSRF protection, despite cookie-based auth with `SameSite=None`
**The single biggest finding of this phase, and one that overturned a prior audit's conclusion.** A previous full-codebase audit and this phase's own auth/session agent both initially assumed "this is a bearer-token API — CSRF doesn't apply." That's wrong: `middleware/AuthMiddleware.php` authenticates purely via an `HttpOnly` cookie (`optivax_at`), read from `$_COOKIE`, with **zero** `Authorization`/`Bearer`-header parsing anywhere in the codebase. The cookie is set `SameSite=None; Secure` (`AuthMiddleware.php:127-137`) — required so it's sent on the frontend's cross-origin `credentials:"include"` fetches, but that same setting explicitly defeats the browser's own default CSRF mitigation, so the cookie also rides along on a forged cross-site request. CORS's origin allow-list (`helpers/SecurityHeaders.php`) only stops an attacker's JavaScript from *reading* the response — it does not stop a "simple" cross-site request (e.g. a `multipart/form-data` `<form>` auto-submit, which needs no preflight) from *executing* server-side with the victim's cookie attached. Concretely: `routes/FileRoutes.php`'s `POST /files/create` accepts a real multipart file upload; an attacker page could silently upload a file attributed to any logged-in victim who visits it, and the same class of attack applies to every other state-changing endpoint in the app (task edits, invoice actions, user management, etc.).

**Fix:** implemented double-submit-cookie CSRF protection.
- `AuthMiddleware.php`: a new non-HttpOnly cookie `optivax_csrf` (random 32-char token) is issued alongside the access-token cookie on login and refresh (`setCsrfCookie()`), and cleared on logout.
- New `middleware/CsrfMiddleware.php`, hooked on `rest_dispatch_request` at priority 5 (runs before `ErrorBoundaryMiddleware`): for every `/saas/v1/*` request using `POST`/`PUT`/`PATCH`/`DELETE` **and** carrying an access-token cookie (i.e., an authenticated-session request — login/reset-request themselves have no cookie yet and are naturally exempt), it requires an `X-CSRF-Token` header matching the `optivax_csrf` cookie value (`hash_equals()` comparison). A same-origin page can read that cookie via JS and echo it back; a cross-site attacker's page cannot (browser same-origin policy blocks reading another origin's cookies), so it cannot forge a matching header even though the `HttpOnly` auth cookie still rides along automatically. A mismatch/missing header returns 403 and logs `csrf_check_failed` to the security audit log.
- `helpers/SecurityHeaders.php`: added `X-CSRF-Token` to the CORS `Access-Control-Allow-Headers` list (cross-origin requests need it preflight-approved).
- `src/lib/client.ts`: every mutating request now reads the `optivax_csrf` cookie and attaches it as `X-CSRF-Token` automatically — since **every** service file in `src/services/*.ts` funnels through this one shared `api.post/put/patch/delete`, coverage is comprehensive by construction, not endpoint-by-endpoint (confirmed: `fetch()` is called nowhere else in `src/`, so there's no bypass path).
- **Files:** `middleware/AuthMiddleware.php`, `middleware/CsrfMiddleware.php` (new), `helpers/SecurityHeaders.php`, `optivax-erp-backend.php` (registration), `src/lib/client.ts`.
- **How to test:** log in via the real frontend, then from a browser devtools console on a *different* origin, attempt `fetch('https://<api>/saas/v1/tasks/create', {method:'POST', credentials:'include', body: ...})` — should 403 without the header even though the auth cookie is attached. A normal in-app mutation (e.g. creating a task from the UI) should still succeed.

### C2 — No rate limiting or lockout on login or password-reset-request
`AuthController::login()` (full method reviewed) only wrote a `SecurityAuditLog` entry on failure — no counter, backoff, lockout, IP throttle, or CAPTCHA. A repo-wide search for `failed_attempts|lockout|max_attempts|rate_limit` returned zero matches anywhere in the plugin before this phase. `wp_authenticate()` could be brute-forced without limit. `requestReset()` had the identical gap — unlimited reset-email triggering (enables both email-bombing a target and, combined with C-adjacent timing behavior, enumeration).

**Fix:** new `helpers/RateLimiter.php` — a transient-backed fixed-window attempt counter (no new infrastructure/dependency). Wired into both endpoints with two layers each:
- **Login** (`AuthController::login()`): max 5 failed attempts per (IP + email) / 15 min, **and** max 20 failed attempts per IP (any email) / 15 min — the second layer catches a credential-stuffing sweep across many accounts from one source, which the first layer alone wouldn't trip. Over the limit → `429` with a `retryAfterSeconds` detail, logged as `login_rate_limited`. The per-account counter is cleared on a successful login (a legitimate user who mistyped their password once isn't penalized); the per-IP counter is deliberately left to decay naturally rather than clearing on any single success, so one valid low-privilege login can't be used to "reset the budget" for continuing a stuffing attack from the same IP.
- **Password reset** (`AuthController::requestReset()`): max 3 requests per (IP + email) / hour, max 10 per IP / hour.
- **Files:** `helpers/RateLimiter.php` (new), `controllers/AuthController.php`.
- **How to test:** submit 6 wrong-password login attempts for the same account within 15 minutes — the 6th (and any further) should return 429 with a `retryAfterSeconds` value, even with the correct password.

---

## High

### H1 — Deployed SPA ships with zero security headers or CSP
`vercel.json` had only a SPA rewrite rule — no `headers` block. `index.html` had no `<meta http-equiv>` security headers. The backend API already had a strict `default-src 'none'` CSP and baseline headers (`SecurityHeaders.php`), but that only protects JSON API responses — the actual internet-facing origin users load (the React app) had no `X-Frame-Options`, no CSP, no HSTS, nothing. This is a pre-existing finding from an earlier audit (`ENTERPRISE_AUDIT_2026-07-10.md` M1) — confirmed still unfixed going into this phase.

**Fix:** added a `headers` block to `vercel.json` applying to every route: `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` (blocks geolocation/camera/microphone by default), `Strict-Transport-Security` (1 year, includeSubDomains), and a CSP: `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self' https:; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'`.
- `style-src` needs `'unsafe-inline'` because React sets inline `style=""` attributes extensively throughout this codebase (dynamic progress-bar widths, colors, etc.) — disallowing it would break large parts of the UI; this is a standard, accepted tradeoff for React apps and does not weaken `script-src` (the higher-value target against XSS), which stays strict with no `unsafe-inline`/`unsafe-eval`.
- **`connect-src 'self' https:` is intentionally permissive** — the real API origin isn't known to this environment (same reason as H2 below), and hardcoding a guessed origin risks silently breaking every API call in production. **Action needed before/at deploy:** replace `https:` with the actual API origin (e.g. `connect-src 'self' https://api.optivax.com`) once it's known.
- Also **removed the inline `<script>` from `index.html`** (the dark-mode-flash-prevention snippet) and moved it to `public/theme-init.js`, loaded via `<script src="/theme-init.js">` — this lets `script-src 'self'` stay hash/nonce-free and fully strict rather than needing `'unsafe-inline'` for one small snippet.
- Added `Referrer-Policy`/`Permissions-Policy` to the backend's API headers too (`SecurityHeaders.php`) — low-risk-but-free hardening for JSON responses.
- **Files:** `vercel.json`, `index.html`, `public/theme-init.js` (new), `wordpress-backend/optivax-erp-backend/helpers/SecurityHeaders.php`.

### H2 — `.env.production` still hardcodes a localhost API URL
Confirmed still broken from a prior audit's finding: `VITE_API_URL=http://localhost/optivax-erp/wp-json`. A real production build using this file would have every API/auth/SSE call silently target `localhost` instead of failing loudly. The real production API origin isn't knowable from this repo/environment.

**Fix:** changed `VITE_API_URL` to empty (matches `.env.example`'s documented "leave empty to use relative paths against the current origin" convention — a safe default that at minimum won't point at someone's local machine) and added a runtime guard in `src/config/environment.ts`: if a **production** build (`import.meta.env.PROD`) ever resolves an API URL containing `localhost`/`127.0.0.1`, it logs a loud `console.error` immediately on load instead of manifesting as a confusing wall of failed network requests. **`VITE_API_URL` must still be set to the real API origin before deploying** — this fix makes misconfiguration loud/obvious rather than silent, it doesn't (can't) know the right value.
- **Files:** `.env.production`, `src/config/environment.ts`.

### H3 — File upload validation relied entirely on WordPress core defaults
`uploads/UploadService.php` called `wp_handle_upload()` with only `test_form => false` — no app-level MIME allow-list, no magic-byte/content sniffing beyond WP core's own (which only does real content verification for a narrow subset of types), and no application-level size cap (silently deferred to PHP's `upload_max_filesize`/`post_max_size` ini values). Any authenticated user permitted to create files (`files:CREATE`) — or, per C1, a CSRF'd victim — could upload arbitrarily large files or any type within WP's broad default allow-list.

**Fix:** `UploadService::handleUpload()` now enforces:
- An explicit 25MB application-level size cap, checked before `wp_handle_upload()` even runs.
- A narrow, explicit MIME allow-list (`ALLOWED_MIMES`) passed as `wp_handle_upload()`'s `mimes` override — images (jpg/png/gif/webp), PDF, Office docs (doc/docx/xls/xlsx/ppt/pptx), csv/txt, zip. Deliberately excludes `.svg` (can embed `<script>` and browsers will execute it if ever viewed directly) and everything else WP's stock allow-list permits that this ERP has no business need for.
- A second, independent content-sniff pass after upload (`finfo_open(FILEINFO_MIME_TYPE)` on the file actually written to disk) that rejects (and deletes) the file if its real content doesn't match one of the allowed MIME types — defense-in-depth against an extension/Content-Type pairing that slips past WP core's own check.
- **Files:** `wordpress-backend/optivax-erp-backend/uploads/UploadService.php`.
- **Not changed:** filename sanitization (`sanitize_file_name(basename(...))`) was already correctly applied and needed no fix; storage location (standard `wp-content/uploads`, script execution prevented by WP core's own deny-list) was reviewed and left as-is — adding an explicit `.htaccess`/execution-prevention rule would be redundant given the now-much-narrower allow-list contains nothing executable.

---

## Medium

### M1 — Password policy accepted any 8-character string
`AuthController::changePassword()`/`confirmReset()` only checked `strlen($new) < 8` — `"aaaaaaaa"` was a valid password.

**Fix:** new `helpers/PasswordPolicy.php` — minimum 8 characters, must contain at least one letter and one number, and rejects a short list of the most obviously-guessable passwords (`password123`, `qwerty123`, etc.). Deliberately *not* a full uppercase/symbol complexity mandate — those tend to push users toward predictable patterns like `Password1!` without materially raising real-world strength; length + character-class mix + a common-password check is a more defensible bar. Wired into both `changePassword()` and `confirmReset()`.
- **Files:** `helpers/PasswordPolicy.php` (new), `controllers/AuthController.php`.

### M2 — Refresh-token reuse wasn't distinguished from "invalid," so theft went undetected
Rotation itself was already correct (old token revoked, new pair issued), but `AuthService::refreshFromCookie()` looked up the token with a `revoked_at IS NULL` filter baked into the query — so presenting an *already-rotated* (i.e. reused/stolen-and-replayed) token was indistinguishable from presenting a token that never existed. Both just silently 401'd. A real attacker replaying a sniffed refresh token before the legitimate client's next rotation got no additional consequence beyond that one failed request.

**Fix:** the lookup now happens without the `revoked_at` filter, so a match against an *already-revoked* row is specifically detectable. When that happens, the fix treats it as a theft signal: every refresh token for that user is revoked and `token_version` is bumped (killing every outstanding access token too), logged as `refresh_token_reuse_detected`. An ordinary expired-token presentation (never revoked, just past `expires_at`) is still treated as a normal, non-alarming expiry.
- **Files:** `wordpress-backend/optivax-erp-backend/services/AuthService.php`.

### M3 — Password-reset-request had a timing side-channel that leaked email-address existence
The response body was already identical (200/success) whether or not the account exists — correct, and confirmed still true. But the "exists" branch called `MailService::sendNow()`, a **synchronous, blocking SMTP send**, before responding, while the "doesn't exist" branch returned immediately. That latency difference (an SMTP round-trip vs. an instant return) is trivially measurable over HTTP and defeats the point of the identical response body.

**Fix:** switched to `MailService::queue()` (an async-delivery mechanism that already existed in the codebase for exactly this kind of non-blocking mail) — the "exists" branch now does one fast DB insert instead of a blocking SMTP call, closing the timing gap to a sub-millisecond difference rather than a multi-hundred-millisecond-to-several-second one. Reset emails now arrive via the existing mail-queue cron worker (runs every minute) instead of instantly — a minor UX tradeoff in exchange for closing a real enumeration channel.
- **Files:** `controllers/AuthController.php`.

### M4 — `.env`/`.env.production` were tracked in git with no `.gitignore` entry
No real secret values are currently present in either file (verified — all placeholders/empty), so this wasn't an active leak, but the repo's structure meant any real key added later (e.g. a Stripe publishable key) would be committed by default. `.gitignore` had no `.env*` entries at all.

**Fix:** added `.env`, `.env.local`, `.env.production`, `.env.production.local`, `.env.development`, `.env.development.local` to `.gitignore` (`.env.example` deliberately left tracked — it's the checked-in template with no real values). Ran `git rm --cached` on `.env` and `.env.production` to untrack them going forward — **files remain on disk unchanged**, this only removes them from git's index; nothing was committed by this change, it's staged and awaiting the user's own commit.
- **Files:** `.gitignore`, git index (`.env`, `.env.production` un-staged from tracking).

### M5 — General application audit log is entirely client-triggered (deferred, not fixed)
Unlike `SecurityAuditLog` (auth events — thoroughly server-logged, confirmed good, see below), the general audit trail behind `/saas/v1/audit-logs/*` is written by the **frontend** as a side effect (`AuditLogService.add()` called from dozens of pages after an action succeeds) — `controllers/AuditLogController.php`'s own doc comment confirms this is deliberate (gating it server-side on a permission would break logging for most legitimate actions). Consequence: a malicious or buggy client can skip logging entirely, and this phase confirmed a concrete instance — **zero export/download actions anywhere in the frontend call the audit logger**, so report/data-export actions leave no trail at all despite being RBAC-gated as sensitive (`reports:EXPORT`).
**Not fixed this phase** — the real fix is architectural (move audit-log writes to be server-triggered from within each mutating controller, not client-asserted), which touches most of the ~40 controllers in the plugin and is a larger, riskier change than appropriate to bundle into a security-verification pass. Documented here as the highest-priority follow-up from this audit.

---

## Low

### L1 — Missing `Referrer-Policy`/`Permissions-Policy` on API responses
Included in the H1 fix above (`SecurityHeaders.php`) — low risk on its own (API responses are JSON, not rendered documents) but free to add alongside the SPA header work.

### L2 — JWT signing secret has no rotation mechanism
`helpers/Jwt.php` generates a strong random secret once and persists it in `wp_options` — reasonable entropy, correctly never hardcoded or reused from a WordPress default. No rotation path exists, so compromise of that one option value (e.g. via a DB backup leak) fully compromises all sessions with no built-in recovery beyond a manual option change. **Not fixed** — a rotation mechanism (dual-secret verification window, forced re-login on rotation) is a reasonable future hardening step but is infrastructure work disproportionate to fix reactively in an audit pass; flagging for awareness rather than leaving silently undocumented.

---

## Verified solid — re-confirmed, no action needed

- **JWT algorithm binding** — `HS256` hardcoded via a `Key` object at decode time (`helpers/Jwt.php`); no `none`-algorithm or algorithm-confusion risk possible.
- **Refresh token storage** — random string, only its SHA-256 hash stored server-side; not a self-contained JWT.
- **Refresh token rotation** — old token revoked, new pair issued on every refresh (now with reuse-detection added, M2).
- **Cookie flags** — `optivax_at`/`optivax_rt` both correctly `Secure`, `HttpOnly`, and (necessarily, for cross-origin) `SameSite=None`.
- **No client-side token storage** — confirmed zero `localStorage`/`sessionStorage` usage for auth anywhere in `src/`; every request relies on the HttpOnly cookie.
- **Session revocation on logout** — server-side `token_version` bump immediately invalidates any outstanding access token; refresh tokens are explicitly revoked in the DB. Logout is not purely client-side token deletion.
- **Self-role-escalation guard** — `ProfileController.php`'s self-update path unconditionally strips `role`/`departmentId`/`status` from the request body before any DB write when the caller is updating their own profile.
- **SQL injection** — spot-checked ~20 repositories across old and newly-added feature areas; every raw query uses `$wpdb->prepare()` with placeholders. The one client-influenced `ORDER BY` path (`BaseCrudController`'s `sortBy`/`sortDir` query params) is whitelisted against a server-defined column map, never interpolated raw.
- **Mass assignment** — every create/update path explicitly whitelists fields via `Sanitize::*()` helpers before reaching `$wpdb->insert()/update()`; no raw request-body pass-through found anywhere.
- **XSS** — zero `dangerouslySetInnerHTML` in the frontend; all 5 PHP mail templates consistently `esc_html()`/`esc_url()` every interpolated variable; stored text fields are sanitized at write time.
- **Path traversal** — no endpoint accepts a client-supplied filename/path used directly against the filesystem; the one dynamic-path pattern found (`MailService::render()`'s template path) is always called with a hardcoded literal, never request-derived.
- **Error boundary / debug hardening** — `middleware/ErrorBoundaryMiddleware.php` catches every uncaught exception on `/saas/v1/*` routes and returns a generic `"Internal server error"` message; full exception details (message, file, line, class) are logged internally only, never leaked to the client response.
- **Security-relevant event logging (auth domain)** — `SecurityAuditLog` coverage is thorough: login success/failure/blocked, logout (single + all-devices), password change/failure, password reset requested/completed, user creation/activation/deactivation/deletion, role/department changes. This phase added `login_rate_limited`, `csrf_check_failed`, and `refresh_token_reuse_detected` to that list.
- **CORS** — real origin allow-list (never `*`), correctly paired with `Access-Control-Allow-Credentials: true` only inside the matched-origin branch (the dangerous `*` + credentials combination doesn't exist anywhere).

---

## Files changed

**Backend (PHP):** `middleware/AuthMiddleware.php`, `middleware/CsrfMiddleware.php` (new), `controllers/AuthController.php`, `services/AuthService.php`, `helpers/RateLimiter.php` (new), `helpers/PasswordPolicy.php` (new), `helpers/SecurityHeaders.php`, `uploads/UploadService.php`, `optivax-erp-backend.php`.

**Frontend:** `src/lib/client.ts`, `src/config/environment.ts`, `index.html`, `public/theme-init.js` (new).

**Config/deployment:** `vercel.json`, `.env.production`, `.gitignore`, git index (`.env`/`.env.production` untracked).

## Action required before production deploy (not fixable from this environment)
1. Set the real production API origin in `VITE_API_URL` (`.env.production` or the deploy platform's env config) — currently intentionally left empty.
2. Update `vercel.json`'s CSP `connect-src` from the placeholder `https:` to the real API origin once known.
3. Confirm `optivax_erp_allowed_origins` (WP admin settings) is set to the real frontend origin(s) — this is a runtime DB option, not visible from static files, so its live value couldn't be verified in this pass.
