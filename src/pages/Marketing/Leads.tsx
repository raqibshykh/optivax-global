import React, { useState, useEffect, useCallback } from "react";
import PageMeta from "../../components/common/PageMeta";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import { useToast } from "../../context/ToastContext";
import { api } from "../../lib/client";
import type { Lead } from "../../types";

// Marketing sees leads in read-only mode, filtered to campaign-generated sources.
// Mutation actions (create/edit/delete) remain with the Sales team.

type LeadStatus = "new" | "contacted" | "qualified" | "lost" | "converted";

const STATUS_STYLES: Record<string, string> = {
  new:        "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  contacted:  "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300",
  qualified:  "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
  lost:       "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
  converted:  "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
};

const SOURCE_LABEL: Record<string, string> = {
  website:    "Website",
  referral:   "Referral",
  linkedin:   "LinkedIn",
  "cold-call": "Cold Call",
  event:      "Event",
  other:      "Other",
};

const MARKETING_SOURCES = ["website", "linkedin", "event", "other"];

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${STATUS_STYLES[status] ?? "bg-gray-100 text-gray-600"}`}>
      {status}
    </span>
  );
}

function SourceBadge({ source }: { source?: string }) {
  const isMarketing = MARKETING_SOURCES.includes(source ?? "");
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
      isMarketing
        ? "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300"
        : "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300"
    }`}>
      {SOURCE_LABEL[source ?? ""] ?? source ?? "—"}
    </span>
  );
}

// ── Attribution summary card ───────────────────────────────────────────────────
function AttributionCard({ label, value, sub, accent }: { label: string; value: number | string; sub?: string; accent: string }) {
  return (
    <div className={`rounded-xl border bg-white dark:bg-gray-900 dark:border-gray-800 p-4 shadow-sm border-l-4 ${accent}`}>
      <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">{label}</p>
      <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
      {sub && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
}

export default function MarketingLeads() {
  const { showToast } = useToast();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [search, setSearch] = useState("");

  const fetchLeads = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await api.get<{ leads: Lead[] }>("/saas/v1/leads");
      setLeads(res.leads ?? []);
    } catch {
      showToast("Failed to load leads", "error");
    } finally {
      setIsLoading(false);
    }
  }, [showToast]);

  useEffect(() => { fetchLeads(); }, [fetchLeads]);

  // Attribution stats — marketing cares about channel-originated leads
  const marketingLeads = leads.filter((l) => MARKETING_SOURCES.includes(l.source ?? ""));
  const conversionRate = marketingLeads.length
    ? Math.round((marketingLeads.filter((l) => l.status === "converted").length / marketingLeads.length) * 100)
    : 0;
  const totalValue = marketingLeads
    .filter((l) => l.status === "qualified" || l.status === "converted")
    .reduce((sum, l) => sum + (l.estimated_value ?? 0), 0);

  const sourceCounts = leads.reduce<Record<string, number>>((acc, l) => {
    const src = l.source ?? "other";
    acc[src] = (acc[src] ?? 0) + 1;
    return acc;
  }, {});

  const filtered = leads.filter((l) => {
    const matchSource = sourceFilter === "all" || l.source === sourceFilter;
    const matchStatus = statusFilter === "all" || l.status === statusFilter;
    const q = search.toLowerCase();
    const matchSearch = !q || l.name.toLowerCase().includes(q) || (l.company ?? "").toLowerCase().includes(q);
    return matchSource && matchStatus && matchSearch;
  });

  return (
    <>
      <PageMeta title="Lead Attribution | Optivax Marketing" description="Marketing channel lead attribution and conversion tracking" />
      <PageBreadcrumb pageTitle="Lead Attribution" />

      {/* ── Attribution KPIs ──────────────────────────────────────── */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        <AttributionCard label="Marketing Leads" value={marketingLeads.length} sub="from marketing channels" accent="border-pink-500" />
        <AttributionCard label="Qualified" value={marketingLeads.filter((l) => l.status === "qualified").length} sub="pipeline-ready" accent="border-purple-500" />
        <AttributionCard label="Converted" value={marketingLeads.filter((l) => l.status === "converted").length} sub={`${conversionRate}% conversion rate`} accent="border-green-500" />
        <AttributionCard label="Pipeline Value" value={`Rs. ${totalValue.toLocaleString()}`} sub="qualified + converted" accent="border-blue-500" />
      </div>

      {/* ── Source breakdown ──────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        {Object.entries(sourceCounts).sort(([,a],[,b]) => b - a).map(([src, count]) => (
          <button
            key={src}
            onClick={() => setSourceFilter(sourceFilter === src ? "all" : src)}
            className={`rounded-xl border p-3 text-center text-sm transition-all ${
              sourceFilter === src
                ? "border-brand-500 bg-brand-50 dark:bg-brand-900/20"
                : "border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 hover:border-gray-300"
            }`}
          >
            <span className="block text-lg font-bold text-gray-900 dark:text-white">{count}</span>
            <span className="text-xs text-gray-500 dark:text-gray-400">{SOURCE_LABEL[src] ?? src}</span>
          </button>
        ))}
      </div>

      {/* ── Filters ───────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <input
          type="text"
          placeholder="Search leads…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-52 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
        <select value={sourceFilter} onChange={(e) => setSourceFilter(e.target.value)}
          className="rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white">
          <option value="all">All sources</option>
          {Object.keys(sourceCounts).map((s) => <option key={s} value={s}>{SOURCE_LABEL[s] ?? s}</option>)}
        </select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white">
          <option value="all">All statuses</option>
          {(["new","contacted","qualified","lost","converted"] as LeadStatus[]).map((s) => (
            <option key={s} value={s} className="capitalize">{s}</option>
          ))}
        </select>
        <span className="ml-auto text-xs text-gray-400">
          Read-only view · Lead management is handled by Sales
        </span>
      </div>

      {/* ── Table ─────────────────────────────────────────────────── */}
      <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm">
        {isLoading ? (
          <div className="flex items-center justify-center h-48">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
              <thead className="bg-gray-50 dark:bg-gray-800/50">
                <tr>
                  {["Name", "Company", "Source", "Estimated Value", "Status", "Date"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-sm text-gray-500 dark:text-gray-400">
                      No leads match the current filters.
                    </td>
                  </tr>
                ) : (
                  filtered.map((lead) => (
                    <tr key={lead.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40">
                      <td className="px-4 py-3 whitespace-nowrap">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{lead.name}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{lead.email}</p>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">{lead.company ?? "—"}</td>
                      <td className="px-4 py-3 whitespace-nowrap"><SourceBadge source={lead.source} /></td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-white font-medium">
                        {lead.estimated_value ? `Rs. ${Number(lead.estimated_value).toLocaleString()}` : "—"}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap"><StatusBadge status={lead.status ?? "new"} /></td>
                      <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-500 dark:text-gray-400">
                        {lead.created_at ? new Date(lead.created_at).toLocaleDateString("en-GB") : "—"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
