import fs from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const INDEX_PATH = path.join(ROOT, "generated", "repeat-index", "index.json");
const EVENTS_PATH = path.join(ROOT, "generated", "repeat-learning", "events.ndjson");
const DATASETS_DIR = path.join(ROOT, "generated", "repeat-learning", "datasets");
const RERANKER_PATH = path.join(DATASETS_DIR, "reranker.jsonl");
const PREFERENCE_PATH = path.join(DATASETS_DIR, "preference.jsonl");

const index = JSON.parse(await fs.readFile(INDEX_PATH, "utf8"));
const chunksById = new Map(index.chunks.map((chunk) => [chunk.chunkId, chunk]));

let events = [];
try {
  const raw = await fs.readFile(EVENTS_PATH, "utf8");
  events = raw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line));
} catch {
  events = [];
}

const rerankerLines = [];
const preferenceLines = [];

for (const event of events) {
  if (event.eventType === "citation_feedback" || event.eventType === "citation_open") {
    const chunkId = typeof event.payload?.chunkId === "string" ? event.payload.chunkId : null;
    const chunk = chunkId ? chunksById.get(chunkId) : null;
    if (chunk) {
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
  }

  if (event.eventType === "answer_feedback" && event.answerId) {
    preferenceLines.push(
      JSON.stringify({
        answerId: event.answerId,
        query: event.queryText ?? "",
        label: event.payload?.value === "useful" ? "accepted" : "rejected",
        clusterId: event.payload?.clusterId,
        feedback: event.payload?.value,
        responseHash: event.responseHash,
      })
    );
  }
}

await fs.mkdir(DATASETS_DIR, { recursive: true });
await fs.writeFile(RERANKER_PATH, rerankerLines.join("\n"));
await fs.writeFile(PREFERENCE_PATH, preferenceLines.join("\n"));

console.log(`Exported ${rerankerLines.length} reranker rows to ${RERANKER_PATH}`);
console.log(`Exported ${preferenceLines.length} preference rows to ${PREFERENCE_PATH}`);
