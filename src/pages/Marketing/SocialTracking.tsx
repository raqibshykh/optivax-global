import { useState } from "react";
import PageMeta from "../../components/common/PageMeta";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { useSocialTracking } from "../../hooks/useSocialTracking";
import type { SocialPlatform } from "../../types";

const PLATFORM_COLORS: Record<string, string> = {
  facebook:   "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  instagram:  "bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-400",
  linkedin:   "bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-400",
  tiktok:     "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
  youtube:    "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  twitter:    "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-400",
  google_ads: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  other:      "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
};

const PLATFORMS: SocialPlatform[] = [
  "facebook", "instagram", "linkedin", "tiktok", "youtube", "twitter", "google_ads", "other",
];

const PLATFORM_LABEL: Record<SocialPlatform, string> = {
  facebook: "Facebook", instagram: "Instagram", linkedin: "LinkedIn",
  tiktok: "TikTok", youtube: "YouTube", twitter: "Twitter / X",
  google_ads: "Google Ads", other: "Other",
};

const EMPTY_FORM = { platform: "facebook" as SocialPlatform, label: "", url: "" };

export default function SocialTracking() {
  const { user, checkPermission } = useAuth();
  const { showToast } = useToast();
  const { links, analytics, accountMetrics, isLoading, createLink, updateLink, deleteLink, trackClick, syncMetrics } = useSocialTracking();
  const [syncingId, setSyncingId] = useState<string | null>(null);

  const canManage = checkPermission("marketing", "CREATE");

  const [activeTab, setActiveTab] = useState<"links" | "analytics">("links");
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.label.trim() || !form.url.trim()) return;
    setSaving(true);
    try {
      if (editingId) {
        await updateLink(editingId, { label: form.label, url: form.url, platform: form.platform });
        showToast("Link updated.", "success");
      } else {
        await createLink({ ...form, createdBy: user?.id ?? "" });
        showToast("Link created.", "success");
      }
      setForm({ ...EMPTY_FORM });
      setShowForm(false);
      setEditingId(null);
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "Failed to save link.", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (link: typeof links[0]) => {
    setForm({ platform: link.platform, label: link.label, url: link.url });
    setEditingId(link.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteLink(id);
      showToast("Link deleted.", "success");
    } catch {
      showToast("Failed to delete link.", "error");
    }
  };

  const handleSimulateClick = async (link: typeof links[0]) => {
    await trackClick(link.id, link.trackingId, link.platform);
    showToast(`Click recorded for ${PLATFORM_LABEL[link.platform]}.`, "success");
  };

  const topPlatforms = Object.entries(analytics.byPlatform)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);

  const handleSync = async (linkId: string) => {
    setSyncingId(linkId);
    try {
      await syncMetrics(linkId);
      showToast("Metrics synced.", "success");
    } catch {
      showToast("Sync failed.", "error");
    } finally {
      setSyncingId(null);
    }
  };

  return (
    <>
      <PageMeta title="Social Tracking | Optivax Global" description="Track social media links and clicks." />
      <PageBreadcrumb pageTitle="Social Media Tracking" />

      {/* Tabs */}
      <div className="mb-6 border-b border-gray-200 dark:border-gray-800">
        <nav className="-mb-px flex space-x-8">
          {(["links", "analytics"] as const).map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`pb-4 px-1 border-b-2 font-medium text-sm capitalize transition-colors ${
                activeTab === tab
                  ? "border-brand-500 text-brand-600 dark:text-brand-400"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400"
              }`}>
              {tab === "links" ? "Tracked Links" : "Analytics"}
            </button>
          ))}
        </nav>
      </div>

      {/* ── Links Tab ────────────────────────────────────────────── */}
      {activeTab === "links" && (
        <div className="space-y-6">
          {/* KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Links</p>
              <h4 className="mt-2 text-2xl font-bold text-gray-800 dark:text-white">{links.length}</h4>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Active Links</p>
              <h4 className="mt-2 text-2xl font-bold text-green-600">{links.filter((l) => l.status === "active").length}</h4>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Clicks</p>
              <h4 className="mt-2 text-2xl font-bold text-brand-600">{analytics.totalClicks}</h4>
            </div>
          </div>

          {/* Link list */}
          <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-800 dark:text-white">Social Links</h3>
              {canManage && (
                <button onClick={() => { setShowForm(true); setEditingId(null); setForm({ ...EMPTY_FORM }); }}
                  className="px-3 py-2 text-sm font-medium text-white bg-brand-500 hover:bg-brand-600 rounded-lg transition-colors">
                  + Add Link
                </button>
              )}
            </div>

            {/* Create / Edit Form */}
            {showForm && canManage && (
              <form onSubmit={handleSubmit} className="mb-6 p-4 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 space-y-4">
                <h4 className="font-semibold text-gray-800 dark:text-white text-sm">{editingId ? "Edit Link" : "New Tracked Link"}</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Platform</label>
                    <select value={form.platform} onChange={(e) => setForm({ ...form, platform: e.target.value as SocialPlatform })}
                      className="w-full rounded-lg border border-gray-300 p-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white">
                      {PLATFORMS.map((p) => <option key={p} value={p}>{PLATFORM_LABEL[p]}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Label</label>
                    <input required type="text" placeholder="e.g. Summer Sale Ad" value={form.label}
                      onChange={(e) => setForm({ ...form, label: e.target.value })}
                      className="w-full rounded-lg border border-gray-300 p-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Destination URL</label>
                    <input required type="url" placeholder="https://..." value={form.url}
                      onChange={(e) => setForm({ ...form, url: e.target.value })}
                      className="w-full rounded-lg border border-gray-300 p-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white" />
                  </div>
                </div>
                <div className="flex gap-2 justify-end">
                  <button type="button" onClick={() => { setShowForm(false); setEditingId(null); }}
                    className="px-3 py-2 text-sm text-gray-600 hover:text-gray-800 dark:text-gray-400">Cancel</button>
                  <button type="submit" disabled={saving}
                    className="px-4 py-2 text-sm font-medium text-white bg-brand-500 hover:bg-brand-600 rounded-lg disabled:opacity-60">
                    {saving ? "Saving…" : editingId ? "Update" : "Create Link"}
                  </button>
                </div>
              </form>
            )}

            {isLoading ? (
              <div className="flex justify-center py-10">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-solid border-brand-500 border-t-transparent" />
              </div>
            ) : links.length === 0 ? (
              <p className="text-center text-sm text-gray-500 dark:text-gray-400 py-8">
                No social links yet. {canManage ? "Add one to start tracking clicks." : "Your admin will set these up."}
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
                  <thead>
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Platform</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Label</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Destination</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Clicks</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                    {links.map((link) => (
                      <tr key={link.id}>
                        <td className="px-4 py-3 text-sm">
                          <span className={`px-2 py-1 text-xs rounded-full font-medium ${PLATFORM_COLORS[link.platform] ?? PLATFORM_COLORS.other}`}>
                            {PLATFORM_LABEL[link.platform]}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">{link.label}</td>
                        <td className="px-4 py-3 text-sm text-gray-500 max-w-[160px] truncate">
                          <a href={link.url} target="_blank" rel="noopener noreferrer" className="hover:underline text-brand-600 dark:text-brand-400">
                            {link.url}
                          </a>
                        </td>
                        <td className="px-4 py-3 text-sm font-semibold text-gray-800 dark:text-white">
                          {analytics.byLink[link.id] ?? 0}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <span className={`px-2 py-1 text-xs rounded-full ${link.status === "active" ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"}`}>
                            {link.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button onClick={() => handleSimulateClick(link)}
                              className="text-xs px-2 py-1 rounded bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300">
                              Simulate Click
                            </button>
                            {canManage && (
                              <>
                                <button onClick={() => handleEdit(link)}
                                  className="text-xs px-2 py-1 rounded bg-brand-50 hover:bg-brand-100 dark:bg-brand-900/30 text-brand-600">
                                  Edit
                                </button>
                                <button onClick={() => handleDelete(link.id)}
                                  className="text-xs px-2 py-1 rounded bg-red-50 hover:bg-red-100 dark:bg-red-900/30 text-red-600">
                                  Delete
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Analytics Tab ─────────────────────────────────────────── */}
      {activeTab === "analytics" && (
        <div className="space-y-6">
          {/* KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Clicks</p>
              <h4 className="mt-2 text-2xl font-bold text-gray-800 dark:text-white">{analytics.totalClicks}</h4>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Platforms</p>
              <h4 className="mt-2 text-2xl font-bold text-gray-800 dark:text-white">
                {Object.keys(analytics.byPlatform).length}
              </h4>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Active Links</p>
              <h4 className="mt-2 text-2xl font-bold text-green-600">{links.filter((l) => l.status === "active").length}</h4>
            </div>
          </div>

          {/* Account Metrics per Link */}
          {accountMetrics.length > 0 && (
            <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
              <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4">Account Metrics</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
                  <thead>
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Account</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Platform</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Followers</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Engagement</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reach</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Last Sync</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                    {accountMetrics.map((m) => {
                      const link = links.find((l) => l.id === m.linkId);
                      return (
                        <tr key={m.linkId}>
                          <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">
                            {link?.label ?? m.linkId}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${PLATFORM_COLORS[m.platform] ?? PLATFORM_COLORS.other}`}>
                              {PLATFORM_LABEL[m.platform as typeof PLATFORMS[number]] ?? m.platform}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm font-semibold text-gray-700 dark:text-gray-200">
                            {m.followers > 0 ? m.followers.toLocaleString() : "N/A"}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-200">{m.engagement}%</td>
                          <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-200">{m.reach.toLocaleString()}</td>
                          <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400">
                            {new Date(m.lastSync).toLocaleDateString()}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button onClick={() => handleSync(m.linkId)} disabled={syncingId === m.linkId}
                              className="text-xs px-2 py-1 rounded bg-brand-50 hover:bg-brand-100 dark:bg-brand-900/30 text-brand-600 disabled:opacity-50">
                              {syncingId === m.linkId ? "Syncing…" : "Sync"}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* By Platform */}
          <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
            <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4">Clicks by Platform</h3>
            {topPlatforms.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-6">
                No click data yet. Use "Simulate Click" on any link to generate data.
              </p>
            ) : (
              <div className="space-y-3">
                {topPlatforms.map(([platform, count]) => {
                  const pct = analytics.totalClicks > 0 ? Math.round((count / analytics.totalClicks) * 100) : 0;
                  return (
                    <div key={platform}>
                      <div className="flex items-center justify-between mb-1">
                        <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${PLATFORM_COLORS[platform] ?? PLATFORM_COLORS.other}`}>
                          {PLATFORM_LABEL[platform as SocialPlatform] ?? platform}
                        </span>
                        <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">{count} clicks ({pct}%)</span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div className="h-2 rounded-full bg-brand-500 transition-all" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* By Link */}
          {Object.keys(analytics.byLink).length > 0 && (
            <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
              <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4">Clicks by Link</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
                  <thead>
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Link</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Platform</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Clicks</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Share</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                    {Object.entries(analytics.byLink)
                      .sort((a, b) => b[1] - a[1])
                      .map(([linkId, count]) => {
                        const link = links.find((l) => l.id === linkId);
                        const pct = analytics.totalClicks > 0 ? Math.round((count / analytics.totalClicks) * 100) : 0;
                        return (
                          <tr key={linkId}>
                            <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">
                              {link?.label ?? linkId}
                            </td>
                            <td className="px-4 py-3 text-sm">
                              {link && (
                                <span className={`px-2 py-1 text-xs rounded-full ${PLATFORM_COLORS[link.platform] ?? PLATFORM_COLORS.other}`}>
                                  {PLATFORM_LABEL[link.platform]}
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-sm font-semibold text-gray-700 dark:text-gray-200">{count}</td>
                            <td className="px-4 py-3 text-sm text-gray-500">{pct}%</td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}
