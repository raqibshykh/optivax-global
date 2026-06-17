import { useState } from "react";
import PageMeta from "../../components/common/PageMeta";
import { FileIcon, DownloadIcon } from "../../icons";
import { useFiles } from "../../hooks/useFiles";

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

export default function Files() {
  const { files, isLoading, error } = useFiles();
  const [searchQuery, setSearchQuery] = useState("");

  const filteredFiles = files.filter(
    (f) =>
      f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.type.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <>
      <PageMeta
        title="Files | Optivax Global"
        description="Download project files and documents."
      />
      <div className="flex flex-col gap-4 mb-6 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Files</h1>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Access and download your project files.
          </p>
        </div>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Available Files{" "}
            {!isLoading && (
              <span className="text-sm font-normal text-gray-500">
                ({filteredFiles.length})
              </span>
            )}
          </h3>
          <input
            type="text"
            placeholder="Search files..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full sm:w-64 px-3 py-1.5 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
        <div className="p-6">
          {isLoading ? (
            <div className="flex h-32 items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-solid border-brand-500 border-t-transparent" />
            </div>
          ) : error ? (
            <p className="text-sm text-red-500">{error}</p>
          ) : filteredFiles.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <FileIcon className="w-12 h-12 text-gray-300 dark:text-gray-600 mb-3" />
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {searchQuery
                  ? "No files match your search."
                  : "No files have been shared with you yet."}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {filteredFiles.map((file) => (
                <div
                  key={file.id}
                  className="flex items-center p-4 border border-gray-200 rounded-lg dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
                >
                  <FileIcon className="w-8 h-8 text-blue-600 mr-3 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-gray-900 dark:text-white truncate">
                      {file.name}
                    </h4>
                    <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                      {file.type}
                    </p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                      {formatDate(file.uploadDate)} &bull; {formatFileSize(file.size)}
                    </p>
                  </div>
                  {file.url ? (
                    <a
                      href={file.url}
                      download={file.name}
                      className="p-2 text-gray-400 hover:text-blue-600 transition flex-shrink-0"
                      title="Download"
                    >
                      <DownloadIcon className="w-4 h-4" />
                    </a>
                  ) : (
                    <button
                      disabled
                      className="p-2 text-gray-300 dark:text-gray-600 cursor-not-allowed flex-shrink-0"
                      title="No download available"
                    >
                      <DownloadIcon className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
