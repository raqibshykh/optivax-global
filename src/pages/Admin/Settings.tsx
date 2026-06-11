import PageMeta from "../../components/common/PageMeta";
import { useState } from "react";

export default function Settings() {
  // Stripe settings state
  const [stripeEnabled, setStripeEnabled] = useState<boolean>(false);
  const [publishableKey, setPublishableKey] = useState<string>("");
  const [secretKey, setSecretKey] = useState<string>("");
  const [webhookSecret, setWebhookSecret] = useState<string>("");

  const toggleSecretVisibility = () => {
    const input = document.querySelector<HTMLInputElement>('input[name="stripe-secret"]');
    if (input) {
      input.type = input.type === "password" ? "text" : "password";
    }
  };

  const saveStripeSettings = async () => {
    try {
      await fetch("/wp-json/saas/v1/settings/stripe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-WP-Nonce": (window as any).SaaSCoreConfig?.nonce,
        },
        body: JSON.stringify({
          enabled: stripeEnabled,
          publishableKey,
          secretKey,
          webhookSecret,
        }),
      });
      alert("Stripe settings saved.");
    } catch (e) {
      console.error(e);
      alert("Failed to save Stripe settings.");
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
                <input type="text" defaultValue="Optivax Global" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:border-gray-600 dark:bg-gray-700 dark:text-white" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
                <input type="email" defaultValue="admin@optivaxglobal.com" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:border-gray-600 dark:bg-gray-700 dark:text-white" />
              </div>
            </div>
            <button className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700">Save Changes</button>
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
              <input type="checkbox" defaultChecked className="w-4 h-4 text-blue-600" />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white">Payment Reminders</h4>
                <p className="text-sm text-gray-500 dark:text-gray-400">Get notified about upcoming payments</p>
              </div>
              <input type="checkbox" defaultChecked className="w-4 h-4 text-blue-600" />
            </div>
          </div>
        </div>

        {/* Stripe Payment Configuration */}
        <div className="rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Stripe Payment Configuration</h3>
          </div>
          <div className="p-6 space-y-4">
            <div className="flex items-center space-x-3">
              <input type="checkbox" id="stripe-enabled" checked={stripeEnabled} onChange={(e) => setStripeEnabled(e.target.checked)} className="w-4 h-4 text-blue-600 border-gray-300 rounded" />
              <label htmlFor="stripe-enabled" className="text-sm font-medium text-gray-700 dark:text-gray-300">Enable Stripe Payment</label>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Stripe Publishable Key</label>
              <input type="text" value={publishableKey} onChange={(e) => setPublishableKey(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:border-gray-600 dark:bg-gray-700 dark:text-white" placeholder="pk_live_..." />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Stripe Secret Key</label>
              <div className="relative">
                <input name="stripe-secret" type="password" value={secretKey} onChange={(e) => setSecretKey(e.target.value)} className="w-full pr-10 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:border-gray-600 dark:bg-gray-700 dark:text-white" placeholder="sk_live_..." />
                <button type="button" className="absolute inset-y-0 right-0 px-3 flex items-center text-gray-500" onClick={toggleSecretVisibility}>👁</button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Stripe Webhook Secret</label>
              <input type="text" value={webhookSecret} onChange={(e) => setWebhookSecret(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:border-gray-600 dark:bg-gray-700 dark:text-white" placeholder="whsec_..." />
            </div>
            <div className="flex justify-end">
              <button type="button" onClick={saveStripeSettings} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700">Save Stripe Settings</button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
