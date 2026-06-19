import { useState, useEffect, useCallback } from "react";
import { CalendarEvent } from "../types";
import { EventService } from "../services/eventService";

export function useEvents() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEvents = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await EventService.getAll();
      setEvents(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to fetch events");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const addEvent = async (eventData: Omit<CalendarEvent, "id">) => {
    try {
      const newEvent = await EventService.create(eventData);
      setEvents((prev) => [...prev, newEvent]);
      return newEvent;
    } catch (err: unknown) {
      throw new Error(err instanceof Error ? err.message : "Failed to add event");
    }
  };

  const updateEvent = async (id: string, updates: Partial<CalendarEvent>) => {
    try {
      const updatedEvent = await EventService.update(id, updates);
      setEvents((prev) =>
        prev.map((e) => (e.id === id ? updatedEvent : e))
      );
      return updatedEvent;
    } catch (err: unknown) {
      throw new Error(err instanceof Error ? err.message : "Failed to update event");
    }
  };

  const deleteEvent = async (id: string) => {
    try {
      await EventService.delete(id);
      setEvents((prev) => prev.filter((e) => e.id !== id));
    } catch (err: unknown) {
      throw new Error(err instanceof Error ? err.message : "Failed to delete event");
    }
  };

  return {
    events,
    isLoading,
    error,
    addEvent,
    updateEvent,
    deleteEvent,
    refreshEvents: fetchEvents,
  };
}
