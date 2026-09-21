// Keep local previews independent of optional analytics services. Developers
// can explicitly enable them when testing instrumentation.
export const clientAnalyticsEnabled = process.env.NODE_ENV === "production"
  || process.env.NEXT_PUBLIC_ENABLE_ANALYTICS === "true";

export const postHogProjectToken = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN?.trim();
export const postHogHost = process.env.NEXT_PUBLIC_POSTHOG_HOST?.trim();
export const postHogEnabled = clientAnalyticsEnabled && Boolean(postHogProjectToken && postHogHost);
