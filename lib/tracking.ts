// ── Types ──────────────────────────────────────────────────────────────────

export type TrackedPaper = {
  href: string;
  name: string;
  count: number;
  firstViewedAt: string;  // ISO
  lastViewedAt: string;   // ISO
  viewedAt: string[];     // ISO array, last 50
};

export type TrackingSnapshot = {
  papers: TrackedPaper[];
  sessionCount: number;
  totalTimeSpent: number;
  papersThisWeek: number;
};

// ── Storage keys ───────────────────────────────────────────────────────────

const PAPERS_KEY = "mit-tracked-papers";
const SESSION_START_KEY = "mit-session-start";
const TIME_KEY = "mit-time-spent";
const SESSION_COUNT_KEY = "mit-session-count";
export const TRACKING_UPDATED_EVENT = "mit-tracking-updated";

// ── Helpers ────────────────────────────────────────────────────────────────

function safeGet<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (raw == null) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function safeSet(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // storage full or unavailable — silently ignore
  }
}

function emitTrackingUpdated() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(TRACKING_UPDATED_EVENT));
}

// ── Paper tracking ─────────────────────────────────────────────────────────

export function trackPaperView(href: string, name: string): void {
  const store = safeGet<Record<string, TrackedPaper>>(PAPERS_KEY, {});
  const now = new Date().toISOString();
  const existing = store[href];

  if (existing) {
    existing.count += 1;
    existing.lastViewedAt = now;
    existing.viewedAt = [...existing.viewedAt.slice(-49), now];
    existing.name = name; // keep name fresh
  } else {
    store[href] = {
      href,
      name,
      count: 1,
      firstViewedAt: now,
      lastViewedAt: now,
      viewedAt: [now],
    };
  }

  safeSet(PAPERS_KEY, store);
  emitTrackingUpdated();
}

export function getTrackedPapers(): TrackedPaper[] {
  const store = safeGet<Record<string, TrackedPaper>>(PAPERS_KEY, {});
  return Object.values(store).sort(
    (a, b) => new Date(b.lastViewedAt).getTime() - new Date(a.lastViewedAt).getTime()
  );
}

export function getRecentPapers(limit = 10): TrackedPaper[] {
  return getTrackedPapers().slice(0, limit);
}

export function getPapersThisWeek(): TrackedPaper[] {
  const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
  return getTrackedPapers().filter(
    (p) => new Date(p.lastViewedAt).getTime() > cutoff
  );
}

// ── Session / time tracking ────────────────────────────────────────────────

export function startSession(): void {
  if (typeof window === "undefined") return;
  const now = new Date().toISOString();
  safeSet(SESSION_START_KEY, now);
  const count = safeGet<number>(SESSION_COUNT_KEY, 0);
  safeSet(SESSION_COUNT_KEY, count + 1);
  emitTrackingUpdated();
}

export function endSession(): void {
  if (typeof window === "undefined") return;
  const startRaw = safeGet<string | null>(SESSION_START_KEY, null);
  if (!startRaw) return;
  const elapsed = Math.floor(
    (Date.now() - new Date(startRaw).getTime()) / 1000
  );
  if (elapsed > 0 && elapsed < 3600 * 6) {
    // cap at 6h to avoid tab-left-open skewing stats
    const total = safeGet<number>(TIME_KEY, 0);
    safeSet(TIME_KEY, total + elapsed);
  }
  localStorage.removeItem(SESSION_START_KEY);
  emitTrackingUpdated();
}

export function getTotalTimeSpent(): number {
  return safeGet<number>(TIME_KEY, 0);
}

export function getSessionCount(): number {
  return safeGet<number>(SESSION_COUNT_KEY, 0);
}

// ── Formatting helpers ─────────────────────────────────────────────────────

export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  const rem = mins % 60;
  return rem > 0 ? `${hrs}h ${rem}m` : `${hrs}h`;
}

export function timeAgo(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

// ── Clear all ─────────────────────────────────────────────────────────────

export function clearAllTracking(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(PAPERS_KEY);
  localStorage.removeItem(SESSION_START_KEY);
  localStorage.removeItem(TIME_KEY);
  localStorage.removeItem(SESSION_COUNT_KEY);
  emitTrackingUpdated();
}

export function getTrackingSnapshot(): TrackingSnapshot {
  return {
    papers: getTrackedPapers(),
    sessionCount: getSessionCount(),
    totalTimeSpent: getTotalTimeSpent(),
    papersThisWeek: getPapersThisWeek().length,
  };
}
