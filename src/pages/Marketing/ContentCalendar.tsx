import React, { useState, useEffect, useMemo } from "react";
import PageMeta from "../../components/common/PageMeta";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import {
  getContentEntries, appendContentEntry, deleteContentEntry,
  PLATFORMS, CONTENT_TYPES, MARKETING_STATUSES,
  PRODUCTION_REQUIREMENT_TYPES, PRODUCTION_STATUSES,
  STATUS_CHIP, STATUS_BADGE, STATUS_DOT, STATUS_BORDER, PLATFORM_ABBR, PLATFORM_COLOR,
  PROD_STATUS_CHIP, PROD_STATUS_BADGE, PROD_STATUS_DOT,
  type ContentEntry, type Platform, type ContentType, type MarketingStatus,
  type ProductionRequirementType, type ProductionStatus,
} from "../../mock/contentCalendarData";

// ── Role helpers ───────────────────────────────────────────────────────────────

function useCalendarRole() {
  const { user } = useAuth();
  const role = user?.role ?? "";
  return {
    user,
    role,
    isMarketingAdmin:   role === "marketing_admin"  || role === "super_admin",
    isMarketingMember:  role === "marketing_member",
    isProductionAdmin:  role === "production_admin" || role === "super_admin",
    isProductionMember: role === "production_member",
    isProduction:       role === "production_admin" || role === "production_member",
    isMarketing:        role === "marketing_admin"  || role === "marketing_member" || role === "super_admin",
    canCreateEntry:     role === "marketing_admin"  || role === "super_admin" || role === "marketing_member",
    canEditEntry:       role === "marketing_admin"  || role === "super_admin",
    canDeleteEntry:     role === "marketing_admin"  || role === "super_admin",
    canUpdateProdStatus:role === "production_admin" || role === "production_member" || role === "super_admin",
  };
}

// ── Constants ──────────────────────────────────────────────────────────────────

const DAY_NAMES   = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const MONTH_NAMES = ["January","February","March","April","May","June",
                     "July","August","September","October","November","December"];

// ── Helpers ────────────────────────────────────────────────────────────────────

function padDate(y: number, m: number, d: number): string {
  return `${y}-${String(m + 1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
}
function fmtTime(t: string): string {
  const [h, m] = t.split(":").map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2,"0")} ${h < 12 ? "AM" : "PM"}`;
}
function fmtDateLong(dateStr: string): string {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("en-US",{
    weekday:"long", month:"long", day:"numeric", year:"numeric",
  });
}
function getWeekStart(d: Date): Date {
  const s = new Date(d);
  s.setDate(d.getDate() - d.getDay());
  return s;
}

// ── Entry Form Modal (marketing roles) ────────────────────────────────────────

type FormState = {
  title: string; description: string; platform: Platform; contentType: ContentType;
  scheduledDate: string; scheduledTime: string; status: MarketingStatus;
  productionSupportRequired: boolean;
  productionRequirementType: ProductionRequirementType;
  productionStatus: ProductionStatus;
};

const EMPTY_FORM: FormState = {
  title:"", description:"", platform:"Instagram", contentType:"Post",
  scheduledDate:"", scheduledTime:"09:00", status:"Planned",
  productionSupportRequired: false,
  productionRequirementType: "Graphic Design",
  productionStatus: "Pending",
};

function EntryModal({
  initial, defaultDate, onSave, onClose,
}: {
  initial: ContentEntry | null; defaultDate: string;
  onSave: (f: FormState) => void; onClose: () => void;
}) {
  const [form, setForm] = useState<FormState>(() => {
    if (initial) {
      return {
        title: initial.title, description: initial.description,
        platform: initial.platform, contentType: initial.contentType,
        scheduledDate: initial.scheduledDate, scheduledTime: initial.scheduledTime,
        status: initial.status,
        productionSupportRequired: initial.productionSupportRequired,
        productionRequirementType: initial.productionRequirementType ?? "Graphic Design",
        productionStatus: initial.productionStatus ?? "Pending",
      };
    }
    return { ...EMPTY_FORM, scheduledDate: defaultDate };
  });
  const [err, setErr] = useState("");

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm(f => ({ ...f, [k]: v }));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim())    { setErr("Title is required."); return; }
    if (!form.scheduledDate)   { setErr("Date is required.");  return; }
    onSave(form);
  };

  const inp = "w-full rounded-lg border border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-white px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-gray-900 shadow-2xl border border-gray-200 dark:border-gray-800 flex flex-col max-h-[92vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800 flex-shrink-0">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white">
            {initial ? "Edit Entry" : "New Content Entry"}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 text-2xl leading-none">&times;</button>
        </div>

        <form onSubmit={submit} className="overflow-y-auto flex-1 p-6 space-y-4">
          {/* Title */}
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Title *</label>
            <input className={inp} value={form.title} onChange={e => set("title",e.target.value)} placeholder="e.g. Summer Sale Post" />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
            <textarea rows={3} className={`${inp} resize-none`} value={form.description}
              onChange={e => set("description",e.target.value)} placeholder="What is this content about?" />
          </div>

          {/* Platform + Content Type */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Platform *</label>
              <select className={inp} value={form.platform} onChange={e => set("platform",e.target.value as Platform)}>
                {PLATFORMS.map(p => <option key={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Content Type *</label>
              <select className={inp} value={form.contentType} onChange={e => set("contentType",e.target.value as ContentType)}>
                {CONTENT_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
          </div>

          {/* Date + Time */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Scheduled Date *</label>
              <input type="date" className={inp} value={form.scheduledDate} onChange={e => set("scheduledDate",e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Scheduled Time *</label>
              <input type="time" className={inp} value={form.scheduledTime} onChange={e => set("scheduledTime",e.target.value)} />
            </div>
          </div>

          {/* Marketing Status */}
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Marketing Status *</label>
            <div className="grid grid-cols-4 gap-2">
              {MARKETING_STATUSES.map(s => (
                <button key={s} type="button" onClick={() => set("status",s)}
                  className={`py-1.5 text-xs font-medium rounded-lg border transition-all ${
                    form.status === s
                      ? `${STATUS_CHIP[s]} border-transparent ring-2 ring-offset-1 ring-current`
                      : "border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"
                  }`}>{s}
                </button>
              ))}
            </div>
          </div>

          {/* Production Support — Yes / No */}
          <div className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-800/50">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Production Support Required</span>
              <div className="flex rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden text-xs font-medium">
                {([false, true] as const).map(v => (
                  <button key={String(v)} type="button"
                    onClick={() => set("productionSupportRequired", v)}
                    className={`px-4 py-1.5 transition-colors ${
                      form.productionSupportRequired === v
                        ? v ? "bg-orange-500 text-white" : "bg-gray-600 text-white"
                        : "text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                    }`}>
                    {v ? "Yes" : "No"}
                  </button>
                ))}
              </div>
            </div>

            {/* Production fields — shown only when Yes */}
            {form.productionSupportRequired && (
              <div className="p-4 space-y-3 border-t border-orange-100 dark:border-orange-900/30 bg-orange-50/50 dark:bg-orange-900/10">
                <div>
                  <label className="block text-xs font-medium text-orange-700 dark:text-orange-400 mb-1">Production Requirement Type *</label>
                  <select className={`${inp} border-orange-200 dark:border-orange-800`}
                    value={form.productionRequirementType}
                    onChange={e => set("productionRequirementType", e.target.value as ProductionRequirementType)}>
                    {PRODUCTION_REQUIREMENT_TYPES.map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <p className="text-[10px] text-orange-600 dark:text-orange-400">
                  This entry will be visible to the Production Department. Production status starts as Pending and is updated by the Production Team.
                </p>
              </div>
            )}
          </div>

          {err && <p className="text-sm text-red-600">{err}</p>}
        </form>

        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-800 flex-shrink-0">
          <button type="button" onClick={onClose}
            className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700">
            Cancel
          </button>
          <button onClick={submit} className="px-4 py-2 text-sm font-semibold text-white bg-brand-500 hover:bg-brand-600 rounded-lg">
            {initial ? "Save Changes" : "Add Entry"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Detail / Production-Status Modal ──────────────────────────────────────────

function DetailModal({
  entry, canEdit, canDelete, canUpdateProdStatus, onEdit, onDelete, onClose, onProdStatusUpdate,
}: {
  entry: ContentEntry; canEdit: boolean; canDelete: boolean; canUpdateProdStatus: boolean;
  onEdit: () => void; onDelete: () => void; onClose: () => void;
  onProdStatusUpdate: (status: ProductionStatus) => void;
}) {
  const [prodStatus, setProdStatus] = useState<ProductionStatus>(entry.productionStatus ?? "Pending");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white dark:bg-gray-900 shadow-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
        {/* Colour strip */}
        <div className={`h-1.5 ${STATUS_DOT[entry.status]}`} />
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800 flex items-start justify-between">
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white text-base leading-snug">{entry.title}</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {fmtDateLong(entry.scheduledDate)} · {fmtTime(entry.scheduledTime)}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 text-2xl leading-none ml-4 flex-shrink-0">&times;</button>
        </div>

        <div className="p-6 space-y-4 overflow-y-auto max-h-[65vh]">
          {/* Marketing chips */}
          <div className="flex flex-wrap gap-2">
            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${STATUS_BADGE[entry.status]}`}>{entry.status}</span>
            <span className={`px-2.5 py-1 rounded-full text-xs font-bold text-white ${PLATFORM_COLOR[entry.platform]}`}>{entry.platform}</span>
            <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">{entry.contentType}</span>
          </div>

          {entry.description && (
            <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{entry.description}</p>
          )}

          {/* Production section */}
          {entry.productionSupportRequired && (
            <div className="rounded-xl border border-orange-200 dark:border-orange-800 overflow-hidden">
              <div className="px-4 py-2 bg-orange-50 dark:bg-orange-900/20 border-b border-orange-100 dark:border-orange-800 flex items-center gap-2">
                <svg className="w-3.5 h-3.5 text-orange-600 dark:text-orange-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                </svg>
                <span className="text-xs font-semibold text-orange-700 dark:text-orange-400">Production Request</span>
              </div>
              <div className="p-4 space-y-3">
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-gray-500 dark:text-gray-400 block mb-0.5">Requirement Type</span>
                    <span className="font-medium text-gray-800 dark:text-gray-200">{entry.productionRequirementType ?? "—"}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 dark:text-gray-400 block mb-0.5">Production Status</span>
                    {canUpdateProdStatus ? (
                      <select
                        value={prodStatus}
                        onChange={e => {
                          const s = e.target.value as ProductionStatus;
                          setProdStatus(s);
                          onProdStatusUpdate(s);
                        }}
                        className="w-full text-xs rounded-lg border border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-white px-2 py-1 focus:ring-2 focus:ring-brand-500"
                      >
                        {PRODUCTION_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    ) : (
                      <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold ${PROD_STATUS_BADGE[prodStatus]}`}>
                        {prodStatus}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 text-xs text-gray-500 dark:text-gray-400">
            <div><span className="font-medium text-gray-700 dark:text-gray-300 block">Created by</span>{entry.createdByName}</div>
            <div><span className="font-medium text-gray-700 dark:text-gray-300 block">Created</span>{new Date(entry.createdAt).toLocaleDateString()}</div>
            {entry.updatedAt && (
              <div><span className="font-medium text-gray-700 dark:text-gray-300 block">Last updated</span>{new Date(entry.updatedAt).toLocaleDateString()}</div>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-800">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700">Close</button>
          {canEdit   && <button onClick={onEdit}   className="px-4 py-2 text-sm font-medium text-brand-700 dark:text-brand-400 bg-brand-50 dark:bg-brand-900/20 rounded-lg hover:bg-brand-100 dark:hover:bg-brand-900/40">Edit</button>}
          {canDelete && <button onClick={onDelete} className="px-4 py-2 text-sm font-medium text-white bg-red-500 hover:bg-red-600 rounded-lg">Delete</button>}
        </div>
      </div>
    </div>
  );
}

// ── Filter Bar ─────────────────────────────────────────────────────────────────

function FilterBar({
  filterPlatform, setFilterPlatform, filterStatus, setFilterStatus,
  filterProdStatus, setFilterProdStatus, showProdFilter, search, setSearch,
}: {
  filterPlatform: string; setFilterPlatform: (v: string) => void;
  filterStatus: string;   setFilterStatus:   (v: string) => void;
  filterProdStatus: string; setFilterProdStatus: (v: string) => void;
  showProdFilter: boolean;
  search: string; setSearch: (v: string) => void;
}) {
  const cls = "text-sm border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-brand-500";
  return (
    <div className="flex flex-wrap gap-2 items-center">
      <input value={search} onChange={e => setSearch(e.target.value)}
        placeholder="Search entries…" className={`${cls} min-w-[140px] flex-1`} />
      <select value={filterPlatform} onChange={e => setFilterPlatform(e.target.value)} className={cls}>
        <option value="">All Platforms</option>
        {PLATFORMS.map(p => <option key={p}>{p}</option>)}
      </select>
      <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className={cls}>
        <option value="">All Statuses</option>
        {MARKETING_STATUSES.map(s => <option key={s}>{s}</option>)}
      </select>
      {showProdFilter && (
        <select value={filterProdStatus} onChange={e => setFilterProdStatus(e.target.value)} className={cls}>
          <option value="">All Production</option>
          {PRODUCTION_STATUSES.map(s => <option key={s}>{s}</option>)}
        </select>
      )}
    </div>
  );
}

// ── Month View ─────────────────────────────────────────────────────────────────

function MonthView({
  year, month, entries, today, canEdit, onDayClick, onEntryClick,
}: {
  year: number; month: number; entries: ContentEntry[]; today: string; canEdit: boolean;
  onDayClick: (date: string) => void; onEntryClick: (e: ContentEntry) => void;
}) {
  const firstDow  = new Date(year, month, 1).getDay();
  const daysInMon = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMon; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const byDate = useMemo(() => {
    const map: Record<string, ContentEntry[]> = {};
    entries.forEach(e => {
      if (!map[e.scheduledDate]) map[e.scheduledDate] = [];
      map[e.scheduledDate].push(e);
    });
    return map;
  }, [entries]);

  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-hidden">
      <div className="grid grid-cols-7 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-800">
        {DAY_NAMES.map(d => (
          <div key={d} className="py-2 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {cells.map((day, idx) => {
          const dateStr   = day ? padDate(year, month, day) : "";
          const dayEnts   = day ? (byDate[dateStr] ?? []).slice().sort((a,b) => a.scheduledTime.localeCompare(b.scheduledTime)) : [];
          const isToday   = dateStr === today;
          const isWeekend = idx % 7 === 0 || idx % 7 === 6;
          return (
            <div key={idx}
              className={`min-h-[110px] border-b border-r border-gray-100 dark:border-gray-800 p-1 relative
                ${isWeekend && day ? "bg-gray-50/50 dark:bg-gray-800/20" : ""}
                ${!day ? "bg-gray-50 dark:bg-gray-800/30" : ""}
                ${day && canEdit ? "cursor-pointer group" : ""}
              `}
              onClick={() => day && canEdit && onDayClick(dateStr)}
            >
              {day && (
                <>
                  <div className="flex items-center justify-between mb-1">
                    <span className={`w-6 h-6 flex items-center justify-center text-xs font-semibold rounded-full
                      ${isToday ? "bg-brand-500 text-white" : "text-gray-600 dark:text-gray-400"}
                      ${canEdit && !isToday ? "group-hover:bg-gray-100 dark:group-hover:bg-gray-700" : ""}
                    `}>{day}</span>
                    {dayEnts.length > 0 && <span className="text-[9px] text-gray-400">{dayEnts.length}</span>}
                  </div>
                  <div className="space-y-0.5" onClick={e => e.stopPropagation()}>
                    {dayEnts.slice(0,3).map(entry => (
                      <button key={entry.id}
                        onClick={e => { e.stopPropagation(); onEntryClick(entry); }}
                        className={`w-full text-left flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium truncate border-l-2
                          ${STATUS_CHIP[entry.status]} ${STATUS_BORDER[entry.status]}`}
                        title={`${entry.title} — ${entry.platform}`}
                      >
                        {entry.productionSupportRequired && (
                          <span className="flex-shrink-0 text-orange-500" title="Production request">⚙</span>
                        )}
                        <span className="flex-shrink-0 opacity-70">{PLATFORM_ABBR[entry.platform]}</span>
                        <span className="truncate">{entry.title}</span>
                      </button>
                    ))}
                    {dayEnts.length > 3 && (
                      <button onClick={e => { e.stopPropagation(); onEntryClick(dayEnts[3]); }}
                        className="text-[10px] text-gray-500 dark:text-gray-400 hover:text-brand-600 dark:hover:text-brand-400 pl-1.5">
                        +{dayEnts.length - 3} more
                      </button>
                    )}
                  </div>
                  {canEdit && dayEnts.length === 0 && (
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                      <span className="text-[10px] text-gray-400">+ Add</span>
                    </div>
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Week View ──────────────────────────────────────────────────────────────────

function WeekView({
  startDate, entries, today, canEdit, onDayClick, onEntryClick,
}: {
  startDate: Date; entries: ContentEntry[]; today: string; canEdit: boolean;
  onDayClick: (date: string) => void; onEntryClick: (e: ContentEntry) => void;
}) {
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(startDate); d.setDate(startDate.getDate() + i); return d;
  });
  return (
    <div className="grid grid-cols-7 gap-px bg-gray-200 dark:bg-gray-700 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-800">
      {days.map(d => {
        const dateStr = d.toISOString().slice(0,10);
        const isToday = dateStr === today;
        const dayEnts = entries.filter(e => e.scheduledDate === dateStr)
                               .sort((a,b) => a.scheduledTime.localeCompare(b.scheduledTime));
        return (
          <div key={dateStr} className={`bg-white dark:bg-gray-900 min-h-[200px] flex flex-col ${isToday ? "ring-2 ring-inset ring-brand-500" : ""}`}>
            <div className={`px-2 py-2 text-center border-b border-gray-100 dark:border-gray-800 ${canEdit ? "cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50" : ""}`}
              onClick={() => canEdit && onDayClick(dateStr)}>
              <p className="text-[10px] uppercase font-semibold text-gray-400">{DAY_NAMES[d.getDay()]}</p>
              <p className={`text-lg font-bold mt-0.5 ${isToday ? "text-brand-600 dark:text-brand-400" : "text-gray-800 dark:text-white"}`}>{d.getDate()}</p>
            </div>
            <div className="flex-1 p-1.5 space-y-1 overflow-hidden">
              {dayEnts.map(entry => (
                <button key={entry.id} onClick={() => onEntryClick(entry)}
                  className={`w-full text-left px-2 py-1.5 rounded-lg border-l-2 text-xs ${STATUS_CHIP[entry.status]} ${STATUS_BORDER[entry.status]}`}>
                  <div className="font-medium truncate leading-tight flex items-center gap-1">
                    {entry.productionSupportRequired && <span className="text-orange-500 flex-shrink-0">⚙</span>}
                    {entry.title}
                  </div>
                  <div className="flex items-center gap-1 mt-0.5 opacity-70">
                    <span>{fmtTime(entry.scheduledTime)}</span>
                    <span>·</span>
                    <span>{entry.platform}</span>
                  </div>
                </button>
              ))}
              {canEdit && dayEnts.length === 0 && (
                <button onClick={() => onDayClick(dateStr)}
                  className="w-full text-center py-3 text-xs text-gray-300 dark:text-gray-600 hover:text-brand-500 dark:hover:text-brand-400 transition-colors">
                  + Add
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Day View ───────────────────────────────────────────────────────────────────

function DayView({
  date, entries, canEdit, onAdd, onEntryClick,
}: {
  date: Date; entries: ContentEntry[]; canEdit: boolean;
  onAdd: () => void; onEntryClick: (e: ContentEntry) => void;
}) {
  const dateStr = date.toISOString().slice(0,10);
  const dayEnts = entries.filter(e => e.scheduledDate === dateStr)
                         .sort((a,b) => a.scheduledTime.localeCompare(b.scheduledTime));
  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-white text-base">{fmtDateLong(dateStr)}</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{dayEnts.length} {dayEnts.length === 1 ? "entry" : "entries"} scheduled</p>
        </div>
        {canEdit && (
          <button onClick={onAdd} className="px-3 py-1.5 text-xs font-medium text-white bg-brand-500 hover:bg-brand-600 rounded-lg">
            + Add Entry
          </button>
        )}
      </div>
      {dayEnts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-3">
            <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">No content scheduled for this day.</p>
          {canEdit && <p className="text-xs text-gray-400 mt-1">Click + Add Entry to schedule something.</p>}
        </div>
      ) : (
        <div className="divide-y divide-gray-100 dark:divide-gray-800">
          {dayEnts.map(entry => (
            <button key={entry.id} onClick={() => onEntryClick(entry)}
              className="w-full text-left flex items-start gap-4 px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
              <div className="w-16 flex-shrink-0 text-right">
                <span className="text-xs font-mono text-gray-500 dark:text-gray-400">{fmtTime(entry.scheduledTime)}</span>
              </div>
              <div className={`w-1 self-stretch rounded-full flex-shrink-0 ${STATUS_DOT[entry.status]}`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-sm text-gray-900 dark:text-white">{entry.title}</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${STATUS_BADGE[entry.status]}`}>{entry.status}</span>
                  {entry.productionSupportRequired && entry.productionStatus && (
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${PROD_STATUS_BADGE[entry.productionStatus]}`}>
                      ⚙ {entry.productionStatus}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold text-white ${PLATFORM_COLOR[entry.platform]}`}>{entry.platform}</span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">{entry.contentType}</span>
                  {entry.productionSupportRequired && entry.productionRequirementType && (
                    <span className="text-[10px] text-orange-600 dark:text-orange-400 font-medium">{entry.productionRequirementType}</span>
                  )}
                </div>
                {entry.description && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">{entry.description}</p>}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Production Requests List (production roles get this instead of calendar) ──

function ProductionRequestsList({
  entries, onEntryClick,
}: {
  entries: ContentEntry[]; onEntryClick: (e: ContentEntry) => void;
}) {
  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-hidden">
      {entries.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">No production requests at this time.</p>
        </div>
      ) : (
        <div className="divide-y divide-gray-100 dark:divide-gray-800">
          {entries.map(entry => (
            <button key={entry.id} onClick={() => onEntryClick(entry)}
              className="w-full text-left flex items-start gap-4 px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
              {/* Production status bar */}
              <div className={`w-1 self-stretch rounded-full flex-shrink-0 ${PROD_STATUS_DOT[entry.productionStatus ?? "Pending"]}`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="font-semibold text-sm text-gray-900 dark:text-white">{entry.title}</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${PROD_STATUS_BADGE[entry.productionStatus ?? "Pending"]}`}>
                    {entry.productionStatus ?? "Pending"}
                  </span>
                </div>
                <div className="flex items-center gap-2 flex-wrap text-xs text-gray-500 dark:text-gray-400">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold text-white ${PLATFORM_COLOR[entry.platform]}`}>{entry.platform}</span>
                  <span>{entry.contentType}</span>
                  <span>·</span>
                  <span className="text-orange-600 dark:text-orange-400 font-medium">{entry.productionRequirementType}</span>
                  <span>·</span>
                  <span>{new Date(entry.scheduledDate + "T00:00:00").toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"})}</span>
                  <span className={`ml-auto px-2 py-0.5 rounded-full text-[10px] font-semibold ${STATUS_BADGE[entry.status]}`}>{entry.status}</span>
                </div>
                {entry.description && <p className="text-xs text-gray-400 mt-1 line-clamp-1">{entry.description}</p>}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Status Legend ──────────────────────────────────────────────────────────────

function StatusLegend({ isProduction }: { isProduction: boolean }) {
  if (isProduction) {
    return (
      <div className="flex flex-wrap items-center gap-3">
        {PRODUCTION_STATUSES.map(s => (
          <div key={s} className="flex items-center gap-1.5">
            <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${PROD_STATUS_DOT[s]}`} />
            <span className="text-xs text-gray-500 dark:text-gray-400">{s}</span>
          </div>
        ))}
      </div>
    );
  }
  return (
    <div className="flex flex-wrap items-center gap-3">
      {MARKETING_STATUSES.map(s => (
        <div key={s} className="flex items-center gap-1.5">
          <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${STATUS_DOT[s]}`} />
          <span className="text-xs text-gray-500 dark:text-gray-400">{s}</span>
        </div>
      ))}
      <div className="flex items-center gap-1.5 ml-2 pl-2 border-l border-gray-200 dark:border-gray-700">
        <span className="text-orange-500 text-sm">⚙</span>
        <span className="text-xs text-gray-500 dark:text-gray-400">Production request</span>
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────

type View = "month" | "week" | "day";

export default function ContentCalendar() {
  const { showToast }    = useToast();
  const perms            = useCalendarRole();
  const { user, isProduction, isMarketing, canCreateEntry, canEditEntry, canDeleteEntry, canUpdateProdStatus } = perms;

  const today = new Date().toISOString().slice(0,10);

  const [view,          setView]          = useState<View>("month");
  const [currentDate,   setCurrentDate]   = useState(new Date());
  const [allEntries,    setAllEntries]     = useState<ContentEntry[]>([]);
  const [filterPlatform, setFilterPlatform] = useState("");
  const [filterStatus,   setFilterStatus]   = useState("");
  const [filterProdStatus, setFilterProdStatus] = useState("");
  const [search,         setSearch]         = useState("");

  const [showForm,    setShowForm]    = useState(false);
  const [editEntry,   setEditEntry]   = useState<ContentEntry | null>(null);
  const [viewEntry,   setViewEntry]   = useState<ContentEntry | null>(null);
  const [defaultDate, setDefaultDate] = useState(today);

  useEffect(() => { setAllEntries(getContentEntries()); }, []);

  // ── Visibility: production sees only prod-required entries ─────────────────
  const visibleEntries = useMemo(() =>
    isProduction && !perms.isMarketingAdmin
      ? allEntries.filter(e => e.productionSupportRequired)
      : allEntries,
  [allEntries, isProduction, perms.isMarketingAdmin]);

  // ── Filtered entries ────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let list = visibleEntries;
    if (filterPlatform)   list = list.filter(e => e.platform === filterPlatform);
    if (filterStatus)     list = list.filter(e => e.status   === filterStatus);
    if (filterProdStatus) list = list.filter(e => e.productionStatus === filterProdStatus);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(e => e.title.toLowerCase().includes(q) || e.description.toLowerCase().includes(q));
    }
    return list;
  }, [visibleEntries, filterPlatform, filterStatus, filterProdStatus, search]);

  // ── KPI summary ─────────────────────────────────────────────────────────────
  const summary = useMemo(() => {
    if (isProduction && !perms.isMarketingAdmin) {
      const prodEntries = visibleEntries;
      return {
        total:     prodEntries.length,
        pending:   prodEntries.filter(e => (e.productionStatus ?? "Pending") === "Pending").length,
        inProgress:prodEntries.filter(e => e.productionStatus === "In Progress").length,
        ready:     prodEntries.filter(e => e.productionStatus === "Ready For Marketing").length,
        delivered: prodEntries.filter(e => e.productionStatus === "Delivered").length,
      };
    }
    const y = currentDate.getFullYear(), m = currentDate.getMonth();
    const monthStr = `${y}-${String(m+1).padStart(2,"0")}`;
    const mEntries = visibleEntries.filter(e => e.scheduledDate.startsWith(monthStr));
    return {
      total:     mEntries.length,
      planned:   mEntries.filter(e => e.status === "Planned").length,
      ready:     mEntries.filter(e => e.status === "Ready").length,
      published: mEntries.filter(e => e.status === "Published").length,
      cancelled: mEntries.filter(e => e.status === "Cancelled").length,
    };
  }, [visibleEntries, currentDate, isProduction, perms.isMarketingAdmin]);

  // ── Navigation ──────────────────────────────────────────────────────────────
  const prev = () => {
    const d = new Date(currentDate);
    if (view === "month") d.setMonth(d.getMonth() - 1);
    if (view === "week")  d.setDate(d.getDate() - 7);
    if (view === "day")   d.setDate(d.getDate() - 1);
    setCurrentDate(d);
  };
  const next = () => {
    const d = new Date(currentDate);
    if (view === "month") d.setMonth(d.getMonth() + 1);
    if (view === "week")  d.setDate(d.getDate() + 7);
    if (view === "day")   d.setDate(d.getDate() + 1);
    setCurrentDate(d);
  };
  const goToday = () => setCurrentDate(new Date());

  const periodLabel = () => {
    const y = currentDate.getFullYear(), m = currentDate.getMonth();
    if (view === "month") return `${MONTH_NAMES[m]} ${y}`;
    if (view === "week") {
      const ws = getWeekStart(currentDate);
      const we = new Date(ws); we.setDate(ws.getDate() + 6);
      return `${ws.toLocaleDateString("en-US",{month:"short",day:"numeric"})} – ${we.toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"})}`;
    }
    return currentDate.toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric",year:"numeric"});
  };

  // ── Handlers ────────────────────────────────────────────────────────────────
  const openAdd = (date: string) => {
    if (!canCreateEntry) return;
    setEditEntry(null); setDefaultDate(date); setShowForm(true);
  };
  const openEdit = (entry: ContentEntry) => {
    setViewEntry(null); setEditEntry(entry); setDefaultDate(entry.scheduledDate); setShowForm(true);
  };

  const handleSave = (form: FormState) => {
    if (!user) return;
    const prodFields = form.productionSupportRequired
      ? { productionRequirementType: form.productionRequirementType, productionStatus: form.productionStatus }
      : { productionRequirementType: undefined, productionStatus: undefined };

    if (editEntry) {
      const updated: ContentEntry = {
        ...editEntry, ...form, ...prodFields, updatedAt: new Date().toISOString(),
      };
      appendContentEntry(updated);
      setAllEntries(getContentEntries());
      showToast("Entry updated", "success");
    } else {
      const newEntry: ContentEntry = {
        ...form, ...prodFields,
        id: `cc-${Date.now()}`,
        createdBy: user.id, createdByName: user.name,
        createdAt: new Date().toISOString(),
      };
      appendContentEntry(newEntry);
      setAllEntries(getContentEntries());
      showToast("Entry added to calendar", "success");
    }
    setShowForm(false); setEditEntry(null);
  };

  const handleDelete = (entry: ContentEntry) => {
    if (!window.confirm(`Delete "${entry.title}"?`)) return;
    deleteContentEntry(entry.id);
    setAllEntries(getContentEntries());
    setViewEntry(null);
    showToast("Entry deleted", "info");
  };

  const handleProdStatusUpdate = (entry: ContentEntry, status: ProductionStatus) => {
    const updated: ContentEntry = { ...entry, productionStatus: status, updatedAt: new Date().toISOString() };
    appendContentEntry(updated);
    setAllEntries(getContentEntries());
    // update viewEntry if open
    setViewEntry(updated);
    showToast(`Production status → ${status}`, "success");
  };

  // ── KPI cards config ────────────────────────────────────────────────────────
  const kpiCards = isProduction && !perms.isMarketingAdmin
    ? [
        { label:"Total Requests",      value:(summary as { total:number }).total,     color:"text-gray-800 dark:text-white" },
        { label:"Pending",             value:(summary as { pending?:number }).pending ?? 0,    color:"text-gray-500 dark:text-gray-400" },
        { label:"In Progress",         value:(summary as { inProgress?:number }).inProgress ?? 0, color:"text-blue-600 dark:text-blue-400" },
        { label:"Ready For Marketing", value:(summary as { ready?:number }).ready ?? 0,    color:"text-green-600 dark:text-green-400" },
        { label:"Delivered",           value:(summary as { delivered?:number }).delivered ?? 0, color:"text-purple-600 dark:text-purple-400" },
      ]
    : [
        { label:"This Month",  value:(summary as { total:number }).total,     color:"text-gray-800 dark:text-white" },
        { label:"Planned",     value:(summary as { planned?:number }).planned ?? 0,    color:"text-blue-600 dark:text-blue-400" },
        { label:"Ready",       value:(summary as { ready?:number }).ready ?? 0,    color:"text-yellow-600 dark:text-yellow-400" },
        { label:"Published",   value:(summary as { published?:number }).published ?? 0, color:"text-green-600 dark:text-green-400" },
        { label:"Cancelled",   value:(summary as { cancelled?:number }).cancelled ?? 0, color:"text-red-500 dark:text-red-400" },
      ];

  // Production-only mode: show list view, no calendar chrome
  const isProdOnly = isProduction && !perms.isMarketingAdmin;

  return (
    <>
      <PageMeta
        title={isProdOnly ? "Production Requests | Optivax" : "Content Calendar | Optivax Marketing"}
        description={isProdOnly ? "Marketing production requests for the Production Department" : "Marketing content calendar"}
      />
      <PageBreadcrumb pageTitle={isProdOnly ? "Production Requests" : "Content Calendar"} />

      {/* ── KPI strip ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-5">
        {kpiCards.map(c => (
          <div key={c.label} className="rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900 px-4 py-3 shadow-sm">
            <p className="text-xs text-gray-500 dark:text-gray-400">{c.label}</p>
            <p className={`text-2xl font-bold mt-1 ${c.color}`}>{c.value}</p>
          </div>
        ))}
      </div>

      {/* ── Toolbar (marketing calendar only) ─────────────────────── */}
      {!isProdOnly && (
        <div className="mb-4 flex flex-wrap items-center gap-3 justify-between">
          <div className="flex items-center gap-2">
            <button onClick={goToday} className="px-3 py-1.5 text-xs font-medium border border-gray-200 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800">Today</button>
            <button onClick={prev} className="w-8 h-8 flex items-center justify-center border border-gray-200 dark:border-gray-700 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/></svg>
            </button>
            <button onClick={next} className="w-8 h-8 flex items-center justify-center border border-gray-200 dark:border-gray-700 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/></svg>
            </button>
            <span className="text-base font-semibold text-gray-900 dark:text-white ml-1">{periodLabel()}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
              {(["month","week","day"] as View[]).map(v => (
                <button key={v} onClick={() => setView(v)}
                  className={`px-3 py-1.5 text-xs font-medium capitalize transition-colors
                    ${view===v ? "bg-brand-500 text-white" : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"}`}>
                  {v}
                </button>
              ))}
            </div>
            {canCreateEntry && (
              <button onClick={() => openAdd(today)}
                className="px-3 py-1.5 text-xs font-semibold text-white bg-brand-500 hover:bg-brand-600 rounded-lg transition-colors whitespace-nowrap">
                + Add Entry
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── Filters ────────────────────────────────────────────────── */}
      <div className="mb-4">
        <FilterBar
          filterPlatform={filterPlatform} setFilterPlatform={setFilterPlatform}
          filterStatus={filterStatus}     setFilterStatus={setFilterStatus}
          filterProdStatus={filterProdStatus} setFilterProdStatus={setFilterProdStatus}
          showProdFilter={isProdOnly || isMarketing}
          search={search} setSearch={setSearch}
        />
      </div>

      {/* ── Legend ─────────────────────────────────────────────────── */}
      <div className="mb-3">
        <StatusLegend isProduction={isProdOnly} />
      </div>

      {/* ── View: production list vs marketing calendar ─────────────── */}
      {isProdOnly ? (
        <ProductionRequestsList entries={filtered} onEntryClick={setViewEntry} />
      ) : (
        <>
          {view === "month" && (
            <MonthView
              year={currentDate.getFullYear()} month={currentDate.getMonth()}
              entries={filtered} today={today} canEdit={canEditEntry}
              onDayClick={openAdd} onEntryClick={setViewEntry}
            />
          )}
          {view === "week" && (
            <WeekView
              startDate={getWeekStart(currentDate)} entries={filtered} today={today}
              canEdit={canEditEntry} onDayClick={openAdd} onEntryClick={setViewEntry}
            />
          )}
          {view === "day" && (
            <DayView
              date={currentDate} entries={filtered} canEdit={canEditEntry}
              onAdd={() => openAdd(currentDate.toISOString().slice(0,10))}
              onEntryClick={setViewEntry}
            />
          )}
        </>
      )}

      {/* ── Access notice ──────────────────────────────────────────── */}
      {!canEditEntry && !isProdOnly && (
        <div className="mt-4 flex items-center gap-2 text-xs text-gray-400 dark:text-gray-500">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
          View-only — contact your Marketing Admin to add or edit calendar entries.
        </div>
      )}

      {/* ── Modals ─────────────────────────────────────────────────── */}
      {showForm && canCreateEntry && (
        <EntryModal
          initial={editEntry} defaultDate={defaultDate}
          onSave={handleSave}
          onClose={() => { setShowForm(false); setEditEntry(null); }}
        />
      )}

      {viewEntry && !showForm && (
        <DetailModal
          entry={viewEntry}
          canEdit={canEditEntry}
          canDelete={canDeleteEntry}
          canUpdateProdStatus={canUpdateProdStatus && !!viewEntry.productionSupportRequired}
          onEdit={() => openEdit(viewEntry)}
          onDelete={() => handleDelete(viewEntry)}
          onProdStatusUpdate={(s) => handleProdStatusUpdate(viewEntry, s)}
          onClose={() => setViewEntry(null)}
        />
      )}
    </>
  );
}
