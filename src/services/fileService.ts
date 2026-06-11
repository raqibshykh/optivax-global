import { api } from "../lib/client";

import { FileRecord } from "../types";

const BASE = "/saas/v1/files";

export class FileService {
  static async getAll(): Promise<FileRecord[]> {
    const data = await api.get<FileRecord[]>(`${BASE}/list`);
    return data || [];
  }

  static async getByProjectId(projectId: string): Promise<FileRecord[]> {
    const data = await api.get<FileRecord[]>(
      `${BASE}/list?projectId=${encodeURIComponent(projectId)}`
    );
    return data || [];
  }

  static async getByClientId(clientId: string): Promise<FileRecord[]> {
    const data = await api.get<FileRecord[]>(
      `${BASE}/list?clientId=${encodeURIComponent(clientId)}`
    );
    return data || [];
  }

  static async create(file: Omit<FileRecord, "id">): Promise<FileRecord> {
    return api.post<FileRecord>(`${BASE}/create`, file);
  }

  static async delete(id: string): Promise<void> {
    await api.delete(`${BASE}/delete`, { id });
  }
}
