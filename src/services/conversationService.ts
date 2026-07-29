import { api } from "../lib/client";
import type { Conversation, ConvMessage, ConvStatus } from "../domain/conversations/visibility";

export {
  getVisibleConversations,
  getConvStats,
  CAN_INITIATE_ROLES,
  DEPT_FOR_ROLE,
} from "../domain/conversations/visibility";
export type { Conversation, ConvMessage, ConvStatus, ConvDept } from "../domain/conversations/visibility";

const BASE = "/saas/v1/conversations";

export class ConversationService {
  /** Fetches the raw conversation list. Access-control filtering is applied
   *  client-side afterwards via getVisibleConversations(conversations, role, userId). */
  static async getAll(): Promise<Conversation[]> {
    const data = await api.get<Conversation[]>(`${BASE}/list`);
    return data || [];
  }

  /** Persists the full conversation list (mirrors previous mock saveConversations). */
  static async save(conversations: Conversation[]): Promise<void> {
    await api.put(`${BASE}/save`, { conversations });
  }

  static async create(conversation: Conversation): Promise<Conversation> {
    return api.post<Conversation>(`${BASE}/create`, conversation);
  }

  static async addMessage(conversationId: string, message: ConvMessage): Promise<void> {
    await api.post(`${BASE}/${encodeURIComponent(conversationId)}/messages`, message);
  }

  static async updateStatus(conversationId: string, status: ConvStatus): Promise<void> {
    await api.put(`${BASE}/${encodeURIComponent(conversationId)}/status`, { status });
  }
}
