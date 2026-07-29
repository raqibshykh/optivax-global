import { api } from "../lib/client";

const BASE = "/saas/v1/attendance";

export type ImportRowStatus = "ready" | "duplicate" | "unmapped" | "failed";

/** One parsed sheet row, resolved against the biometric mapping table and checked for duplicates — but not yet written anywhere. */
export interface AttendanceImportPreviewRow {
  rowNumber: number;
  biometricUserId: string | null;
  employeeId: string | null;
  employeeName: string | null;
  date: string | null;
  time: string | null;
  punchType: "in" | "out" | null;
  rawStatus: string | null;
  recordHash: string | null;
  status: ImportRowStatus;
  errorMessage: string | null;
}

export interface AttendanceImportSummary {
  total: number;
  imported: number;
  duplicates: number;
  failed: number;
}

export interface AttendanceImportPreviewResult {
  fileName: string;
  rows: AttendanceImportPreviewRow[];
  summary: AttendanceImportSummary;
}

export interface AttendanceImportConfirmResult {
  importId: string;
  totalRecords: number;
  importedRecords: number;
  duplicateRecords: number;
  failedRecords: number;
  aggregationErrors: number;
}

export interface AttendanceImportHistoryEntry {
  id: string;
  fileName: string;
  totalRecords: number;
  importedRecords: number;
  duplicateRecords: number;
  failedRecords: number;
  errorSummary: string | null;
  uploadedBy: string;
  uploadedAt: string;
}

export interface BiometricMapping {
  id: string;
  employeeId: string;
  biometricUserId: string;
  deviceName: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Reads a browser File as base64 — the plugin's REST surface is JSON-only (see src/lib/client.ts), so this is how the raw file bytes reach the server instead of multipart/form-data. */
const readFileAsBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Strip the "data:<mime>;base64," prefix FileReader adds — the backend only wants the raw base64 payload.
      const commaIndex = result.indexOf(",");
      resolve(commaIndex >= 0 ? result.slice(commaIndex + 1) : result);
    };
    reader.onerror = () => reject(reader.error ?? new Error("Could not read the selected file."));
    reader.readAsDataURL(file);
  });

export class AttendanceImportService {
  static async previewFile(file: File): Promise<AttendanceImportPreviewResult> {
    const fileContent = await readFileAsBase64(file);
    return api.post<AttendanceImportPreviewResult>(`${BASE}/import/preview`, {
      fileName: file.name,
      fileContent,
    });
  }

  /** Resends exactly the raw fields preview() returned for each row — the server re-derives mapping/hash/status itself rather than trusting anything computed client-side. */
  static async confirmImport(
    fileName: string,
    rows: AttendanceImportPreviewRow[]
  ): Promise<AttendanceImportConfirmResult> {
    return api.post<AttendanceImportConfirmResult>(`${BASE}/import/confirm`, {
      fileName,
      rows: rows.map((r) => ({
        rowNumber: r.rowNumber,
        biometricUserId: r.biometricUserId,
        date: r.date,
        time: r.time,
        rawStatus: r.rawStatus,
      })),
    });
  }

  static async getHistory(page = 1, perPage = 20): Promise<AttendanceImportHistoryEntry[]> {
    const data = await api.get<AttendanceImportHistoryEntry[]>(`${BASE}/import/history`, {
      params: { page, perPage },
    });
    return data || [];
  }

  static async getMappings(): Promise<BiometricMapping[]> {
    const data = await api.get<BiometricMapping[]>(`${BASE}/mapping`);
    return data || [];
  }

  static async createMapping(input: {
    employeeId: string;
    biometricUserId: string;
    deviceName?: string;
  }): Promise<BiometricMapping> {
    return api.post<BiometricMapping>(`${BASE}/mapping`, input);
  }

  static async updateMapping(
    id: string,
    input: Partial<{ employeeId: string; biometricUserId: string; deviceName: string }>
  ): Promise<BiometricMapping> {
    return api.put<BiometricMapping>(`${BASE}/mapping/${id}`, input);
  }

  static async deleteMapping(id: string): Promise<void> {
    await api.delete(`${BASE}/mapping/${id}`);
  }
}
