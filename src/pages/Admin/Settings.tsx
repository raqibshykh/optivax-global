import { useState } from "react";
import PageMeta from "../../components/common/PageMeta";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { api } from "../../lib/client";

export default function Settings() {
  const { user, checkPermission } = useAuth();
  const { showToast } = useToast();
  const isSuperAdmin = checkPermission("system", "EDIT");

  const [profileName, setProfileName] = useState("Optivax Global");
  const [profileEmail, setProfileEmail] = useState(user?.email ?? "admin@optivaxglobal.com");
  const [emailNotifs, setEmailNotifs] = useState(true);
  const [paymentReminders, setPaymentReminders] = useState(true);

  const [stripeEnabled, setStripeEnabled] = useState<boolean>(false);
  const [publishableKey, setPublishableKey] = useState<string>("");
  const [secretKey, setSecretKey] = useState<string>("");
  const [webhookSecret, setWebhookSecret] = useState<string>("");
  const [secretVisible, setSecretVisible] = useState(false);

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
        {/* Profile Settings */}
        <div className="rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Profile Settings</h3>
          </div>
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Company Name</label>
                <input
                  type="text"
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
                <input
                  type="email"
                  value={profileEmail}
                  onChange={(e) => setProfileEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                />
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                try {
                  localStorage.setItem("optivax_profile_settings", JSON.stringify({ name: profileName, email: profileEmail }));
                  showToast("Profile settings saved.", "success");
                } catch {
                  showToast("Failed to save profile settings.", "error");
                }
              }}
              className="px-4 py-2 text-sm font-medium text-white bg-brand-500 border border-transparent rounded-lg hover:bg-brand-600"
            >
              Save Changes
            </button>
          </div>
        </div>

        {/* Notification Preferences */}
        <div className="rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
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
                onChange={(e) => setEmailNotifs(e.target.checked)}
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
                onChange={(e) => setPaymentReminders(e.target.checked)}
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

        {/* Stripe Payment Configuration — super_admin only */}
        {isSuperAdmin && (
          <div className="rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Stripe Payment Configuration</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Restricted to Super Admin</p>
            </div>
            <div className="p-6 space-y-4">
              {/* SECURITY NOTICE — visible in dev/mock mode only */}
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
                <input type="checkbox" id="stripe-enabled" checked={stripeEnabled} onChange={(e) => setStripeEnabled(e.target.checked)} className="w-4 h-4 text-brand-600 border-gray-300 rounded" />
                <label htmlFor="stripe-enabled" className="text-sm font-medium text-gray-700 dark:text-gray-300">Enable Stripe Payment</label>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Stripe Publishable Key</label>
                <input type="text" value={publishableKey} onChange={(e) => setPublishableKey(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent dark:border-gray-600 dark:bg-gray-800 dark:text-white" placeholder="pk_live_..." />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Stripe Secret Key
                  <span className="ml-2 text-[10px] font-semibold uppercase tracking-wide text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/40 px-1.5 py-0.5 rounded">
                    Dev/mock only
                  </span>
                </label>
                <div className="relative">
                  <input type={secretVisible ? "text" : "password"} value={secretKey} onChange={(e) => setSecretKey(e.target.value)} className="w-full pr-10 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent dark:border-gray-600 dark:bg-gray-800 dark:text-white" placeholder="sk_live_..." />
                  <button type="button" className="absolute inset-y-0 right-0 px-3 flex items-center text-gray-500 hover:text-gray-700" onClick={() => setSecretVisible((v) => !v)}>
                    {secretVisible ? "Hide" : "Show"}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Stripe Webhook Secret</label>
                <input type="text" value={webhookSecret} onChange={(e) => setWebhookSecret(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent dark:border-gray-600 dark:bg-gray-800 dark:text-white" placeholder="whsec_..." />
              </div>
              <div className="flex justify-end">
                <button type="button" onClick={saveStripeSettings} className="px-4 py-2 text-sm font-medium text-white bg-brand-500 border border-transparent rounded-lg hover:bg-brand-600">Save Stripe Settings</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
