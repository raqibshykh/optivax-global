import { api } from "../lib/client";

const BASE = "/saas/v1/profile/me";

/** Self-editable fields for an employee (any role except client). */
export interface EmployeeEditableProfile {
  avatar: string | null;
  phone: string;
  altPhone: string;
  address: string;
  city: string;
  country: string;
  postalCode: string;
  emergencyContactName: string;
  emergencyContactNumber: string;
  bio: string;
  gender: string;
  dateOfBirth: string | null;
  timezone: string;
  language: string;
}

export interface EmployeeReadOnlyProfile {
  employeeId: string;
  email: string;
  role: string;
  departmentId: string | null;
  designation: string | null;
  reportingManager: string | null;
  salary: number | null;
  joiningDate: string | null;
  status: string;
  company: string;
  createdBy: string | null;
  createdAt: string | null;
  lastLogin: string | null;
}

/** Self-editable fields for a client. */
export interface ClientEditableProfile {
  avatar: string | null;
  phone: string;
  address: string;
  city: string;
  country: string;
  companyLogo: string | null;
  contactName: string;
  website: string;
  bio: string;
}

export interface ClientReadOnlyProfile {
  clientId: string;
  email: string;
  status: string;
  company: string;
  createdBy: string | null;
  createdAt: string | null;
  joinDate: string | null;
}

export type SelfProfile =
  | { kind: "employee"; editable: EmployeeEditableProfile; readOnly: EmployeeReadOnlyProfile }
  | { kind: "client"; editable: ClientEditableProfile; readOnly: ClientReadOnlyProfile };

const ALLOWED_AVATAR_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_AVATAR_BYTES = 5 * 1024 * 1024; // 5MB — mirrors AvatarUploadService.php's server-side cap.

export class ProfileService {
  static async getMe(): Promise<SelfProfile> {
    return api.get<SelfProfile>(BASE);
  }

  /** Only the keys present in `patch` are sent — the backend applies its own whitelist regardless, this just avoids clobbering fields the form didn't touch. */
  static async updateMe(
    patch: Partial<EmployeeEditableProfile> | Partial<ClientEditableProfile>
  ): Promise<SelfProfile> {
    return api.put<SelfProfile>(BASE, patch);
  }

  /**
   * Client-side pre-check so a bad file never even reaches the network —
   * the backend re-validates independently (AvatarUploadService.php), this
   * is purely for immediate user feedback.
   */
  static validateAvatarFile(file: File): string | null {
    if (!ALLOWED_AVATAR_TYPES.includes(file.type)) {
      return "Please choose a JPG, PNG, or WEBP image.";
    }
    if (file.size > MAX_AVATAR_BYTES) {
      return "Image must be 5MB or smaller.";
    }
    return null;
  }

  static async uploadAvatar(file: File): Promise<string> {
    const error = this.validateAvatarFile(file);
    if (error) {
      throw new Error(error);
    }
    const formData = new FormData();
    formData.append("avatar", file);
    const result = await api.upload<{ avatarUrl: string }>(`${BASE}/avatar`, formData);
    return result.avatarUrl;
  }

  static async removeAvatar(): Promise<void> {
    await api.delete(`${BASE}/avatar`);
  }
}
