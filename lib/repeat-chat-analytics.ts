import {
  getRepeatLearningConfig,
  readRepeatLearningEvents,
} from "./repeat-learning";
import type { RepeatLearningEvent, RepeatLearningEventType } from "./repeat-types";

export type RepeatChatAnalyticsRow = {
  eventId: string;
  createdAt: string;
  eventType: RepeatLearningEventType;
  sessionId: string;
  subjectKey?: string;
  paperId?: string;
  queryText?: string;
  answerId?: string;
  responseHash?: string;
  selectedCitationIds?: string[];
  selectedChunkIds?: string[];
  payload?: Record<string, unknown>;
};

export type RepeatChatAnalyticsPayload = {
  learningEnabled: boolean;
  eventSamplingRate: number;
  totalEvents: number;
  uniqueSessions: number;
  queryEventCount: number;
  feedbackEventCount: number;
  byType: Partial<Record<RepeatLearningEventType, number>>;
  timeline: { date: string; events: number; queries: number }[];
  recentEvents: RepeatChatAnalyticsRow[];
  generatedAt: string;
};

function isQueryEvent(t: RepeatLearningEventType) {
  return (
    t === "query_submitted" ||
    t === "query_reformulated" ||
    t === "follow_up_asked"
  );
}

function isFeedbackEvent(t: RepeatLearningEventType) {
  return t === "answer_feedback" || t === "citation_feedback";
}

function toRow(event: RepeatLearningEvent): RepeatChatAnalyticsRow {
  return {
    eventId: event.eventId,
    createdAt: event.createdAt,
    eventType: event.eventType,
    sessionId: event.sessionId,
    subjectKey: event.subjectKey,
    paperId: event.paperId,
    queryText: event.queryText,
    answerId: event.answerId,
    responseHash: event.responseHash,
    selectedCitationIds: event.selectedCitationIds,
    selectedChunkIds: event.selectedChunkIds,
    payload: event.payload,
  };
}

export async function buildRepeatChatAnalytics(
  recentLimit = 200
): Promise<RepeatChatAnalyticsPayload> {
  const config = getRepeatLearningConfig();
  const events = await readRepeatLearningEvents();

  const byType: Partial<Record<RepeatLearningEventType, number>> = {};
  const byDay = new Map<string, { events: number; queries: number }>();
  const sessions = new Set<string>();
  let queryEventCount = 0;
  let feedbackEventCount = 0;

  for (const e of events) {
    byType[e.eventType] = (byType[e.eventType] ?? 0) + 1;
    sessions.add(e.sessionId);
    if (isQueryEvent(e.eventType)) queryEventCount += 1;
    if (isFeedbackEvent(e.eventType)) feedbackEventCount += 1;

    const day = e.createdAt.slice(0, 10);
    const row = byDay.get(day) ?? { events: 0, queries: 0 };
    row.events += 1;
    if (isQueryEvent(e.eventType)) row.queries += 1;
    byDay.set(day, row);
  }

  const timeline = [...byDay.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, v]) => ({ date, ...v }));

  const sorted = [...events].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  const recentEvents = sorted.slice(0, recentLimit).map(toRow);

  return {
    learningEnabled: config.learningEnabled,
    eventSamplingRate: config.eventSamplingRate,
    totalEvents: events.length,
    uniqueSessions: sessions.size,
    queryEventCount,
    feedbackEventCount,
    byType,
    timeline,
    recentEvents,
    generatedAt: new Date().toISOString(),
  };
}
