import { api } from "../lib/client";

// ── Content Calendar — types, presentation constants, and REST service ─────────
// NOTE: The types/constants below are pure schema + UI-display concerns (not
// mock/seed data), so they live here permanently rather than in src/mock/.

export type Platform      = "Facebook" | "Instagram" | "LinkedIn" | "TikTok" | "YouTube" | "Website" | "Other";
export type ContentType   = "Post" | "Reel" | "Story" | "Video" | "Banner" | "Campaign" | "Blog" | "Other";
export type MarketingStatus = "Planned" | "Ready" | "Published" | "Cancelled";
export type ProductionRequirementType =
  | "Graphic Design" | "Video Editing" | "Motion Graphics"
  | "Banner Design" | "Social Media Creative" | "Product Photography" | "Other";
export type ProductionStatus = "Pending" | "In Progress" | "Ready For Marketing" | "Delivered";

export interface ContentEntry {
  id: string;
  title: string;
  description: string;
  platform: Platform;
  contentType: ContentType;
  scheduledDate: string;   // YYYY-MM-DD
  scheduledTime: string;   // HH:MM
  status: MarketingStatus;
  productionSupportRequired: boolean;
  // Production collaboration fields — only set when productionSupportRequired = true
  productionRequirementType?: ProductionRequirementType;
  productionStatus?: ProductionStatus;
  createdBy: string;
  createdByName: string;
  createdAt: string;
  updatedAt?: string;
}

// ── Constants ──────────────────────────────────────────────────────────────────

export const PLATFORMS: Platform[]        = ["Facebook","Instagram","LinkedIn","TikTok","YouTube","Website","Other"];
export const CONTENT_TYPES: ContentType[] = ["Post","Reel","Story","Video","Banner","Campaign","Blog","Other"];
export const MARKETING_STATUSES: MarketingStatus[] = ["Planned","Ready","Published","Cancelled"];
export const PRODUCTION_REQUIREMENT_TYPES: ProductionRequirementType[] = [
  "Graphic Design","Video Editing","Motion Graphics",
  "Banner Design","Social Media Creative","Product Photography","Other",
];
export const PRODUCTION_STATUSES: ProductionStatus[] = ["Pending","In Progress","Ready For Marketing","Delivered"];

export const PROD_STATUS_CHIP: Record<ProductionStatus, string> = {
  "Pending":            "bg-gray-100   text-gray-700   dark:bg-gray-800    dark:text-gray-300",
  "In Progress":        "bg-blue-50    text-blue-700   dark:bg-blue-900/25  dark:text-blue-400",
  "Ready For Marketing":"bg-green-50   text-green-700  dark:bg-green-900/25 dark:text-green-400",
  "Delivered":          "bg-purple-50  text-purple-700 dark:bg-purple-900/25 dark:text-purple-400",
};
export const PROD_STATUS_BADGE: Record<ProductionStatus, string> = {
  "Pending":            "bg-gray-100   text-gray-800   dark:bg-gray-800    dark:text-gray-200",
  "In Progress":        "bg-blue-100   text-blue-800   dark:bg-blue-900/30  dark:text-blue-300",
  "Ready For Marketing":"bg-green-100  text-green-800  dark:bg-green-900/30 dark:text-green-300",
  "Delivered":          "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
};
export const PROD_STATUS_DOT: Record<ProductionStatus, string> = {
  "Pending":            "bg-gray-400",
  "In Progress":        "bg-blue-500",
  "Ready For Marketing":"bg-green-500",
  "Delivered":          "bg-purple-500",
};

export const STATUS_CHIP: Record<MarketingStatus, string> = {
  Planned:   "bg-blue-50   text-blue-700   dark:bg-blue-900/25  dark:text-blue-400",
  Ready:     "bg-yellow-50 text-yellow-700 dark:bg-yellow-900/25 dark:text-yellow-400",
  Published: "bg-green-50  text-green-700  dark:bg-green-900/25  dark:text-green-400",
  Cancelled: "bg-red-50    text-red-600    dark:bg-red-900/25    dark:text-red-400",
};

export const STATUS_BADGE: Record<MarketingStatus, string> = {
  Planned:   "bg-blue-100   text-blue-800   dark:bg-blue-900/30  dark:text-blue-300",
  Ready:     "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
  Published: "bg-green-100  text-green-800  dark:bg-green-900/30  dark:text-green-300",
  Cancelled: "bg-red-100    text-red-800    dark:bg-red-900/30    dark:text-red-300",
};

export const STATUS_DOT: Record<MarketingStatus, string> = {
  Planned:   "bg-blue-500",
  Ready:     "bg-yellow-400",
  Published: "bg-green-500",
  Cancelled: "bg-red-500",
};

export const STATUS_BORDER: Record<MarketingStatus, string> = {
  Planned:   "border-l-blue-500",
  Ready:     "border-l-yellow-400",
  Published: "border-l-green-500",
  Cancelled: "border-l-red-500",
};

export const PLATFORM_ABBR: Record<Platform, string> = {
  Facebook:  "FB", Instagram: "IG", LinkedIn: "LI",
  TikTok:    "TT", YouTube:   "YT", Website:  "WEB", Other: "—",
};

export const PLATFORM_COLOR: Record<Platform, string> = {
  Facebook:  "bg-blue-600",
  Instagram: "bg-pink-500",
  LinkedIn:  "bg-sky-700",
  TikTok:    "bg-gray-900 dark:bg-gray-700",
  YouTube:   "bg-red-600",
  Website:   "bg-purple-600",
  Other:     "bg-gray-500",
};

// ── Date helpers used by both calendar and dashboard ──────────────────────────

export function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

export function weekRange(): { start: string; end: string } {
  const now = new Date();
  const day = now.getDay(); // 0=Sun
  const mon = new Date(now); mon.setDate(now.getDate() - day);
  const sun = new Date(mon); sun.setDate(mon.getDate() + 6);
  return { start: mon.toISOString().slice(0, 10), end: sun.toISOString().slice(0, 10) };
}

export function upcomingRange(): { start: string; end: string } {
  const now = new Date();
  const tomorrow = new Date(now); tomorrow.setDate(now.getDate() + 1);
  const weekOut  = new Date(now); weekOut.setDate(now.getDate() + 7);
  return { start: tomorrow.toISOString().slice(0, 10), end: weekOut.toISOString().slice(0, 10) };
}

export function monthRange(): { start: string; end: string } {
  const now = new Date();
  const y = now.getFullYear(), m = now.getMonth();
  const first = new Date(y, m, 1);
  const last  = new Date(y, m + 1, 0);
  return { start: first.toISOString().slice(0, 10), end: last.toISOString().slice(0, 10) };
}

// ── REST service ─────────────────────────────────────────────────────────────

const BASE = "/saas/v1/content-calendar";

export class ContentCalendarService {
  static async getAll(): Promise<ContentEntry[]> {
    const data = await api.get<ContentEntry[]>(`${BASE}/list`);
    return data || [];
  }

  static async create(entry: Omit<ContentEntry, "id">): Promise<ContentEntry> {
    return api.post<ContentEntry>(`${BASE}/create`, entry);
  }

  static async update(id: string, updates: Partial<Omit<ContentEntry, "id">>): Promise<ContentEntry> {
    return api.put<ContentEntry>(`${BASE}/update`, { id, ...updates });
  }

  static async delete(id: string): Promise<void> {
    await api.delete(`${BASE}/delete`, { id });
  }
}
