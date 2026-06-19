import { useState, useEffect, useCallback } from "react";
import { FileRecord } from "../types";
import { FileService } from "../services/fileService";
import { useAuth } from "../context/AuthContext";

export function useFiles(projectId?: string) {
  const [files, setFiles] = useState<FileRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const fetchFiles = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      let data: FileRecord[] = [];
      if (projectId) {
        data = await FileService.getByProjectId(projectId);
      } else if (user?.role === "client" && user.id) {
        data = await FileService.getByClientId(user.id);
      } else {
        data = await FileService.getAll();
      }
      setFiles(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to fetch files");
    } finally {
      setIsLoading(false);
    }
  }, [projectId, user]);

  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

  const uploadFile = async (file: File, metadata: Partial<FileRecord>) => {
    try {
      const newFile = await FileService.create({
        name: file.name,
        size: file.size,
        type: file.type,
        uploadedBy: user?.id || "",
        uploadDate: new Date().toISOString(),
        url: URL.createObjectURL(file),
        ...metadata
      });
      setFiles((prev) => [...prev, newFile]);
      return newFile;
    } catch (err: unknown) {
      throw new Error(err instanceof Error ? err.message : "Failed to upload file");
    }
  };

  const deleteFile = async (id: string) => {
    try {
      await FileService.delete(id);
      setFiles((prev) => prev.filter((f) => f.id !== id));
    } catch (err: unknown) {
      throw new Error(err instanceof Error ? err.message : "Failed to delete file");
    }
  };

  return {
    files,
    isLoading,
    error,
    uploadFile,
    deleteFile,
    refreshFiles: fetchFiles,
  };
}
