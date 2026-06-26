/**
 * Role-based notification helpers.
 * Each function fires the right set of notifications for a specific ERP event.
 * All helpers read the user list from localStorage (mock_profiles) to find recipients.
 */
import { NotificationService } from "./notificationService";
import { AuditLogService } from "./auditLogService";
import { safeParse } from "../lib/storage";
import type { NotificationType, NotificationModule } from "../types";

interface Profile {
  id: string;
  role: string;
  full_name: string;
  email: string;
  departmentId?: string;
}

const getProfiles = (): Profile[] =>
  safeParse<Profile[]>(localStorage.getItem("mock_profiles"), []);

const getUsersByRole = (...roles: string[]): Profile[] =>
  getProfiles().filter((p) => roles.includes(p.role));

const notify = (
  userId: string,
  title: string,
  message: string,
  type: NotificationType = "system",
  module?: NotificationModule,
  actionUrl?: string,
  actionLabel?: string
) => {
  NotificationService.create({
    userId,
    title,
    message,
    type,
    module,
    read: false,
    createdAt: new Date().toISOString(),
    actionUrl,
    actionLabel,
  }).catch(() => {});
};

// ── Helpers ────────────────────────────────────────────────────────────────────

function deptAdminRoleFor(role: string): string {
  const prefix = role.replace("_member", "").replace("_admin", "");
  return `${prefix}_admin`;
}

// ── Employee Created ──────────────────────────────────────────────────────────

export function notifyUserCreated(
  creatorId: string,
  creatorName: string,
  creatorRole: string,
  newUserId: string,
  newUserName: string,
  newUserEmail: string,
  newUserRole: string
) {
  notify(newUserId, "Welcome to OptiVax Global",
    `Your account has been created by ${creatorName}. Login email: ${newUserEmail}.`,
    "system", "employee");

  const sa = getUsersByRole("super_admin").filter(p => p.id !== creatorId);
  for (const r of sa) {
    notify(r.id, "New Employee Created",
      `${creatorName} created ${newUserRole} account for ${newUserName}.`,
      "system", "employee");
  }
  AuditLogService.add({ action: "USER_CREATED", entityType: "user", entityId: newUserId, entityName: newUserName, performedBy: creatorId, performedByName: creatorName, performedByRole: creatorRole, description: `${creatorName} created ${newUserRole} account for ${newUserName} (${newUserEmail})`, newValue: { role: newUserRole, email: newUserEmail } });
}

// ── Employee Updated ──────────────────────────────────────────────────────────

export function notifyUserUpdated(
  editorId: string,
  editorName: string,
  editorRole: string,
  targetId: string,
  targetName: string,
  changes: string
) {
  const recipients = getUsersByRole("super_admin", "management").filter(p => p.id !== editorId);
  for (const r of recipients) {
    notify(r.id, "Employee Profile Updated",
      `${editorName} updated ${targetName}'s profile. Changes: ${changes}.`,
      "system", "employee");
  }
  AuditLogService.add({ action: "USER_UPDATED", entityType: "user", entityId: targetId, entityName: targetName, performedBy: editorId, performedByName: editorName, performedByRole: editorRole, description: `${editorName} updated ${targetName}: ${changes}` });
}

// ── Employee Deleted ──────────────────────────────────────────────────────────

export function notifyUserDeleted(
  adminId: string,
  adminName: string,
  adminRole: string,
  targetId: string,
  targetName: string
) {
  const recipients = getUsersByRole("super_admin", "management").filter(p => p.id !== adminId);
  for (const r of recipients) {
    notify(r.id, "Employee Account Removed",
      `${adminName} removed the account for ${targetName}.`,
      "system", "employee");
  }
  AuditLogService.add({ action: "USER_DELETED", entityType: "user", entityId: targetId, entityName: targetName, performedBy: adminId, performedByName: adminName, performedByRole: adminRole, description: `${adminName} deleted account for ${targetName}` });
}

// ── Password Reset ────────────────────────────────────────────────────────────

export function notifyPasswordReset(
  adminId: string,
  adminName: string,
  adminRole: string,
  targetUserId: string,
  targetUserName: string
) {
  notify(targetUserId, "Password Reset",
    `Your password has been reset by ${adminName}. Contact your administrator for new credentials.`,
    "system", "security");
  const overseers = getUsersByRole("super_admin", "management").filter(p => p.id !== adminId && p.id !== targetUserId);
  for (const r of overseers) {
    notify(r.id, "Security Event: Password Reset",
      `${adminName} reset the password for ${targetUserName}.`,
      "system", "security");
  }
  AuditLogService.add({ action: "PASSWORD_RESET", entityType: "user", entityId: targetUserId, entityName: targetUserName, performedBy: adminId, performedByName: adminName, performedByRole: adminRole, description: `${adminName} reset password for ${targetUserName}` });
}

// ── Attendance Marked ─────────────────────────────────────────────────────────

export function notifyAttendanceMarked(
  markerId: string,
  markerName: string,
  employeeId: string,
  employeeName: string,
  date: string,
  status: string
) {
  notify(employeeId, "Attendance Recorded",
    `Your attendance for ${date} has been marked as "${status}" by ${markerName}.`,
    "system", "attendance", "/salary-slips", "View Payroll");

  AuditLogService.add({ action: "ATTENDANCE_MARKED", entityType: "attendance", entityId: employeeId, entityName: employeeName, performedBy: markerId, performedByName: markerName, performedByRole: "hr_admin", description: `${markerName} marked ${employeeName} as "${status}" on ${date}`, newValue: { date, status } });
}

// ── Attendance Edited ─────────────────────────────────────────────────────────

export function notifyAttendanceEdited(
  editorId: string,
  editorName: string,
  employeeId: string,
  employeeName: string,
  date: string,
  oldStatus: string,
  newStatus: string,
  reason: string
) {
  notify(employeeId, "Attendance Record Corrected",
    `Your attendance for ${date} was corrected from "${oldStatus}" to "${newStatus}". Reason: ${reason}.`,
    "system", "attendance");

  const overseers = getUsersByRole("super_admin", "management", "hr_admin").filter(r => r.id !== editorId && r.id !== employeeId);
  for (const r of overseers) {
    notify(r.id, "Attendance Correction Made",
      `${editorName} changed ${employeeName}'s attendance on ${date}: ${oldStatus} → ${newStatus}. Reason: ${reason}.`,
      "system", "attendance");
  }
  AuditLogService.add({ action: "ATTENDANCE_EDITED", entityType: "attendance", entityId: employeeId, entityName: employeeName, performedBy: editorId, performedByName: editorName, performedByRole: "super_admin", description: `${editorName} corrected ${employeeName}'s attendance on ${date}: ${oldStatus} → ${newStatus}. Reason: ${reason}`, newValue: { date, oldStatus, newStatus, reason } });
}

export function logAttendanceModified(
  hrAdminId: string,
  hrAdminName: string,
  employeeName: string,
  employeeId: string,
  date: string,
  status: string
) {
  const overseers = getUsersByRole("super_admin", "management", "hr_admin").filter(r => r.id !== hrAdminId);
  for (const r of overseers) {
    notify(r.id, "Attendance Updated",
      `${hrAdminName} marked ${employeeName} as "${status}" on ${date}.`,
      "system", "attendance");
  }
  AuditLogService.add({ action: "ATTENDANCE_MODIFIED", entityType: "attendance", entityId: employeeId, entityName: employeeName, performedBy: hrAdminId, performedByName: hrAdminName, performedByRole: "hr_admin", description: `${hrAdminName} marked ${employeeName} as "${status}" on ${date}`, newValue: { date, status } });
}

// ── Leave Request Submitted ───────────────────────────────────────────────────

export function notifyLeaveRequestSubmitted(
  employeeId: string,
  employeeName: string,
  employeeRole: string,
  leaveType: string,
  leaveId: string
) {
  const recipients = getUsersByRole("hr_admin", "management", "super_admin");
  for (const r of recipients) {
    notify(r.id, "New Leave Request",
      `${employeeName} submitted a ${leaveType} leave request.`,
      "system", "leave", "/hr/leave-requests", "Review Requests");
  }
  AuditLogService.add({ action: "LEAVE_SUBMITTED", entityType: "leave_request", entityId: leaveId, entityName: `${leaveType} Leave - ${employeeName}`, performedBy: employeeId, performedByName: employeeName, performedByRole: employeeRole, description: `${employeeName} submitted a ${leaveType} leave request` });
}

// ── Leave Approved / Rejected ─────────────────────────────────────────────────

export function notifyLeaveDecision(
  hrAdminId: string,
  hrAdminName: string,
  employeeId: string,
  employeeName: string,
  approved: boolean,
  leaveType: string,
  leaveId: string
) {
  notify(
    employeeId,
    approved ? "Leave Request Approved" : "Leave Request Rejected",
    `Your ${leaveType} leave request has been ${approved ? "approved" : "rejected"} by ${hrAdminName}.${!approved ? " It has been removed from payroll deductions." : " This leave will be deducted from your salary."}`,
    "system", "leave"
  );
  AuditLogService.add({ action: approved ? "LEAVE_APPROVED" : "LEAVE_REJECTED", entityType: "leave_request", entityId: leaveId, entityName: `${leaveType} Leave - ${employeeName}`, performedBy: hrAdminId, performedByName: hrAdminName, performedByRole: "hr_admin", description: `${hrAdminName} ${approved ? "approved" : "rejected"} ${employeeName}'s ${leaveType} leave request` });
}

// ── Payroll / Salary Slip Generated ──────────────────────────────────────────

export function notifySalarySlipGenerated(
  hrId: string,
  hrName: string,
  hrRole: string,
  employeeId: string,
  employeeName: string,
  month: string
) {
  notify(employeeId, "Salary Slip Generated",
    `Your salary slip for ${month} has been generated by ${hrName}. View your payroll breakdown.`,
    "payment", "payroll", "/salary-slips", "View Salary Slip");

  AuditLogService.add({ action: "SALARY_SLIP_GENERATED", entityType: "salary_slip", entityId: employeeId, entityName: employeeName, performedBy: hrId, performedByName: hrName, performedByRole: hrRole, description: `${hrName} generated salary slip for ${employeeName} — ${month}` });
}

export function notifyPayrollUpdated(
  hrAdminId: string,
  hrAdminName: string,
  employeeId: string,
  employeeName: string
) {
  notify(employeeId, "Payroll Updated",
    `Your payroll details have been updated by ${hrAdminName}.`,
    "payment", "payroll", "/salary-slips", "View Payroll");
  AuditLogService.add({ action: "PAYROLL_UPDATED", entityType: "payroll", entityId: employeeId, entityName: employeeName, performedBy: hrAdminId, performedByName: hrAdminName, performedByRole: "hr_admin", description: `${hrAdminName} updated payroll for ${employeeName}` });
}

// ── Advance Salary Requested ──────────────────────────────────────────────────

export function notifyAdvanceSalaryRequested(
  employeeId: string,
  employeeName: string,
  employeeRole: string,
  department: string,
  amount: number,
  requestId: string
) {
  const hrAdmins  = getUsersByRole("hr_admin", "management", "super_admin");
  const deptAdmins = getUsersByRole(deptAdminRoleFor(employeeRole)).filter(p => p.id !== employeeId);
  const allRecipients = [...hrAdmins, ...deptAdmins].filter((p, i, a) => a.findIndex(x => x.id === p.id) === i);

  for (const r of allRecipients) {
    notify(r.id, "Advance Salary Request",
      `${employeeName} (${department}) requested an advance salary of Rs. ${Math.round(amount).toLocaleString()}.`,
      "payment", "advance", "/hr/advance-salary", "Review Request");
  }
  AuditLogService.add({ action: "ADVANCE_SALARY_REQUESTED", entityType: "advance_salary", entityId: requestId, entityName: `Advance Request — ${employeeName}`, performedBy: employeeId, performedByName: employeeName, performedByRole: employeeRole, description: `${employeeName} requested advance salary of Rs. ${Math.round(amount).toLocaleString()}` });
}

// ── Advance Salary Decision ───────────────────────────────────────────────────

export function notifyAdvanceSalaryDecision(
  deciderId: string,
  deciderName: string,
  deciderRole: string,
  employeeId: string,
  employeeName: string,
  action: "approved" | "rejected" | "paid",
  amount: number,
  requestId: string,
  reason?: string
) {
  const messages: Record<string, string> = {
    approved: `Your advance salary request of Rs. ${Math.round(amount).toLocaleString()} has been approved by ${deciderName}.`,
    rejected: `Your advance salary request of Rs. ${Math.round(amount).toLocaleString()} was rejected by ${deciderName}.${reason ? ` Reason: ${reason}` : ""}`,
    paid:     `Your approved advance salary of Rs. ${Math.round(amount).toLocaleString()} has been marked as paid by ${deciderName}.`,
  };
  const titles: Record<string, string> = {
    approved: "Advance Salary Approved",
    rejected: "Advance Salary Rejected",
    paid:     "Advance Salary Disbursed",
  };
  notify(employeeId, titles[action], messages[action], "payment", "advance");

  AuditLogService.add({ action: `ADVANCE_SALARY_${action.toUpperCase()}` as string, entityType: "advance_salary", entityId: requestId, entityName: `Advance Request — ${employeeName}`, performedBy: deciderId, performedByName: deciderName, performedByRole: deciderRole, description: `${deciderName} ${action} advance salary of Rs. ${Math.round(amount).toLocaleString()} for ${employeeName}${reason ? ` (${reason})` : ""}` } as Parameters<typeof AuditLogService.add>[0]);
}

// ── Budget Allocated to Dept Admin ────────────────────────────────────────────

export function notifyBudgetAllocatedToDept(
  saId: string,
  saName: string,
  adminId: string,
  adminName: string,
  department: string,
  amount: number,
  isUpdate: boolean
) {
  notify(adminId,
    isUpdate ? "Budget Allocation Updated" : "Budget Allocated to Your Department",
    `${saName} ${isUpdate ? "updated" : "allocated"} Rs. ${Math.round(amount).toLocaleString()} to the ${department} department budget.`,
    "payment", "budget", "/budget", "View Budget");

  const mgmt = getUsersByRole("management").filter(p => p.id !== saId);
  for (const m of mgmt) {
    notify(m.id,
      `${department} Budget ${isUpdate ? "Updated" : "Allocated"}`,
      `${saName} ${isUpdate ? "updated" : "set"} the ${department} budget to Rs. ${Math.round(amount).toLocaleString()}.`,
      "payment", "budget", "/budget", "View Budget");
  }
  AuditLogService.add({ action: isUpdate ? "BUDGET_DEPT_UPDATED" : "BUDGET_DEPT_ALLOCATED", entityType: "budget", entityId: `dept-${department}`, entityName: `${department} Budget`, performedBy: saId, performedByName: saName, performedByRole: "super_admin", description: `${saName} ${isUpdate ? "updated" : "allocated"} ${department} budget to Rs. ${Math.round(amount).toLocaleString()}`, newValue: { amount, department } });
}

// ── Budget Allocated to Member ────────────────────────────────────────────────

export function notifyBudgetAllocatedToMember(
  adminId: string,
  adminName: string,
  adminRole: string,
  employeeId: string,
  employeeName: string,
  department: string,
  amount: number,
  isUpdate: boolean
) {
  notify(employeeId,
    isUpdate ? "Your Budget Allocation Updated" : "Budget Assigned to You",
    `${adminName} ${isUpdate ? "updated" : "assigned"} your budget to Rs. ${Math.round(amount).toLocaleString()} for ${department} department.`,
    "payment", "budget", "/my-budget", "View My Budget");

  AuditLogService.add({ action: isUpdate ? "BUDGET_MEMBER_UPDATED" : "BUDGET_MEMBER_ALLOCATED", entityType: "budget", entityId: employeeId, entityName: employeeName, performedBy: adminId, performedByName: adminName, performedByRole: adminRole, description: `${adminName} ${isUpdate ? "updated" : "allocated"} Rs. ${Math.round(amount).toLocaleString()} budget to ${employeeName} (${department})`, newValue: { amount, department } });
}

// ── Company Budget Events (SA-level) ──────────────────────────────────────────

export function notifyCompanyBudgetAction(
  saId: string,
  saName: string,
  action: "created" | "increased" | "reduced" | "updated" | "reset",
  newAmount: number,
  prevAmount: number
) {
  const mgmt = getUsersByRole("management");
  const label = { created: "Created", increased: "Increased", reduced: "Reduced", updated: "Updated", reset: "Reset" }[action];
  for (const m of mgmt) {
    notify(m.id, `Company Budget ${label}`,
      `${saName} ${action} the company budget.${action !== "reset" ? ` New total: Rs. ${Math.round(newAmount).toLocaleString()}.` : " All allocations have been reset."}`,
      "payment", "budget", "/budget", "View Budget");
  }
  AuditLogService.add({ action: `COMPANY_BUDGET_${action.toUpperCase()}`, entityType: "budget", entityId: "company-master", entityName: "Company Budget", performedBy: saId, performedByName: saName, performedByRole: "super_admin", description: `${saName} ${action} company budget: Rs. ${Math.round(prevAmount).toLocaleString()} → Rs. ${Math.round(newAmount).toLocaleString()}` });
}

// ── Budget Return ─────────────────────────────────────────────────────────────

export function notifyBudgetReturned(
  adminId: string,
  adminName: string,
  adminRole: string,
  department: string,
  returnedAmount: number,
  newDeptAllocated: number
) {
  const recipients = getUsersByRole("super_admin", "management").filter(p => p.id !== adminId);
  for (const r of recipients) {
    notify(r.id,
      `${department} Budget Returned`,
      `${adminName} returned Rs. ${Math.round(returnedAmount).toLocaleString()} from the ${department} department budget. New dept allocation: Rs. ${Math.round(newDeptAllocated).toLocaleString()}.`,
      "payment", "budget", "/budget", "View Budget");
  }
  AuditLogService.add({ action: "BUDGET_RETURNED", entityType: "budget", entityId: `dept-${department}`, entityName: `${department} Budget`, performedBy: adminId, performedByName: adminName, performedByRole: adminRole, description: `${adminName} returned Rs. ${Math.round(returnedAmount).toLocaleString()} from ${department} budget.` });
}

// ── Budget Request ────────────────────────────────────────────────────────────

export function notifyBudgetRequested(
  adminId: string,
  adminName: string,
  adminRole: string,
  department: string,
  requestedAmount: number,
  priority: string,
  requestId: string
) {
  const recipients = getUsersByRole("super_admin", "management").filter(p => p.id !== adminId);
  for (const r of recipients) {
    notify(r.id,
      `Budget Request — ${department}`,
      `${adminName} requested additional budget of Rs. ${Math.round(requestedAmount).toLocaleString()} for the ${department} department. Priority: ${priority}.`,
      "payment", "budget", "/budget", "Review Request");
  }
  AuditLogService.add({ action: "BUDGET_REQUEST_SUBMITTED", entityType: "budget", entityId: requestId, entityName: `${department} Budget Request`, performedBy: adminId, performedByName: adminName, performedByRole: adminRole, description: `${adminName} submitted a budget request of Rs. ${Math.round(requestedAmount).toLocaleString()} for ${department} (Priority: ${priority}).` });
}

export function notifyBudgetRequestActioned(
  saId: string,
  saName: string,
  adminId: string,
  department: string,
  status: "Approved" | "Rejected" | "Partially Approved",
  requestedAmount: number,
  approvedAmount: number,
  requestId: string
) {
  const actionLabel = status === "Approved" ? "approved" : status === "Rejected" ? "rejected" : "partially approved";
  const amountNote  = status === "Rejected"
    ? ""
    : ` Approved amount: Rs. ${Math.round(approvedAmount).toLocaleString()}.`;

  notify(adminId,
    `Budget Request ${status}`,
    `Your budget request of Rs. ${Math.round(requestedAmount).toLocaleString()} for ${department} has been ${actionLabel}.${amountNote}`,
    "payment", "budget", "/budget", "View Budget");

  const saRecips = getUsersByRole("super_admin", "management").filter(p => p.id !== saId && p.id !== adminId);
  for (const r of saRecips) {
    notify(r.id,
      `Budget Request ${status}`,
      `${saName} ${actionLabel} a budget request of Rs. ${Math.round(requestedAmount).toLocaleString()} for ${department}.${amountNote}`,
      "payment", "budget", "/budget", "View Budget");
  }
  AuditLogService.add({ action: `BUDGET_REQUEST_${status.toUpperCase().replace(" ", "_")}`, entityType: "budget", entityId: requestId, entityName: `${department} Budget Request`, performedBy: saId, performedByName: saName, performedByRole: "super_admin", description: `${saName} ${actionLabel} ${department} budget request: Rs. ${Math.round(requestedAmount).toLocaleString()} requested, Rs. ${Math.round(approvedAmount).toLocaleString()} approved.` });
}

// ── Project Events ────────────────────────────────────────────────────────────

export function notifyProjectCreated(
  creatorId: string,
  creatorName: string,
  creatorRole: string,
  projectName: string,
  projectId: string
) {
  const recipients = getUsersByRole("management", "super_admin").filter(p => p.id !== creatorId);
  for (const r of recipients) {
    notify(r.id, "New Project Created",
      `${creatorName} created a new project: "${projectName}".`,
      "project", "project");
  }
  AuditLogService.add({ action: "PROJECT_CREATED", entityType: "project", entityId: projectId, entityName: projectName, performedBy: creatorId, performedByName: creatorName, performedByRole: creatorRole, description: `${creatorName} created project "${projectName}"` });
}

export function notifyProjectUpdated(
  updaterId: string,
  updaterName: string,
  updaterRole: string,
  projectName: string,
  projectId: string,
  change: string
) {
  const dept = updaterRole.replace("_member", "").replace("_admin", "");
  const admins = getUsersByRole(`${dept}_admin`, "management", "super_admin").filter(p => p.id !== updaterId);
  for (const a of admins) {
    notify(a.id, "Project Updated",
      `${updaterName} updated project "${projectName}": ${change}.`,
      "project", "project");
  }
  AuditLogService.add({ action: "PROJECT_UPDATED", entityType: "project", entityId: projectId, entityName: projectName, performedBy: updaterId, performedByName: updaterName, performedByRole: updaterRole, description: `${updaterName} updated project "${projectName}": ${change}` });
}

// ── Task Events ───────────────────────────────────────────────────────────────

export function notifyTaskAssigned(
  assignerId: string,
  assignerName: string,
  assignerRole: string,
  assigneeId: string,
  assigneeName: string,
  taskTitle: string,
  taskId: string
) {
  notify(assigneeId, "Task Assigned to You",
    `${assignerName} assigned you task: "${taskTitle}".`,
    "project", "task", "/production/tasks", "View Task");
  AuditLogService.add({ action: "TASK_ASSIGNED", entityType: "task", entityId: taskId, entityName: taskTitle, performedBy: assignerId, performedByName: assignerName, performedByRole: assignerRole, description: `${assignerName} assigned task "${taskTitle}" to ${assigneeName}` });
}

export function notifyTaskStatusChanged(
  changerId: string,
  changerName: string,
  changerRole: string,
  taskTitle: string,
  taskId: string,
  newStatus: string
) {
  const dept = changerRole.replace("_member", "").replace("_admin", "");
  const admins = getUsersByRole(`${dept}_admin`).filter(p => p.id !== changerId);
  for (const a of admins) {
    notify(a.id, "Task Status Updated",
      `${changerName} moved "${taskTitle}" to ${newStatus}.`,
      "project", "task");
  }
  AuditLogService.add({ action: "TASK_UPDATED", entityType: "task", entityId: taskId, entityName: taskTitle, performedBy: changerId, performedByName: changerName, performedByRole: changerRole, description: `${changerName} changed task "${taskTitle}" status to ${newStatus}` });
}

export function notifyTaskCompleted(
  completerId: string,
  completerName: string,
  completerRole: string,
  taskTitle: string,
  taskId: string
) {
  const dept = completerRole.replace("_member", "").replace("_admin", "");
  const recipients = getUsersByRole("super_admin", "management", "hr_admin", `${dept}_admin`).filter(p => p.id !== completerId);
  for (const r of recipients) {
    notify(r.id, "Task Completed",
      `${completerName} completed task: "${taskTitle}".`,
      "project", "task");
  }
  AuditLogService.add({ action: "TASK_COMPLETED", entityType: "task", entityId: taskId, entityName: taskTitle, performedBy: completerId, performedByName: completerName, performedByRole: completerRole, description: `${completerName} completed task "${taskTitle}"` });
}

// ── Campaign Created ──────────────────────────────────────────────────────────

export function notifyCampaignCreated(
  creatorId: string,
  creatorName: string,
  creatorRole: string,
  campaignName: string,
  campaignId: string
) {
  const management = getUsersByRole("management", "super_admin").filter(p => p.id !== creatorId);
  for (const m of management) {
    notify(m.id, "New Campaign Created",
      `${creatorName} created marketing campaign: "${campaignName}".`,
      "system", "campaign");
  }
  AuditLogService.add({ action: "CAMPAIGN_CREATED", entityType: "campaign", entityId: campaignId, entityName: campaignName, performedBy: creatorId, performedByName: creatorName, performedByRole: creatorRole, description: `${creatorName} created campaign "${campaignName}"` });
}

// ── Deliverable Events ────────────────────────────────────────────────────────

export function notifyDeliverableApproved(
  approverId: string,
  approverName: string,
  clientId: string,
  clientName: string,
  deliverableTitle: string,
  deliverableId: string
) {
  notify(clientId, "Deliverable Ready",
    `Your deliverable "${deliverableTitle}" has been approved and is ready for review.`,
    "project", "production", "/client/dashboard", "View Dashboard");
  AuditLogService.add({ action: "DELIVERABLE_APPROVED", entityType: "deliverable", entityId: deliverableId, entityName: deliverableTitle, performedBy: approverId, performedByName: approverName, performedByRole: "production_admin", description: `${approverName} approved deliverable "${deliverableTitle}" for client ${clientName}` });
}

export function notifyDeliverableUploaded(
  uploaderId: string,
  uploaderName: string,
  uploaderRole: string,
  deliverableTitle: string,
  deliverableId: string,
  clientName: string
) {
  const prodAdmins = getUsersByRole("production_admin");
  for (const a of prodAdmins) {
    notify(a.id, "Deliverable Uploaded",
      `${uploaderName} uploaded deliverable "${deliverableTitle}" for client ${clientName}.`,
      "project", "production", "/production/deliverables", "Review");
  }
  AuditLogService.add({ action: "DELIVERABLE_UPLOADED", entityType: "deliverable", entityId: deliverableId, entityName: deliverableTitle, performedBy: uploaderId, performedByName: uploaderName, performedByRole: uploaderRole, description: `${uploaderName} uploaded deliverable "${deliverableTitle}" for client ${clientName}` });
}

// ── Client Events ─────────────────────────────────────────────────────────────

export function notifyClientCreated(
  creatorId: string,
  creatorName: string,
  creatorRole: string,
  clientName: string,
  clientId: string
) {
  const recipients = getUsersByRole("production_admin", "management", "super_admin").filter(p => p.id !== creatorId);
  for (const r of recipients) {
    notify(r.id, "New Client Created",
      `${creatorName} created a new client: ${clientName}.`,
      "system", "client");
  }
  AuditLogService.add({ action: "CLIENT_CREATED", entityType: "client", entityId: clientId, entityName: clientName, performedBy: creatorId, performedByName: creatorName, performedByRole: creatorRole, description: `${creatorName} created client "${clientName}"` });
}

export function notifyClientAssigned(
  adminId: string,
  adminName: string,
  memberId: string,
  memberName: string,
  clientName: string,
  clientId: string
) {
  notify(memberId, "Client Assigned to You",
    `${adminName} assigned client "${clientName}" to you.`,
    "system", "client");
  AuditLogService.add({ action: "CLIENT_ASSIGNED", entityType: "client", entityId: clientId, entityName: clientName, performedBy: adminId, performedByName: adminName, performedByRole: "production_admin", description: `${adminName} assigned client "${clientName}" to ${memberName}` });
}

// ── Login / Security Events ───────────────────────────────────────────────────

export function notifyLoginActivity(
  userId: string,
  userName: string,
  role: string,
  ip?: string
) {
  const recipients = getUsersByRole("super_admin", "management");
  for (const r of recipients) {
    if (r.id === userId) continue;
    notify(r.id, "Login Activity",
      `${userName} (${role}) logged in${ip ? ` from ${ip}` : ""}.`,
      "system", "login");
  }
  AuditLogService.add({ action: "USER_LOGIN", entityType: "security", entityId: userId, entityName: userName, performedBy: userId, performedByName: userName, performedByRole: role, description: `${userName} logged in${ip ? ` from ${ip}` : ""}` });
}

export function notifySecurityEvent(
  eventType: string,
  description: string,
  performedBy: string,
  performedByName: string,
  performedByRole = "system"
) {
  const recipients = getUsersByRole("super_admin", "management");
  for (const r of recipients) {
    notify(r.id, `Security Event: ${eventType}`,
      description,
      "system", "security");
  }
  AuditLogService.add({ action: "SECURITY_EVENT", entityType: "security", entityId: performedBy, entityName: performedByName, performedBy, performedByName, performedByRole, description });
}

// ── Budget Changed (legacy, kept for compatibility) ───────────────────────────

export function notifyBudgetChanged(
  changerId: string,
  changerName: string,
  changerRole: string,
  entityName: string,
  entityId: string,
  newBudget: number
) {
  const management = getUsersByRole("management", "super_admin").filter(p => p.id !== changerId);
  for (const m of management) {
    notify(m.id, "Budget Updated",
      `${changerName} updated budget for "${entityName}" to Rs. ${newBudget.toLocaleString()}.`,
      "payment", "budget");
  }
  AuditLogService.add({ action: "BUDGET_CHANGED", entityType: "task", entityId: entityId, entityName: entityName, performedBy: changerId, performedByName: changerName, performedByRole: changerRole, description: `${changerName} changed budget for "${entityName}" to Rs. ${newBudget.toLocaleString()}`, newValue: { budget: newBudget } });
}


// ── Projects ──────────────────────────────────────────────────────────────────

export function notifyProjectDeleted(deleterId: string, deleterName: string, deleterRole: string, projectName: string, projectId: string) {
  const recipients = getUsersByRole("super_admin", "management").filter(p => p.id !== deleterId);
  for (const r of recipients) {
    notify(r.id, "Project Deleted", `${deleterName} deleted project "${projectName}".`, "project", "project");
  }
  AuditLogService.add({ action: "PROJECT_DELETED", entityType: "project", entityId: projectId, entityName: projectName, performedBy: deleterId, performedByName: deleterName, performedByRole: deleterRole, description: `${deleterName} deleted project "${projectName}"` });
}

export function notifyProjectStatusChanged(changerId: string, changerName: string, changerRole: string, projectName: string, projectId: string, newStatus: string) {
  const dept = changerRole.replace("_member", "").replace("_admin", "");
  const recipients = getUsersByRole("super_admin", "management", `${dept}_admin`).filter(p => p.id !== changerId);
  for (const r of recipients) {
    notify(r.id, "Project Status Changed", `${changerName} changed project "${projectName}" status to ${newStatus}.`, "project", "project");
  }
  AuditLogService.add({ action: "PROJECT_STATUS_CHANGED", entityType: "project", entityId: projectId, entityName: projectName, performedBy: changerId, performedByName: changerName, performedByRole: changerRole, description: `${changerName} changed project "${projectName}" status to ${newStatus}` });
}

// ── Tasks ─────────────────────────────────────────────────────────────────────

export function notifyTaskCreated(creatorId: string, creatorName: string, creatorRole: string, taskTitle: string, taskId: string, assigneeId?: string) {
  const recipients = getUsersByRole("super_admin", "management").filter(p => p.id !== creatorId);
  if (assigneeId && assigneeId !== creatorId && !recipients.find(r => r.id === assigneeId)) {
    notify(assigneeId, "New Task Assigned", `${creatorName} created and assigned you task: "${taskTitle}".`, "project", "task");
  }
  for (const r of recipients) {
    notify(r.id, "New Task Created", `${creatorName} created task "${taskTitle}".`, "project", "task");
  }
  AuditLogService.add({ action: "TASK_CREATED", entityType: "task", entityId: taskId, entityName: taskTitle, performedBy: creatorId, performedByName: creatorName, performedByRole: creatorRole, description: `${creatorName} created task "${taskTitle}"` });
}

export function notifyTaskUpdated(updaterId: string, updaterName: string, updaterRole: string, taskTitle: string, taskId: string, assigneeId?: string) {
  const recipients = getUsersByRole("super_admin", "management").filter(p => p.id !== updaterId);
  if (assigneeId && assigneeId !== updaterId) notify(assigneeId, "Task Updated", `${updaterName} updated your task "${taskTitle}".`, "project", "task");
  for (const r of recipients) notify(r.id, "Task Updated", `${updaterName} updated task "${taskTitle}".`, "project", "task");
  AuditLogService.add({ action: "TASK_UPDATED", entityType: "task", entityId: taskId, entityName: taskTitle, performedBy: updaterId, performedByName: updaterName, performedByRole: updaterRole, description: `${updaterName} updated task "${taskTitle}"` });
}

export function notifyTaskDeleted(deleterId: string, deleterName: string, deleterRole: string, taskTitle: string, taskId: string, assigneeId?: string) {
  const recipients = getUsersByRole("super_admin", "management").filter(p => p.id !== deleterId);
  if (assigneeId && assigneeId !== deleterId) notify(assigneeId, "Task Deleted", `${deleterName} deleted task "${taskTitle}".`, "project", "task");
  for (const r of recipients) notify(r.id, "Task Deleted", `${deleterName} deleted task "${taskTitle}".`, "project", "task");
  AuditLogService.add({ action: "TASK_DELETED", entityType: "task", entityId: taskId, entityName: taskTitle, performedBy: deleterId, performedByName: deleterName, performedByRole: deleterRole, description: `${deleterName} deleted task "${taskTitle}"` });
}

export function notifyTaskReassigned(assignerId: string, assignerName: string, assignerRole: string, taskTitle: string, taskId: string, oldAssigneeId: string, newAssigneeId: string) {
  const recipients = getUsersByRole("super_admin", "management").filter(p => p.id !== assignerId);
  notify(oldAssigneeId, "Task Unassigned", `${assignerName} removed you from task "${taskTitle}".`, "project", "task");
  notify(newAssigneeId, "Task Assigned", `${assignerName} assigned you task "${taskTitle}".`, "project", "task");
  for (const r of recipients) notify(r.id, "Task Reassigned", `${assignerName} reassigned task "${taskTitle}".`, "project", "task");
  AuditLogService.add({ action: "TASK_REASSIGNED", entityType: "task", entityId: taskId, entityName: taskTitle, performedBy: assignerId, performedByName: assignerName, performedByRole: assignerRole, description: `${assignerName} reassigned task "${taskTitle}"` });
}

// ── Clients ───────────────────────────────────────────────────────────────────

export function notifyClientUpdated(updaterId: string, updaterName: string, updaterRole: string, clientName: string, clientId: string) {
  const recipients = getUsersByRole("super_admin", "management", "production_admin").filter(p => p.id !== updaterId);
  for (const r of recipients) notify(r.id, "Client Updated", `${updaterName} updated client ${clientName}.`, "system", "client");
  AuditLogService.add({ action: "CLIENT_UPDATED", entityType: "client", entityId: clientId, entityName: clientName, performedBy: updaterId, performedByName: updaterName, performedByRole: updaterRole, description: `${updaterName} updated client "${clientName}"` });
}

export function notifyClientDeleted(deleterId: string, deleterName: string, deleterRole: string, clientName: string, clientId: string) {
  const recipients = getUsersByRole("super_admin", "management", "production_admin").filter(p => p.id !== deleterId);
  for (const r of recipients) notify(r.id, "Client Deleted", `${deleterName} deleted client ${clientName}.`, "system", "client");
  AuditLogService.add({ action: "CLIENT_DELETED", entityType: "client", entityId: clientId, entityName: clientName, performedBy: deleterId, performedByName: deleterName, performedByRole: deleterRole, description: `${deleterName} deleted client "${clientName}"` });
}

export function notifyClientConversationStarted(creatorId: string, creatorName: string, creatorRole: string, clientId: string, clientName: string, subject: string) {
  const recipients = getUsersByRole("super_admin", "management").filter(p => p.id !== creatorId);
  notify(clientId, "New Conversation", `${creatorName} started a conversation: "${subject}".`, "system", "message");
  for (const r of recipients) notify(r.id, "Conversation Started", `${creatorName} started conversation with ${clientName}: "${subject}".`, "system", "message");
}

export function notifyClientMessageSent(clientId: string, clientName: string, assignedUserId: string, assignedDept: string, subject: string) {
  const recipients = getUsersByRole("super_admin", "management", `${assignedDept.toLowerCase()}_admin`);
  notify(assignedUserId, "New Message from Client", `${clientName} sent a message in "${subject}".`, "system", "message");
  for (const r of recipients.filter(p => p.id !== assignedUserId)) notify(r.id, "Client Message", `${clientName} replied in "${subject}".`, "system", "message");
}

export function notifyClientMessageReply(replierId: string, replierName: string, replierRole: string, clientId: string, clientName: string, subject: string) {
  const recipients = getUsersByRole("super_admin", "management").filter(p => p.id !== replierId);
  notify(clientId, "New Reply", `${replierName} replied to "${subject}".`, "system", "message");
  for (const r of recipients) notify(r.id, "Team Reply", `${replierName} replied to ${clientName} in "${subject}".`, "system", "message");
}

export function notifyClientRevisionSubmitted(clientId: string, clientName: string, projectId: string, projectName: string) {
  const recipients = getUsersByRole("super_admin", "management", "production_admin");
  for (const r of recipients) notify(r.id, "Revision Requested", `Client ${clientName} submitted a revision for project "${projectName}".`, "project", "project");
}

export function notifyClientProfileUpdated(clientId: string, clientName: string) {
  const recipients = getUsersByRole("super_admin", "management", "production_admin");
  for (const r of recipients) notify(r.id, "Client Profile Updated", `Client ${clientName} updated their profile.`, "system", "client");
}

// ── Invoices ──────────────────────────────────────────────────────────────────

export function notifyInvoiceCreated(creatorId: string, creatorName: string, creatorRole: string, clientId: string, clientName: string, invoiceNumber: string, amount: number) {
  const recipients = getUsersByRole("super_admin", "management").filter(p => p.id !== creatorId);
  notify(clientId, "New Invoice", `A new invoice (${invoiceNumber}) for $${amount} has been generated.`, "payment", "payroll");
  for (const r of recipients) notify(r.id, "Invoice Created", `${creatorName} created invoice ${invoiceNumber} for ${clientName}.`, "payment", "payroll");
  AuditLogService.add({ action: "INVOICE_CREATED", entityType: "invoice", entityId: invoiceNumber, entityName: `Invoice ${invoiceNumber}`, performedBy: creatorId, performedByName: creatorName, performedByRole: creatorRole, description: `${creatorName} created invoice ${invoiceNumber} for ${clientName}` });
}

export function notifyInvoiceUpdated(updaterId: string, updaterName: string, updaterRole: string, clientId: string, clientName: string, invoiceNumber: string) {
  const recipients = getUsersByRole("super_admin", "management").filter(p => p.id !== updaterId);
  notify(clientId, "Invoice Updated", `Invoice ${invoiceNumber} has been updated.`, "payment", "payroll");
  for (const r of recipients) notify(r.id, "Invoice Updated", `${updaterName} updated invoice ${invoiceNumber} for ${clientName}.`, "payment", "payroll");
  AuditLogService.add({ action: "INVOICE_UPDATED", entityType: "invoice", entityId: invoiceNumber, entityName: `Invoice ${invoiceNumber}`, performedBy: updaterId, performedByName: updaterName, performedByRole: updaterRole, description: `${updaterName} updated invoice ${invoiceNumber} for ${clientName}` });
}

export function notifyInvoiceDeleted(deleterId: string, deleterName: string, deleterRole: string, clientId: string, clientName: string, invoiceNumber: string) {
  const recipients = getUsersByRole("super_admin", "management").filter(p => p.id !== deleterId);
  notify(clientId, "Invoice Deleted", `Invoice ${invoiceNumber} has been cancelled.`, "payment", "payroll");
  for (const r of recipients) notify(r.id, "Invoice Deleted", `${deleterName} deleted invoice ${invoiceNumber} for ${clientName}.`, "payment", "payroll");
  AuditLogService.add({ action: "INVOICE_DELETED", entityType: "invoice", entityId: invoiceNumber, entityName: `Invoice ${invoiceNumber}`, performedBy: deleterId, performedByName: deleterName, performedByRole: deleterRole, description: `${deleterName} deleted invoice ${invoiceNumber} for ${clientName}` });
}

// ── HR Additional ─────────────────────────────────────────────────────────────

export function notifyBulkSalarySlipsGenerated(hrId: string, hrName: string, hrRole: string, count: number, month: string) {
  const recipients = getUsersByRole("super_admin", "management").filter(p => p.id !== hrId);
  for (const r of recipients) notify(r.id, "Bulk Payroll Generated", `${hrName} generated ${count} salary slips for ${month}.`, "payment", "payroll");
  AuditLogService.add({ action: "BULK_SALARY_SLIPS", entityType: "payroll", entityId: month, entityName: `Payroll ${month}`, performedBy: hrId, performedByName: hrName, performedByRole: hrRole, description: `${hrName} generated ${count} salary slips for ${month}` });
}
export function notifySalarySlipDeleted(hrId: string, hrName: string, hrRole: string, employeeId: string, employeeName: string, month: string) {
  const recipients = getUsersByRole("super_admin", "management").filter(p => p.id !== hrId);
  for (const r of recipients) notify(r.id, "Salary Slip Deleted", `${hrName} deleted the salary slip for ${employeeName} (${month}).`, "payment", "payroll");
  AuditLogService.add({ action: "SALARY_SLIP_DELETED", entityType: "payroll", entityId: employeeId, entityName: `Payroll ${employeeName}`, performedBy: hrId, performedByName: hrName, performedByRole: hrRole, description: `${hrName} deleted salary slip for ${employeeName} (${month})` });
}

// ── Generic ───────────────────────────────────────────────────────────────────

export function notifyGenericAction(userId: string, userName: string, userRole: string, actionType: string, description: string, moduleName: NotificationModule) {
  const recipients = getUsersByRole("super_admin", "management").filter(p => p.id !== userId);
  for (const r of recipients) notify(r.id, actionType, `${userName}: ${description}`, "system", moduleName);
  AuditLogService.add({ action: actionType.toUpperCase().replace(/\s/g, '_'), entityType: "system", entityId: "sys", entityName: actionType, performedBy: userId, performedByName: userName, performedByRole: userRole, description: `${userName}: ${description}` });
}

// ── Sales Campaign Budget ──────────────────────────────────────────────────────

export function notifySalesBudgetCreated(creatorId: string, creatorName: string, creatorRole: string, campaignName: string, campaignId: string) {
  const recipients = getUsersByRole("super_admin", "management", "sales_admin").filter(p => p.id !== creatorId);
  for (const r of recipients) notify(r.id, "Campaign Budget Created", `${creatorName} created a new campaign budget: "${campaignName}".`, "system", "sales");
  AuditLogService.add({ action: "CAMPAIGN_BUDGET_CREATED", entityType: "campaign", entityId: campaignId, entityName: campaignName, performedBy: creatorId, performedByName: creatorName, performedByRole: creatorRole, description: `${creatorName} created campaign budget "${campaignName}"` });
}

export function notifySalesBudgetUpdated(updaterId: string, updaterName: string, updaterRole: string, campaignName: string, campaignId: string) {
  const recipients = getUsersByRole("super_admin", "management", "sales_admin").filter(p => p.id !== updaterId);
  for (const r of recipients) notify(r.id, "Campaign Budget Updated", `${updaterName} updated campaign budget: "${campaignName}".`, "system", "sales");
  AuditLogService.add({ action: "CAMPAIGN_BUDGET_UPDATED", entityType: "campaign", entityId: campaignId, entityName: campaignName, performedBy: updaterId, performedByName: updaterName, performedByRole: updaterRole, description: `${updaterName} updated campaign budget "${campaignName}"` });
}

export function notifySalesBudgetDeleted(deleterId: string, deleterName: string, deleterRole: string, campaignName: string, campaignId: string) {
  const recipients = getUsersByRole("super_admin", "management", "sales_admin").filter(p => p.id !== deleterId);
  for (const r of recipients) notify(r.id, "Campaign Budget Deleted", `${deleterName} deleted campaign budget: "${campaignName}".`, "system", "sales");
  AuditLogService.add({ action: "CAMPAIGN_BUDGET_DELETED", entityType: "campaign", entityId: campaignId, entityName: campaignName, performedBy: deleterId, performedByName: deleterName, performedByRole: deleterRole, description: `${deleterName} deleted campaign budget "${campaignName}"` });
}

// ── Client Portal Message (from Client side) ──────────────────────────────────

export function notifyClientPortalMessageSent(clientId: string, clientName: string, assignedUserId: string, assignedDept: string, subject: string, convId: string) {
  const deptAdminRole = `${assignedDept.toLowerCase()}_admin`;
  const recipients = getUsersByRole("super_admin", "management", deptAdminRole);
  notify(assignedUserId, "New Message from Client", `${clientName} sent a message in "${subject}".`, "system", "message", `/admin/conversations`);
  for (const r of recipients.filter(p => p.id !== assignedUserId)) {
    notify(r.id, "Client Message", `${clientName} replied in "${subject}".`, "system", "message", `/admin/conversations`);
  }
}

// ── IT Support Tickets ─────────────────────────────────────────────────────────

export function notifyTicketCreated(creatorId: string, creatorName: string, creatorRole: string, ticketId: string, ticketTitle: string, priority: string) {
  const recipients = getUsersByRole("super_admin", "management", "it_admin");
  for (const r of recipients.filter(p => p.id !== creatorId)) {
    notify(r.id, "New IT Ticket", `${creatorName} submitted a ${priority} priority ticket: "${ticketTitle}".`, "system", "ticket", `/it-tickets`);
  }
  AuditLogService.add({ action: "TICKET_CREATED", entityType: "ticket", entityId: ticketId, entityName: ticketTitle, performedBy: creatorId, performedByName: creatorName, performedByRole: creatorRole, description: `${creatorName} submitted IT ticket "${ticketTitle}"` });
}

export function notifyTicketAssigned(assignerId: string, assignerName: string, assignerRole: string, assigneeId: string, assigneeName: string, ticketId: string, ticketTitle: string) {
  notify(assigneeId, "IT Ticket Assigned", `You have been assigned ticket: "${ticketTitle}".`, "system", "ticket", `/it-tickets`);
  const recipients = getUsersByRole("super_admin", "management").filter(p => p.id !== assignerId && p.id !== assigneeId);
  for (const r of recipients) notify(r.id, "Ticket Assigned", `${assignerName} assigned "${ticketTitle}" to ${assigneeName}.`, "system", "ticket");
}

export function notifyTicketStatusChanged(actorId: string, actorName: string, actorRole: string, requesterId: string, ticketId: string, ticketTitle: string, newStatus: string) {
  // Notify requester
  notify(requesterId, "Ticket Status Update", `Your ticket "${ticketTitle}" is now ${newStatus}.`, "system", "ticket", `/it-tickets`);
  const recipients = getUsersByRole("super_admin", "management", "it_admin").filter(p => p.id !== actorId && p.id !== requesterId);
  for (const r of recipients) notify(r.id, "Ticket Updated", `${actorName} set "${ticketTitle}" to ${newStatus}.`, "system", "ticket");
  AuditLogService.add({ action: `TICKET_${newStatus.toUpperCase().replace('-','_')}`, entityType: "ticket", entityId: ticketId, entityName: ticketTitle, performedBy: actorId, performedByName: actorName, performedByRole: actorRole, description: `${actorName} changed ticket "${ticketTitle}" status to ${newStatus}` });
}

// ── Sales Leads ────────────────────────────────────────────────────────────────

export function notifyLeadCreated(creatorId: string, creatorName: string, creatorRole: string, leadName: string, leadId: string) {
  const recipients = getUsersByRole("super_admin", "management", "sales_admin").filter(p => p.id !== creatorId);
  for (const r of recipients) notify(r.id, "New Lead Created", `${creatorName} added a new lead: "${leadName}".`, "system", "sales");
  AuditLogService.add({ action: "LEAD_CREATED", entityType: "lead", entityId: leadId, entityName: leadName, performedBy: creatorId, performedByName: creatorName, performedByRole: creatorRole, description: `${creatorName} created lead "${leadName}"` });
}

export function notifyLeadUpdated(updaterId: string, updaterName: string, updaterRole: string, leadName: string, leadId: string) {
  const recipients = getUsersByRole("super_admin", "management", "sales_admin").filter(p => p.id !== updaterId);
  for (const r of recipients) notify(r.id, "Lead Updated", `${updaterName} updated lead: "${leadName}".`, "system", "sales");
  AuditLogService.add({ action: "LEAD_UPDATED", entityType: "lead", entityId: leadId, entityName: leadName, performedBy: updaterId, performedByName: updaterName, performedByRole: updaterRole, description: `${updaterName} updated lead "${leadName}"` });
}

export function notifyLeadDeleted(deleterId: string, deleterName: string, deleterRole: string, leadName: string, leadId: string) {
  const recipients = getUsersByRole("super_admin", "management", "sales_admin").filter(p => p.id !== deleterId);
  for (const r of recipients) notify(r.id, "Lead Deleted", `${deleterName} deleted lead: "${leadName}".`, "system", "sales");
  AuditLogService.add({ action: "LEAD_DELETED", entityType: "lead", entityId: leadId, entityName: leadName, performedBy: deleterId, performedByName: deleterName, performedByRole: deleterRole, description: `${deleterName} deleted lead "${leadName}"` });
}

export function notifyLeadConverted(converterId: string, converterName: string, converterRole: string, leadName: string, leadId: string) {
  const recipients = getUsersByRole("super_admin", "management", "sales_admin", "production_admin").filter(p => p.id !== converterId);
  for (const r of recipients) notify(r.id, "Lead Converted to Client", `${converterName} converted lead "${leadName}" to a client.`, "system", "client");
  AuditLogService.add({ action: "LEAD_CONVERTED", entityType: "lead", entityId: leadId, entityName: leadName, performedBy: converterId, performedByName: converterName, performedByRole: converterRole, description: `${converterName} converted lead "${leadName}" to a client` });
}
