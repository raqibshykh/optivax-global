import PageMeta from "../../components/common/PageMeta";
import { MailIcon } from "../../icons";
import { useNotifications } from "../../hooks/useNotifications";
import { useClients } from "../../hooks/useClients";
import { useState, useEffect } from "react";
import NotificationModal from "./NotificationModal";
import { useToast } from "../../context/ToastContext";

export default function Notifications() {
  const { notifications, isLoading, addNotification, deleteNotification, refreshNotifications } = useNotifications();
  const { clients } = useClients();
  const { showToast } = useToast();
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Listen for in-app notification events (dispatched by mock flows) and cross-tab broadcasts
  useEffect(() => {
    const handler = (ev: Event) => {
      try {
        // ev is CustomEvent with detail payload
        refreshNotifications();
        const detail = (ev as CustomEvent).detail;
        const msg = detail && detail.payload && detail.payload.message ? detail.payload.message : "New notification";
        showToast(msg, "info", 4000);
      } catch {}
    };

    window.addEventListener("saas:notification", handler as EventListener);

    // BroadcastChannel for cross-tab sync
    let bc: BroadcastChannel | null = null;
    if (typeof window !== "undefined" && "BroadcastChannel" in window) {
      try {
        bc = new BroadcastChannel("saas_notifications");
        bc.onmessage = () => {
          try { refreshNotifications(); } catch {}
        };
      } catch {
        bc = null;
      }
    }

    // Fallback storage event for older browsers
    const storageHandler = (e: StorageEvent) => {
      try {
        if (e.key === "__saas_notifications_update") {
          refreshNotifications();
        }
      } catch {}
    };
    window.addEventListener("storage", storageHandler);

    return () => {
      window.removeEventListener("saas:notification", handler as EventListener);
      window.removeEventListener("storage", storageHandler);
      try { if (bc) bc.close(); } catch {}
    };
  }, [refreshNotifications, showToast]);

  const handleSend = async (notificationData: any) => {
    try {
      await addNotification(notificationData);
      showToast("Notification sent successfully", "success");
    } catch (err: any) {
      showToast(err.message, "error");
      throw err;
    }
  };

  const getClientName = (clientId: string) => {
    const client = clients.find(c => c.id === clientId);
    return client ? client.company : "Unknown Recipient";
  };

  const formatTimeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);
    if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
    if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    return 'Just now';
  };

  return (
    <>
      <PageMeta
        title="Notifications | Optivax Global"
        description="Manage notifications and communications."
      />
      <div className="flex flex-col gap-4 mb-6 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
            Notifications
          </h1>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Send notifications and manage communications.
          </p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700"
        >
          Send Notification
        </button>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Recent Notifications
          </h3>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            {isLoading ? (
              <div className="flex justify-center p-8">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-solid border-brand-500 border-t-transparent"></div>
              </div>
            ) : notifications.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">No notifications found.</p>
            ) : (
              notifications.map((notification) => (
                <div key={notification.id} className={`flex items-start space-x-4 p-4 border border-gray-200 rounded-lg dark:border-gray-700 ${!notification.read ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''}`}>
                  <MailIcon className={`w-5 h-5 mt-1 shrink-0 ${
                    notification.type === 'invoice' ? 'text-green-600' :
                    notification.type === 'project' ? 'text-blue-600' :
                    'text-yellow-600'
                  }`} />
                  <div className="flex-1">
                    <div className="flex justify-between items-start">
                      <h4 className="font-medium text-gray-900 dark:text-white">
                        {notification.title}
                      </h4>
                      <button 
                        onClick={() => deleteNotification(notification.id)}
                        className="text-gray-400 hover:text-red-500"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      {notification.message}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                      Sent to {getClientName(notification.userId)} • {formatTimeAgo(notification.createdAt)}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <NotificationModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSend={handleSend}
      />
    </>
  );
}
