import type { UserRole } from "../types";

export interface SessionUserDto {
  id: string;
  email: string;
  role: UserRole;
  full_name: string;
  avatar_url?: string;
  company?: string;
  must_change_password: boolean;
}

export interface SessionDto {
  user: SessionUserDto;
}

export interface LoginResponseDto {
  user: SessionUserDto;
}
