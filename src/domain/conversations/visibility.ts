import type { UserRole } from "../../types";

export type ConvStatus = "open" | "awaiting_client" | "awaiting_team" | "closed";
export type ConvDept = "Sales" | "Marketing" | "Production" | "Management";

export interface ConvMessage {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  senderRole: string;
  body: string;
  sentAt: string;
  readBy: string[];
}

export interface Conversation {
  id: string;
  subject: string;
  clientId: string;
  clientName: string;
  clientEmail: string;
  assignedDept: ConvDept;
  assignedUserId: string;
  assignedUserName: string;
  status: ConvStatus;
  createdAt: string;
  lastActivity: string;
  unreadByClient: number;
  unreadByTeam: number;
  messages: ConvMessage[];
}

// Sales Admin / Sales Member are excluded — they have no access to Client Messages at all.
export const CAN_INITIATE_ROLES: UserRole[] = [
  "super_admin", "management",
  "marketing_admin", "marketing_member",
  "production_admin", "production_member",
];

export const DEPT_FOR_ROLE: Partial<Record<UserRole, ConvDept>> = {
  marketing_admin: "Marketing",
  marketing_member: "Marketing",
  production_admin: "Production",
  production_member: "Production",
};

export function getVisibleConversations(
  conversations: Conversation[],
  role: string,
  userId: string,
): Conversation[] {
  // Sales Admin / Sales Member are explicitly denied access to client messages and
  // message history — enforced here (the data layer) so it holds even if a caller
  // reaches this function directly, not just via the route/menu guard.
  if (role === "sales_admin" || role === "sales_member") return [];
  if (role === "client") return conversations.filter(c => c.clientId === userId);
  if (role === "super_admin" || role === "management") return conversations;
  if (role.startsWith("marketing_")) return conversations.filter(c => c.assignedDept === "Marketing");
  if (role.startsWith("production_")) return conversations.filter(c => c.assignedDept === "Production");
  return [];
}

export function getConvStats(conversations: Conversation[]) {
  return {
    open: conversations.filter(c => c.status === "open").length,
    awaitingClient: conversations.filter(c => c.status === "awaiting_client").length,
    awaitingTeam: conversations.filter(c => c.status === "awaiting_team").length,
    unreadByTeam: conversations.reduce((sum, c) => sum + c.unreadByTeam, 0),
    closed: conversations.filter(c => c.status === "closed").length,
    total: conversations.length,
  };
}
