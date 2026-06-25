// ── Content Calendar — standalone data module (no relation to task/attendance/payroll) ──

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

// ── Storage ────────────────────────────────────────────────────────────────────

const STORAGE_KEY = "mkt_content_calendar_v1";

const SEED: ContentEntry[] = [
  // June published entries
  { id:"cc-001", title:"Monthly Newsletter Launch",    description:"Announce June newsletter with key highlights and subscriber growth.",  platform:"Facebook",  contentType:"Post",     scheduledDate:"2026-06-01", scheduledTime:"09:00", status:"Published", productionSupportRequired:false, createdBy:"u10", createdByName:"Olivia Brown", createdAt:"2026-05-25T08:00:00Z" },
  { id:"cc-002", title:"Behind the Scenes Studio Tour",description:"Short reel showing our creative workspace and how we produce content.", platform:"Instagram", contentType:"Reel",     scheduledDate:"2026-06-02", scheduledTime:"11:00", status:"Published", productionSupportRequired:true,  productionRequirementType:"Video Editing",        productionStatus:"Delivered",           createdBy:"u10", createdByName:"Olivia Brown", createdAt:"2026-05-25T08:30:00Z" },
  { id:"cc-003", title:"Q2 Industry Insights Blog",    description:"Deep dive into digital marketing trends observed in Q2 2026.",         platform:"LinkedIn",  contentType:"Blog",     scheduledDate:"2026-06-03", scheduledTime:"10:00", status:"Published", productionSupportRequired:false, createdBy:"u10", createdByName:"Olivia Brown", createdAt:"2026-05-26T09:00:00Z" },
  { id:"cc-004", title:"Product Feature Friday",       description:"Highlight key product features with interactive story polls.",          platform:"Instagram", contentType:"Story",    scheduledDate:"2026-06-05", scheduledTime:"14:00", status:"Published", productionSupportRequired:false, createdBy:"u21", createdByName:"Ben Thompson",  createdAt:"2026-05-27T10:00:00Z" },
  { id:"cc-005", title:"Mid-Year Sale Kickoff",        description:"Launch campaign announcing 25% off all services for July.",            platform:"Facebook",  contentType:"Campaign", scheduledDate:"2026-06-08", scheduledTime:"09:30", status:"Published", productionSupportRequired:true,  productionRequirementType:"Graphic Design",        productionStatus:"Delivered",           createdBy:"u10", createdByName:"Olivia Brown", createdAt:"2026-05-28T08:00:00Z" },
  { id:"cc-006", title:"How Our Team Works",           description:"Fun TikTok showcasing daily routines and team culture.",               platform:"TikTok",    contentType:"Video",    scheduledDate:"2026-06-10", scheduledTime:"16:00", status:"Published", productionSupportRequired:true,  productionRequirementType:"Video Editing",        productionStatus:"Delivered",           createdBy:"u21", createdByName:"Ben Thompson",  createdAt:"2026-06-01T09:00:00Z" },
  { id:"cc-007", title:"Client Testimonial Spotlight", description:"Video testimonial from top client with impact statistics.",            platform:"Instagram", contentType:"Post",     scheduledDate:"2026-06-12", scheduledTime:"12:00", status:"Published", productionSupportRequired:false, createdBy:"u10", createdByName:"Olivia Brown", createdAt:"2026-06-02T08:00:00Z" },
  { id:"cc-008", title:"Product Tutorial Series EP1",  description:"First episode of a 4-part YouTube series showing platform walkthrough.",platform:"YouTube",  contentType:"Video",    scheduledDate:"2026-06-15", scheduledTime:"10:00", status:"Published", productionSupportRequired:true,  productionRequirementType:"Video Editing",        productionStatus:"Delivered",           createdBy:"u10", createdByName:"Olivia Brown", createdAt:"2026-06-04T10:00:00Z" },
  { id:"cc-009", title:"Company Milestone: 5 Years",   description:"Celebrate 5 years with a LinkedIn post featuring team photos.",        platform:"LinkedIn",  contentType:"Post",     scheduledDate:"2026-06-17", scheduledTime:"09:00", status:"Published", productionSupportRequired:false, createdBy:"u10", createdByName:"Olivia Brown", createdAt:"2026-06-05T09:00:00Z" },
  { id:"cc-010", title:"Office Life Reel",             description:"Entertaining reel of office moments and team celebrations.",           platform:"Instagram", contentType:"Reel",     scheduledDate:"2026-06-18", scheduledTime:"15:00", status:"Published", productionSupportRequired:false, createdBy:"u21", createdByName:"Ben Thompson",  createdAt:"2026-06-06T11:00:00Z" },
  { id:"cc-011", title:"Website Banner — Summer Sale", description:"Hero banner design refresh for the summer promotion landing page.",    platform:"Website",   contentType:"Banner",   scheduledDate:"2026-06-19", scheduledTime:"08:00", status:"Published", productionSupportRequired:true,  productionRequirementType:"Banner Design",         productionStatus:"Delivered",           createdBy:"u10", createdByName:"Olivia Brown", createdAt:"2026-06-08T09:00:00Z" },
  // June ready entries
  { id:"cc-012", title:"Weekend Special Offer Post",   description:"Flash sale post: 48-hour exclusive discount for followers.",           platform:"Facebook",  contentType:"Post",     scheduledDate:"2026-06-20", scheduledTime:"10:00", status:"Ready",     productionSupportRequired:false, createdBy:"u10", createdByName:"Olivia Brown", createdAt:"2026-06-10T08:00:00Z" },
  { id:"cc-013", title:"Instagram Poll Story",         description:"Engage audience: ask what content they want to see next week.",        platform:"Instagram", contentType:"Story",    scheduledDate:"2026-06-22", scheduledTime:"13:00", status:"Ready",     productionSupportRequired:false, createdBy:"u21", createdByName:"Ben Thompson",  createdAt:"2026-06-11T10:00:00Z" },
  { id:"cc-014", title:"Digital Marketing Trends Blog",description:"LinkedIn blog on AI-driven marketing trends emerging in H2 2026.",    platform:"LinkedIn",  contentType:"Blog",     scheduledDate:"2026-06-24", scheduledTime:"10:00", status:"Ready",     productionSupportRequired:false, createdBy:"u10", createdByName:"Olivia Brown", createdAt:"2026-06-12T09:00:00Z" },
  { id:"cc-015", title:"Launch Countdown Campaign",    description:"3-day countdown campaign with daily posts building hype for new offer.",platform:"Facebook", contentType:"Campaign", scheduledDate:"2026-06-25", scheduledTime:"08:30", status:"Ready",     productionSupportRequired:false, createdBy:"u10", createdByName:"Olivia Brown", createdAt:"2026-06-13T08:00:00Z" },
  // June planned entries (today + future)
  { id:"cc-016", title:"Friday Motivation Post",       description:"Weekly motivational quote paired with brand visual.",                  platform:"Instagram", contentType:"Post",     scheduledDate:"2026-06-26", scheduledTime:"09:00", status:"Planned",   productionSupportRequired:false, createdBy:"u21", createdByName:"Ben Thompson",  createdAt:"2026-06-14T10:00:00Z" },
  { id:"cc-017", title:"Product Unboxing TikTok",      description:"Trending unboxing format for new product line launch.",               platform:"TikTok",    contentType:"Video",    scheduledDate:"2026-06-27", scheduledTime:"14:00", status:"Planned",   productionSupportRequired:true,  productionRequirementType:"Video Editing",        productionStatus:"In Progress",         createdBy:"u10", createdByName:"Olivia Brown", createdAt:"2026-06-14T11:00:00Z" },
  { id:"cc-018", title:"Weekend Lifestyle Reel",       description:"Saturday lifestyle reel targeting the young professional audience.",   platform:"Instagram", contentType:"Reel",     scheduledDate:"2026-06-28", scheduledTime:"12:00", status:"Planned",   productionSupportRequired:false, createdBy:"u21", createdByName:"Ben Thompson",  createdAt:"2026-06-15T09:00:00Z" },
  { id:"cc-019", title:"Product Tutorial Series EP2",  description:"Second tutorial episode: advanced features walkthrough.",             platform:"YouTube",   contentType:"Video",    scheduledDate:"2026-06-29", scheduledTime:"10:00", status:"Planned",   productionSupportRequired:true,  productionRequirementType:"Video Editing",        productionStatus:"Ready For Marketing", createdBy:"u10", createdByName:"Olivia Brown", createdAt:"2026-06-15T10:00:00Z" },
  { id:"cc-020", title:"Month-End Recap Post",         description:"End-of-month Instagram post highlighting June achievements and reach.",platform:"Instagram", contentType:"Post",     scheduledDate:"2026-06-30", scheduledTime:"16:00", status:"Planned",   productionSupportRequired:false, createdBy:"u10", createdByName:"Olivia Brown", createdAt:"2026-06-16T09:00:00Z" },
  // July planned
  { id:"cc-021", title:"July Campaign Launch",         description:"First post of the new Q3 campaign with fresh brand visuals.",         platform:"Instagram", contentType:"Campaign", scheduledDate:"2026-07-01", scheduledTime:"09:00", status:"Planned",   productionSupportRequired:true,  productionRequirementType:"Social Media Creative", productionStatus:"Pending",             createdBy:"u10", createdByName:"Olivia Brown", createdAt:"2026-06-17T08:00:00Z" },
  { id:"cc-022", title:"Mid-Year Business Review Blog",description:"LinkedIn thought leadership piece reviewing H1 business performance.", platform:"LinkedIn",  contentType:"Blog",     scheduledDate:"2026-07-03", scheduledTime:"10:00", status:"Planned",   productionSupportRequired:false, createdBy:"u10", createdByName:"Olivia Brown", createdAt:"2026-06-17T09:00:00Z" },
  { id:"cc-023", title:"Summer Campaign Reel",         description:"High-energy summer reel to kick off Q3 content calendar.",            platform:"Instagram", contentType:"Reel",     scheduledDate:"2026-07-05", scheduledTime:"11:00", status:"Planned",   productionSupportRequired:true,  productionRequirementType:"Motion Graphics",       productionStatus:"Pending",             createdBy:"u21", createdByName:"Ben Thompson",  createdAt:"2026-06-18T10:00:00Z" },
  { id:"cc-024", title:"Q3 Campaign Kickoff Facebook", description:"Facebook campaign launch post for the July-September initiative.",    platform:"Facebook",  contentType:"Campaign", scheduledDate:"2026-07-07", scheduledTime:"09:30", status:"Planned",   productionSupportRequired:true,  productionRequirementType:"Graphic Design",        productionStatus:"Pending",             createdBy:"u10", createdByName:"Olivia Brown", createdAt:"2026-06-18T11:00:00Z" },
  { id:"cc-025", title:"Website Blog: AI in Marketing",description:"Deep dive article on integrating AI tools into the marketing stack.", platform:"Website",   contentType:"Blog",     scheduledDate:"2026-07-10", scheduledTime:"10:00", status:"Planned",   productionSupportRequired:false, createdBy:"u10", createdByName:"Olivia Brown", createdAt:"2026-06-19T09:00:00Z" },
  // Cancelled example
  { id:"cc-026", title:"Cancelled: June Contest Post", description:"Instagram contest cancelled due to budget reallocation.",             platform:"Instagram", contentType:"Post",     scheduledDate:"2026-06-21", scheduledTime:"11:00", status:"Cancelled", productionSupportRequired:false, createdBy:"u10", createdByName:"Olivia Brown", createdAt:"2026-06-10T08:00:00Z", updatedAt:"2026-06-15T14:00:00Z" },
];

export function getContentEntries(): ContentEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(SEED));
      return SEED;
    }
    const parsed = JSON.parse(raw) as ContentEntry[];
    if (parsed.length === 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(SEED));
      return SEED;
    }
    // Merge seed entries that are missing, and migrate production fields from SEED
    const seedById = new Map(SEED.map((e) => [e.id, e]));
    const ids = new Set(parsed.map((e) => e.id));
    const missing = SEED.filter((e) => !ids.has(e.id));
    // Migrate: if a parsed entry has productionSupportRequired=true but no productionStatus,
    // backfill from seed (if available) or default to "Pending"
    const migrated = parsed.map((e) => {
      if (!e.productionSupportRequired) return e;
      if (e.productionStatus) return e;
      const seed = seedById.get(e.id);
      return {
        ...e,
        productionRequirementType: e.productionRequirementType ?? seed?.productionRequirementType ?? "Other",
        productionStatus: seed?.productionStatus ?? "Pending",
      } as ContentEntry;
    });
    if (missing.length > 0 || migrated.some((e, i) => e !== parsed[i])) {
      const merged = [...migrated, ...missing];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
      return merged;
    }
    return migrated;
  } catch {
    return SEED;
  }
}

export function saveContentEntries(entries: ContentEntry[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

export function appendContentEntry(entry: ContentEntry): void {
  const existing = getContentEntries();
  const idx = existing.findIndex((e) => e.id === entry.id);
  const updated = idx >= 0
    ? existing.map((e) => (e.id === entry.id ? entry : e))
    : [entry, ...existing];
  saveContentEntries(updated);
}

export function deleteContentEntry(id: string): void {
  saveContentEntries(getContentEntries().filter((e) => e.id !== id));
}

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
