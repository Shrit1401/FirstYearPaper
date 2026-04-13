import type { RepeatChunk, RepeatIndexStatus } from "@/lib/repeat-types";
import { getSupabaseServiceRoleClient } from "@/lib/supabase/admin";

const DEFAULT_MATCH_COUNT = 900;
const EMBEDDING_DIMS = Number.parseInt(process.env.REPEAT_EMBEDDING_DIMENSIONS ?? "4096", 10);

type ChunkRow = {
  chunk_id: string;
  paper_id: string;
  href: string;
  page_start: number;
  page_end: number;
  chunk_index: number;
  text: string;
  chunk_type: string | null;
  diagram_signals: string[] | null;
  visual_context: string | null;
  question_type: string | null;
  answer_mode: string | null;
  topic: string | null;
  subtopic: string | null;
  marks_band: string | null;
  cluster_id: string | null;
  occurrence_count: number | null;
};

function rowToChunk(row: ChunkRow): RepeatChunk {
  return {
    chunkId: row.chunk_id,
    paperId: row.paper_id,
    href: row.href,
    pageStart: row.page_start,
    pageEnd: row.page_end,
    chunkIndex: row.chunk_index,
    text: row.text,
    chunkType: (row.chunk_type as RepeatChunk["chunkType"]) ?? undefined,
    diagramSignals: row.diagram_signals ?? undefined,
    visualContext: row.visual_context ?? undefined,
    questionType: (row.question_type as RepeatChunk["questionType"]) ?? undefined,
    answerMode: (row.answer_mode as RepeatChunk["answerMode"]) ?? undefined,
    topic: row.topic ?? undefined,
    subtopic: row.subtopic ?? undefined,
    marksBand: (row.marks_band as RepeatChunk["marksBand"]) ?? undefined,
    clusterId: row.cluster_id ?? undefined,
    occurrenceCount: row.occurrence_count ?? undefined,
    embedding: [],
  };
}

export async function getRepeatIndexStatusSupabase(): Promise<RepeatIndexStatus> {
  try {
    const supabase = getSupabaseServiceRoleClient();
    const [papersRes, chunksRes, metaRes] = await Promise.all([
      supabase.from("repeat_papers").select("*", { count: "exact", head: true }),
      supabase.from("repeat_chunks").select("*", { count: "exact", head: true }),
      supabase.from("repeat_index_meta").select("*").eq("id", 1).maybeSingle(),
    ]);

    if (papersRes.error || chunksRes.error || metaRes.error) {
      return { ready: false, path: "supabase://repeat-index" };
    }

    const meta = metaRes.data;
    const paperCount = papersRes.count ?? 0;
    const chunkCount = chunksRes.count ?? 0;
    const ready = Boolean(meta && paperCount > 0 && chunkCount > 0);

    return {
      ready,
      path: "supabase://repeat-index",
      generatedAt: meta?.generated_at ?? undefined,
      paperCount,
      chunkCount,
      embeddingModel: meta?.embedding_model ?? undefined,
    };
  } catch {
    return { ready: false, path: "supabase://repeat-index" };
  }
}

function vectorLiteral(values: number[]) {
  return `[${values.join(",")}]`;
}

export async function fetchCandidateChunksSupabase(
  paperIds: string[],
  queryEmbedding: number[],
  matchCount = DEFAULT_MATCH_COUNT
): Promise<{ chunks: RepeatChunk[]; similaritySeed: Map<string, number> }> {
  if (paperIds.length === 0) {
    return { chunks: [], similaritySeed: new Map() };
  }

  if (queryEmbedding.length !== EMBEDDING_DIMS) {
    throw new Error(
      `Query embedding length ${queryEmbedding.length} does not match REPEAT_EMBEDDING_DIMENSIONS (${EMBEDDING_DIMS}).`
    );
  }

  const supabase = getSupabaseServiceRoleClient();
  const { data: rpcRows, error: rpcError } = await supabase.rpc("match_repeat_chunks", {
    query_embedding: vectorLiteral(queryEmbedding),
    filter_paper_ids: paperIds,
    match_count: matchCount,
  });

  if (rpcError) {
    throw new Error(rpcError.message);
  }

  const matches = (rpcRows ?? []) as { chunk_id: string; similarity: number }[];
  if (matches.length === 0) {
    return { chunks: [], similaritySeed: new Map() };
  }

  const similaritySeed = new Map(
    matches.map((m) => [m.chunk_id, typeof m.similarity === "number" ? m.similarity : Number(m.similarity)])
  );
  const ids = matches.map((m) => m.chunk_id);

  const { data: rows, error: fetchError } = await supabase
    .from("repeat_chunks")
    .select(
      "chunk_id, paper_id, href, page_start, page_end, chunk_index, text, chunk_type, diagram_signals, visual_context, question_type, answer_mode, topic, subtopic, marks_band, cluster_id, occurrence_count"
    )
    .in("chunk_id", ids);

  if (fetchError) {
    throw new Error(fetchError.message);
  }

  const byId = new Map((rows as ChunkRow[]).map((r) => [r.chunk_id, r]));
  const ordered: RepeatChunk[] = [];
  for (const id of ids) {
    const row = byId.get(id);
    if (row) ordered.push(rowToChunk(row));
  }

  return { chunks: ordered, similaritySeed };
}
