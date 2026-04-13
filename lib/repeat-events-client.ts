"use client";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";

const SESSION_KEY = "repeat-session-id";

function safeStorageGet(key: string) {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeStorageSet(key: string, value: string) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Ignore storage errors.
  }
}

export function getRepeatSessionId() {
  const existing = safeStorageGet(SESSION_KEY);
  if (existing) return existing;
  const nextId =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `repeat-${Date.now()}`;
  safeStorageSet(SESSION_KEY, nextId);
  return nextId;
}

export async function postRepeatEvent(endpoint: string, payload: Record<string, unknown>) {
  try {
    const supabase = getSupabaseBrowserClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(session?.access_token
          ? { Authorization: `Bearer ${session.access_token}` }
          : {}),
      },
      body: JSON.stringify(payload),
      keepalive: true,
    });
  } catch {
    // Ignore fire-and-forget client telemetry failures.
  }
}
