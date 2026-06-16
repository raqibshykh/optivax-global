import { User } from "../types";

const d = new Date().toISOString();

export const mockUsers: User[] = [
  // ── Super Admin ──────────────────────────────────────────────────────────
  {
    id: "u1",
    email: "superadmin@example.com",
    password: "password123",
    name: "Super Admin",
    role: "super_admin",
    avatar: "https://i.pravatar.cc/150?img=1",
    joinDate: d,
  },

  // ── Management ───────────────────────────────────────────────────────────
  {
    id: "u2",
    email: "manager@example.com",
    password: "password123",
    name: "Sarah Mitchell",
    role: "management",
    avatar: "https://i.pravatar.cc/150?img=2",
    joinDate: d,
  },

  // ── Sales ────────────────────────────────────────────────────────────────
  {
    id: "u8",
    email: "sales.admin@example.com",
    password: "password123",
    name: "James Carter",
    role: "sales_admin",
    avatar: "https://i.pravatar.cc/150?img=8",
    joinDate: d,
    departmentId: "dept-sales",
  },
  {
    id: "u12",
    email: "sales.member@example.com",
    password: "password123",
    name: "Emma Wilson",
    role: "sales_member",
    avatar: "https://i.pravatar.cc/150?img=12",
    joinDate: d,
    departmentId: "dept-sales",
  },

  // ── Production ───────────────────────────────────────────────────────────
  {
    id: "u9",
    email: "production.admin@example.com",
    password: "password123",
    name: "David Chen",
    role: "production_admin",
    avatar: "https://i.pravatar.cc/150?img=9",
    joinDate: d,
    departmentId: "dept-production",
  },
  {
    id: "u13",
    email: "production.member@example.com",
    password: "password123",
    name: "Liam Park",
    role: "production_member",
    avatar: "https://i.pravatar.cc/150?img=13",
    joinDate: d,
    departmentId: "dept-production",
  },

  // ── Marketing ────────────────────────────────────────────────────────────
  {
    id: "u10",
    email: "marketing.admin@example.com",
    password: "password123",
    name: "Olivia Brown",
    role: "marketing_admin",
    avatar: "https://i.pravatar.cc/150?img=10",
    joinDate: d,
    departmentId: "dept-marketing",
  },
  {
    id: "u14",
    email: "marketing.member@example.com",
    password: "password123",
    name: "Noah Davis",
    role: "marketing_member",
    avatar: "https://i.pravatar.cc/150?img=14",
    joinDate: d,
    departmentId: "dept-marketing",
  },

  // ── HR ───────────────────────────────────────────────────────────────────
  {
    id: "u11",
    email: "hr.admin@example.com",
    password: "password123",
    name: "Ava Johnson",
    role: "hr_admin",
    avatar: "https://i.pravatar.cc/150?img=11",
    joinDate: d,
    departmentId: "dept-hr",
  },
  {
    id: "u15",
    email: "hr.member@example.com",
    password: "password123",
    name: "Ethan Lee",
    role: "hr_member",
    avatar: "https://i.pravatar.cc/150?img=15",
    joinDate: d,
    departmentId: "dept-hr",
  },

  // ── Employees (mock staff) ─────────────────────────────────────────────────
  {
    id: "u20",
    email: "alice.marketing@example.com",
    password: "password123",
    name: "Alice Martins",
    role: "marketing_member",
    avatar: "https://i.pravatar.cc/150?img=20",
    joinDate: d,
    departmentId: "dept-marketing",
  },
  {
    id: "u21",
    email: "ben.marketing@example.com",
    password: "password123",
    name: "Ben Thompson",
    role: "marketing_member",
    avatar: "https://i.pravatar.cc/150?img=21",
    joinDate: d,
    departmentId: "dept-marketing",
  },
  {
    id: "u22",
    email: "chris.sales@example.com",
    password: "password123",
    name: "Chris Nolan",
    role: "sales_member",
    avatar: "https://i.pravatar.cc/150?img=22",
    joinDate: d,
    departmentId: "dept-sales",
  },
  {
    id: "u23",
    email: "diana.sales@example.com",
    password: "password123",
    name: "Diana Prince",
    role: "sales_member",
    avatar: "https://i.pravatar.cc/150?img=23",
    joinDate: d,
    departmentId: "dept-sales",
  },
  {
    id: "u24",
    email: "ed.production@example.com",
    password: "password123",
    name: "Edgar Wright",
    role: "production_member",
    avatar: "https://i.pravatar.cc/150?img=24",
    joinDate: d,
    departmentId: "dept-production",
  },
  {
    id: "u25",
    email: "fiona.hr@example.com",
    password: "password123",
    name: "Fiona Gallagher",
    role: "hr_member",
    avatar: "https://i.pravatar.cc/150?img=25",
    joinDate: d,
    departmentId: "dept-hr",
  },

  // ── Clients ──────────────────────────────────────────────────────────────
  {
    id: "u6",
    email: "client1@example.com",
    password: "password123",
    name: "Acme Corp",
    role: "client",
    avatar: "https://i.pravatar.cc/150?img=6",
    joinDate: d,
    company: "Acme Corporation",
  },
  {
    id: "u7",
    email: "client2@example.com",
    password: "password123",
    name: "Globex Ltd",
    role: "client",
    avatar: "https://i.pravatar.cc/150?img=7",
    joinDate: d,
    company: "Globex Limited",
  },
];