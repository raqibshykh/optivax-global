import { User } from "../types";

const defaultJoinDate = new Date().toISOString();

export const mockUsers: User[] = [
  {
    id: "u1",
    email: "superadmin@example.com",
    password: "password123",
    name: "Super Admin",
    role: "super_admin",
    avatar: "https://i.pravatar.cc/150?img=1",
    joinDate: defaultJoinDate,
  },
  {
    id: "u2",
    email: "manager@example.com",
    password: "password123",
    name: "Management User",
    role: "management",
    avatar: "https://i.pravatar.cc/150?img=2",
    joinDate: defaultJoinDate,
  },
  {
    id: "u6",
    email: "client1@example.com",
    password: "password123",
    name: "Client One",
    role: "client",
    avatar: "https://i.pravatar.cc/150?img=6",
    joinDate: defaultJoinDate,
  },
  {
    id: "u7",
    email: "client2@example.com",
    password: "password123",
    name: "Client Two",
    role: "client",
    avatar: "https://i.pravatar.cc/150?img=7",
    joinDate: defaultJoinDate,
  },
  {
    id: "u8",
    email: "sales.admin@example.com",
    password: "password123",
    name: "Sales Admin",
    role: "sales_admin",
    avatar: "https://i.pravatar.cc/150?img=8",
    joinDate: defaultJoinDate,
    departmentId: "d1", // Sales
  },
  {
    id: "u11",
    email: "hr.admin@example.com",
    password: "password123",
    name: "HR Admin",
    role: "hr_admin",
    avatar: "https://i.pravatar.cc/150?img=11",
    joinDate: defaultJoinDate,
    departmentId: "d2", // HR
  },
  {
    id: "u9",
    email: "production.admin@example.com",
    password: "password123",
    name: "Production Admin",
    role: "production_admin",
    avatar: "https://i.pravatar.cc/150?img=9",
    joinDate: defaultJoinDate,
    departmentId: "d3", // Production
  },
  {
    id: "u10",
    email: "marketing.admin@example.com",
    password: "password123",
    name: "Marketing Admin",
    role: "marketing_admin",
    avatar: "https://i.pravatar.cc/150?img=10",
    joinDate: defaultJoinDate,
    departmentId: "d4", // Marketing
  }
];