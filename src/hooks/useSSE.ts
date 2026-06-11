import { useEffect, useRef } from "react";
import { useToast } from "../context/ToastContext";

const buildSseUrl = (): string => {
  const w = (window as any) || {};
  // If localized config provides apiBase (e.g. rest_url('saas/v1'))
  if (w.SaaSCoreConfig?.apiBase) {
    const base: string = String(w.SaaSCoreConfig.apiBase).replace(/\/$/, "");
    return `${base}/notifications/stream`;
  }
  if (w.wpSaaSContext?.root) {
    const base: string = String(w.wpSaaSContext.root).replace(/\/$/, "");
    return `${base}/notifications/stream`;
  }
  // Fallback to site origin + WP REST root
  if (typeof window !== "undefined") {
    const origin = window.location.origin.replace(/\/$/, "");
    return `${origin}/wp-json/saas/v1/notifications/stream`;
  }
  return "/wp-json/saas/v1/notifications/stream";
};

export const useSSE = (enabled: boolean) => {
  const esRef = useRef<EventSource | null>(null);
  const reconnectRef = useRef<number>(0);
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

    const connect = () => {
      const url = buildSseUrl();
      try {
        const es = new EventSource(url);
        esRef.current = es;

        es.onopen = () => {
          reconnectRef.current = 0;
          console.debug("SSE connected", url);
        };

        es.onmessage = (ev) => {
          // generic messages (ping) — keep quiet in production
          // console.debug("SSE message", ev.data);
        };

        es.addEventListener("notification", (ev: MessageEvent) => {
          try {
            const payload = JSON.parse((ev as MessageEvent).data);
            const title = payload.type || "Notification";
            const body = (payload.payload && (payload.payload.message || payload.payload.body)) || JSON.stringify(payload.payload || payload);
            // show user-facing notification
            showToast(`${title}: ${body}`, "info", 5000);
            // persist last id for reconnects
            if (payload.id) {
              try { localStorage.setItem('saas:lastNotificationId', String(payload.id)); } catch {}
            }
            // Emit a DOM event so other parts of the app can react
            const custom = new CustomEvent("saas:notification", { detail: payload });
            window.dispatchEvent(custom);
          } catch (err) {
            console.error("Failed to handle notification SSE", err);
          }
        });

        es.onerror = () => {
          if (!mounted) return;
          // close and reconnect with jittered backoff
          try { es.close(); } catch {}
          const attempts = reconnectRef.current = reconnectRef.current + 1;
          const base = Math.min(30000, 1000 * Math.pow(2, attempts));
          const jitter = Math.floor(Math.random() * 1000);
          const timeout = base + jitter;
          setTimeout(() => connect(), timeout);
        };
      } catch (e) {
        console.error("SSE connection failed", e);
        const attempts = reconnectRef.current = reconnectRef.current + 1;
        const base = Math.min(30000, 1000 * Math.pow(2, attempts));
        const jitter = Math.floor(Math.random() * 1000);
        setTimeout(() => connect(), base + jitter);
      }
    };

    connect();

    return () => {
      mounted = false;
      if (esRef.current) {
        try {
          esRef.current.close();
        } catch {}
        esRef.current = null;
      }
    };
  }, [enabled, showToast]);
};

export default useSSE;
