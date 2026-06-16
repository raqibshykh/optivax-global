import React, { useState, useMemo } from "react";
import PageMeta from "../../components/common/PageMeta";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import { useAuth } from "../../context/AuthContext";
import { useLocation } from "react-router-dom";

// ── Mock report data ───────────────────────────────────────────────────────
const MOCK_REPORTS = [
  { id: "r1", name: "Q2 Revenue Summary",       category: "Finance",    date: "2026-06-01", status: "ready",   downloads: 42 },
  { id: "r2", name: "Lead Conversion Rate",     category: "Sales",      date: "2026-06-05", status: "ready",   downloads: 18 },
  { id: "r3", name: "Project Delivery KPIs",    category: "Production", date: "2026-06-08", status: "ready",   downloads: 31 },
  { id: "r4", name: "Campaign Performance",     category: "Marketing",  date: "2026-06-10", status: "ready",   downloads: 27 },
  { id: "r5", name: "Employee Headcount",       category: "HR",         date: "2026-06-12", status: "pending", downloads: 0  },
  { id: "r6", name: "Accounts Receivable",      category: "Finance",    date: "2026-06-13", status: "ready",   downloads: 9  },
  { id: "r7", name: "Client Satisfaction",      category: "Sales",      date: "2026-06-14", status: "pending", downloads: 0  },
  { id: "r8", name: "Server Uptime Report",     category: "System",     date: "2026-06-14", status: "ready",   downloads: 5  },
];

const CATEGORIES = ["All", "Finance", "Sales", "Production", "Marketing", "HR", "System"];

const statusColor = (s: string) =>
  s === "ready" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700";

export default function Reports() {
  const { canExport } = useAuth();
  const [filter, setFilter] = useState("All");
  const [search, setSearch] = useState("");
  const location = useLocation();

  // Determine domain from the current route (e.g. /marketing/reports -> marketing)
  const domain = useMemo(() => {
    const seg = location.pathname.split("/").filter(Boolean)[0];
    return seg || null;
  }, [location.pathname]);

  const domainCategoryMap: Record<string, string | null> = {
    marketing: "Marketing",
    sales: "Sales",
    production: "Production",
    hr: "HR",
    admin: null,
    "super-admin": null,
    management: null,
    client: null,
  };

  const restrictedCategory = domain ? domainCategoryMap[domain] ?? null : null;

  const visible = MOCK_REPORTS.filter((r) => {
    const matchesDomain = restrictedCategory ? r.category === restrictedCategory : true;
    const matchesFilter = filter === "All" || r.category === filter;
    const matchesSearch = r.name.toLowerCase().includes(search.toLowerCase());
    return matchesDomain && matchesFilter && matchesSearch;
  });

  const totalReady = visible.filter((r) => r.status === "ready").length;
  const totalPending = visible.filter((r) => r.status === "pending").length;
  const totalDownloads = visible.reduce((sum, r) => sum + r.downloads, 0);

  return (
    <>
      <PageMeta title="Reports | Optivax CRM" description="View and export business reports" />
      <PageBreadcrumb pageTitle="Reports" />

      {/* ── KPI Cards ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Total Reports",    value: MOCK_REPORTS.length, color: "text-brand-500" },
          { label: "Ready to Export",  value: totalReady,          color: "text-emerald-500" },
          { label: "Pending",          value: totalPending,        color: "text-amber-500" },
          { label: "Total Downloads",  value: totalDownloads,      color: "text-purple-500" },
        ].map(({ label, value, color }) => (
          <div key={label} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400">{label}</p>
            <p className={`mt-2 text-3xl font-bold ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* ── Filters & Search ──────────────────────────────────────────── */}
      <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900 p-6 shadow-sm">
        <div className="mb-4 flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            placeholder="Search reports…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full sm:w-64 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setFilter(cat)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  filter === cat
                    ? "bg-brand-500 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* ── Report Table ───────────────────────────────────────────── */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
            <thead>
              <tr>
                {["Report Name", "Category", "Date", "Status", "Downloads", "Action"].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase dark:text-gray-400">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {visible.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-sm text-gray-400">
                    No reports match your filter.
                  </td>
                </tr>
              ) : (
                visible.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">{r.name}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{r.category}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{r.date}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusColor(r.status)}`}>
                        {r.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">{r.downloads}</td>
                    <td className="px-4 py-3">
                      {r.status === "ready" && canExport("reports") ? (
                        <button className="text-xs text-brand-600 hover:text-brand-800 dark:text-brand-400 font-medium">
                          ↓ Export
                        </button>
                      ) : r.status === "ready" ? (
                        <button className="text-xs text-gray-400 cursor-not-allowed">↓ Export</button>
                      ) : (
                        <span className="text-xs text-gray-400 italic">Processing…</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
