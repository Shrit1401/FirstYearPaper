import fs from "node:fs/promises";
import path from "node:path";
import { getRepeatIndexSource } from "@/lib/supabase/config";
import { getRepeatIndexStatusSupabase } from "@/lib/repeat-supabase";
import type { RepeatChunk, RepeatIndexFile, RepeatIndexStatus, RepeatPaperContext } from "./repeat-types";

const INDEX_DIR = path.join(process.cwd(), "generated", "repeat-index");
const INDEX_FILE = path.join(INDEX_DIR, "index.json");

let cachedIndex: RepeatIndexFile | null = null;
const decodedEmbeddingCache = new Map<string, number[]>();

export function getRepeatIndexPath() {
  return INDEX_FILE;
}

export async function getRepeatIndexStatus(): Promise<RepeatIndexStatus> {
  if (getRepeatIndexSource() === "supabase") {
    return getRepeatIndexStatusSupabase();
  }

  try {
    const raw = await fs.readFile(INDEX_FILE, "utf8");
    const parsed = JSON.parse(raw) as RepeatIndexFile;
    return {
      ready: true,
      path: INDEX_FILE,
      source: "local",
      generatedAt: parsed.generatedAt,
      paperCount: parsed.papers.length,
      chunkCount: parsed.chunks.length,
      embeddingModel: parsed.embeddingModel,
    };
  } catch {
    return {
      ready: false,
      path: INDEX_FILE,
      source: "local",
    };
  }
}

export async function readRepeatIndex() {
  if (cachedIndex) return cachedIndex;

  const raw = await fs.readFile(INDEX_FILE, "utf8").catch(() => {
    throw new Error(
      "Repeat index not found. Run `npm run repeat:index` after setting HACK_CLUB_AI_API_KEY."
    );
  });

  cachedIndex = JSON.parse(raw) as RepeatIndexFile;
  return cachedIndex;
}

export function quoteChunk(text: string, maxLength = 220) {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, maxLength).trimEnd()}...`;
}

export function cosineSimilarity(a: number[], b: number[]) {
  let dot = 0;
  let magA = 0;
  let magB = 0;
  const length = Math.min(a.length, b.length);

  for (let i = 0; i < length; i += 1) {
    dot += a[i]! * b[i]!;
    magA += a[i]! * a[i]!;
    magB += b[i]! * b[i]!;
  }

  if (magA === 0 || magB === 0) return 0;
  return dot / (Math.sqrt(magA) * Math.sqrt(magB));
}

function decodeEmbeddingBase64(encoded: string) {
  const cached = decodedEmbeddingCache.get(encoded);
  if (cached) return cached;

  const bytes = Buffer.from(encoded, "base64");
  const view = new Int16Array(bytes.buffer, bytes.byteOffset, bytes.byteLength / Int16Array.BYTES_PER_ELEMENT);
  const decoded = Array.from(view, (value) => value / 32767);
  decodedEmbeddingCache.set(encoded, decoded);
  return decoded;
}

export function getChunkEmbedding(chunk: RepeatChunk) {
  if (Array.isArray(chunk.embedding)) return chunk.embedding;
  return decodeEmbeddingBase64(chunk.embedding);
}

export function resolvePaperFilePath(href: string) {
  const trimmed = href.startsWith("/") ? href.slice(1) : href;
  return path.join(process.cwd(), "public", decodeURIComponent(trimmed));
}

export function groupChunksByPaper(chunks: RepeatChunk[]) {
  return chunks.reduce<Map<string, RepeatChunk[]>>((acc, chunk) => {
    const existing = acc.get(chunk.paperId);
    if (existing) existing.push(chunk);
    else acc.set(chunk.paperId, [chunk]);
    return acc;
  }, new Map());
}

export function filterCandidatePapers(
  papers: RepeatPaperContext[],
  subjectKey?: string,
  currentPaperId?: string
) {
  const candidates = subjectKey ? papers.filter((paper) => paper.subjectKey === subjectKey) : [...papers];

  if (!currentPaperId) return candidates;

  const currentPaper = papers.find((paper) => paper.paperId === currentPaperId);
  if (!currentPaper) return candidates;

  return candidates.sort((a, b) => {
    if (a.paperId === currentPaper.paperId) return -1;
    if (b.paperId === currentPaper.paperId) return 1;
    const yearA = a.normalizedYear ?? 0;
    const yearB = b.normalizedYear ?? 0;
    if (yearA !== yearB) return yearB - yearA;
    return a.paperName.localeCompare(b.paperName);
  });
}
