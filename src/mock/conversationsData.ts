import type { UserRole } from "../types";

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

export const CAN_INITIATE_ROLES: UserRole[] = [
  "super_admin", "management",
  "sales_admin", "sales_member",
  "marketing_admin", "marketing_member",
  "production_admin", "production_member",
];

export const DEPT_FOR_ROLE: Partial<Record<UserRole, ConvDept>> = {
  sales_admin: "Sales",
  sales_member: "Sales",
  marketing_admin: "Marketing",
  marketing_member: "Marketing",
  production_admin: "Production",
  production_member: "Production",
};

const CONV_KEY = "mock_conversations";

function seedConversations(): Conversation[] {
  return [
    {
      id: "conv-001",
      subject: "Website Redesign Project — Scope Clarification",
      clientId: "u6",
      clientName: "Alice Johnson",
      clientEmail: "client1@example.com",
      assignedDept: "Sales",
      assignedUserId: "u8",
      assignedUserName: "James Carter",
      status: "awaiting_client",
      createdAt: "2026-06-10T09:00:00Z",
      lastActivity: "2026-06-18T14:30:00Z",
      unreadByClient: 1,
      unreadByTeam: 0,
      messages: [
        {
          id: "msg-001-1", conversationId: "conv-001",
          senderId: "u8", senderName: "James Carter", senderRole: "sales_admin",
          body: "Hi Alice, thank you for choosing Optivax for your website redesign project. I wanted to clarify the scope: will you need e-commerce functionality, or is this purely a branding/content site?",
          sentAt: "2026-06-10T09:00:00Z", readBy: ["u8", "u6"],
        },
        {
          id: "msg-001-2", conversationId: "conv-001",
          senderId: "u6", senderName: "Alice Johnson", senderRole: "client",
          body: "Hi James! We'll need a product catalog with cart functionality, but full checkout can wait for Phase 2. Does that affect the timeline?",
          sentAt: "2026-06-10T11:45:00Z", readBy: ["u8", "u6"],
        },
        {
          id: "msg-001-3", conversationId: "conv-001",
          senderId: "u8", senderName: "James Carter", senderRole: "sales_admin",
          body: "That works perfectly. Phase 1 with catalog + cart (no payment gateway) keeps us on the 8-week timeline. I'll update the proposal with a Phase 2 addendum for the full checkout. Please confirm once you've reviewed the updated document.",
          sentAt: "2026-06-18T14:30:00Z", readBy: ["u8"],
        },
      ],
    },
    {
      id: "conv-002",
      subject: "Q3 Digital Marketing Campaign Strategy",
      clientId: "u7",
      clientName: "Bob Williams",
      clientEmail: "client2@example.com",
      assignedDept: "Marketing",
      assignedUserId: "u10",
      assignedUserName: "Olivia Brown",
      status: "awaiting_team",
      createdAt: "2026-06-12T10:00:00Z",
      lastActivity: "2026-06-20T16:00:00Z",
      unreadByClient: 0,
      unreadByTeam: 1,
      messages: [
        {
          id: "msg-002-1", conversationId: "conv-002",
          senderId: "u10", senderName: "Olivia Brown", senderRole: "marketing_admin",
          body: "Hi Bob, I'm reaching out to discuss your Q3 digital marketing campaign. Based on the brief, I'm proposing a mix of Google Ads and LinkedIn targeting your B2B segment. Can we schedule a call this week to finalize the ad spend allocation?",
          sentAt: "2026-06-12T10:00:00Z", readBy: ["u10", "u7"],
        },
        {
          id: "msg-002-2", conversationId: "conv-002",
          senderId: "u7", senderName: "Bob Williams", senderRole: "client",
          body: "Hi Olivia, this sounds great. I'm available Thursday at 3 PM or Friday morning. Also, can you include Instagram in the mix? We've been seeing good engagement there.",
          sentAt: "2026-06-13T09:30:00Z", readBy: ["u10", "u7"],
        },
        {
          id: "msg-002-3", conversationId: "conv-002",
          senderId: "u10", senderName: "Olivia Brown", senderRole: "marketing_admin",
          body: "Thursday 3 PM works for me. Instagram Reels can be very effective for retail — I'll build that into the strategy. Looking forward to our call!",
          sentAt: "2026-06-14T11:00:00Z", readBy: ["u10", "u7"],
        },
        {
          id: "msg-002-4", conversationId: "conv-002",
          senderId: "u7", senderName: "Bob Williams", senderRole: "client",
          body: "Perfect. One more thing — our budget for Q3 has increased to $15K. Please factor that in when preparing the media plan.",
          sentAt: "2026-06-20T16:00:00Z", readBy: ["u7"],
        },
      ],
    },
    {
      id: "conv-003",
      subject: "Production Milestone 2 — Delivery Update",
      clientId: "u30",
      clientName: "Carol Stevens",
      clientEmail: "client3@example.com",
      assignedDept: "Production",
      assignedUserId: "u9",
      assignedUserName: "David Chen",
      status: "open",
      createdAt: "2026-06-15T08:00:00Z",
      lastActivity: "2026-06-22T09:00:00Z",
      unreadByClient: 0,
      unreadByTeam: 0,
      messages: [
        {
          id: "msg-003-1", conversationId: "conv-003",
          senderId: "u9", senderName: "David Chen", senderRole: "production_admin",
          body: "Hi Carol, I'm writing to flag that Milestone 2 (backend API integration) is running 3 days behind schedule due to an unexpected dependency issue. New delivery date: June 28. I sincerely apologize for the delay.",
          sentAt: "2026-06-15T08:00:00Z", readBy: ["u9", "u30"],
        },
        {
          id: "msg-003-2", conversationId: "conv-003",
          senderId: "u30", senderName: "Carol Stevens", senderRole: "client",
          body: "Thank you for the early notice, David. June 28 is still within our acceptable window. Can you send an updated project timeline showing the impact on subsequent milestones?",
          sentAt: "2026-06-15T10:30:00Z", readBy: ["u9", "u30"],
        },
        {
          id: "msg-003-3", conversationId: "conv-003",
          senderId: "u9", senderName: "David Chen", senderRole: "production_admin",
          body: "Absolutely. I've updated the Gantt chart and shared it via the Files section. Milestones 3 and 4 have each shifted by 3 days, but final delivery remains August 15 as we'll run M3 and M4 in parallel.",
          sentAt: "2026-06-22T09:00:00Z", readBy: ["u9", "u30"],
        },
      ],
    },
    {
      id: "conv-004",
      subject: "Contract Renewal — Annual Plan 2026-27",
      clientId: "u6",
      clientName: "Alice Johnson",
      clientEmail: "client1@example.com",
      assignedDept: "Sales",
      assignedUserId: "u8",
      assignedUserName: "James Carter",
      status: "closed",
      createdAt: "2026-05-20T10:00:00Z",
      lastActivity: "2026-06-01T15:00:00Z",
      unreadByClient: 0,
      unreadByTeam: 0,
      messages: [
        {
          id: "msg-004-1", conversationId: "conv-004",
          senderId: "u8", senderName: "James Carter", senderRole: "sales_admin",
          body: "Hi Alice, your current service plan expires on June 30. I'd love to discuss the renewal and introduce our new Enterprise tier which includes priority support and unlimited revisions.",
          sentAt: "2026-05-20T10:00:00Z", readBy: ["u8", "u6"],
        },
        {
          id: "msg-004-2", conversationId: "conv-004",
          senderId: "u6", senderName: "Alice Johnson", senderRole: "client",
          body: "Hi James, we're definitely interested in renewing. The Enterprise tier sounds attractive — please send over the detailed pricing.",
          sentAt: "2026-05-22T09:00:00Z", readBy: ["u8", "u6"],
        },
        {
          id: "msg-004-3", conversationId: "conv-004",
          senderId: "u8", senderName: "James Carter", senderRole: "sales_admin",
          body: "Wonderful! The proposal is in your Files section. Annual rate is $18,000 with 10% discount for upfront payment. Contract is pre-signed on our end — awaiting your signature via DocuSign.",
          sentAt: "2026-05-28T11:00:00Z", readBy: ["u8", "u6"],
        },
        {
          id: "msg-004-4", conversationId: "conv-004",
          senderId: "u6", senderName: "Alice Johnson", senderRole: "client",
          body: "Signed and sent! Looking forward to another year of great work together.",
          sentAt: "2026-06-01T15:00:00Z", readBy: ["u8", "u6"],
        },
      ],
    },
    {
      id: "conv-005",
      subject: "New Product Launch — Social Media Strategy",
      clientId: "u31",
      clientName: "Daniel Foster",
      clientEmail: "client4@example.com",
      assignedDept: "Marketing",
      assignedUserId: "u10",
      assignedUserName: "Olivia Brown",
      status: "awaiting_team",
      createdAt: "2026-06-19T14:00:00Z",
      lastActivity: "2026-06-22T11:00:00Z",
      unreadByClient: 0,
      unreadByTeam: 2,
      messages: [
        {
          id: "msg-005-1", conversationId: "conv-005",
          senderId: "u10", senderName: "Olivia Brown", senderRole: "marketing_admin",
          body: "Hi Daniel, congratulations on the upcoming product launch! I'd like to propose a 30-day social media blitz starting July 1 — teaser content, influencer partnerships, and targeted paid ads. What platforms are most important to your audience?",
          sentAt: "2026-06-19T14:00:00Z", readBy: ["u10", "u31"],
        },
        {
          id: "msg-005-2", conversationId: "conv-005",
          senderId: "u31", senderName: "Daniel Foster", senderRole: "client",
          body: "Hi Olivia! Our core audience is on TikTok and Instagram (18-35 demographic). We've also been thinking about a YouTube unboxing campaign. Budget is around $8K for the launch month.",
          sentAt: "2026-06-20T09:30:00Z", readBy: ["u10", "u31"],
        },
        {
          id: "msg-005-3", conversationId: "conv-005",
          senderId: "u31", senderName: "Daniel Foster", senderRole: "client",
          body: "Also, can you include a hashtag strategy? We want something that trends organically alongside the paid push.",
          sentAt: "2026-06-22T11:00:00Z", readBy: ["u31"],
        },
      ],
    },
    {
      id: "conv-006",
      subject: "Revision Request — Landing Page Copy",
      clientId: "u30",
      clientName: "Carol Stevens",
      clientEmail: "client3@example.com",
      assignedDept: "Production",
      assignedUserId: "u9",
      assignedUserName: "David Chen",
      status: "closed",
      createdAt: "2026-06-05T10:00:00Z",
      lastActivity: "2026-06-12T16:00:00Z",
      unreadByClient: 0,
      unreadByTeam: 0,
      messages: [
        {
          id: "msg-006-1", conversationId: "conv-006",
          senderId: "u30", senderName: "Carol Stevens", senderRole: "client",
          body: "Hi, the landing page headline doesn't match our brand tone. We want something more dynamic and less corporate. Can this be revised?",
          sentAt: "2026-06-05T10:00:00Z", readBy: ["u9", "u30"],
        },
        {
          id: "msg-006-2", conversationId: "conv-006",
          senderId: "u9", senderName: "David Chen", senderRole: "production_admin",
          body: "Hi Carol, absolutely — we'll get that revised. Could you share 2-3 examples of copy that represents the tone you're going for? This will help our copywriter nail it on the first pass.",
          sentAt: "2026-06-06T09:00:00Z", readBy: ["u9", "u30"],
        },
        {
          id: "msg-006-3", conversationId: "conv-006",
          senderId: "u30", senderName: "Carol Stevens", senderRole: "client",
          body: "Sure! Think Airbnb-style — inspiring, action-oriented, personable. I've pinned some examples in the files section.",
          sentAt: "2026-06-07T11:00:00Z", readBy: ["u9", "u30"],
        },
        {
          id: "msg-006-4", conversationId: "conv-006",
          senderId: "u9", senderName: "David Chen", senderRole: "production_admin",
          body: "Perfect reference! The revised landing page is ready and uploaded to your Files section (v2). Please review and let us know if this hits the mark.",
          sentAt: "2026-06-12T16:00:00Z", readBy: ["u9", "u30"],
        },
      ],
    },
    {
      id: "conv-007",
      subject: "Strategic Partnership Discussion — Multi-year Engagement",
      clientId: "u7",
      clientName: "Bob Williams",
      clientEmail: "client2@example.com",
      assignedDept: "Management",
      assignedUserId: "u2",
      assignedUserName: "Sarah Mitchell",
      status: "open",
      createdAt: "2026-06-17T11:00:00Z",
      lastActivity: "2026-06-21T13:00:00Z",
      unreadByClient: 0,
      unreadByTeam: 0,
      messages: [
        {
          id: "msg-007-1", conversationId: "conv-007",
          senderId: "u2", senderName: "Sarah Mitchell", senderRole: "management",
          body: "Hi Bob, given the strong results we've delivered for Globex Corp over the past year, I'd love to explore a multi-year strategic partnership. This would give you dedicated team capacity, priority access to new services, and significant cost savings. Would you be open to a call this month?",
          sentAt: "2026-06-17T11:00:00Z", readBy: ["u2", "u7"],
        },
        {
          id: "msg-007-2", conversationId: "conv-007",
          senderId: "u7", senderName: "Bob Williams", senderRole: "client",
          body: "Hi Sarah, we'd absolutely be interested. The consistency of service from your team has been impressive. Let's plan for the last week of June — I'll have our CFO on the call as well.",
          sentAt: "2026-06-21T13:00:00Z", readBy: ["u2", "u7"],
        },
      ],
    },
    {
      id: "conv-008",
      subject: "Welcome to Optivax — Onboarding",
      clientId: "u31",
      clientName: "Daniel Foster",
      clientEmail: "client4@example.com",
      assignedDept: "Sales",
      assignedUserId: "u8",
      assignedUserName: "James Carter",
      status: "closed",
      createdAt: "2026-06-01T09:00:00Z",
      lastActivity: "2026-06-03T10:00:00Z",
      unreadByClient: 0,
      unreadByTeam: 0,
      messages: [
        {
          id: "msg-008-1", conversationId: "conv-008",
          senderId: "u8", senderName: "James Carter", senderRole: "sales_admin",
          body: "Welcome to Optivax, Daniel! Your account is now active. You have access to project tracking, file sharing, billing, and direct communication with your assigned team. Your production contact is David Chen and your marketing contact is Olivia Brown. Feel free to reach out anytime.",
          sentAt: "2026-06-01T09:00:00Z", readBy: ["u8", "u31"],
        },
        {
          id: "msg-008-2", conversationId: "conv-008",
          senderId: "u31", senderName: "Daniel Foster", senderRole: "client",
          body: "Thank you James! The portal looks great. I've already explored the projects section. Looking forward to working with the team!",
          sentAt: "2026-06-03T10:00:00Z", readBy: ["u8", "u31"],
        },
      ],
    },
  ];
}

export function getConversations(): Conversation[] {
  const raw = localStorage.getItem(CONV_KEY);
  if (raw) {
    try { return JSON.parse(raw) as Conversation[]; } catch { /* fall through to seed */ }
  }
  const seed = seedConversations();
  localStorage.setItem(CONV_KEY, JSON.stringify(seed));
  return seed;
}

export function saveConversations(conversations: Conversation[]): void {
  localStorage.setItem(CONV_KEY, JSON.stringify(conversations));
}

export function getVisibleConversations(
  conversations: Conversation[],
  role: string,
  userId: string,
): Conversation[] {
  if (role === "client") return conversations.filter(c => c.clientId === userId);
  if (role === "super_admin" || role === "management") return conversations;
  if (role.startsWith("sales_")) return conversations.filter(c => c.assignedDept === "Sales");
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
