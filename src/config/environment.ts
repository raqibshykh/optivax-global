// Single source of truth for environment-driven configuration.
// Replaces the old USE_MOCK / getBaseUrl() toggle now that the mock backend is gone.

export interface EnvironmentConfig {
  apiBaseUrl: string;
  ssePath: string;
  stripePublishableKey?: string;
}

let cached: EnvironmentConfig | null = null;

export function getEnvironment(): EnvironmentConfig {
  if (cached) return cached;

  const env = import.meta.env as Record<string, string | undefined>;
  const rawUrl = env.VITE_API_URL ?? env.VITE_API_BASE ?? "";

  const apiBaseUrl = rawUrl.replace(/\/$/, "");

  // A production build that still points at localhost means .env.production
  // (or whatever env file fed this build) was never updated for the real
  // deployment — every API/auth/SSE call would silently target someone's
  // local machine instead of failing loudly. Surface it immediately rather
  // than letting it manifest as a confusing wall of failed network requests.
  if (env.PROD && /localhost|127\.0\.0\.1/.test(apiBaseUrl)) {
    console.error(
      `[config] VITE_API_URL ("${apiBaseUrl}") looks like a local dev address in a production build. ` +
        `Set the real API origin before deploying.`
    );
  }

  cached = {
    apiBaseUrl,
    ssePath: env.VITE_SSE_PATH ?? "/saas/v1/notifications/stream",
    stripePublishableKey: env.VITE_STRIPE_PUBLISHABLE_KEY || undefined,
  };
  return cached;
}

export function getApiBaseUrl(): string {
  return getEnvironment().apiBaseUrl;
}