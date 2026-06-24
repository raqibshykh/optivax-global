import { useState, useEffect, useRef } from "react";
import PageMeta from "../../components/common/PageMeta";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { api } from "../../lib/client";
import {
  getCompanySettings,
  saveCompanySettings,
  type CompanySettings,
} from "../../services/companySettingsService";

const LOGO_MAX_BYTES = 512 * 1024; // 500 KB

const inputCls =
  "w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent dark:border-gray-600 dark:bg-gray-800 dark:text-white text-sm";

export default function Settings() {
  const { user, checkPermission } = useAuth();
  const { showToast } = useToast();

  const isSuperAdmin   = checkPermission("system", "EDIT");
  const canEditBranding = ["super_admin", "hr_admin"].includes(user?.role ?? "");

  // ── Company branding state ─────────────────────────────────────────────────
  const [company, setCompany] = useState<CompanySettings>(getCompanySettings());
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setCompany(getCompanySettings());
  }, []);

  const setField = <K extends keyof CompanySettings>(key: K, val: CompanySettings[K]) =>
    setCompany(prev => ({ ...prev, [key]: val }));

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > LOGO_MAX_BYTES) {
      showToast("Logo file is too large. Maximum size is 500 KB.", "error");
      e.target.value = "";
      return;
    }
    const reader = new FileReader();
    reader.onload = ev => {
      const dataUrl = ev.target?.result as string;
      setField("logoDataUrl", dataUrl);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleSaveCompany = () => {
    try {
      saveCompanySettings(company);
      showToast("Company profile saved successfully.", "success");
    } catch {
      showToast("Failed to save company profile.", "error");
    }
  };

  // ── Notification state ─────────────────────────────────────────────────────
  const [emailNotifs, setEmailNotifs]       = useState(true);
  const [paymentReminders, setPaymentReminders] = useState(true);

  // ── Stripe state ───────────────────────────────────────────────────────────
  const [stripeEnabled, setStripeEnabled]   = useState(false);
  const [publishableKey, setPublishableKey] = useState("");
  const [secretKey, setSecretKey]           = useState("");
  const [webhookSecret, setWebhookSecret]   = useState("");
  const [secretVisible, setSecretVisible]   = useState(false);

  const saveStripeSettings = async () => {
    try {
      await api.post("/saas/v1/settings/stripe", {
        enabled: stripeEnabled,
        publishableKey,
        secretKey,
        webhookSecret,
      });
      showToast("Stripe settings saved.", "success");
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : "Failed to save Stripe settings.", "error");
    }
  };

  // ── Derived monogram for preview ──────────────────────────────────────────
  const monogram = company.name
    .split(" ")
    .map(w => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <>
      <PageMeta title="Settings | Optivax Global" description="Manage account and system settings." />
      <div className="flex flex-col gap-4 mb-6 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Settings</h1>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Configure your account and system preferences.
          </p>
        </div>
      </div>

      <div className="space-y-6">

        {/* ── Company Profile & Branding ────────────────────────────────── */}
        {canEditBranding && (
          <div className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Company Profile &amp; Branding
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                This information appears on every generated salary slip — PDF and print versions.
              </p>
            </div>

            <div className="p-6 space-y-6">
              {/* Logo upload */}
              <div>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  Company Logo
                </p>
                <div className="flex flex-col sm:flex-row gap-5 items-start">
                  {/* Preview / placeholder */}
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="cursor-pointer flex-shrink-0 w-28 h-28 rounded-2xl border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-brand-400 dark:hover:border-brand-500 transition-colors flex items-center justify-center overflow-hidden bg-gray-50 dark:bg-gray-800 group relative"
                  >
                    {company.logoDataUrl ? (
                      <img
                        src={company.logoDataUrl}
                        alt="Company logo"
                        className="w-full h-full object-contain p-2"
                      />
                    ) : (
                      <div className="flex flex-col items-center gap-1 text-gray-400 group-hover:text-brand-500 transition-colors">
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span className="text-[10px] font-medium text-center leading-tight px-1">
                          Click to upload
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex-1 space-y-2.5">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Upload your official company logo. It will appear in the header of every salary slip.
                    </p>
                    <ul className="text-xs text-gray-400 dark:text-gray-500 space-y-0.5 list-disc list-inside">
                      <li>Accepted formats: PNG, JPG, SVG, WebP</li>
                      <li>Maximum size: 500 KB</li>
                      <li>Recommended: square or landscape, at least 200×200 px</li>
                      <li>If no logo is set, a text monogram is used as fallback</li>
                    </ul>
                    <div className="flex gap-2 flex-wrap">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="px-3 py-1.5 text-xs font-semibold text-white bg-brand-500 hover:bg-brand-600 rounded-lg transition-colors"
                      >
                        {company.logoDataUrl ? "Change Logo" : "Upload Logo"}
                      </button>
                      {company.logoDataUrl && (
                        <button
                          type="button"
                          onClick={() => setField("logoDataUrl", "")}
                          className="px-3 py-1.5 text-xs font-semibold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/40 rounded-lg transition-colors"
                        >
                          Remove Logo
                        </button>
                      )}
                    </div>
                    {!company.logoDataUrl && (
                      <div className="flex items-center gap-2 p-2.5 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                        <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                          {monogram}
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Default monogram <strong className="text-gray-700 dark:text-gray-300">"{monogram}"</strong> will be used until a logo is uploaded.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/svg+xml,image/webp"
                  className="hidden"
                  onChange={handleLogoUpload}
                />
              </div>

              {/* Company info fields */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Company Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={company.name}
                    onChange={e => setField("name", e.target.value)}
                    className={inputCls}
                    placeholder="e.g. Optivax Global"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Tagline / Industry
                  </label>
                  <input
                    type="text"
                    value={company.tagline}
                    onChange={e => setField("tagline", e.target.value)}
                    className={inputCls}
                    placeholder="e.g. Digital Marketing Agency"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Street Address
                  </label>
                  <input
                    type="text"
                    value={company.address}
                    onChange={e => setField("address", e.target.value)}
                    className={inputCls}
                    placeholder="e.g. 12-B, Block 7, Clifton"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    City
                  </label>
                  <input
                    type="text"
                    value={company.city}
                    onChange={e => setField("city", e.target.value)}
                    className={inputCls}
                    placeholder="e.g. Karachi"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Country
                  </label>
                  <input
                    type="text"
                    value={company.country}
                    onChange={e => setField("country", e.target.value)}
                    className={inputCls}
                    placeholder="e.g. Pakistan"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Phone
                  </label>
                  <input
                    type="tel"
                    value={company.phone}
                    onChange={e => setField("phone", e.target.value)}
                    className={inputCls}
                    placeholder="e.g. +92 21 1234567"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={company.email}
                    onChange={e => setField("email", e.target.value)}
                    className={inputCls}
                    placeholder="e.g. info@company.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Website
                  </label>
                  <input
                    type="text"
                    value={company.website}
                    onChange={e => setField("website", e.target.value)}
                    className={inputCls}
                    placeholder="e.g. www.optivaxglobal.com"
                  />
                </div>
              </div>

              {/* Salary slip preview strip */}
              <div className="rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700">
                <div className="px-4 py-2 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                  <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                    Salary Slip Header Preview
                  </p>
                </div>
                <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-[#1e3a5f] to-[#2563eb]">
                  {/* Logo preview */}
                  {company.logoDataUrl ? (
                    <img
                      src={company.logoDataUrl}
                      alt="logo"
                      className="w-12 h-12 object-contain rounded-lg bg-white p-1 flex-shrink-0"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-white/20 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                      {monogram}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-bold text-sm truncate">{company.name.toUpperCase()}</p>
                    {company.tagline && (
                      <p className="text-white/70 text-xs italic truncate">{company.tagline}</p>
                    )}
                    <p className="text-white/60 text-xs truncate">
                      {[company.address, company.city, company.country].filter(Boolean).join(", ")}
                      {company.phone && ` · ${company.phone}`}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="inline-block border border-white/40 bg-white/10 rounded px-2 py-0.5 text-white text-xs font-bold tracking-widest">
                      SALARY SLIP
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleSaveCompany}
                  className="px-5 py-2 text-sm font-semibold text-white bg-brand-500 hover:bg-brand-600 rounded-lg transition-colors"
                >
                  Save Company Profile
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Notification Preferences ──────────────────────────────────── */}
        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Notification Preferences</h3>
          </div>
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white">Email Notifications</h4>
                <p className="text-sm text-gray-500 dark:text-gray-400">Receive email updates about projects</p>
              </div>
              <input
                type="checkbox"
                checked={emailNotifs}
                onChange={e => setEmailNotifs(e.target.checked)}
                className="w-4 h-4 text-brand-600"
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white">Payment Reminders</h4>
                <p className="text-sm text-gray-500 dark:text-gray-400">Get notified about upcoming payments</p>
              </div>
              <input
                type="checkbox"
                checked={paymentReminders}
                onChange={e => setPaymentReminders(e.target.checked)}
                className="w-4 h-4 text-brand-600"
              />
            </div>
            <button
              type="button"
              onClick={() => {
                localStorage.setItem("optivax_notif_settings", JSON.stringify({ emailNotifs, paymentReminders }));
                showToast("Notification preferences saved.", "success");
              }}
              className="px-4 py-2 text-sm font-medium text-white bg-brand-500 border border-transparent rounded-lg hover:bg-brand-600"
            >
              Save Preferences
            </button>
          </div>
        </div>

        {/* ── Stripe Payment Configuration — super_admin only ───────────── */}
        {isSuperAdmin && (
          <div className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Stripe Payment Configuration</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Restricted to Super Admin</p>
            </div>
            <div className="p-6 space-y-4">
              {import.meta.env.DEV && (
                <div className="flex items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-700 px-4 py-3">
                  <span className="text-amber-600 dark:text-amber-400 text-lg leading-none">⚠</span>
                  <div>
                    <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">Development mode — mock storage only</p>
                    <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
                      In production, the Stripe <strong>secret key</strong> must <strong>never</strong> be sent to or stored by the browser.
                      Remove this field and store it exclusively in your server-side environment variables (<code>STRIPE_SECRET_KEY</code>).
                    </p>
                  </div>
                </div>
              )}
              <div className="flex items-center space-x-3">
                <input type="checkbox" id="stripe-enabled" checked={stripeEnabled} onChange={e => setStripeEnabled(e.target.checked)} className="w-4 h-4 text-brand-600 border-gray-300 rounded" />
                <label htmlFor="stripe-enabled" className="text-sm font-medium text-gray-700 dark:text-gray-300">Enable Stripe Payment</label>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Stripe Publishable Key</label>
                <input type="text" value={publishableKey} onChange={e => setPublishableKey(e.target.value)} className={inputCls} placeholder="pk_live_..." />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Stripe Secret Key
                  <span className="ml-2 text-[10px] font-semibold uppercase tracking-wide text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/40 px-1.5 py-0.5 rounded">Dev/mock only</span>
                </label>
                <div className="relative">
                  <input type={secretVisible ? "text" : "password"} value={secretKey} onChange={e => setSecretKey(e.target.value)} className={`${inputCls} pr-16`} placeholder="sk_live_..." />
                  <button type="button" className="absolute inset-y-0 right-0 px-3 text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300" onClick={() => setSecretVisible(v => !v)}>
                    {secretVisible ? "Hide" : "Show"}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Stripe Webhook Secret</label>
                <input type="text" value={webhookSecret} onChange={e => setWebhookSecret(e.target.value)} className={inputCls} placeholder="whsec_..." />
              </div>
              <div className="flex justify-end">
                <button type="button" onClick={saveStripeSettings} className="px-4 py-2 text-sm font-medium text-white bg-brand-500 border border-transparent rounded-lg hover:bg-brand-600">
                  Save Stripe Settings
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
