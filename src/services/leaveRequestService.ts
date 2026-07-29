import { api } from "../lib/client";

// NOTE: this codebase independently grew *two* unrelated leave-request features
// with different shapes and different localStorage keys — they were never
// unified. Both are migrated here, kept as distinct sub-resources, so neither
// page's behavior/shape changes.

const BASE = "/saas/v1/leave-requests";
const EMPLOYEE_BASE = "/saas/v1/hr/employee-leave-requests";

// ── HR full-lifecycle leave requests (src/pages/HR/LeaveRequests.tsx) ──────
// Previously localStorage "mock_leave_requests".

export type HRLeaveType = "annual" | "sick" | "casual" | "maternity" | "unpaid";
export type HRLeaveStatus = "pending" | "approved" | "rejected";

export interface HRLeaveRequest {
  id: string;
  userId: string;
  userName: string;
  userRole: string;
  departmentId?: string;
  type: HRLeaveType;
  startDate: string;
  endDate: string;
  days: number;
  reason: string;
  status: HRLeaveStatus;
  reviewedBy?: string;
  reviewNote?: string;
  createdAt: string;
}

// ── Employee-submitted leave requests ──────────────────────────────────────
// (src/pages/Client/Profile.tsx submission + src/pages/Dashboard/HRPanel.tsx
// review + src/pages/Dashboard/SuperAdminPanel.tsx review). Previously
// localStorage "optivax_leave_requests" — all three consumers now go through
// getEmployeeRequests()/updateEmployeeRequestStatus() below.

export interface LeaveRequest {
  id: string;
  employeeId: string;
  employeeName: string;
  role: string;
  department: string;
  type: "Annual" | "Sick" | "Personal" | "Emergency";
  startDate: string;
  endDate: string;
  days: number;
  reason: string;
  status: "Pending" | "Approved" | "Rejected";
  submittedAt: string;
}

export class LeaveRequestService {
  // ── HR full lifecycle (HR/LeaveRequests.tsx) ─────────────────────────────

  static async getAll(): Promise<HRLeaveRequest[]> {
    const data = await api.get<HRLeaveRequest[]>(BASE);
    return data || [];
  }

  static async create(entry: Omit<HRLeaveRequest, "id" | "createdAt">): Promise<HRLeaveRequest> {
    return api.post<HRLeaveRequest>(BASE, { ...entry, createdAt: new Date().toISOString() });
  }

  static async review(
    id: string,
    patch: { status: "approved" | "rejected"; reviewedBy: string; reviewNote?: string }
  ): Promise<void> {
    await api.put(`${BASE}/${id}`, patch);
  }

  static async cancel(id: string): Promise<void> {
    await api.delete(`${BASE}/${id}`);
  }

  // ── Employee-submitted requests (Client/Profile.tsx + HRPanel.tsx) ───────

  static async getEmployeeRequests(): Promise<LeaveRequest[]> {
    const data = await api.get<LeaveRequest[]>(EMPLOYEE_BASE);
    return data || [];
  }

  static async submitEmployeeRequest(entry: Omit<LeaveRequest, "id" | "submittedAt">): Promise<LeaveRequest> {
    return api.post<LeaveRequest>(EMPLOYEE_BASE, { ...entry, submittedAt: new Date().toISOString() });
  }

  static async updateEmployeeRequestStatus(id: string, status: LeaveRequest["status"]): Promise<void> {
    await api.put(`${EMPLOYEE_BASE}/${id}`, { status });
  }
}
