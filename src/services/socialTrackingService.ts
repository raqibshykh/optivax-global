import { api } from "../lib/client";
import type { SocialLink, SocialClickEvent, SocialPlatform } from "../types";

export interface SocialAnalytics {
  totalClicks: number;
  byPlatform: Record<string, number>;
  byLink: Record<string, number>;
  links: SocialLink[];
  clicks: SocialClickEvent[];
}

export interface AccountMetric {
  linkId: string;
  platform: string;
  followers: number;
  engagement: number;
  reach: number;
  lastSync: string;
}

export class SocialTrackingService {
  static async getLinks(): Promise<SocialLink[]> {
    return api.get<SocialLink[]>("/saas/v1/social-links/list");
  }

  static async getAnalytics(): Promise<SocialAnalytics> {
    return api.get<SocialAnalytics>("/saas/v1/social-analytics");
  }

  static async getAccountMetrics(): Promise<AccountMetric[]> {
    const data = await api.get<AccountMetric[]>("/saas/v1/social-analytics/account-metrics");
    return Array.isArray(data) ? data : [];
  }

  static async createLink(payload: {
    platform: SocialPlatform;
    label: string;
    url: string;
    createdBy: string;
  }): Promise<SocialLink> {
    return api.post<SocialLink>("/saas/v1/social-links/create", payload);
  }

  static async updateLink(id: string, patch: Partial<SocialLink>): Promise<void> {
    await api.put("/saas/v1/social-links/update", { id, ...patch });
  }

  static async deleteLink(id: string): Promise<void> {
    await api.delete("/saas/v1/social-links/delete", { id });
  }

  static async trackClick(linkId: string, trackingId: string, platform: SocialPlatform): Promise<void> {
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
  }

  static async syncMetrics(linkId: string): Promise<void> {
    await api.post("/saas/v1/social-analytics/account-metrics", { linkId });
  }
}
