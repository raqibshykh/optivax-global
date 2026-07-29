import { useState } from "react";

export type AvatarSize = "xs" | "sm" | "md" | "lg" | "xl";

const SIZE_CLASSES: Record<AvatarSize, string> = {
  xs: "h-6 w-6 text-[10px]",
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-14 w-14 text-lg",
  xl: "h-24 w-24 text-2xl",
};

// A fixed, deterministic palette (not random) so the same person's initials circle is always
// the same color across every page — a stable visual identity, not a re-roll on every render.
const INITIALS_COLORS = [
  "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
  "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
  "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300",
  "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300",
  "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300",
  "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
  "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300",
];

function initialsOf(name?: string | null): string {
  const trimmed = (name || "").trim();
  if (!trimmed) return "?";
  const parts = trimmed.split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase() || "?";
}

function colorFor(name?: string | null): string {
  const str = (name || "?").trim() || "?";
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = (hash * 31 + str.charCodeAt(i)) >>> 0;
  return INITIALS_COLORS[hash % INITIALS_COLORS.length];
}

export interface AvatarProps {
  /** Photo URL — accepts either `avatar_url` (UserProfile) or `avatar` (User/AuthContext) naming, pass whichever the caller has. */
  src?: string | null;
  name?: string | null;
  size?: AvatarSize;
  className?: string;
  title?: string;
}

/**
 * The one shared employee/user avatar — an `<img>` when a real photo URL is available,
 * falling back to a deterministic-color initials circle (never a broken-image icon) otherwise.
 * Replaces the ad hoc `charAt(0)` initials-circle markup that used to be duplicated across
 * ~20+ pages with one consistent, reusable implementation.
 */
export default function Avatar({ src, name, size = "md", className = "", title }: AvatarProps) {
  const [imgFailed, setImgFailed] = useState(false);
  const sizeClass = SIZE_CLASSES[size];
  const showImg = !!src && !imgFailed;

  return (
    <div
      className={`shrink-0 rounded-full overflow-hidden flex items-center justify-center font-semibold select-none ${sizeClass} ${
        showImg ? "bg-gray-100 dark:bg-gray-800" : colorFor(name)
      } ${className}`}
      title={title ?? name ?? undefined}
    >
      {showImg ? (
        <img
          src={src as string}
          alt={name ?? "Avatar"}
          className="h-full w-full object-cover"
          onError={() => setImgFailed(true)}
        />
      ) : (
        <span>{initialsOf(name)}</span>
      )}
    </div>
  );
}
