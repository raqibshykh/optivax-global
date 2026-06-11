import { api } from "../lib/client";

import { CalendarEvent } from "../types";

const BASE = "/saas/v1/calendar-events";

export class EventService {
  static async getAll(): Promise<CalendarEvent[]> {
    const data = await api.get<CalendarEvent[]>(`${BASE}/list`);
    return data || [];
  }

  static async getById(id: string): Promise<CalendarEvent | null> {
    const data = await api.get<CalendarEvent[]>(`${BASE}/list?id=${encodeURIComponent(id)}`);
    return data?.[0] ?? null;
  }

  static async create(event: Omit<CalendarEvent, "id">): Promise<CalendarEvent> {
    return api.post<CalendarEvent>(`${BASE}/create`, event);
  }

  static async update(id: string, updates: Partial<CalendarEvent>): Promise<CalendarEvent> {
    return api.put<CalendarEvent>(`${BASE}/update`, { id, ...updates });
  }

  static async delete(id: string): Promise<void> {
    await api.delete(`${BASE}/delete`, { id });
  }
}
