import React, { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import PageMeta from "../../components/common/PageMeta";
import Avatar from "../../components/common/Avatar";
import { useAuth } from "../../context/AuthContext";
import { useDepartments } from "../../context/DepartmentContext";
import { useToast } from "../../context/ToastContext";
import { notifyLeaveRequestSubmitted, notifyClientProfileUpdated } from "../../services/notificationHelpers";
import { ConversationService } from "../../services/conversationService";
import { LeaveRequestService } from "../../services/leaveRequestService";
import { ClientOwnershipService } from "../../services/clientOwnershipService";
import {
  ProfileService,
  SelfProfile,
  EmployeeEditableProfile,
  ClientEditableProfile,
} from "../../services/profileService";
import { RBAC_MATRIX } from "../../utils/rbac";
import type { UserRole } from "../../types";

// Re-exported so existing consumers (HRPanel.tsx) keep working unchanged;
// the canonical definition now lives in leaveRequestService.ts alongside
// the data-access methods.
export type { LeaveRequest } from "../../services/leaveRequestService";
import type { LeaveRequest } from "../../services/leaveRequestService";

const calcDays = (start: string, end: string): number => {
  if (!start || !end) return 0;
  const diff = new Date(end).getTime() - new Date(start).getTime();
  return Math.max(1, Math.round(diff / (1000 * 60 * 60 * 24)) + 1);
};

type FormState = Partial<EmployeeEditableProfile & ClientEditableProfile>;

const fmtDate = (iso?: string | null) => (iso ? new Date(iso).toLocaleDateString() : "—");
const fmtDateTime = (iso?: string | null) => (iso ? new Date(iso).toLocaleString() : "—");

/** Compact "which areas this role can touch" summary — derived live from the RBAC matrix, never stored. */
const permissionSummary = (role?: string): string => {
  const perms = RBAC_MATRIX[role as UserRole];
  if (!perms) return "—";
  const domains = Object.keys(perms);
  return domains.length ? domains.map((d) => d.replace(/_/g, " ")).join(", ") : "—";
};

// ── Small reusable field bits ──────────────────────────────────────────────

function TextField({
  label, value, onChange, type = "text", placeholder, disabled, fullWidth,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  disabled?: boolean;
  fullWidth?: boolean;
}) {
  return (
    <div className={fullWidth ? "md:col-span-2" : undefined}>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{label}</label>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent dark:border-gray-600 dark:bg-gray-800 dark:text-white disabled:opacity-60"
      />
    </div>
  );
}

function ReadOnlyField({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide dark:text-gray-400">{label}</p>
      <p className="mt-1 text-sm font-medium text-gray-900 dark:text-white">{value ?? "—"}</p>
    </div>
  );
}

function Card({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h3>
        {subtitle && <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{subtitle}</p>}
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}

export default function Profile() {
  const { user, syncUser } = useAuth();
  const { getDepartmentName } = useDepartments();
  const { showToast } = useToast();

  const isEmployee = !!user && user.role !== "client";

  // ── Self profile (new self-service feature) ────────────────────────────
  const [profile, setProfile] = useState<SelfProfile | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [form, setForm] = useState<FormState>({});
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [assignedTeam, setAssignedTeam] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadProfile = useCallback(async () => {
    setIsLoadingProfile(true);
    try {
      const data = await ProfileService.getMe();
      setProfile(data);
      setForm(data.editable);
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "Failed to load profile", "error");
    } finally {
      setIsLoadingProfile(false);
    }
  }, [showToast]);

  useEffect(() => {
    if (user) loadProfile();
  }, [user, loadProfile]);

  useEffect(() => {
    if (!user || user.role !== "client") {
      setAssignedTeam(null);
      return;
    }
    let cancelled = false;
    ClientOwnershipService.getByClientId(user.id)
      .then((o) => {
        if (!cancelled) setAssignedTeam(o?.ownerName ?? null);
      })
      .catch(() => {
        if (!cancelled) setAssignedTeam(null);
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  const setField = (field: keyof FormState, value: string) =>
    setForm((f) => ({ ...f, [field]: value }));

  const handleCancel = () => {
    if (profile) setForm(profile.editable);
  };

  const handleSaveProfile = async () => {
    if (!profile || !user) return;
    setIsSaving(true);
    try {
      const updated = await ProfileService.updateMe(form);
      setProfile(updated);
      setForm(updated.editable);
      showToast("Profile updated successfully", "success");
      if (updated.kind === "client") {
        notifyClientProfileUpdated(user.id, updated.editable.contactName || user.name);
      }
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "Failed to update profile", "error");
    } finally {
      setIsSaving(false);
    }
  };

  /** Narrows explicitly on `kind` so TS keeps `editable`'s discriminated-union shape correct — a generic spread across the union loses that correlation. */
  const applyAvatar = (p: SelfProfile, avatarUrl: string | null): SelfProfile =>
    p.kind === "client"
      ? { ...p, editable: { ...p.editable, avatar: avatarUrl } }
      : { ...p, editable: { ...p.editable, avatar: avatarUrl } };

  const handleUploadClick = () => fileInputRef.current?.click();

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same file again later
    if (!file) return;

    const validationError = ProfileService.validateAvatarFile(file);
    if (validationError) {
      showToast(validationError, "error");
      return;
    }

    setIsUploadingAvatar(true);
    try {
      const avatarUrl = await ProfileService.uploadAvatar(file);
      setProfile((p) => (p ? applyAvatar(p, avatarUrl) : p));
      syncUser({ avatar: avatarUrl });
      showToast("Profile photo updated", "success");
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "Failed to upload photo", "error");
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleRemovePhoto = async () => {
    setIsUploadingAvatar(true);
    try {
      await ProfileService.removeAvatar();
      setProfile((p) => (p ? applyAvatar(p, null) : p));
      syncUser({ avatar: "" });
      showToast("Profile photo removed", "success");
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "Failed to remove photo", "error");
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  // ── Conversation summary for client (unchanged) ─────────────────────────
  const [convSummary, setConvSummary] = useState({ total: 0, unread: 0 });

  useEffect(() => {
    if (!user || user.role !== "client") {
      setConvSummary({ total: 0, unread: 0 });
      return;
    }
    let cancelled = false;
    ConversationService.getAll()
      .then((all) => {
        if (cancelled) return;
        const mine = all.filter(c => c.clientId === user.id);
        setConvSummary({
          total: mine.length,
          unread: mine.reduce((sum, c) => sum + c.unreadByClient, 0),
        });
      })
      .catch(() => {
        if (!cancelled) setConvSummary({ total: 0, unread: 0 });
      });
    return () => { cancelled = true; };
  }, [user]);

  // ── Leave request state (employees only, unchanged) ────────────────────
  const [leaveType, setLeaveType] = useState<LeaveRequest["type"]>("Annual");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [myRequests, setMyRequests] = useState<LeaveRequest[]>([]);

  const deptLabel = user
    ? user.role
        .replace("_admin", "")
        .replace("_member", "")
        .replace(/\b\w/g, (c) => c.toUpperCase())
    : "";

  useEffect(() => {
    if (!user || user.role === "client") {
      setMyRequests([]);
      return;
    }
    let cancelled = false;
    LeaveRequestService.getEmployeeRequests()
      .then((all) => {
        if (!cancelled) setMyRequests(all.filter((r) => r.employeeId === user.id));
      })
      .catch(() => {
        if (!cancelled) setMyRequests([]);
      });
    return () => { cancelled = true; };
  }, [user]);

  const handleSubmitLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !startDate || !endDate || !reason.trim()) return;
    if (new Date(endDate) < new Date(startDate)) {
      showToast("End date must be after start date", "error");
      return;
    }
    setSubmitting(true);

    const days = calcDays(startDate, endDate);
    try {
      const newRequest = await LeaveRequestService.submitEmployeeRequest({
        employeeId: user.id,
        employeeName: user.name,
        role: user.role,
        department: deptLabel,
        type: leaveType,
        startDate,
        endDate,
        days,
        reason: reason.trim(),
        status: "Pending",
      });

      setMyRequests((prev) => [...prev, newRequest]);
      setLeaveType("Annual");
      setStartDate("");
      setEndDate("");
      setReason("");
      showToast("Leave request submitted successfully", "success");
      notifyLeaveRequestSubmitted(user.id, user.name, user.role, leaveType, newRequest.id);
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "Failed to submit leave request", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const liveMyRequests = myRequests;

  if (!user) return null;

  const avatarUrl = profile?.editable.avatar || user.avatar || null;

  return (
    <>
      <PageMeta
        title="My Profile | Optivax Global"
        description="Manage your account and profile information."
      />
      <div className="flex flex-col gap-4 mb-6 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
            My Profile
          </h1>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            {isEmployee ? "Manage your personal information and leave requests." : "Manage your account and contact information."}
          </p>
        </div>
      </div>

      {isLoadingProfile ? (
        <div className="flex justify-center p-8">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-solid border-brand-500 border-t-transparent"></div>
        </div>
      ) : profile && (
        <div className="space-y-6">
          {/* ── PROFILE PICTURE ────────────────────────────────────────── */}
          <Card title="Profile Picture">
            <div className="flex flex-col sm:flex-row items-center gap-6">
              <div className="border border-gray-200 dark:border-gray-700 rounded-full">
                <Avatar src={avatarUrl} name={user.name} size="xl" />
              </div>
              <div className="flex flex-col items-center sm:items-start gap-2">
                <p className="text-sm text-gray-500 dark:text-gray-400">JPG, PNG or WEBP. Max 5MB.</p>
                <div className="flex gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleFileSelected}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={handleUploadClick}
                    disabled={isUploadingAvatar}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 disabled:opacity-50 transition"
                  >
                    {isUploadingAvatar ? "Uploading..." : "Upload Photo"}
                  </button>
                  {avatarUrl && (
                    <button
                      type="button"
                      onClick={handleRemovePhoto}
                      disabled={isUploadingAvatar}
                      className="px-4 py-2 text-sm font-medium text-red-600 border border-gray-300 rounded-lg hover:bg-red-50 disabled:opacity-50 transition dark:border-gray-600 dark:hover:bg-red-900/20"
                    >
                      Remove Photo
                    </button>
                  )}
                </div>
              </div>
            </div>
          </Card>

          {profile.kind === "employee" ? (
            <>
              {/* ── PERSONAL INFORMATION ─────────────────────────────────── */}
              <Card title="Personal Information">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Gender</label>
                    <select
                      value={form.gender ?? ""}
                      onChange={(e) => setField("gender", e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                    >
                      <option value="">Prefer not to say</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <TextField label="Date of Birth" type="date" value={form.dateOfBirth ?? ""} onChange={(v) => setField("dateOfBirth", v)} />
                  <TextField label="Timezone" placeholder="e.g. Asia/Karachi" value={form.timezone ?? ""} onChange={(v) => setField("timezone", v)} />
                  <TextField label="Language" placeholder="e.g. en" value={form.language ?? ""} onChange={(v) => setField("language", v)} />
                </div>
              </Card>

              {/* ── CONTACT INFORMATION ──────────────────────────────────── */}
              <Card title="Contact Information">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <TextField label="Phone Number" type="tel" value={form.phone ?? ""} onChange={(v) => setField("phone", v)} />
                  <TextField label="Alternate Phone Number" type="tel" value={form.altPhone ?? ""} onChange={(v) => setField("altPhone", v)} />
                </div>
              </Card>

              {/* ── ADDRESS ───────────────────────────────────────────────── */}
              <Card title="Address">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <TextField label="Address" value={form.address ?? ""} onChange={(v) => setField("address", v)} fullWidth />
                  <TextField label="City" value={form.city ?? ""} onChange={(v) => setField("city", v)} />
                  <TextField label="Country" value={form.country ?? ""} onChange={(v) => setField("country", v)} />
                  <TextField label="Postal Code" value={form.postalCode ?? ""} onChange={(v) => setField("postalCode", v)} />
                </div>
              </Card>

              {/* ── EMERGENCY CONTACT ─────────────────────────────────────── */}
              <Card title="Emergency Contact">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <TextField label="Emergency Contact Name" value={form.emergencyContactName ?? ""} onChange={(v) => setField("emergencyContactName", v)} />
                  <TextField label="Emergency Contact Number" type="tel" value={form.emergencyContactNumber ?? ""} onChange={(v) => setField("emergencyContactNumber", v)} />
                </div>
              </Card>

              {/* ── ABOUT ME ──────────────────────────────────────────────── */}
              <Card title="About Me">
                <textarea
                  rows={4}
                  value={form.bio ?? ""}
                  onChange={(e) => setField("bio", e.target.value)}
                  placeholder="Tell your team a little about yourself..."
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white resize-none"
                />
              </Card>

              <div className="flex items-center justify-end gap-2">
                <button onClick={handleCancel} disabled={isSaving} type="button"
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-700">
                  Cancel
                </button>
                <button onClick={handleSaveProfile} disabled={isSaving} type="button"
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 disabled:opacity-50 transition">
                  {isSaving ? "Saving..." : "Save Changes"}
                </button>
              </div>

              {/* ── READ-ONLY EMPLOYMENT INFORMATION ─────────────────────── */}
              <Card title="Employment Information" subtitle="Contact HR or your administrator to change any of these details.">
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
                  <ReadOnlyField label="Employee ID" value={profile.readOnly.employeeId} />
                  <ReadOnlyField label="Email" value={profile.readOnly.email} />
                  <ReadOnlyField label="Role" value={profile.readOnly.role} />
                  <ReadOnlyField label="Department" value={getDepartmentName(profile.readOnly.departmentId)} />
                  <ReadOnlyField label="Designation" value={profile.readOnly.designation} />
                  <ReadOnlyField label="Salary" value={profile.readOnly.salary != null ? `Rs. ${Math.round(profile.readOnly.salary).toLocaleString()}` : "—"} />
                  <ReadOnlyField label="Joining Date" value={fmtDate(profile.readOnly.joiningDate)} />
                  <ReadOnlyField label="Reporting Manager" value={profile.readOnly.reportingManager ?? "Not assigned"} />
                  <ReadOnlyField label="Status" value={profile.readOnly.status} />
                  <ReadOnlyField label="Company" value={profile.readOnly.company} />
                  <ReadOnlyField label="Permissions" value={permissionSummary(user.role)} />
                  <ReadOnlyField label="Created By" value={profile.readOnly.createdBy} />
                  <ReadOnlyField label="Created Date" value={fmtDate(profile.readOnly.createdAt)} />
                  <ReadOnlyField label="Last Login" value={fmtDateTime(profile.readOnly.lastLogin)} />
                </div>
              </Card>
            </>
          ) : (
            <>
              {/* ── CONTACT INFORMATION ──────────────────────────────────── */}
              <Card title="Contact Information">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <TextField label="Contact Person" value={form.contactName ?? ""} onChange={(v) => setField("contactName", v)} />
                  <TextField label="Phone" type="tel" value={form.phone ?? ""} onChange={(v) => setField("phone", v)} />
                </div>
              </Card>

              {/* ── ADDRESS ───────────────────────────────────────────────── */}
              <Card title="Address">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <TextField label="Address" value={form.address ?? ""} onChange={(v) => setField("address", v)} fullWidth />
                  <TextField label="City" value={form.city ?? ""} onChange={(v) => setField("city", v)} />
                  <TextField label="Country" value={form.country ?? ""} onChange={(v) => setField("country", v)} />
                </div>
              </Card>

              {/* ── COMPANY ───────────────────────────────────────────────── */}
              <Card title="Company">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <TextField label="Website" placeholder="https://..." value={form.website ?? ""} onChange={(v) => setField("website", v)} />
                  <TextField label="Company Logo URL" placeholder="https://... (optional)" value={form.companyLogo ?? ""} onChange={(v) => setField("companyLogo", v)} />
                </div>
              </Card>

              {/* ── ABOUT ME ──────────────────────────────────────────────── */}
              <Card title="Bio / About">
                <textarea
                  rows={4}
                  value={form.bio ?? ""}
                  onChange={(e) => setField("bio", e.target.value)}
                  placeholder="A short description of your company..."
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white resize-none"
                />
              </Card>

              <div className="flex items-center justify-end gap-2">
                <button onClick={handleCancel} disabled={isSaving} type="button"
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-700">
                  Cancel
                </button>
                <button onClick={handleSaveProfile} disabled={isSaving} type="button"
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 disabled:opacity-50 transition">
                  {isSaving ? "Saving..." : "Save Changes"}
                </button>
              </div>

              {/* ── READ-ONLY ACCOUNT INFORMATION ────────────────────────── */}
              <Card title="Account Information" subtitle="Contact your account manager to change any of these details.">
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
                  <ReadOnlyField label="Client ID" value={profile.readOnly.clientId} />
                  <ReadOnlyField label="Email" value={profile.readOnly.email} />
                  <ReadOnlyField label="Status" value={profile.readOnly.status} />
                  <ReadOnlyField label="Company" value={profile.readOnly.company} />
                  <ReadOnlyField label="Assigned Team" value={assignedTeam ?? "Not assigned"} />
                  <ReadOnlyField label="Permissions" value={permissionSummary(user.role)} />
                  <ReadOnlyField label="Created By" value={profile.readOnly.createdBy} />
                  <ReadOnlyField label="Created Date" value={fmtDate(profile.readOnly.createdAt)} />
                </div>
              </Card>

              {/* Messages — link to unified Messages page */}
              <div className="rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
                <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Messages</h3>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Conversations with your assigned team.</p>
                  </div>
                  {convSummary.unread > 0 && (
                    <span className="px-2.5 py-0.5 text-xs font-medium rounded-full bg-brand-100 text-brand-700 dark:bg-brand-900/30 dark:text-brand-400">
                      {convSummary.unread} unread
                    </span>
                  )}
                </div>
                <div className="p-6 flex flex-col items-center text-center gap-4">
                  <div className="grid grid-cols-2 gap-4 w-full max-w-xs">
                    <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50">
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">{convSummary.total}</p>
                      <p className="text-xs text-gray-500 mt-0.5">Conversations</p>
                    </div>
                    <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50">
                      <p className="text-2xl font-bold text-brand-600">{convSummary.unread}</p>
                      <p className="text-xs text-gray-500 mt-0.5">Unread</p>
                    </div>
                  </div>
                  <Link
                    to="/client/messages"
                    className="w-full max-w-xs py-2.5 text-sm font-semibold text-white bg-brand-500 hover:bg-brand-600 rounded-xl transition-colors text-center"
                  >
                    Open Messages
                  </Link>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── LEAVE REQUESTS (employees only, unchanged) ──────────────────── */}
      {isEmployee && user && (
        <div className="space-y-6 mt-6">
          <div className="rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Request Leave</h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Submit a leave request to HR for approval.</p>
            </div>
            <form onSubmit={handleSubmitLeave} className="p-6 space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Leave Type</label>
                  <select
                    value={leaveType}
                    onChange={(e) => setLeaveType(e.target.value as LeaveRequest["type"])}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  >
                    <option value="Annual">Annual Leave</option>
                    <option value="Sick">Sick Leave</option>
                    <option value="Personal">Personal Leave</option>
                    <option value="Emergency">Emergency Leave</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Start Date</label>
                  <input
                    type="date"
                    required
                    value={startDate}
                    min={new Date().toISOString().split("T")[0]}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">End Date</label>
                  <input
                    type="date"
                    required
                    value={endDate}
                    min={startDate || new Date().toISOString().split("T")[0]}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  />
                </div>
                <div className="flex items-end">
                  {startDate && endDate && (
                    <div className="w-full rounded-lg bg-blue-50 dark:bg-blue-900/20 px-3 py-2 text-center">
                      <p className="text-xs text-gray-500 dark:text-gray-400">Duration</p>
                      <p className="text-lg font-bold text-blue-600 dark:text-blue-400">
                        {calcDays(startDate, endDate)} day{calcDays(startDate, endDate) !== 1 ? "s" : ""}
                      </p>
                    </div>
                  )}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Reason</label>
                <textarea
                  required
                  rows={3}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Briefly describe the reason for your leave request..."
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white resize-none"
                />
              </div>
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition"
                >
                  {submitting ? "Submitting..." : "Submit Request"}
                </button>
              </div>
            </form>
          </div>

          {/* My leave history */}
          <div className="rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">My Leave History</h3>
              <span className="text-sm text-gray-500 dark:text-gray-400">{liveMyRequests.length} request{liveMyRequests.length !== 1 ? "s" : ""}</span>
            </div>
            <div className="p-6">
              {liveMyRequests.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-6">
                  No leave requests submitted yet.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
                    <thead>
                      <tr>
                        {["Type", "Dates", "Days", "Reason", "Status", "Submitted"].map((h) => (
                          <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                      {[...liveMyRequests].reverse().map((r) => (
                        <tr key={r.id}>
                          <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">{r.type}</td>
                          <td className="px-4 py-3 text-sm text-gray-500">{r.startDate} → {r.endDate}</td>
                          <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">{r.days}d</td>
                          <td className="px-4 py-3 text-sm text-gray-500 max-w-xs truncate">{r.reason}</td>
                          <td className="px-4 py-3 text-sm">
                            <span className={`px-2 py-1 text-xs rounded-full font-medium ${
                              r.status === "Approved" ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" :
                              r.status === "Rejected" ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400" :
                              "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"
                            }`}>{r.status}</span>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-500">
                            {new Date(r.submittedAt).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
