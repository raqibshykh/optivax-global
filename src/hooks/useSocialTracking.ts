import { useState, useEffect, useCallback, useRef } from "react";
import { SocialTrackingService, type AccountMetric } from "../services/socialTrackingService";
import type { SocialLink, SocialClickEvent, SocialPlatform } from "../types";

interface SocialAnalytics {
  totalClicks: number;
  byPlatform: Record<string, number>;
  byLink: Record<string, number>;
  links: SocialLink[];
  clicks: SocialClickEvent[];
}

export type { AccountMetric };

export function useSocialTracking() {
  const [links, setLinks] = useState<SocialLink[]>([]);
  const [analytics, setAnalytics] = useState<SocialAnalytics>({
    totalClicks: 0, byPlatform: {}, byLink: {}, links: [], clicks: [],
  });
  const [accountMetrics, setAccountMetrics] = useState<AccountMetric[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const loadLinks = useCallback(async () => {
    try {
      const data = await SocialTrackingService.getLinks();
      if (mountedRef.current) setLinks(data);
    } catch {
      if (mountedRef.current) setLinks([]);
    }
  }, []);

  const loadAnalytics = useCallback(async () => {
    try {
      const data = await SocialTrackingService.getAnalytics();
      if (mountedRef.current) setAnalytics(data);
    } catch {
      // keep previous analytics on failure
    }
  }, []);

  const loadAccountMetrics = useCallback(async () => {
    try {
      const data = await SocialTrackingService.getAccountMetrics();
      if (mountedRef.current) setAccountMetrics(data);
    } catch {
      // keep previous metrics on failure
    }
  }, []);

  const load = useCallback(async () => {
    setIsLoading(true);
    await Promise.all([loadLinks(), loadAnalytics(), loadAccountMetrics()]);
    if (mountedRef.current) setIsLoading(false);
  }, [loadLinks, loadAnalytics, loadAccountMetrics]);

  useEffect(() => { load(); }, [load]);

  const createLink = useCallback(async (payload: {
    platform: SocialPlatform; label: string; url: string; createdBy: string;
  }) => {
    const link = await SocialTrackingService.createLink(payload);
    await load();
    return link;
  }, [load]);

  const updateLink = useCallback(async (id: string, patch: Partial<SocialLink>) => {
    await SocialTrackingService.updateLink(id, patch);
    await load();
  }, [load]);

  const deleteLink = useCallback(async (id: string) => {
    await SocialTrackingService.deleteLink(id);
    await load();
  }, [load]);

  const trackClick = useCallback(async (linkId: string, trackingId: string, platform: SocialPlatform) => {
    await SocialTrackingService.trackClick(linkId, trackingId, platform);
    await loadAnalytics();
  }, [loadAnalytics]);

  const syncMetrics = useCallback(async (linkId: string) => {
    await SocialTrackingService.syncMetrics(linkId);
    await loadAccountMetrics();
  }, [loadAccountMetrics]);

  return { links, analytics, accountMetrics, isLoading, createLink, updateLink, deleteLink, trackClick, syncMetrics, reload: load };
}
