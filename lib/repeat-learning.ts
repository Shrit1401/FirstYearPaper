import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import type {
  RepeatChunk,
  RepeatClusterLearningStats,
  RepeatLearningConfig,
  RepeatLearningEvent,
  RepeatLearningSnapshot,
} from "./repeat-types";

const LEARNING_DIR = path.join(process.cwd(), "generated", "repeat-learning");
const EVENTS_PATH = path.join(LEARNING_DIR, "events.ndjson");
const SNAPSHOT_PATH = path.join(LEARNING_DIR, "snapshot.json");
const DATASETS_DIR = path.join(LEARNING_DIR, "datasets");
const RERANKER_DATASET_PATH = path.join(DATASETS_DIR, "reranker.jsonl");
const PREFERENCE_DATASET_PATH = path.join(DATASETS_DIR, "preference.jsonl");

const DEFAULT_SNAPSHOT: RepeatLearningSnapshot = {
  generatedAt: new Date(0).toISOString(),
  eventCount: 0,
  chunkStats: {},
  clusterStats: {},
  queryStats: {},
};

export function getRepeatLearningConfig(): RepeatLearningConfig {
  return {
    learningEnabled: process.env.REPEAT_LEARNING_ENABLED !== "false",
    rerankerEnabled: process.env.REPEAT_RERANKER_ENABLED !== "false",
    fineTunedModelEnabled: process.env.REPEAT_FINE_TUNED_MODEL_ENABLED === "true",
    confidenceFloor: Number(process.env.REPEAT_CONFIDENCE_FLOOR ?? "0.18"),
    lowConfidenceThreshold: Number(process.env.REPEAT_LOW_CONFIDENCE_THRESHOLD ?? "0.55"),
    eventSamplingRate: Number(process.env.REPEAT_EVENT_SAMPLING_RATE ?? "1"),
    retentionDays: Number(process.env.REPEAT_EVENT_RETENTION_DAYS ?? "120"),
  };
}

export function normalizeRepeatQueryKey(queryText?: string) {
  return (queryText ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 180);
}

export function createRepeatAnswerId(seed: string) {
  return `repeat_${crypto.createHash("sha1").update(seed).digest("hex").slice(0, 16)}`;
}

export function createRepeatResponseHash(answerMarkdown: string, citationIds: string[]) {
  return crypto
    .createHash("sha1")
    .update(JSON.stringify({ answerMarkdown, citationIds }))
    .digest("hex");
}

async function ensureLearningDir() {
  await fs.mkdir(LEARNING_DIR, { recursive: true });
}

export async function readRepeatLearningSnapshot(): Promise<RepeatLearningSnapshot> {
  try {
    const raw = await fs.readFile(SNAPSHOT_PATH, "utf8");
    return JSON.parse(raw) as RepeatLearningSnapshot;
  } catch {
    return DEFAULT_SNAPSHOT;
  }
}

export async function readRepeatLearningEvents(): Promise<RepeatLearningEvent[]> {
  try {
    const raw = await fs.readFile(EVENTS_PATH, "utf8");
    return raw
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => JSON.parse(line) as RepeatLearningEvent);
  } catch {
    return [];
  }
}

function createChunkStat(chunkId: string) {
  return {
    chunkId,
    citationOpenCount: 0,
    wrongCitationCount: 0,
    helpfulCitationCount: 0,
    paperOpenCount: 0,
    supportRate: 0,
    answerUsefulCount: 0,
    answerNegativeCount: 0,
    answerBadDiagramCount: 0,
  };
}

function createClusterStat(clusterId: string): RepeatClusterLearningStats {
  return {
    clusterId,
    positiveAnswerCount: 0,
    negativeAnswerCount: 0,
    missedRepeatCount: 0,
    repeatQuestionClickCount: 0,
  };
}

export async function rebuildRepeatLearningSnapshot() {
  const events = await readRepeatLearningEvents();
  const snapshot: RepeatLearningSnapshot = {
    generatedAt: new Date().toISOString(),
    eventCount: events.length,
    chunkStats: {},
    clusterStats: {},
    queryStats: {},
  };

  for (const event of events) {
    const chunkId = typeof event.payload?.chunkId === "string" ? event.payload.chunkId : null;
    const clusterId = typeof event.payload?.clusterId === "string" ? event.payload.clusterId : null;
    const queryKey = normalizeRepeatQueryKey(event.queryText);

    if (queryKey) {
      const queryStats = snapshot.queryStats[queryKey] ?? {
        submittedCount: 0,
        reformulationCount: 0,
        followUpCount: 0,
      };
      if (event.eventType === "query_submitted") queryStats.submittedCount += 1;
      if (event.eventType === "query_reformulated") queryStats.reformulationCount += 1;
      if (event.eventType === "follow_up_asked") queryStats.followUpCount += 1;
      snapshot.queryStats[queryKey] = queryStats;
    }

    if (chunkId) {
      const chunkStats = snapshot.chunkStats[chunkId] ?? createChunkStat(chunkId);
      if (event.eventType === "citation_open") chunkStats.citationOpenCount += 1;
      if (event.eventType === "paper_open") chunkStats.paperOpenCount += 1;
      if (event.eventType === "citation_feedback" && event.payload?.value === "wrong_citation") {
        chunkStats.wrongCitationCount += 1;
      }
      if (event.eventType === "citation_feedback" && event.payload?.value === "helpful") {
        chunkStats.helpfulCitationCount += 1;
      }
      const denominator =
        chunkStats.citationOpenCount +
        chunkStats.helpfulCitationCount +
        chunkStats.wrongCitationCount +
        chunkStats.paperOpenCount;
      chunkStats.supportRate =
        denominator > 0
          ? (chunkStats.citationOpenCount + chunkStats.helpfulCitationCount + chunkStats.paperOpenCount - chunkStats.wrongCitationCount) /
            denominator
          : 0;
      snapshot.chunkStats[chunkId] = chunkStats;
    }

    if (event.eventType === "answer_feedback") {
      const chunkIds = event.selectedChunkIds?.filter((id) => typeof id === "string" && id.trim()) ?? [];
      const value = event.payload?.value;
      for (const cid of chunkIds) {
        const cs = snapshot.chunkStats[cid] ?? createChunkStat(cid);
        if (value === "useful") cs.answerUsefulCount += 1;
        if (value === "not_useful" || value === "incomplete" || value === "missed_repeat_question") {
          cs.answerNegativeCount += 1;
        }
        if (value === "bad_diagram") cs.answerBadDiagramCount += 1;
        snapshot.chunkStats[cid] = cs;
      }
    }

    if (clusterId) {
      const clusterStats = snapshot.clusterStats[clusterId] ?? createClusterStat(clusterId);
      if (event.eventType === "answer_feedback" && event.payload?.value === "useful") {
        clusterStats.positiveAnswerCount += 1;
      }
      if (
        event.eventType === "answer_feedback" &&
        (event.payload?.value === "not_useful" ||
          event.payload?.value === "incomplete" ||
          event.payload?.value === "bad_diagram")
      ) {
        clusterStats.negativeAnswerCount += 1;
      }
      if (event.eventType === "answer_feedback" && event.payload?.value === "missed_repeat_question") {
        clusterStats.missedRepeatCount += 1;
      }
      if (event.eventType === "repeat_question_click") {
        clusterStats.repeatQuestionClickCount += 1;
      }
      snapshot.clusterStats[clusterId] = clusterStats;
    }
  }

  await ensureLearningDir();
  await fs.writeFile(SNAPSHOT_PATH, JSON.stringify(snapshot, null, 2));
  return snapshot;
}

export async function logRepeatLearningEvent(
  input: Omit<RepeatLearningEvent, "eventId" | "createdAt">
) {
  const config = getRepeatLearningConfig();
  if (!config.learningEnabled) return null;
  if (Math.random() > config.eventSamplingRate) return null;

  const event: RepeatLearningEvent = {
    ...input,
    eventId: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  };

  await ensureLearningDir();
  await fs.appendFile(EVENTS_PATH, `${JSON.stringify(event)}\n`, "utf8");
  await rebuildRepeatLearningSnapshot();
  return event;
}

function chooseClusterId(event: RepeatLearningEvent) {
  return typeof event.payload?.clusterId === "string" ? event.payload.clusterId : undefined;
}

export async function exportRepeatLearningDatasets(chunksById: Map<string, RepeatChunk>) {
  const events = await readRepeatLearningEvents();
  await fs.mkdir(DATASETS_DIR, { recursive: true });

  const rerankerLines: string[] = [];
  const preferenceLines: string[] = [];

  for (const event of events) {
    if (event.eventType === "citation_feedback" || event.eventType === "citation_open") {
      const chunkId = typeof event.payload?.chunkId === "string" ? event.payload.chunkId : null;
      const chunk = chunkId ? chunksById.get(chunkId) : null;
      if (!chunk) continue;

      rerankerLines.push(
        JSON.stringify({
          query: event.queryText ?? "",
          chunkId,
          label:
            event.eventType === "citation_open"
              ? 1
              : event.payload?.value === "helpful"
                ? 1
                : 0,
          chunkText: chunk.text,
          questionType: chunk.questionType,
          answerMode: chunk.answerMode,
          topic: chunk.topic,
          clusterId: chunk.clusterId,
        })
      );
    }

    if (event.eventType === "answer_feedback" && event.answerId) {
      preferenceLines.push(
        JSON.stringify({
          answerId: event.answerId,
          query: event.queryText ?? "",
          label: event.payload?.value === "useful" ? "accepted" : "rejected",
          clusterId: chooseClusterId(event),
          feedback: event.payload?.value,
          responseHash: event.responseHash,
        })
      );
    }
  }

  await fs.writeFile(RERANKER_DATASET_PATH, rerankerLines.join("\n"));
  await fs.writeFile(PREFERENCE_DATASET_PATH, preferenceLines.join("\n"));

  return {
    rerankerPath: RERANKER_DATASET_PATH,
    preferencePath: PREFERENCE_DATASET_PATH,
    rerankerCount: rerankerLines.length,
    preferenceCount: preferenceLines.length,
  };
}
