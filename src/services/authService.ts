import { api } from "../lib/client";
import { ApiError } from "../lib/apiError";
import type { User } from "../types";
import type { SessionDto, LoginResponseDto, SessionUserDto } from "../dto/auth.dto";

export class AuthService {
  static async login(email: string, password: string): Promise<LoginResponseDto> {
    return api.post<LoginResponseDto>("/saas/v1/auth/login", { email, password });
  }

  static async getSession(): Promise<SessionDto | null> {
    try {
      return await api.get<SessionDto>("/saas/v1/auth/session");
    } catch (e) {
      if (e instanceof ApiError && e.kind === "unauthorized") return null;
      throw e;
    }
  }

  static async logout(): Promise<void> {
    await api.post("/saas/v1/auth/logout", {});
  }

  static async changePassword(currentPassword: string, newPassword: string, confirmPassword: string): Promise<SessionUserDto> {
    const res = await api.post<{ user: SessionUserDto }>("/saas/v1/auth/change-password", {
      currentPassword,
      newPassword,
      confirmPassword,
    });
    return res.user;
  }

  static async updateProfile(userId: string, data: Partial<User>): Promise<void> {
    await api.put("/saas/v1/profiles/update", {
      id: userId,
      full_name: data.name,
      company: data.company,
      avatar_url: data.avatar,
    });
  }

  static async requestPasswordReset(email: string): Promise<void> {
    await api.post("/saas/v1/auth/request-reset", { email });
  }

  static async confirmPasswordReset(token: string, newPassword: string): Promise<void> {
    await api.post("/saas/v1/auth/confirm-reset", { token, newPassword });
  }
}
