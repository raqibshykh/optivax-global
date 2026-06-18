/**
 * Role-based notification helpers.
 * Each function fires the right set of notifications for a specific system event.
 * All helpers read the user list from localStorage (mock_profiles) to find recipients.
 */
import { NotificationService } from "./notificationService";
import { AuditLogService } from "./auditLogService";
import { safeParse } from "../lib/storage";

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
  type: "invoice" | "project" | "payment" | "system" | "profile" = "system",
  actionUrl?: string,
  actionLabel?: string
) => {
  NotificationService.create({
    userId,
    title,
    message,
    type,
    read: false,
    createdAt: new Date().toISOString(),
    actionUrl,
    actionLabel,
  }).catch(() => {});
};

// ── Client Created (Sales Admin creates client) ─────────────────────────────

export function notifyClientCreated(
  creatorId: string,
  creatorName: string,
  creatorRole: string,
  clientName: string,
  clientId: string
) {
  const recipients = getUsersByRole("production_admin", "management", "super_admin").filter(
    (p) => p.id !== creatorId
  );
  for (const r of recipients) {
    notify(
      r.id,
      "New Client Created",
      `${creatorName} created a new client: ${clientName}.`,
      "system",
      "#/production/dashboard",
      "View Clients"
    );
  }
  AuditLogService.add({
    action: "CLIENT_CREATED",
    entityType: "client",
    entityId: clientId,
    entityName: clientName,
    performedBy: creatorId,
    performedByName: creatorName,
    performedByRole: creatorRole,
    description: `${creatorName} created client "${clientName}"`,
  });
}

// ── Client Assigned (Production Admin assigns client to member) ─────────────

export function notifyClientAssigned(
  adminId: string,
  adminName: string,
  memberId: string,
  memberName: string,
  clientName: string,
  clientId: string
) {
  notify(
    memberId,
    "Client Assigned to You",
    `${adminName} assigned client "${clientName}" to you.`,
    "system",
    "#/production/dashboard",
    "View My Clients"
  );
  AuditLogService.add({
    action: "CLIENT_ASSIGNED",
    entityType: "client",
    entityId: clientId,
    entityName: clientName,
    performedBy: adminId,
    performedByName: adminName,
    performedByRole: "production_admin",
    description: `${adminName} assigned client "${clientName}" to ${memberName}`,
  });
}

// ── Task Assigned ────────────────────────────────────────────────────────────

export function notifyTaskAssigned(
  assignerId: string,
  assignerName: string,
  assignerRole: string,
  assigneeId: string,
  assigneeName: string,
  taskTitle: string,
  taskId: string
) {
  notify(
    assigneeId,
    "Task Assigned to You",
    `${assignerName} assigned you task: "${taskTitle}".`,
    "project",
    "#/production/tasks",
    "View Task"
  );
  AuditLogService.add({
    action: "TASK_ASSIGNED",
    entityType: "task",
    entityId: taskId,
    entityName: taskTitle,
    performedBy: assignerId,
    performedByName: assignerName,
    performedByRole: assignerRole,
    description: `${assignerName} assigned task "${taskTitle}" to ${assigneeName}`,
  });
}

// ── Task Status Changed ──────────────────────────────────────────────────────

export function notifyTaskStatusChanged(
  changerId: string,
  changerName: string,
  changerRole: string,
  taskTitle: string,
  taskId: string,
  newStatus: string
) {
  const dept = changerRole.replace("_member", "").replace("_admin", "");
  const admins = getUsersByRole(`${dept}_admin`).filter((p) => p.id !== changerId);
  for (const a of admins) {
    notify(
      a.id,
      "Task Status Updated",
      `${changerName} moved "${taskTitle}" to ${newStatus}.`,
      "project"
    );
  }
  AuditLogService.add({
    action: "TASK_UPDATED",
    entityType: "task",
    entityId: taskId,
    entityName: taskTitle,
    performedBy: changerId,
    performedByName: changerName,
    performedByRole: changerRole,
    description: `${changerName} changed task "${taskTitle}" status to ${newStatus}`,
  });
}

// ── Task Completed ────────────────────────────────────────────────────────────

export function notifyTaskCompleted(
  completerId: string,
  completerName: string,
  completerRole: string,
  taskTitle: string,
  taskId: string
) {
  const dept = completerRole.replace("_member", "").replace("_admin", "");
  const recipients = getUsersByRole("super_admin", "management", "hr_admin", `${dept}_admin`).filter(
    (p) => p.id !== completerId
  );
  for (const r of recipients) {
    notify(
      r.id,
      "Task Completed",
      `${completerName} completed task: "${taskTitle}".`,
      "project"
    );
  }
  AuditLogService.add({
    action: "TASK_COMPLETED",
    entityType: "task",
    entityId: taskId,
    entityName: taskTitle,
    performedBy: completerId,
    performedByName: completerName,
    performedByRole: completerRole,
    description: `${completerName} completed task "${taskTitle}"`,
  });
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
    const actionUrl = r.role === "management" ? "#/management/dashboard" : r.role === "super_admin" ? "#/super-admin/dashboard" : "#/hr/dashboard";
    notify(
      r.id,
      "New Leave Request",
      `${employeeName} (${employeeRole}) submitted a ${leaveType} leave request.`,
      "system",
      actionUrl,
      "Review Requests"
    );
  }
  AuditLogService.add({
    action: "LEAVE_SUBMITTED",
    entityType: "leave_request",
    entityId: leaveId,
    entityName: `${leaveType} Leave - ${employeeName}`,
    performedBy: employeeId,
    performedByName: employeeName,
    performedByRole: employeeRole,
    description: `${employeeName} submitted a ${leaveType} leave request`,
  });
}

// ── Leave Approved / Rejected ────────────────────────────────────────────────

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
    `Your ${leaveType} leave request has been ${approved ? "approved" : "rejected"} by ${hrAdminName}.`,
    "system",
    "#/hr/profile",
    "View My Leaves"
  );
  AuditLogService.add({
    action: approved ? "LEAVE_APPROVED" : "LEAVE_REJECTED",
    entityType: "leave_request",
    entityId: leaveId,
    entityName: `${leaveType} Leave - ${employeeName}`,
    performedBy: hrAdminId,
    performedByName: hrAdminName,
    performedByRole: "hr_admin",
    description: `${hrAdminName} ${approved ? "approved" : "rejected"} ${employeeName}'s ${leaveType} leave request`,
  });
}

// ── Payroll Updated ───────────────────────────────────────────────────────────

export function notifyPayrollUpdated(
  hrAdminId: string,
  hrAdminName: string,
  employeeId: string,
  employeeName: string
) {
  notify(
    employeeId,
    "Payroll Updated",
    `Your payroll details have been updated by ${hrAdminName}.`,
    "payment",
    "#/hr/payroll",
    "View Payroll"
  );
  AuditLogService.add({
    action: "PAYROLL_UPDATED",
    entityType: "payroll",
    entityId: employeeId,
    entityName: employeeName,
    performedBy: hrAdminId,
    performedByName: hrAdminName,
    performedByRole: "hr_admin",
    description: `${hrAdminName} updated payroll for ${employeeName}`,
  });
}

// ── Campaign Created ──────────────────────────────────────────────────────────

export function notifyCampaignCreated(
  creatorId: string,
  creatorName: string,
  creatorRole: string,
  campaignName: string,
  campaignId: string
) {
  const management = getUsersByRole("management", "super_admin").filter((p) => p.id !== creatorId);
  for (const m of management) {
    notify(
      m.id,
      "New Campaign Created",
      `${creatorName} created marketing campaign: "${campaignName}".`,
      "system",
      "#/marketing/dashboard",
      "View Campaigns"
    );
  }
  AuditLogService.add({
    action: "CAMPAIGN_CREATED",
    entityType: "campaign",
    entityId: campaignId,
    entityName: campaignName,
    performedBy: creatorId,
    performedByName: creatorName,
    performedByRole: creatorRole,
    description: `${creatorName} created campaign "${campaignName}"`,
  });
}

// ── Budget Changed ────────────────────────────────────────────────────────────

export function notifyBudgetChanged(
  changerId: string,
  changerName: string,
  changerRole: string,
  entityName: string,
  entityId: string,
  newBudget: number
) {
  const management = getUsersByRole("management", "super_admin").filter((p) => p.id !== changerId);
  for (const m of management) {
    notify(
      m.id,
      "Budget Updated",
      `${changerName} updated budget for "${entityName}" to Rs. ${newBudget.toLocaleString()}.`,
      "payment"
    );
  }
  AuditLogService.add({
    action: "BUDGET_CHANGED",
    entityType: "task",
    entityId: entityId,
    entityName: entityName,
    performedBy: changerId,
    performedByName: changerName,
    performedByRole: changerRole,
    description: `${changerName} changed budget for "${entityName}" to Rs. ${newBudget.toLocaleString()}`,
    newValue: { budget: newBudget },
  });
}

// ── Deliverable Approved ──────────────────────────────────────────────────────

export function notifyDeliverableApproved(
  approverId: string,
  approverName: string,
  clientId: string,
  clientName: string,
  deliverableTitle: string,
  deliverableId: string
) {
  notify(
    clientId,
    "Deliverable Ready",
    `Your deliverable "${deliverableTitle}" has been approved and is ready for review.`,
    "project",
    "#/client/dashboard",
    "View Dashboard"
  );
  AuditLogService.add({
    action: "DELIVERABLE_APPROVED",
    entityType: "deliverable",
    entityId: deliverableId,
    entityName: deliverableTitle,
    performedBy: approverId,
    performedByName: approverName,
    performedByRole: "production_admin",
    description: `${approverName} approved deliverable "${deliverableTitle}" for client ${clientName}`,
  });
}

// ── Deliverable Uploaded ──────────────────────────────────────────────────────

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
    notify(
      a.id,
      "Deliverable Uploaded",
      `${uploaderName} uploaded deliverable "${deliverableTitle}" for client ${clientName}.`,
      "project",
      "#/production/deliverables",
      "Review"
    );
  }
  AuditLogService.add({
    action: "DELIVERABLE_UPLOADED",
    entityType: "deliverable",
    entityId: deliverableId,
    entityName: deliverableTitle,
    performedBy: uploaderId,
    performedByName: uploaderName,
    performedByRole: uploaderRole,
    description: `${uploaderName} uploaded deliverable "${deliverableTitle}" for client ${clientName}`,
  });
}

// ── User Created ──────────────────────────────────────────────────────────────

export function notifyUserCreated(
  creatorId: string,
  creatorName: string,
  creatorRole: string,
  newUserId: string,
  newUserName: string,
  newUserEmail: string,
  newUserRole: string
) {
  notify(
    newUserId,
    "Welcome to OptiVax Global",
    `Your account has been created by ${creatorName}. Your login email is ${newUserEmail}.`,
    "system"
  );
  AuditLogService.add({
    action: "USER_CREATED",
    entityType: "user",
    entityId: newUserId,
    entityName: newUserName,
    performedBy: creatorId,
    performedByName: creatorName,
    performedByRole: creatorRole,
    description: `${creatorName} created ${newUserRole} account for ${newUserName} (${newUserEmail})`,
    newValue: { role: newUserRole, email: newUserEmail },
  });
}

// ── Password Reset ────────────────────────────────────────────────────────────

export function notifyPasswordReset(
  adminId: string,
  adminName: string,
  adminRole: string,
  targetUserId: string,
  targetUserName: string
) {
  notify(
    targetUserId,
    "Password Reset",
    `Your password has been reset by ${adminName}. Please contact your administrator for your new credentials.`,
    "system"
  );
  AuditLogService.add({
    action: "PASSWORD_RESET",
    entityType: "user",
    entityId: targetUserId,
    entityName: targetUserName,
    performedBy: adminId,
    performedByName: adminName,
    performedByRole: adminRole,
    description: `${adminName} reset password for ${targetUserName}`,
  });
}

// ── Attendance Modified ───────────────────────────────────────────────────────

export function logAttendanceModified(
  hrAdminId: string,
  hrAdminName: string,
  employeeName: string,
  employeeId: string,
  date: string,
  status: string
) {
  AuditLogService.add({
    action: "ATTENDANCE_MODIFIED",
    entityType: "attendance",
    entityId: employeeId,
    entityName: employeeName,
    performedBy: hrAdminId,
    performedByName: hrAdminName,
    performedByRole: "hr_admin",
    description: `${hrAdminName} marked ${employeeName} as "${status}" on ${date}`,
    newValue: { date, status },
  });
}
