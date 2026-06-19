/* eslint-disable react-refresh/only-export-components */
import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
  ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { Toast } from "../types";

const generateId = (prefix = "") =>
  prefix + Math.random().toString(36).slice(2, 10);

interface ToastContextType {
  toasts: Toast[];
  showToast: (
    message: string,
    type?: "success" | "error" | "warning" | "info",
    duration?: number
  ) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
};

// ── Icon helpers ──────────────────────────────────────────────────────────────

const ICONS: Record<Toast["type"], string> = {
  success: "✓",
  error:   "✕",
  warning: "⚠",
  info:    "ℹ",
};

const STYLES: Record<Toast["type"], string> = {
  success: "bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-900/30 dark:border-emerald-700 dark:text-emerald-300",
  error:   "bg-red-50 border-red-200 text-red-800 dark:bg-red-900/30 dark:border-red-700 dark:text-red-300",
  warning: "bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-900/30 dark:border-amber-700 dark:text-amber-300",
  info:    "bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-900/30 dark:border-blue-700 dark:text-blue-300",
};

const ICON_STYLES: Record<Toast["type"], string> = {
  success: "bg-emerald-100 text-emerald-600 dark:bg-emerald-800 dark:text-emerald-300",
  error:   "bg-red-100 text-red-600 dark:bg-red-800 dark:text-red-300",
  warning: "bg-amber-100 text-amber-600 dark:bg-amber-800 dark:text-amber-300",
  info:    "bg-blue-100 text-blue-600 dark:bg-blue-800 dark:text-blue-300",
};

// ── Single toast item ─────────────────────────────────────────────────────────

interface ToastItemProps {
  toast: Toast;
  onRemove: (id: string) => void;
}

function ToastItem({ toast, onRemove }: ToastItemProps) {
  const [visible, setVisible] = useState(false);

  // mount → slide in
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 10);
    return () => clearTimeout(t);
  }, []);

  const handleClose = () => {
    setVisible(false);
    setTimeout(() => onRemove(toast.id), 300);
  };

  return (
    <div
      role="alert"
      aria-live="assertive"
      className={[
        "flex items-start gap-3 w-full max-w-sm rounded-xl border px-4 py-3 shadow-lg",
        "transition-all duration-300 ease-in-out",
        visible ? "opacity-100 translate-x-0" : "opacity-0 translate-x-8",
        STYLES[toast.type],
      ].join(" ")}
    >
      {/* icon */}
      <span
        className={[
          "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold",
          ICON_STYLES[toast.type],
        ].join(" ")}
      >
        {ICONS[toast.type]}
      </span>

      {/* message */}
      <p className="flex-1 text-sm font-medium leading-snug">{toast.message}</p>

      {/* close */}
      <button
        onClick={handleClose}
        className="shrink-0 text-current opacity-50 hover:opacity-100 transition-opacity text-base leading-none"
        aria-label="Dismiss"
      >
        ✕
      </button>
    </div>
  );
}

// ── Container — rendered in a portal at document.body ────────────────────────

interface ToastContainerProps {
  toasts: Toast[];
  onRemove: (id: string) => void;
}

export function ToastContainer({ toasts, onRemove }: ToastContainerProps) {
  const portalRef = useRef<HTMLDivElement | null>(null);

  if (!portalRef.current) {
    const el = document.createElement("div");
    el.id = "toast-portal";
    document.body.appendChild(el);
    portalRef.current = el;
  }

  return createPortal(
    <div
      aria-label="Notifications"
      className="fixed bottom-5 right-5 z-[9999] flex flex-col gap-3 items-end pointer-events-none"
    >
      {toasts.map((t) => (
        <div key={t.id} className="pointer-events-auto">
          <ToastItem toast={t} onRemove={onRemove} />
        </div>
      ))}
    </div>,
    portalRef.current
  );
}

// ── Provider ──────────────────────────────────────────────────────────────────

interface ToastProviderProps {
  children: ReactNode;
}

export const ToastProvider: React.FC<ToastProviderProps> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (
      message: string,
      type: "success" | "error" | "warning" | "info" = "info",
      duration = 3500
    ) => {
      const id = generateId("toast-");
      setToasts((prev) => [...prev, { id, message, type, duration }]);

      if (duration > 0) {
        setTimeout(() => removeToast(id), duration);
      }
    },
    [removeToast]
  );

  return (
    <ToastContext.Provider value={{ toasts, showToast, removeToast }}>
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  );
};

export default ToastContext;
