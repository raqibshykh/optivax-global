export type ApiErrorKind =
  | "unauthorized"
  | "forbidden"
  | "not_found"
  | "validation"
  | "server"
  | "network"
  | "timeout"
  | "unknown";

/**
 * The full envelope shape ApiResponse::exceptionError() (backend) returns
 * for endpoints that must never hide their real exception — a superset of
 * the plain {success,data,error} shape every other endpoint uses, so
 * `rawBody` is safe to read opportunistically without assuming these extra
 * fields are present.
 */
export interface ApiExceptionBody {
  success: false;
  data: null;
  error: string;
  message?: string;
  file?: string;
  line?: number;
  /** Only present when the backend is running in WP_DEBUG mode. */
  stack?: string;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly kind: ApiErrorKind,
    public readonly status?: number,
    public readonly details?: unknown,
    /** The full parsed JSON response body, when one was returned — lets callers that need more than `.message` (file/line/stack, a connector's structured result) read it without the shared HTTP client having to know about their specific shape. */
    public readonly rawBody?: unknown,
    public readonly requestUrl?: string,
    public readonly requestMethod?: string,
    public readonly requestHeaders?: Record<string, string>,
    public readonly responseHeaders?: Record<string, string>
  ) {
    super(message);
    this.name = "ApiError";
  }
}
