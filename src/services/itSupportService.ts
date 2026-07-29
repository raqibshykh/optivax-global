import { api } from "../lib/client";

// ── Ticket types ──────────────────────────────────────────────────────────────

export type TicketCategory = "hardware" | "software" | "device" | "system" | "network" | "other";
export type TicketPriority = "low" | "medium" | "high" | "critical";
export type TicketStatus   = "open" | "in-progress" | "resolved" | "closed" | "escalated";

export interface ITTicket {
  id: string;
  title: string;
  description: string;
  category: TicketCategory;
  priority: TicketPriority;
  status: TicketStatus;
  requestedBy: string;       // user ID
  requestedByName: string;
  requestedByDept: string;
  assignedTo?: string;       // IT member user ID
  assignedToName?: string;
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
  slaDeadline: string;
  notes?: string;
}

// ── Device types ──────────────────────────────────────────────────────────────

export type DeviceStatus  = "online" | "offline" | "error" | "syncing";
export type SyncFrequency = "every-hour" | "every-6h" | "every-12h" | "daily";

export interface BiometricDevice {
  id: string;
  name: string;
  deviceType: "ZKTeco";
  serialNumber: string;
  ipAddress: string;
  port: number;
  branch: string;
  status: DeviceStatus;
  lastSync: string;
  syncFrequency: SyncFrequency;
  totalUsers: number;
  firmwareVersion: string;
  /**
   * Shared secret the Local Bridge Application sends as X-Device-Key when
   * importing punches. The backend now hashes this at rest and only ever
   * returns the real plaintext value in the one-time response of
   * DeviceService.generateApiKey() — every other response (including this
   * field on a plain getAll()/create()/update()) carries `null`/undefined.
   * Never rely on this field to display or recover an existing key; use
   * `apiKeyLastFour` for that.
   */
  apiKey?: string | null;
  /** Last 4 characters of the current key, for identification only — undefined if no key has ever been generated for this device. */
  apiKeyLastFour?: string | null;
  apiKeyRotatedAt?: string | null;
  apiKeyExpiresAt?: string | null;
  apiKeyRevoked?: boolean;
  // ── Live-connection diagnostics — written only by DeviceSyncService (test-connection/live-sync), never by the create/edit form ──
  /** Last time a TCP connection to this device succeeded, regardless of whether anything new was found. */
  lastConnection?: string;
  /** Last time an attendance-log download from this device completed. */
  lastDownload?: string;
  /** Last time a live sync fully completed with zero aggregation failures. */
  lastSuccessfulSync?: string;
  /** Message from the most recent failed connect/download/sync attempt; cleared on the next success. */
  lastError?: string;
  /** The device's own real-time clock reading as of the last successful connection — compare against lastConnection to spot clock drift. */
  lastDeviceTime?: string;
  /** Count of raw punch rows stored for this device (it_biometric_punches), refreshed after every live sync. */
  totalLogs: number;
}

export interface TestConnectionResult {
  reachable: boolean;
  deviceName?: string;
  firmwareVersion?: string;
  serialNumber?: string;
  deviceTime?: string;
  siteTime?: string;
  enrolledUsers?: number;
  responseTimeMs: number;
  error?: string;
}

/** Response of DeviceService.generateApiKey() — the only place the real plaintext key is ever returned, exactly once. */
export interface GeneratedApiKey {
  apiKey: string;
  lastFour: string;
}

export interface LiveSyncResult {
  deviceId: string;
  accepted: number;
  duplicates: number;
  rejected: number;
  unmapped: number;
  aggregated: number;
  aggregationFailures: number;
  errors: string[];
  rawRecordsDownloaded: number;
  newRecordsConsidered: number;
  durationMs: number;
}

// ── Device sync log types ─────────────────────────────────────────────────────

export type SyncResult = "success" | "partial" | "failed" | "timeout";

export type ConnectionResult = "connected" | "failed";

export interface DeviceSyncLog {
  id: string;
  deviceId: string;
  deviceName: string;
  startedAt: string;
  completedAt?: string;
  result: SyncResult;
  recordsSynced: number;
  errors?: string;
  triggeredBy: "auto" | "manual";
  triggeredByName?: string;
  /** Raw punch count downloaded from the device this run — null for log rows written before this field existed. */
  downloadedRecords?: number | null;
  duplicates?: number | null;
  aggregationFailures?: number | null;
  /** Whether the TCP connection itself succeeded, independent of whether any new records were found — null for pre-live-sync rows. */
  connectionResult?: ConnectionResult | null;
  durationMs?: number | null;
}

// ── Attendance exception types ─────────────────────────────────────────────────

export type ExceptionType =
  | "missing-punch"
  | "late-arrival"
  | "early-departure"
  | "no-record"
  | "duplicate-punch";

export interface AttendanceException {
  id: string;
  employeeId: string;
  employeeName: string;
  department: string;
  date: string;
  exceptionType: ExceptionType;
  checkIn?: string;
  checkOut?: string;
  expectedCheckIn: string;
  status: "pending" | "reviewed" | "approved" | "rejected";
  notes?: string;
}

// ── Biometric raw punch + employee mapping types ────────────────────────────────

export type PunchType = "in" | "out" | "break-in" | "break-out";
export type PunchProcessedStatus = "pending" | "processed" | "failed" | "unmapped";

export interface BiometricPunch {
  id: string;
  deviceId: string;
  biometricUserId: string;
  mappedUserId?: string;
  mappedUserName?: string;
  punchType: PunchType;
  punchTimeUtc: string;
  punchTimeRaw: string;
  attendanceDate: string;
  receivedAt: string;
  sourceIp?: string;
  isDuplicate: boolean;
  processedStatus: PunchProcessedStatus;
  processedAt?: string;
  processError?: string;
}

export interface BiometricEmployeeMapping {
  id: string;
  /** Omitted (undefined) means "applies to any device" — see backend migration's doc comment. */
  deviceId?: string;
  biometricUserId: string;
  internalUserId: string;
  employeeName?: string;
  status: "active" | "inactive";
  createdAt: string;
}

export interface BiometricSyncSummary {
  aggregated: number;
  aggregationFailures: number;
  errors: string[];
}

// ── Services ──────────────────────────────────────────────────────────────────

const TICKETS_BASE      = "/saas/v1/it/tickets";
const DEVICES_BASE      = "/saas/v1/it/devices";
const DEVICE_LOGS_BASE  = "/saas/v1/it/device-logs";
const EXCEPTIONS_BASE   = "/saas/v1/it/attendance-exceptions";
const PUNCHES_BASE      = "/saas/v1/it/punches";
const BIOMETRIC_MAPPING_BASE = "/saas/v1/it/biometric-mapping";

export class ITTicketService {
  static async getAll(): Promise<ITTicket[]> {
    const data = await api.get<ITTicket[]>(`${TICKETS_BASE}/list`);
    return data || [];
  }

  static async create(ticket: Omit<ITTicket, "id">): Promise<ITTicket> {
    return api.post<ITTicket>(`${TICKETS_BASE}/create`, ticket);
  }

  static async update(id: string, updates: Partial<ITTicket>): Promise<ITTicket> {
    return api.put<ITTicket>(`${TICKETS_BASE}/update`, { id, ...updates });
  }
}

export class DeviceService {
  static async getAll(): Promise<BiometricDevice[]> {
    const data = await api.get<BiometricDevice[]>(`${DEVICES_BASE}/list`);
    return data || [];
  }

  static async create(device: Omit<BiometricDevice, "id">): Promise<BiometricDevice> {
    return api.post<BiometricDevice>(`${DEVICES_BASE}/create`, device);
  }

  static async update(id: string, updates: Partial<BiometricDevice>): Promise<BiometricDevice> {
    return api.put<BiometricDevice>(`${DEVICES_BASE}/update`, { id, ...updates });
  }

  static async delete(id: string): Promise<void> {
    await api.delete(`${DEVICES_BASE}/delete`, { id });
  }

  /**
   * "Retry Sync" — re-runs aggregation for whatever this device's raw
   * punches haven't been successfully processed yet, without touching
   * hardware. Kept for backward compatibility; the Devices.tsx "Sync Now"
   * button calls liveSync() below instead, which is the real hardware pull.
   */
  static async syncNow(deviceId: string): Promise<BiometricSyncSummary> {
    return api.post<BiometricSyncSummary>(`${DEVICES_BASE}/${deviceId}/punches/reprocess`, {});
  }

  /**
   * Real live TCP probe of the physical device (connect, read firmware/
   * clock/enrolled-user count, disconnect) — not a cached-status check.
   * Also refreshes the device's own lastConnection/firmwareVersion/
   * totalUsers/status columns server-side on success, so callers should
   * re-fetch the device list after this resolves.
   */
  static async testConnection(deviceId: string): Promise<TestConnectionResult> {
    return api.post<TestConnectionResult>(`${DEVICES_BASE}/${deviceId}/test-connection`, {});
  }

  /**
   * The real "Sync Now" action: connects to the physical device over TCP
   * right now, downloads its attendance log, and ingests whatever's new.
   * Replaces the old client-side Math.random()-fabricated sync entirely.
   * The backend writes/enriches its own real DeviceSyncLog row and updates
   * this device's lastSync/lastSuccessfulSync/totalLogs/status, so callers
   * should re-fetch the device list after this resolves.
   */
  static async liveSync(deviceId: string): Promise<LiveSyncResult> {
    return api.post<LiveSyncResult>(`${DEVICES_BASE}/${deviceId}/live-sync`, {});
  }

  /**
   * Generates a brand-new API key for this device — or replaces the
   * existing one, same operation either way (the backend always issues a
   * fresh key regardless of whether one already existed). RBAC-restricted
   * server-side to super_admin/it_admin. The returned plaintext `apiKey` is
   * shown to the caller exactly once; it is never stored client-side beyond
   * the caller's own transient UI state and is never recoverable from any
   * other endpoint again. Callers should re-fetch the device list after
   * this resolves so `apiKeyLastFour` reflects the new key.
   */
  static async generateApiKey(deviceId: string): Promise<GeneratedApiKey> {
    return api.post<GeneratedApiKey>(`${DEVICES_BASE}/${deviceId}/generate-api-key`, {});
  }
}

export class DeviceSyncLogService {
  static async getAll(): Promise<DeviceSyncLog[]> {
    const data = await api.get<DeviceSyncLog[]>(`${DEVICE_LOGS_BASE}/list`);
    return data || [];
  }

  static async create(log: Omit<DeviceSyncLog, "id">): Promise<DeviceSyncLog> {
    return api.post<DeviceSyncLog>(`${DEVICE_LOGS_BASE}/create`, log);
  }
}

export class AttendanceExceptionService {
  static async getAll(): Promise<AttendanceException[]> {
    const data = await api.get<AttendanceException[]>(`${EXCEPTIONS_BASE}/list`);
    return data || [];
  }

  static async update(id: string, updates: Partial<AttendanceException>): Promise<AttendanceException> {
    return api.put<AttendanceException>(`${EXCEPTIONS_BASE}/update`, { id, ...updates });
  }
}

/** Read-only viewer over the raw punches a device (or its bridge) has pushed — the ground truth behind every attendance row/exception this integration produces. */
export class BiometricPunchService {
  static async getAll(params?: {
    deviceId?: string;
    mappedUserId?: string;
    attendanceDate?: string;
    punchType?: PunchType;
    processedStatus?: PunchProcessedStatus;
  }): Promise<BiometricPunch[]> {
    const data = await api.get<BiometricPunch[]>(`${PUNCHES_BASE}/list`, { params });
    return data || [];
  }
}

/** Manages the biometric device's raw numeric/card user id -> our internal employee id link — required before any punch from that id can be aggregated into attendance. */
export class BiometricMappingService {
  static async getAll(): Promise<BiometricEmployeeMapping[]> {
    const data = await api.get<BiometricEmployeeMapping[]>(`${BIOMETRIC_MAPPING_BASE}/list`);
    return data || [];
  }

  static async create(mapping: Omit<BiometricEmployeeMapping, "id" | "createdAt">): Promise<BiometricEmployeeMapping> {
    return api.post<BiometricEmployeeMapping>(`${BIOMETRIC_MAPPING_BASE}/create`, mapping);
  }

  static async update(id: string, updates: Partial<BiometricEmployeeMapping>): Promise<BiometricEmployeeMapping> {
    return api.put<BiometricEmployeeMapping>(`${BIOMETRIC_MAPPING_BASE}/update`, { id, ...updates });
  }

  static async delete(id: string): Promise<void> {
    await api.delete(`${BIOMETRIC_MAPPING_BASE}/delete`, { id });
  }
}
