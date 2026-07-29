import { api } from "../lib/client";

const BASE = "/saas/v1/production-assignments";

export class ProductionAssignmentService {
  static async getAll(): Promise<Record<string, string[]>> {
    const data = await api.get<Record<string, string[]>>(BASE);
    return data || {};
  }

  static async save(assignments: Record<string, string[]>): Promise<void> {
    await api.put(BASE, assignments);
  }
}
