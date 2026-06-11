export type Role = "super_admin" | "management" | "admin" | "client";

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  avatar?: string;
  company?: string;
  joinDate?: string;
  departmentId?: string;
}

export interface Department {
  id: string;
  name: string;
  adminIds: string[]; // User ids with role "admin"
}

export interface Message {
  id: string;
  chatId: string;
  senderId: string; // User id
  content: string;
  createdAt: string; // ISO string
}

export interface Chat {
  id: string;
  clientId: string; // User id with role "client"
  adminId: string; // Assigned admin user id
  departmentId: string;
  messages: Message[];
}

export interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}
