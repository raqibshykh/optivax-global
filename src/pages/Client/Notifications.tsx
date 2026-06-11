import PageMeta from "../../components/common/PageMeta";
import { MailIcon } from "../../icons";

export default function Notifications() {
  return (
    <>
      <PageMeta
        title="Notifications | Optivax Global"
        description="View your notifications and updates."
      />
      <div className="flex flex-col gap-4 mb-6 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
            Notifications
          </h1>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Stay updated with project progress and important messages.
          </p>
        </div>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Recent Notifications
          </h3>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            <div className="flex items-start space-x-4 p-4 border border-gray-200 rounded-lg dark:border-gray-700 bg-blue-50 dark:bg-blue-900/20">
              <MailIcon className="w-5 h-5 text-blue-600 mt-1" />
              <div className="flex-1">
                <h4 className="font-medium text-gray-900 dark:text-white">
                  New Files Available
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Design mockups for the website redesign have been uploaded. Please review and provide feedback.
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  2 hours ago
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-4 p-4 border border-gray-200 rounded-lg dark:border-gray-700">
              <MailIcon className="w-5 h-5 text-green-600 mt-1" />
              <div className="flex-1">
                <h4 className="font-medium text-gray-900 dark:text-white">
                  Project Milestone Reached
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Development phase is now 75% complete. Next: Testing and quality assurance.
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  1 day ago
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-4 p-4 border border-gray-200 rounded-lg dark:border-gray-700">
              <MailIcon className="w-5 h-5 text-yellow-600 mt-1" />
              <div className="flex-1">
                <h4 className="font-medium text-gray-900 dark:text-white">
                  Invoice Sent
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Invoice INV-2024-002 for $3,500 has been sent. Payment due by December 1st.
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  3 days ago
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-4 p-4 border border-gray-200 rounded-lg dark:border-gray-700">
              <MailIcon className="w-5 h-5 text-purple-600 mt-1" />
              <div className="flex-1">
                <h4 className="font-medium text-gray-900 dark:text-white">
                  Meeting Scheduled
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Weekly progress meeting scheduled for tomorrow at 2:00 PM EST.
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  5 days ago
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
