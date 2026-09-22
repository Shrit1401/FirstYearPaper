import posthog from "posthog-js";
import { postHogEnabled, postHogHost, postHogProjectToken } from "@/lib/client-analytics";

if (postHogEnabled && postHogProjectToken && postHogHost) {
  posthog.init(postHogProjectToken, {
    api_host: postHogHost,
    ui_host: "https://us.posthog.com",
    defaults: "2026-05-30",
    autocapture: true,
    capture_pageview: "history_change",
    capture_pageleave: true,
    capture_exceptions: true,
    capture_heatmaps: true,
    capture_performance: { web_vitals: true, network_timing: true },
    disable_session_recording: false,
    session_recording: {
      maskAllInputs: true,
      recordHeaders: false,
      recordBody: false,
    },
    person_profiles: "identified_only",
    tracing_headers: [window.location.hostname],
    loaded(instance) {
      instance.register({ app: "papers", tracking_version: "2026-09-23" });
    },
    debug: process.env.NODE_ENV === "development",
  });
}
