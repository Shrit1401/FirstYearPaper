import posthog from "posthog-js"
import { postHogEnabled, postHogHost, postHogProjectToken } from "@/lib/client-analytics"

if (postHogEnabled && postHogProjectToken && postHogHost) {
  posthog.init(postHogProjectToken, {
    api_host: postHogHost,
    defaults: "2026-01-30",
    autocapture: true,
    capture_pageview: "history_change",
    capture_pageleave: true,
    capture_exceptions: true,
    disable_session_recording: false,
    person_profiles: "identified_only",
    tracing_headers: [window.location.hostname],
    debug: process.env.NODE_ENV === "development",
  })
}
