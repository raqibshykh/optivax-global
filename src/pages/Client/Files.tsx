import PageMeta from "../../components/common/PageMeta";
import { FileIcon, DownloadIcon } from "../../icons";

export default function Files() {
  return (
    <>
      <PageMeta
        title="Files | Optivax Global"
        description="Download project files and documents."
      />
      <div className="flex flex-col gap-4 mb-6 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
            Files
          </h1>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Access and download your project files.
          </p>
        </div>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Available Files
          </h3>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="flex items-center p-4 border border-gray-200 rounded-lg dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800">
              <FileIcon className="w-8 h-8 text-blue-600 mr-3" />
              <div className="flex-1">
                <h4 className="font-medium text-gray-900 dark:text-white">Website Mockups</h4>
                <p className="text-sm text-gray-500 dark:text-gray-400">Design mockups for homepage and key pages</p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Uploaded 2 days ago • 5.2 MB</p>
              </div>
              <button className="p-2 text-gray-400 hover:text-blue-600">
                <DownloadIcon className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center p-4 border border-gray-200 rounded-lg dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800">
              <FileIcon className="w-8 h-8 text-green-600 mr-3" />
              <div className="flex-1">
                <h4 className="font-medium text-gray-900 dark:text-white">Brand Guidelines</h4>
                <p className="text-sm text-gray-500 dark:text-gray-400">Complete brand identity guidelines</p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Uploaded 1 week ago • 12.8 MB</p>
              </div>
              <button className="p-2 text-gray-400 hover:text-blue-600">
                <DownloadIcon className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center p-4 border border-gray-200 rounded-lg dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800">
              <FileIcon className="w-8 h-8 text-purple-600 mr-3" />
              <div className="flex-1">
                <h4 className="font-medium text-gray-900 dark:text-white">Project Timeline</h4>
                <p className="text-sm text-gray-500 dark:text-gray-400">Detailed project schedule and milestones</p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Uploaded 3 days ago • 1.2 MB</p>
              </div>
              <button className="p-2 text-gray-400 hover:text-blue-600">
                <DownloadIcon className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center p-4 border border-gray-200 rounded-lg dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800">
              <FileIcon className="w-8 h-8 text-yellow-600 mr-3" />
              <div className="flex-1">
                <h4 className="font-medium text-gray-900 dark:text-white">Invoice INV-2024-002</h4>
                <p className="text-sm text-gray-500 dark:text-gray-400">Invoice for Phase 2 development</p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Uploaded 1 day ago • 256 KB</p>
              </div>
              <button className="p-2 text-gray-400 hover:text-blue-600">
                <DownloadIcon className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
