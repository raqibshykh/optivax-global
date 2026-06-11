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
      } else {
        data = await FileService.getAll();
        // Client filtering if needed, but keeping it simple for super_admin first
        if (user?.role === "client") {
          data = data.filter(f => f.clientId === user.id);
        }
      }
      setFiles(data);
    } catch (err: any) {
      setError(err.message || "Failed to fetch files");
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
        url: URL.createObjectURL(file), // mock url
        ...metadata
      });
      setFiles((prev) => [...prev, newFile]);
      return newFile;
    } catch (err: any) {
      throw new Error(err.message || "Failed to upload file");
    }
  };

  const deleteFile = async (id: string) => {
    try {
      await FileService.delete(id);
      setFiles((prev) => prev.filter((f) => f.id !== id));
    } catch (err: any) {
      throw new Error(err.message || "Failed to delete file");
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
