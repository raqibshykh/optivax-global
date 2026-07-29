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

interface RequestOptions {
  /**
   * Marks this call as a best-effort side effect (audit-trail writes,
   * notification fan-out, ...) rather than a primary user-facing action.
   * A 401 from a background call must not blow away a session that's
   * otherwise perfectly valid — only a 401 from a real foreground request
   * (the one the user is actually waiting on) is trustworthy evidence the
   * session itself is dead. The request still throws ApiError either way;
   * this only controls whether it's allowed to trigger the app-wide logout.
   */
  background?: boolean;
}

const requestOnce = async <T>(path: string, options: RequestInit, reqOptions?: RequestOptions): Promise<T> => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

  const method = (options.method ?? "GET").toUpperCase();
  const csrfToken = MUTATING_METHODS.has(method) ? readCsrfCookie() : null;
  const url = `${getApiBaseUrl()}${path}`;
  // FormData bodies (file uploads) must NOT get a manual Content-Type — the
  // browser sets one itself (multipart/form-data; boundary=...) only when
  // the header is left unset. Every other request keeps the JSON default.
  const isFormData = typeof FormData !== "undefined" && options.body instanceof FormData;
  const requestHeaders: Record<string, string> = {
    ...(isFormData ? {} : { "Content-Type": "application/json" }),
    ...(csrfToken ? { "X-CSRF-Token": csrfToken } : {}),
    ...((options.headers as Record<string, string>) || {}),
  };

  let res: Response;
  try {
    res = await fetch(url, {
      ...options,
      credentials: "include",
      signal: controller.signal,
      headers: requestHeaders,
    });
  } catch (e) {
    clearTimeout(timer);
    const kind: ApiErrorKind = (e as Error)?.name === "AbortError" ? "timeout" : "network";
    throw new ApiError((e as Error)?.message ?? "Network error", kind, undefined, undefined, undefined, url, method, requestHeaders);
  }
  clearTimeout(timer);

  const responseHeaders: Record<string, string> = {};
  res.headers.forEach((value, key) => { responseHeaders[key] = value; });

  let body: SaasApiResponse<T> | null = null;
  try {
    body = await res.json();
  } catch {
    // non-JSON response body — most commonly a fatal PHP error printing an
    // HTML/plain-text page instead of the plugin's JSON envelope; `body`
    // stays null and the generic `Request failed: ${status}` fallback below
    // is what a caller sees, which is exactly why every connector endpoint
    // (ApiResponse::exceptionError()) is wrapped to never let that happen.
  }

  if (!res.ok || body?.success === false) {
    const kind = classifyStatus(res.status);
    if (kind === "unauthorized" && !reqOptions?.background) onUnauthorized?.();
    throw new ApiError(
      body?.error ?? `Request failed: ${res.status}`,
      kind,
      res.status,
      body?.details,
      body,
      url,
      method,
      requestHeaders,
      responseHeaders
    );
  }

  if (body && "data" in body) {
    return body.data as T;
  }
  return body as unknown as T;
};

const request = async <T = unknown>(path: string, options: RequestInit = {}, reqOptions?: RequestOptions): Promise<T> => {
  const method = (options.method ?? "GET").toUpperCase();
  let attempt = 0;
  for (;;) {
    try {
      return await requestOnce<T>(path, options, reqOptions);
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
  post: <T = unknown>(path: string, body: unknown, reqOptions?: RequestOptions) =>
    request<T>(path, { method: "POST", body: JSON.stringify(body) }, reqOptions),
  /** For file uploads — pass a FormData body as-is (no JSON.stringify, no manual Content-Type; see requestOnce's isFormData handling). */
  upload: <T = unknown>(path: string, formData: FormData) =>
    request<T>(path, { method: "POST", body: formData }),
  put: <T = unknown>(path: string, body: unknown) =>
    request<T>(path, { method: "PUT", body: JSON.stringify(body) }),
  patch: <T = unknown>(path: string, body: unknown) =>
    request<T>(path, { method: "PATCH", body: JSON.stringify(body) }),
  delete: <T = unknown>(path: string, body?: unknown) =>
    request<T>(path, { method: "DELETE", ...(body ? { body: JSON.stringify(body) } : {}) }),
};
