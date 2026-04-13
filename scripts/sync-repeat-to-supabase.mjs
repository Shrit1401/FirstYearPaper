/**
 * Upload PDFs to Supabase Storage (bucket `papers`) and sync Repeat index
 * (papers, chunks, embeddings) from `generated/repeat-index/index.json`.
 *
 * Prerequisites: run migration `20260413_repeat_papers_and_embeddings.sql`, then `npm run repeat:index`.
 *
 * Env: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 * Optional: REPEAT_EMBEDDING_DIMENSIONS (default 4096) — must match DB column size in the migration.
 *
 * Flags: --skip-pdfs  only sync DB rows (chunks already point at manifest hrefs).
 */

import { createClient } from "@supabase/supabase-js";
import fs from "node:fs/promises";
import path from "node:path";
import nextEnv from "@next/env";

const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd());

const ROOT = process.cwd();
const INDEX_PATH = path.join(ROOT, "generated", "repeat-index", "index.json");
const SKIP_PDFS = process.argv.includes("--skip-pdfs");
const EXPECTED_DIMS = Number.parseInt(process.env.REPEAT_EMBEDDING_DIMENSIONS ?? "4096", 10);

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

const supabase = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

function decodeEmbedding(encoded) {
  if (Array.isArray(encoded) && encoded.length > 0) return encoded;
  if (typeof encoded !== "string" || !encoded) return null;
  const bytes = Buffer.from(encoded, "base64");
  const view = new Int16Array(bytes.buffer, bytes.byteOffset, bytes.byteLength / 2);
  return Array.from(view, (v) => v / 32767);
}

function toVectorLiteral(values) {
  return `[${values.join(",")}]`;
}

function storageKeyFromHref(href) {
  const trimmed = href.startsWith("/") ? href.slice(1) : href;
  return decodeURIComponent(trimmed);
}

async function main() {
  const raw = await fs.readFile(INDEX_PATH, "utf8");
  const index = JSON.parse(raw);
  const papers = index.papers ?? [];
  const chunks = index.chunks ?? [];
  const failures = index.failures ?? [];

  const embedSample = chunks.map((c) => decodeEmbedding(c.embedding)).find((e) => e && e.length);
  if (!embedSample) {
    console.error("No embeddings in index. Run: npm run repeat:index");
    process.exit(1);
  }
  const dims = embedSample.length;
  if (dims !== EXPECTED_DIMS) {
    console.error(
      `Embedding dimension is ${dims} but REPEAT_EMBEDDING_DIMENSIONS=${EXPECTED_DIMS}. Align the migration vector(N) and this env var.`
    );
    process.exit(1);
  }

  const { error: truncError } = await supabase.rpc("repeat_truncate_for_sync");
  if (truncError) {
    console.error("repeat_truncate_for_sync:", truncError.message);
    process.exit(1);
  }

  const { error: metaError } = await supabase.from("repeat_index_meta").upsert({
    id: 1,
    version: index.version ?? 3,
    generated_at: index.generatedAt,
    embedding_model: index.embeddingModel ?? "",
    embedding_dims: dims,
    failures,
    updated_at: new Date().toISOString(),
  });
  if (metaError) {
    console.error("repeat_index_meta:", metaError.message);
    process.exit(1);
  }

  if (!SKIP_PDFS) {
    for (const paper of papers) {
      const keyPath = storageKeyFromHref(paper.href);
      const diskPath = path.join(ROOT, "public", keyPath);
      let body;
      try {
        body = await fs.readFile(diskPath);
      } catch {
        console.warn("Skip upload (file missing):", diskPath);
        continue;
      }
      const { error: upErr } = await supabase.storage.from("papers").upload(keyPath, body, {
        contentType: "application/pdf",
        upsert: true,
      });
      if (upErr) console.warn("Upload failed:", keyPath, upErr.message);
    }
    console.log("PDF uploads finished (see warnings for any skips).");
  }

  const paperRows = papers.map((p) => ({
    paper_id: p.paperId,
    href: p.href,
    paper_name: p.paperName,
    normalized_year: p.normalizedYear,
    source_type: p.sourceType,
    subject_key: p.subjectKey,
    subject_name: p.subjectName,
    subject_label: p.subjectLabel,
    collection_label: p.collectionLabel,
    year_label: p.yearLabel ?? null,
    sem_label: p.semLabel ?? null,
    branch_name: p.branchName ?? null,
    exam_type: p.examType ?? null,
    stream_name: p.streamName ?? null,
    page_count: p.pageCount,
    extraction_method: p.extractionMethod,
    full_text: p.fullText ?? null,
  }));

  for (let i = 0; i < paperRows.length; i += 150) {
    const batch = paperRows.slice(i, i + 150);
    const { error } = await supabase.from("repeat_papers").insert(batch);
    if (error) {
      console.error("repeat_papers:", error.message);
      process.exit(1);
    }
  }
  console.log("Inserted papers:", paperRows.length);

  const chunkBatchSize = 10;
  let inserted = 0;
  for (let i = 0; i < chunks.length; i += chunkBatchSize) {
    const batch = chunks.slice(i, i + chunkBatchSize);
    const rows = [];
    for (const c of batch) {
      const vec = decodeEmbedding(c.embedding);
      if (!vec || vec.length !== dims) continue;
      rows.push({
        chunk_id: c.chunkId,
        paper_id: c.paperId,
        href: c.href,
        page_start: c.pageStart,
        page_end: c.pageEnd,
        chunk_index: c.chunkIndex,
        text: c.text,
        chunk_type: c.chunkType ?? null,
        diagram_signals: c.diagramSignals ?? null,
        visual_context: c.visualContext ?? null,
        question_type: c.questionType ?? null,
        answer_mode: c.answerMode ?? null,
        topic: c.topic ?? null,
        subtopic: c.subtopic ?? null,
        marks_band: c.marksBand ?? null,
        cluster_id: c.clusterId ?? null,
        occurrence_count: c.occurrenceCount ?? 1,
        embedding: toVectorLiteral(vec),
      });
    }
    if (!rows.length) continue;
    const { error } = await supabase.from("repeat_chunks").insert(rows);
    if (error) {
      console.error("repeat_chunks at offset", i, error.message);
      process.exit(1);
    }
    inserted += rows.length;
    if (inserted % 400 === 0) console.log("Chunks inserted:", inserted);
  }
  console.log("Done. Total chunks:", inserted);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
