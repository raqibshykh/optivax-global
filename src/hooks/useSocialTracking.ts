import { useState, useEffect, useCallback } from "react";
import { api } from "../lib/client";
import type { SocialLink, SocialClickEvent, SocialPlatform } from "../types";

interface SocialAnalytics {
  totalClicks: number;
  byPlatform: Record<string, number>;
  byLink: Record<string, number>;
  links: SocialLink[];
  clicks: SocialClickEvent[];
}

export function useSocialTracking() {
  const [links, setLinks] = useState<SocialLink[]>([]);
  const [analytics, setAnalytics] = useState<SocialAnalytics>({
    totalClicks: 0, byPlatform: {}, byLink: {}, links: [], clicks: [],
  });
  const [isLoading, setIsLoading] = useState(true);

  const loadLinks = useCallback(async () => {
    try {
      const data = await api.get<SocialLink[]>("/saas/v1/social-links/list");
      setLinks(data);
    } catch {
      setLinks([]);
    }
  }, []);

  const loadAnalytics = useCallback(async () => {
    try {
      const data = await api.get<SocialAnalytics>("/saas/v1/social-analytics");
      setAnalytics(data);
    } catch {}
  }, []);

  const load = useCallback(async () => {
    setIsLoading(true);
    await Promise.all([loadLinks(), loadAnalytics()]);
    setIsLoading(false);
  }, [loadLinks, loadAnalytics]);

  useEffect(() => { load(); }, [load]);

  const createLink = useCallback(async (payload: {
    platform: SocialPlatform; label: string; url: string; createdBy: string;
  }) => {
    const link = await api.post<SocialLink>("/saas/v1/social-links/create", payload);
    await load();
    return link;
  }, [load]);

  const updateLink = useCallback(async (id: string, patch: Partial<SocialLink>) => {
    await api.put("/saas/v1/social-links/update", { id, ...patch });
    await load();
  }, [load]);

  const deleteLink = useCallback(async (id: string) => {
    await api.delete("/saas/v1/social-links/delete", { id });
    await load();
  }, [load]);

  const trackClick = useCallback(async (linkId: string, trackingId: string, platform: SocialPlatform) => {
    const visitorId = `v-${Math.random().toString(36).slice(2, 10)}`;
    await api.post("/saas/v1/social-links/track", {
      linkId,
      trackingId,
      platform,
      visitorId,
      referrer: document.referrer || "direct",
      device: /Mobi|Android/i.test(navigator.userAgent) ? "mobile" : "desktop",
      browser: navigator.userAgent.split(" ").pop()?.split("/")[0] ?? "unknown",
      sourceUrl: window.location.href,
    });
    await loadAnalytics();
  }, [loadAnalytics]);

  return { links, analytics, isLoading, createLink, updateLink, deleteLink, trackClick, reload: load };
}
