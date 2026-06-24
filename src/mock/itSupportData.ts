const now = new Date();
const daysAgo = (n: number) => new Date(now.getTime() - n * 86_400_000).toISOString();
const minsAgo = (n: number) => new Date(now.getTime() - n * 60_000).toISOString();

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

export type DeviceStatus    = "online" | "offline" | "error" | "syncing";
export type SyncFrequency   = "every-hour" | "every-6h" | "every-12h" | "daily";

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
}

// ── Device sync log types ─────────────────────────────────────────────────────

export type SyncResult = "success" | "partial" | "failed" | "timeout";

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
}

// ── Attendance exception types ─────────────────────────────────────────────────

export type ExceptionType = "missing-punch" | "late-arrival" | "early-departure" | "no-record";

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

// ── Seed data ─────────────────────────────────────────────────────────────────

export const mockITTickets: ITTicket[] = [
  {
    id: "tkt-001",
    title: "Laptop screen flickering",
    description: "My laptop screen flickers intermittently during video calls.",
    category: "hardware",
    priority: "high",
    status: "in-progress",
    requestedBy: "u12",
    requestedByName: "Emma Wilson",
    requestedByDept: "Sales",
    assignedTo: "u26",
    assignedToName: "Sophia Kim",
    createdAt: daysAgo(3),
    updatedAt: daysAgo(1),
    slaDeadline: daysAgo(-1),
    notes: "Ordered replacement screen. Scheduled replacement Thursday.",
  },
  {
    id: "tkt-002",
    title: "VPN not connecting",
    description: "Unable to connect to company VPN from home office since yesterday.",
    category: "network",
    priority: "critical",
    status: "open",
    requestedBy: "u14",
    requestedByName: "Noah Davis",
    requestedByDept: "Marketing",
    createdAt: daysAgo(1),
    updatedAt: daysAgo(1),
    slaDeadline: daysAgo(0),
  },
  {
    id: "tkt-003",
    title: "Request new MacBook Pro",
    description: "Current laptop is 4 years old and slowing down production work.",
    category: "hardware",
    priority: "medium",
    status: "open",
    requestedBy: "u13",
    requestedByName: "Liam Park",
    requestedByDept: "Production",
    createdAt: daysAgo(5),
    updatedAt: daysAgo(5),
    slaDeadline: daysAgo(-3),
  },
  {
    id: "tkt-004",
    title: "Adobe Creative Cloud license expired",
    description: "My Adobe CC subscription has expired and I cannot access design tools.",
    category: "software",
    priority: "high",
    status: "resolved",
    requestedBy: "u20",
    requestedByName: "Alice Martins",
    requestedByDept: "Marketing",
    assignedTo: "u27",
    assignedToName: "Marcus Bell",
    createdAt: daysAgo(7),
    updatedAt: daysAgo(4),
    resolvedAt: daysAgo(4),
    slaDeadline: daysAgo(5),
    notes: "Renewed license. User confirmed access restored.",
  },
  {
    id: "tkt-005",
    title: "ZKTeco device at branch B not syncing",
    description: "Branch B biometric device has not synced since Monday. Attendance data may be incomplete.",
    category: "device",
    priority: "critical",
    status: "escalated",
    requestedBy: "u11",
    requestedByName: "Ava Johnson",
    requestedByDept: "HR",
    assignedTo: "u16",
    assignedToName: "Ryan Patel",
    createdAt: daysAgo(2),
    updatedAt: daysAgo(0),
    slaDeadline: daysAgo(-1),
    notes: "Escalated to IT Admin. Physical site visit required.",
  },
  {
    id: "tkt-006",
    title: "Email not loading on mobile",
    description: "Company email app crashes on Android after latest update.",
    category: "software",
    priority: "low",
    status: "closed",
    requestedBy: "u22",
    requestedByName: "Chris Nolan",
    requestedByDept: "Sales",
    assignedTo: "u26",
    assignedToName: "Sophia Kim",
    createdAt: daysAgo(10),
    updatedAt: daysAgo(8),
    resolvedAt: daysAgo(8),
    slaDeadline: daysAgo(9),
    notes: "Cleared app cache and reinstalled. Issue resolved.",
  },
  {
    id: "tkt-007",
    title: "Printer offline — Floor 2",
    description: "HP LaserJet on Floor 2 shows offline and will not print.",
    category: "hardware",
    priority: "medium",
    status: "open",
    requestedBy: "u25",
    requestedByName: "Fiona Gallagher",
    requestedByDept: "HR",
    createdAt: daysAgo(0),
    updatedAt: daysAgo(0),
    slaDeadline: daysAgo(-2),
  },
  {
    id: "tkt-008",
    title: "Request Microsoft Project license",
    description: "Need MS Project for resource planning. Currently using workarounds in Excel.",
    category: "software",
    priority: "medium",
    status: "in-progress",
    requestedBy: "u9",
    requestedByName: "David Chen",
    requestedByDept: "Production",
    assignedTo: "u27",
    assignedToName: "Marcus Bell",
    createdAt: daysAgo(4),
    updatedAt: daysAgo(2),
    slaDeadline: daysAgo(-2),
  },
];

export const mockDevices: BiometricDevice[] = [
  {
    id: "dev-001",
    name: "Main Office — Entrance",
    deviceType: "ZKTeco",
    serialNumber: "ZK-A8204-001",
    ipAddress: "192.168.1.101",
    port: 4370,
    branch: "Head Office",
    status: "online",
    lastSync: minsAgo(45),
    syncFrequency: "every-hour",
    totalUsers: 142,
    firmwareVersion: "6.60.3100",
  },
  {
    id: "dev-002",
    name: "Main Office — Exit",
    deviceType: "ZKTeco",
    serialNumber: "ZK-A8204-002",
    ipAddress: "192.168.1.102",
    port: 4370,
    branch: "Head Office",
    status: "online",
    lastSync: minsAgo(47),
    syncFrequency: "every-hour",
    totalUsers: 142,
    firmwareVersion: "6.60.3100",
  },
  {
    id: "dev-003",
    name: "Branch B — Entrance",
    deviceType: "ZKTeco",
    serialNumber: "ZK-F18-2203",
    ipAddress: "10.0.2.50",
    port: 4370,
    branch: "Branch B",
    status: "offline",
    lastSync: daysAgo(2),
    syncFrequency: "every-6h",
    totalUsers: 38,
    firmwareVersion: "6.55.0900",
  },
  {
    id: "dev-004",
    name: "Warehouse — Gate",
    deviceType: "ZKTeco",
    serialNumber: "ZK-K14-3317",
    ipAddress: "172.16.5.20",
    port: 4370,
    branch: "Warehouse",
    status: "online",
    lastSync: minsAgo(120),
    syncFrequency: "every-6h",
    totalUsers: 56,
    firmwareVersion: "6.60.2800",
  },
  {
    id: "dev-005",
    name: "Server Room — Access",
    deviceType: "ZKTeco",
    serialNumber: "ZK-L10-7741",
    ipAddress: "192.168.1.110",
    port: 4370,
    branch: "Head Office",
    status: "error",
    lastSync: daysAgo(1),
    syncFrequency: "every-12h",
    totalUsers: 12,
    firmwareVersion: "6.50.1100",
  },
];

export const mockDeviceSyncLogs: DeviceSyncLog[] = [
  {
    id: "log-001",
    deviceId: "dev-001",
    deviceName: "Main Office — Entrance",
    startedAt: minsAgo(45),
    completedAt: minsAgo(44),
    result: "success",
    recordsSynced: 147,
    triggeredBy: "auto",
  },
  {
    id: "log-002",
    deviceId: "dev-002",
    deviceName: "Main Office — Exit",
    startedAt: minsAgo(47),
    completedAt: minsAgo(46),
    result: "success",
    recordsSynced: 143,
    triggeredBy: "auto",
  },
  {
    id: "log-003",
    deviceId: "dev-003",
    deviceName: "Branch B — Entrance",
    startedAt: daysAgo(2),
    completedAt: daysAgo(2),
    result: "failed",
    recordsSynced: 0,
    errors: "Connection timeout: device unreachable at 10.0.2.50:4370",
    triggeredBy: "auto",
  },
  {
    id: "log-004",
    deviceId: "dev-003",
    deviceName: "Branch B — Entrance",
    startedAt: daysAgo(1),
    result: "timeout",
    recordsSynced: 0,
    errors: "TCP timeout after 30s",
    triggeredBy: "manual",
    triggeredByName: "Ryan Patel",
  },
  {
    id: "log-005",
    deviceId: "dev-004",
    deviceName: "Warehouse — Gate",
    startedAt: minsAgo(122),
    completedAt: minsAgo(120),
    result: "success",
    recordsSynced: 62,
    triggeredBy: "auto",
  },
  {
    id: "log-006",
    deviceId: "dev-005",
    deviceName: "Server Room — Access",
    startedAt: daysAgo(1),
    completedAt: daysAgo(1),
    result: "partial",
    recordsSynced: 4,
    errors: "Firmware mismatch: 3 records skipped",
    triggeredBy: "auto",
  },
  {
    id: "log-007",
    deviceId: "dev-001",
    deviceName: "Main Office — Entrance",
    startedAt: minsAgo(105),
    completedAt: minsAgo(104),
    result: "success",
    recordsSynced: 9,
    triggeredBy: "manual",
    triggeredByName: "Sophia Kim",
  },
];

export const mockAttendanceExceptions: AttendanceException[] = [
  {
    id: "exc-001",
    employeeId: "u12",
    employeeName: "Emma Wilson",
    department: "Sales",
    date: new Date(now.getTime() - 1 * 86_400_000).toISOString().split("T")[0],
    exceptionType: "missing-punch",
    checkIn: "09:12",
    expectedCheckIn: "09:00",
    status: "pending",
    notes: "Check-out punch missing — device may have been offline.",
  },
  {
    id: "exc-002",
    employeeId: "u22",
    employeeName: "Chris Nolan",
    department: "Sales",
    date: new Date(now.getTime() - 1 * 86_400_000).toISOString().split("T")[0],
    exceptionType: "late-arrival",
    checkIn: "10:04",
    checkOut: "18:30",
    expectedCheckIn: "09:00",
    status: "reviewed",
  },
  {
    id: "exc-003",
    employeeId: "u13",
    employeeName: "Liam Park",
    department: "Production",
    date: new Date(now.getTime() - 2 * 86_400_000).toISOString().split("T")[0],
    exceptionType: "no-record",
    expectedCheckIn: "09:00",
    status: "pending",
    notes: "No biometric record found for Branch B device (offline period).",
  },
  {
    id: "exc-004",
    employeeId: "u24",
    employeeName: "Edgar Wright",
    department: "Production",
    date: new Date(now.getTime() - 2 * 86_400_000).toISOString().split("T")[0],
    exceptionType: "no-record",
    expectedCheckIn: "09:00",
    status: "pending",
    notes: "Branch B device offline. Records to be imported manually.",
  },
  {
    id: "exc-005",
    employeeId: "u20",
    employeeName: "Alice Martins",
    department: "Marketing",
    date: new Date(now.getTime() - 3 * 86_400_000).toISOString().split("T")[0],
    exceptionType: "early-departure",
    checkIn: "08:55",
    checkOut: "14:30",
    expectedCheckIn: "09:00",
    status: "approved",
    notes: "Approved — medical appointment.",
  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

export function getITTickets(): ITTicket[] {
  try {
    const raw = localStorage.getItem("mock_it_tickets");
    if (raw) return JSON.parse(raw) as ITTicket[];
  } catch { /* ignore */ }
  localStorage.setItem("mock_it_tickets", JSON.stringify(mockITTickets));
  return mockITTickets;
}

export function saveITTickets(tickets: ITTicket[]): void {
  localStorage.setItem("mock_it_tickets", JSON.stringify(tickets));
}

export function getDevices(): BiometricDevice[] {
  try {
    const raw = localStorage.getItem("mock_biometric_devices");
    if (raw) return JSON.parse(raw) as BiometricDevice[];
  } catch { /* ignore */ }
  localStorage.setItem("mock_biometric_devices", JSON.stringify(mockDevices));
  return mockDevices;
}

export function saveDevices(devices: BiometricDevice[]): void {
  localStorage.setItem("mock_biometric_devices", JSON.stringify(devices));
}

export function getDeviceSyncLogs(): DeviceSyncLog[] {
  try {
    const raw = localStorage.getItem("mock_device_sync_logs");
    if (raw) return JSON.parse(raw) as DeviceSyncLog[];
  } catch { /* ignore */ }
  localStorage.setItem("mock_device_sync_logs", JSON.stringify(mockDeviceSyncLogs));
  return mockDeviceSyncLogs;
}

export function saveDeviceSyncLogs(logs: DeviceSyncLog[]): void {
  localStorage.setItem("mock_device_sync_logs", JSON.stringify(logs));
}

export function getAttendanceExceptions(): AttendanceException[] {
  try {
    const raw = localStorage.getItem("mock_attendance_exceptions");
    if (raw) return JSON.parse(raw) as AttendanceException[];
  } catch { /* ignore */ }
  localStorage.setItem("mock_attendance_exceptions", JSON.stringify(mockAttendanceExceptions));
  return mockAttendanceExceptions;
}

export function saveAttendanceExceptions(exceptions: AttendanceException[]): void {
  localStorage.setItem("mock_attendance_exceptions", JSON.stringify(exceptions));
}
