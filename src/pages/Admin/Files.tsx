import PageMeta from "../../components/common/PageMeta";
import { FileIcon, DownloadIcon } from "../../icons";
import { useFiles } from "../../hooks/useFiles";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { useRef, useState } from "react";

export default function Files() {
  const { files, isLoading, uploadFile, deleteFile } = useFiles();
  const { user, canCreate, canDelete } = useAuth();
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setIsUploading(true);
    try {
      await uploadFile(selectedFile, { uploadedBy: user?.name });
      showToast("File uploaded successfully", "success");
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "Failed to upload file", "error");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this file?")) {
      try {
        await deleteFile(id);
        showToast("File deleted successfully", "success");
      } catch (err: unknown) {
        showToast(err instanceof Error ? err.message : "Failed to delete file", "error");
      }
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <>
      <PageMeta
        title="Files | Optivax Global"
        description="Manage project files and documents."
      />
      <div className="flex flex-col gap-4 mb-6 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
            Files
          </h1>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Upload and manage project files and documents.
          </p>
        </div>
        {canCreate("files") && (
          <div>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              className="hidden"
            />
            <button
              onClick={handleUploadClick}
              disabled={isUploading}
              className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {isUploading ? "Uploading..." : "Upload File"}
            </button>
          </div>
        )}
      </div>

      <div className="rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Project Files
          </h3>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {isLoading ? (
              <div className="col-span-full flex justify-center p-8">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-solid border-brand-500 border-t-transparent"></div>
              </div>
            ) : files.length === 0 ? (
              <div className="col-span-full text-center p-8 text-gray-500 dark:text-gray-400">
                No files uploaded yet.
              </div>
            ) : (
              files.map((file) => (
                <div key={file.id} className="flex items-center p-4 border border-gray-200 rounded-lg dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800">
                  <FileIcon className="w-8 h-8 text-gray-400 mr-3 shrink-0" />
                  <div className="flex-1 min-w-0 pr-2">
                    <h4 className="font-medium text-gray-900 dark:text-white truncate" title={file.name}>
                      {file.name}
                    </h4>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {formatSize(file.size)} • {file.uploadDate}
                    </p>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <a
                      href={file.url || '#'}
                      download={file.name}
                      target="_blank"
                      rel="noreferrer"
                      className="p-2 text-gray-400 hover:text-blue-600 rounded-full hover:bg-blue-50 dark:hover:bg-blue-900/20"
                    >
                      <DownloadIcon className="w-4 h-4" />
                    </a>
                    {canDelete("files") && (
                      <button
                        onClick={() => handleDelete(file.id)}
                        className="p-2 text-gray-400 hover:text-red-600 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </>
  );
}
