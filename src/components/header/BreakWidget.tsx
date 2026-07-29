import { useState, useEffect, useRef } from "react";
import { useAuth } from "../../context/AuthContext";
import { useActivity } from "../../context/ActivityContext";
import { BreakType, BREAK_LABELS } from "../../types/activity";

const BREAK_OPTIONS: { type: BreakType; label: string }[] = [
  { type: "meal_dinner", label: BREAK_LABELS.meal_dinner },
  { type: "casual_5",    label: BREAK_LABELS.casual_5 },
];

function formatElapsed(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

export default function BreakWidget() {
  const { user } = useAuth();
  const { activeBreak, breakStatus, startBreak, endBreak, isLoading } = useActivity();

  const [isOpen, setIsOpen]   = useState(false);
  const [error, setError]     = useState<string | null>(null);
  const [notice, setNotice]   = useState<string | null>(null);
  const [, forceTick]         = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  // Cosmetic-only local ticker: the server recomputes elapsedSeconds fresh
  // from the DB's start_time on every 30s heartbeat/sync. Between syncs we
  // interpolate a smoothly-ticking display value from that last-synced
  // number, purely so the UI doesn't look frozen for 30 seconds at a time —
  // isOverdue/warningLevel are never derived from this local tick, only from
  // the server's own breakStatus.
  const syncedElapsedRef = useRef(0);
  const syncedAtRef = useRef(Date.now());
  useEffect(() => {
    syncedElapsedRef.current = breakStatus?.elapsedSeconds ?? 0;
    syncedAtRef.current = Date.now();
  }, [breakStatus?.elapsedSeconds]);

  useEffect(() => {
    if (!activeBreak) return;
    const id = setInterval(() => forceTick((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, [activeBreak]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setIsOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  if (!user || user.role === "client") return null;

  const remainingBalance = breakStatus?.remainingBalance ?? 0;
  const mealTaken = breakStatus?.mealTaken ?? false;
  const isOverdue = breakStatus?.isOverdue ?? false;
  const warningLevel = breakStatus?.warningLevel ?? "none";
  const displayedElapsedSeconds = activeBreak
    ? syncedElapsedRef.current + Math.floor((Date.now() - syncedAtRef.current) / 1000)
    : 0;

  const handleStart = async (type: BreakType) => {
    setError(null);
    setNotice(null);
    try {
      await startBreak(type);
      setIsOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start break.");
    }
  };

  const handleEnd = async () => {
    setError(null);
    try {
      await endBreak();
      setNotice("Welcome back — your break has been recorded.");
      setTimeout(() => setNotice(null), 6000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not end break.");
    }
  };

  return (
    <div ref={ref} className="relative">
      {activeBreak ? (
        <button
          onClick={handleEnd}
          disabled={isLoading}
          className={`flex items-center gap-2 rounded-full border px-3 h-11 text-sm font-medium transition-colors ${
            warningLevel === "critical"
              ? "border-red-300 bg-red-50 text-red-600 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400"
              : warningLevel === "warning"
              ? "border-amber-300 bg-amber-50 text-amber-600 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-400"
              : "border-brand-300 bg-brand-50 text-brand-600 dark:border-brand-800 dark:bg-brand-900/20 dark:text-brand-400"
          }`}
          title={`${BREAK_LABELS[activeBreak.type]} — click to return`}
        >
          <span>{BREAK_LABELS[activeBreak.type]}</span>
          <span className="font-mono">{formatElapsed(displayedElapsedSeconds)}</span>
          {isOverdue && <span className="text-xs">Overdue</span>}
        </button>
      ) : (
        <button
          onClick={() => setIsOpen((p) => !p)}
          disabled={isLoading}
          className="flex items-center justify-center gap-2 rounded-full border border-gray-200 bg-white px-3 h-11 text-sm font-medium text-gray-600 hover:bg-gray-100 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800"
        >
          Take a Break
        </button>
      )}

      {isOpen && !activeBreak && (
        <div className="absolute right-0 mt-2 w-64 rounded-2xl border border-gray-200 bg-white p-2 shadow-lg z-50 dark:border-gray-800 dark:bg-gray-900">
          {BREAK_OPTIONS.map((opt) => {
            const isMeal   = opt.type.startsWith("meal_");
            const disabled = isMeal ? mealTaken : remainingBalance <= 0;
            return (
              <button
                key={opt.type}
                disabled={disabled}
                onClick={() => handleStart(opt.type)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm ${
                  disabled
                    ? "text-gray-300 dark:text-gray-600 cursor-not-allowed"
                    : "text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-white/5"
                }`}
              >
                {opt.label}
                {isMeal ? (
                  disabled && <span className="block text-xs text-gray-400">Already taken today</span>
                ) : (
                  <span className="block text-xs text-gray-400">
                    {disabled ? "Daily casual balance used up" : `${remainingBalance} min left today`}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {error && (
        <div className="absolute right-0 mt-2 w-64 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600 shadow-lg z-50 dark:border-red-900 dark:bg-red-900/20 dark:text-red-400">
          {error}
        </div>
      )}
      {notice && !error && (
        <div className="absolute right-0 mt-2 w-64 rounded-xl border border-green-200 bg-green-50 px-3 py-2 text-xs text-green-700 shadow-lg z-50 dark:border-green-900 dark:bg-green-900/20 dark:text-green-400">
          {notice}
        </div>
      )}
    </div>
  );
}
