import { useState, useEffect, useRef } from "react";
import { useAuth } from "../../context/AuthContext";
import { useActivity } from "../../context/ActivityContext";
import { BreakType, BREAK_LABELS, getRemainingCasualBalance } from "../../mock/activityData";

const BREAK_OPTIONS: { type: BreakType; label: string }[] = [
  { type: "meal_dinner", label: BREAK_LABELS.meal_dinner },
  { type: "casual_5",    label: BREAK_LABELS.casual_5 },
];

function formatElapsed(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export default function BreakWidget() {
  const { user } = useAuth();
  const { activeSession, activeBreak, startBreak, endBreak, isLoading } = useActivity();

  const [isOpen, setIsOpen]   = useState(false);
  const [error, setError]     = useState<string | null>(null);
  const [notice, setNotice]   = useState<string | null>(null);
  const [, forceTick]         = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  // Local re-render tick only — the countdown value itself is always derived
  // fresh from the server-provided activeBreak.startTime, never stored locally.
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

  const todaysBreaks = activeSession?.date === new Date().toISOString().slice(0, 10)
    ? activeSession.breaks
    : [];
  const takenMealTypes = new Set(todaysBreaks.filter((b) => b.category === "meal").map((b) => b.type));
  // Casual Break Balance Rule: a 15-minute daily pool, not a fixed count — this is
  // only a UX hint (recomputed live from storage); the server call is authoritative.
  const remainingCasualBalance = getRemainingCasualBalance(user.id);

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

  const elapsedMs   = activeBreak ? Date.now() - new Date(activeBreak.startTime).getTime() : 0;
  const allowedMs   = (activeBreak?.allowedMinutes ?? 0) * 60000;
  const isOverdue   = activeBreak ? elapsedMs > allowedMs : false;

  return (
    <div ref={ref} className="relative">
      {activeBreak ? (
        <button
          onClick={handleEnd}
          disabled={isLoading}
          className={`flex items-center gap-2 rounded-full border px-3 h-11 text-sm font-medium transition-colors ${
            isOverdue
              ? "border-red-300 bg-red-50 text-red-600 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400"
              : "border-brand-300 bg-brand-50 text-brand-600 dark:border-brand-800 dark:bg-brand-900/20 dark:text-brand-400"
          }`}
          title={`${BREAK_LABELS[activeBreak.type]} — click to return`}
        >
          <span>{BREAK_LABELS[activeBreak.type]}</span>
          <span className="font-mono">{formatElapsed(elapsedMs)}</span>
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
            const disabled = isMeal ? takenMealTypes.has(opt.type) : remainingCasualBalance <= 0;
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
                    {disabled ? "Daily casual balance used up" : `${remainingCasualBalance} min left today`}
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
