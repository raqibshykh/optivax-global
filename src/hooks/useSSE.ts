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
