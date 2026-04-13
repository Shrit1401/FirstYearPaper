import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import nextEnv from "@next/env";

const ROOT = process.cwd();
const MANIFEST_PATH = path.join(ROOT, "lib", "papers-manifest.json");
const OUTPUT_DIR = path.join(ROOT, "generated", "repeat-index");
const OUTPUT_PATH = path.join(OUTPUT_DIR, "index.json");
const API_BASE = "https://ai.hackclub.com/proxy/v1";
const EMBEDDING_MODEL = process.env.HACK_CLUB_AI_EMBEDDING_MODEL ?? "qwen/qwen3-embedding-8b";
const MIN_TEXT_LENGTH = 120;
const STANDARD_FONT_DATA_URL = `${pathToFileURL(
  path.join(ROOT, "node_modules", "pdfjs-dist", "standard_fonts")
).href}/`;
const QUESTION_START_REGEX = /(?:^|\s)(?:q(?:uestion)?\.?\s*\d+[a-z]?|\d+[.)]|[ivxlcdm]+[.)])\s+/gi;
const STOPWORDS = new Set([
  "the", "of", "and", "to", "a", "for", "in", "with", "on", "using", "show", "explain",
  "describe", "define", "state", "derive", "calculate", "draw", "list", "compare", "discuss",
  "what", "is", "are", "an", "or", "by", "from", "that", "this", "as", "at", "be"
]);
const DIAGRAM_PATTERNS = [
  /\bdiagram\b/gi,
  /\bfigure\b/gi,
  /\bfig\.?\b/gi,
  /\bsketch(?:es)?\b/gi,
  /\bwaveform\b/gi,
  /\bgraph\b/gi,
  /\bcircuit\b/gi,
  /\bblock diagram\b/gi,
  /\bphasor\b/gi,
];

const { loadEnvConfig } = nextEnv;
loadEnvConfig(ROOT);

function encodeEmbedding(values) {
  const quantized = Int16Array.from(values.map((value) => {
    const clamped = Math.max(-1, Math.min(1, value));
    return Math.round(clamped * 32767);
  }));

  return Buffer.from(quantized.buffer, quantized.byteOffset, quantized.byteLength).toString("base64");
}

function inferYear(text) {
  const fourDigit = text.match(/(?:19|20)\d{2}/g);
  if (fourDigit?.length) return Number.parseInt(fourDigit[fourDigit.length - 1], 10);
  const twoDigit = text.match(/\b(?:0[0-9]|1[0-9]|2[0-9]|9[0-9])\b/g);
  if (!twoDigit?.length) return null;
  const year = Number.parseInt(twoDigit[twoDigit.length - 1], 10);
  return year >= 90 ? 1900 + year : 2000 + year;
}

function inferNormalizedYear(name, href) {
  return inferYear(`${name} ${decodeURIComponent(href)}`);
}

function createHierarchySubjectKey(yearLabel, semLabel, branchName, examType, subjectName) {
  return ["hierarchy", yearLabel, semLabel, branchName, examType, subjectName].join("::");
}

function createLegacySubjectKey(streamName, subjectName) {
  return ["legacy", streamName, subjectName].join("::");
}

function isGenericSubjectName(subjectName) {
  return /^(all subjects?|sem(?:ester)?\s*\d+)\b/i.test(subjectName.trim());
}

function extractCourseCode(text) {
  const match = text.match(/\b([A-Z]{2,5})[-_ ]?(\d{3,5}[A-Z]?)\b/i);
  if (!match) return null;
  return `${match[1].toUpperCase()} ${match[2].toUpperCase()}`;
}

function normalizePaperSubjectName(text) {
  return text
    .replace(/\.pdf$/i, "")
    .replace(/\b\d{1,2}\s+[A-Za-z]{3,9}\s+\d{4}\b/g, "")
    .replace(/\b(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\b/gi, "")
    .replace(/\b(?:make[\s-]?up|qp|ak|answers?|paper|midsem|endsem|rcs)\b/gi, "")
    .replace(/\(\s*\d+\s*\)/g, "")
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function resolveSubjectName(subjectName, paperName, href) {
  if (!isGenericSubjectName(subjectName)) return subjectName;

  const decodedHref = decodeURIComponent(href);
  const courseCode = extractCourseCode(`${paperName} ${decodedHref}`);
  if (courseCode) return courseCode;

  const normalizedPaper = normalizePaperSubjectName(paperName);
  if (normalizedPaper && !/^\d/.test(normalizedPaper)) {
    return normalizedPaper;
  }

  return subjectName;
}

function buildCatalog(manifest) {
  const papers = [];

  for (const [yearLabel, yearData] of Object.entries(manifest.years ?? {})) {
    for (const [semLabel, semData] of Object.entries(yearData.sems ?? {})) {
      for (const [branchName, branchData] of Object.entries(semData.branches ?? {})) {
        for (const [examType, examData] of Object.entries(branchData)) {
          for (const [subjectName, subjectData] of Object.entries(examData.subjects ?? {})) {
            const collectionLabel = `${semLabel} · ${branchName} · ${examType}`;

            for (const paper of subjectData.papers ?? []) {
              const paperSubjectName = resolveSubjectName(subjectName, paper.name, paper.href);
              const subjectKey = createHierarchySubjectKey(
                yearLabel,
                semLabel,
                branchName,
                examType,
                paperSubjectName
              );
              papers.push({
                paperId: paper.href,
                href: paper.href,
                paperName: paper.name,
                normalizedYear: inferNormalizedYear(paper.name, paper.href),
                sourceType: "hierarchy",
                subjectKey,
                subjectName: paperSubjectName,
                subjectLabel: `${paperSubjectName} · ${collectionLabel}`,
                collectionLabel,
                yearLabel,
                semLabel,
                branchName,
                examType,
              });
            }
          }
        }
      }
    }
  }

  for (const [streamName, stream] of Object.entries(manifest.streams ?? {})) {
    for (const subject of stream.subjects ?? []) {
      const subjectKey = createLegacySubjectKey(streamName, subject.name);
      const subjectLabel = `${subject.name} · ${streamName}`;

      for (const paper of subject.papers ?? []) {
        papers.push({
          paperId: paper.href,
          href: paper.href,
          paperName: paper.name.replace(/\.pdf$/i, ""),
          normalizedYear: inferNormalizedYear(paper.name, paper.href),
          sourceType: "legacy",
          subjectKey,
          subjectName: subject.name,
          subjectLabel,
          collectionLabel: streamName,
          streamName,
        });
      }
    }
  }

  return papers;
}

function resolveFilePath(href) {
  return path.join(ROOT, "public", decodeURIComponent(href.replace(/^\//, "")));
}

function normalizeChunkText(text) {
  return text.replace(/\s+/g, " ").trim();
}

function extractDiagramSignals(text) {
  const normalized = normalizeChunkText(text).toLowerCase();
  const hits = new Set();

  for (const pattern of DIAGRAM_PATTERNS) {
    const matches = normalized.match(pattern);
    for (const match of matches ?? []) {
      hits.add(match.replace(/\.$/, ""));
    }
  }

  return Array.from(hits);
}

function extractQuestionBlocks(text) {
  const normalized = normalizeChunkText(text);
  if (!normalized) return [];

  const matches = Array.from(normalized.matchAll(QUESTION_START_REGEX));
  if (matches.length < 2) return [];

  return matches
    .map((match, index) => {
      const start = match.index ?? 0;
      const end = matches[index + 1]?.index ?? normalized.length;
      return normalized.slice(start, end).trim();
    })
    .filter((block) => block.length > 40);
}

function summarizeVisualContext(text) {
  const normalized = normalizeChunkText(text);
  const signals = extractDiagramSignals(normalized);
  if (signals.length === 0) return null;

  const sentences = normalized.split(/(?<=[.?!:;])\s+/);
  const relevant = [];

  for (const sentence of sentences) {
    if (extractDiagramSignals(sentence).length > 0) {
      relevant.push(sentence.trim());
    }
    if (relevant.length >= 2) break;
  }

  const detail = normalizeChunkText(relevant.join(" "));
  const signalLabel = signals.slice(0, 4).join(", ");
  const summary = detail || normalized.slice(0, 260);
  return `Visual context: page references ${signalLabel}. ${summary}`.trim();
}

function createChunkText(baseText, visualContext, chunkType) {
  const normalized = normalizeChunkText(baseText);
  if (!visualContext) return normalized;
  if (chunkType === "diagram") {
    return normalizeChunkText(`${visualContext} ${normalized}`);
  }
  return normalizeChunkText(`${normalized} ${visualContext}`);
}

function inferQuestionType(text) {
  const normalized = normalizeChunkText(text).toLowerCase();
  if (/\bcalculate|compute|find|determine|numerical\b/.test(normalized)) return "calculate";
  if (/\bcompare|differentiate|distinguish\b/.test(normalized)) return "compare";
  if (/\bdraw|sketch|diagram|waveform|circuit\b/.test(normalized)) return "draw";
  if (/\blist|mention|name\b/.test(normalized)) return "list";
  if (/\bdefine|what is\b/.test(normalized)) return "define";
  if (/\bdiscuss\b/.test(normalized)) return "discuss";
  if (/\bexplain|describe\b/.test(normalized)) return "explain";
  return "generic";
}

function inferAnswerMode(text, questionType) {
  const normalized = normalizeChunkText(text).toLowerCase();
  const numerical = /\bcalculate|compute|determine|numerical|solve|evaluate\b/.test(normalized);
  const theory = /\bexplain|describe|discuss|define|compare|list|state\b/.test(normalized);
  if (questionType === "draw") return "mixed";
  if (numerical && theory) return "mixed";
  if (numerical) return "numerical";
  return "theory";
}

function inferMarksBand(text) {
  const normalized = normalizeChunkText(text);
  const explicit = normalized.match(/\((\d{1,2})\s*marks?\)/i) ?? normalized.match(/\[(\d{1,2})\]/);
  const marks = explicit ? Number.parseInt(explicit[1], 10) : null;
  if (marks != null) {
    if (marks <= 3) return "short";
    if (marks <= 7) return "medium";
    return "long";
  }
  const length = normalized.split(/\s+/).length;
  if (length < 18) return "short";
  if (length < 40) return "medium";
  return "long";
}

function inferTopic(text) {
  const words = normalizeChunkText(text)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 2 && !STOPWORDS.has(word));

  const unique = Array.from(new Set(words));
  const topic = unique.slice(0, 3).join(" ");
  const subtopic = unique.slice(0, 6).join(" ");
  return {
    topic: topic || "general",
    subtopic: subtopic || "general",
  };
}

function createQuestionFingerprint(text) {
  return normalizeChunkText(text)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 2 && !STOPWORDS.has(word))
    .slice(0, 10)
    .join("-");
}

function makePublicUrl(href) {
  const base = process.env.REPEAT_PUBLIC_BASE_URL;
  if (!base) return null;
  return `${base.replace(/\/$/, "")}${href}`;
}

async function extractWithPdfText(filePath) {
  const task = getDocument({
    url: filePath,
    standardFontDataUrl: STANDARD_FONT_DATA_URL,
  });
  const pdf = await task.promise;
  const pages = [];

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();
    const text = content.items
      .map((item) => ("str" in item ? item.str : ""))
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();

    pages.push({ pageNumber, text });
  }

  const fullText = pages.map((page) => page.text).join("\n\n").trim();
  const pageCount = pdf.numPages;
  await pdf.destroy();
  return {
    pageCount,
    pages,
    fullText,
    extractionMethod: "pdf-text",
  };
}

async function extractWithOcr(href) {
  const publicUrl = makePublicUrl(href);
  if (!publicUrl || !process.env.HACK_CLUB_AI_API_KEY) return null;

  const response = await fetch(`${API_BASE}/ocr`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.HACK_CLUB_AI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      document: {
        type: "document_url",
        document_url: publicUrl,
      },
      table_format: "markdown",
    }),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`OCR failed: ${response.status} ${message}`);
  }

  const data = await response.json();
  const pages = (data.pages ?? []).map((page) => ({
    pageNumber: Number(page.index ?? 0) + 1,
    text: String(page.markdown ?? "").replace(/\s+/g, " ").trim(),
  }));

  return {
    pageCount: pages.length,
    pages,
    fullText: pages.map((page) => page.text).join("\n\n").trim(),
    extractionMethod: "ocr",
  };
}

function chunkPageText(pageNumber, text) {
  const normalized = normalizeChunkText(text);
  if (!normalized) return [];

  const questionBlocks = extractQuestionBlocks(normalized);
  const visualContext = summarizeVisualContext(normalized);
  const diagramSignals = extractDiagramSignals(normalized);
  const questionChunks = questionBlocks.map((block, chunkIndex) => {
    const questionType = inferQuestionType(block);
    const answerMode = inferAnswerMode(block, questionType);
    const { topic, subtopic } = inferTopic(block);
    const marksBand = inferMarksBand(block);

    return {
      pageStart: pageNumber,
      pageEnd: pageNumber,
      chunkIndex,
      chunkType: diagramSignals.length > 0 ? "diagram" : "question",
      diagramSignals,
      visualContext,
      questionType,
      answerMode,
      topic,
      subtopic,
      marksBand,
      clusterSeed: createQuestionFingerprint(block),
      text: createChunkText(block, visualContext, diagramSignals.length > 0 ? "diagram" : "question"),
    };
  });

  if (questionChunks.length > 0) {
    return questionChunks;
  }

  const words = normalized.split(/\s+/).filter(Boolean);
  const chunks = [];
  const size = 180;
  const overlap = 40;

  for (let start = 0, chunkIndex = 0; start < words.length; start += size - overlap, chunkIndex += 1) {
    const slice = words.slice(start, start + size);
    if (slice.length === 0) continue;
    const questionType = inferQuestionType(slice.join(" "));
    const answerMode = inferAnswerMode(slice.join(" "), questionType);
    const { topic, subtopic } = inferTopic(slice.join(" "));
    chunks.push({
      pageStart: pageNumber,
      pageEnd: pageNumber,
      chunkIndex,
      chunkType: diagramSignals.length > 0 ? "diagram" : "page",
      diagramSignals,
      visualContext,
      questionType,
      answerMode,
      topic,
      subtopic,
      marksBand: inferMarksBand(slice.join(" ")),
      clusterSeed: createQuestionFingerprint(slice.join(" ")),
      text: createChunkText(
        slice.join(" "),
        visualContext,
        diagramSignals.length > 0 ? "diagram" : "page"
      ),
    });
  }

  return chunks;
}

async function embedBatch(input) {
  const response = await fetch(`${API_BASE}/embeddings`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.HACK_CLUB_AI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: EMBEDDING_MODEL,
      input,
    }),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`Embedding batch failed: ${response.status} ${message}`);
  }

  const data = await response.json();
  return (data.data ?? []).map((item) => item.embedding);
}

async function embedChunks(chunks) {
  if (!process.env.HACK_CLUB_AI_API_KEY) {
    throw new Error("Missing HACK_CLUB_AI_API_KEY for repeat:index.");
  }

  const batchSize = 24;
  for (let i = 0; i < chunks.length; i += batchSize) {
    const batch = chunks.slice(i, i + batchSize);
    const embeddings = await embedBatch(batch.map((chunk) => chunk.text));
    embeddings.forEach((embedding, index) => {
      batch[index].embedding = encodeEmbedding(embedding);
    });
    console.log(`Embedded ${Math.min(i + batch.length, chunks.length)}/${chunks.length} chunks`);
  }
}

const manifest = JSON.parse(await fs.readFile(MANIFEST_PATH, "utf8"));
const catalog = buildCatalog(manifest);
const indexedPapers = [];
const indexedChunks = [];
const failures = [];
const clusterCounts = new Map();

for (const paper of catalog) {
  const filePath = resolveFilePath(paper.href);

  try {
    const extracted = await extractWithPdfText(filePath);
    let effective = extracted;

    if (extracted.fullText.length < MIN_TEXT_LENGTH) {
      const ocrResult = await extractWithOcr(paper.href);
      if (ocrResult?.fullText.length) effective = ocrResult;
    }

    const fullText = effective.fullText.trim();
    const chunks = effective.pages.flatMap((page) => chunkPageText(page.pageNumber, page.text));

    indexedPapers.push({
      ...paper,
      pageCount: effective.pageCount,
      extractionMethod: fullText.length ? effective.extractionMethod : "empty",
    });

    for (const chunk of chunks) {
      const clusterId = `${paper.subjectKey}::${chunk.clusterSeed || `page-${chunk.pageStart}-${chunk.chunkIndex}`}`;
      clusterCounts.set(clusterId, (clusterCounts.get(clusterId) ?? 0) + 1);
      indexedChunks.push({
        chunkId: `${paper.paperId}::${chunk.pageStart}::${chunk.chunkIndex}`,
        paperId: paper.paperId,
        href: paper.href,
        pageStart: chunk.pageStart,
        pageEnd: chunk.pageEnd,
        chunkIndex: chunk.chunkIndex,
        text: chunk.text,
        chunkType: chunk.chunkType,
        diagramSignals: chunk.diagramSignals,
        visualContext: chunk.visualContext,
        questionType: chunk.questionType,
        answerMode: chunk.answerMode,
        topic: chunk.topic,
        subtopic: chunk.subtopic,
        marksBand: chunk.marksBand,
        clusterId,
        embedding: [],
      });
    }

    console.log(`Indexed ${paper.paperName} (${chunks.length} chunks, ${effective.extractionMethod})`);
  } catch (error) {
    const reason = error instanceof Error ? error.message : "Unknown error";
    failures.push({
      paperId: paper.paperId,
      href: paper.href,
      reason,
    });
    console.warn(`Failed ${paper.paperName}: ${reason}`);
  }
}

const embeddableChunks = indexedChunks.filter((chunk) => chunk.text.trim().length > 0);
for (const chunk of indexedChunks) {
  chunk.occurrenceCount = clusterCounts.get(chunk.clusterId) ?? 1;
}
await embedChunks(embeddableChunks);

await fs.mkdir(OUTPUT_DIR, { recursive: true });
await fs.writeFile(
  OUTPUT_PATH,
  JSON.stringify(
    {
      version: 3,
      generatedAt: new Date().toISOString(),
      embeddingModel: EMBEDDING_MODEL,
      papers: indexedPapers,
      chunks: indexedChunks,
      failures,
    }
  )
);

console.log(`Wrote repeat index to ${OUTPUT_PATH}`);
