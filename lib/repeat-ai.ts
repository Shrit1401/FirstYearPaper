import {
  isRepeatSurveyIntent,
  type RepeatCitation,
  type RepeatChunk,
  type RepeatDiagramSupport,
  type RepeatInsight,
  type RepeatLearningSnapshot,
  type RepeatPaperContext,
  type RepeatQueryRequest,
  type RepeatQueryResponse,
  type RepeatRetrievedPaper,
} from "./repeat-types";
import {
  createRepeatAnswerId,
  getRepeatLearningConfig,
  normalizeRepeatQueryKey,
  readRepeatLearningSnapshot,
} from "./repeat-learning";
import { getRepeatCatalog, getRepeatSubjectMap } from "./repeat-catalog";
import { getRepeatIndexSource } from "@/lib/supabase/config";
import { fetchCandidateChunksSupabase } from "@/lib/repeat-supabase";
import {
  cosineSimilarity,
  filterCandidatePapers,
  getChunkEmbedding,
  groupChunksByPaper,
  quoteChunk,
  readRepeatIndex,
} from "./repeat-store";

const HACK_CLUB_BASE_URL = "https://ai.hackclub.com/proxy/v1";
const DEFAULT_CHAT_MODEL = process.env.HACK_CLUB_AI_CHAT_MODEL ?? "google/gemini-2.5-flash";
const DEFAULT_EMBEDDING_MODEL =
  process.env.HACK_CLUB_AI_EMBEDDING_MODEL ?? "qwen/qwen3-embedding-8b";

type ModelPayload = {
  answerMarkdown: string;
  repeatedQuestions?: RepeatInsight[];
  commonTopics?: RepeatInsight[];
  revisionList?: RepeatInsight[];
  notices?: string[];
};

const ADMIN_PATTERNS = [
  /marks are awarded strictly/i,
  /answer key only/i,
  /revaluation/i,
  /do not write personal requests/i,
  /all rights reserved/i,
  /question paper - report/i,
  /exampad/i,
];

const QUESTION_PATTERNS = [
  /\bq(?:uestion)?\.?\s*\d+[a-z]?\b/i,
  /\b\d+[a-z]\.\b/i,
  /\b(?:calculate|determine|derive|explain|discuss|find|list|show that|define|what is|state|compare|mention)\b/i,
  /\(\s*\d+\s*\)/,
];

const DIAGRAM_PATTERNS = [
  /\bdiagram\b/i,
  /\bfigure\b/i,
  /\bfig\.?\b/i,
  /\bsketch(?:es)?\b/i,
  /\bwaveform\b/i,
  /\bgraph\b/i,
  /\bcircuit\b/i,
];
const WORD_STOPWORDS = new Set([
  "the", "of", "and", "to", "a", "for", "in", "with", "on", "using", "show", "explain",
  "describe", "define", "state", "derive", "calculate", "draw", "list", "compare", "discuss",
  "what", "is", "are", "an", "or", "by", "from", "that", "this", "as", "at", "be",
]);

function getApiKey() {
  const apiKey = process.env.HACK_CLUB_AI_API_KEY;
  if (!apiKey) throw new Error("Missing HACK_CLUB_AI_API_KEY.");
  return apiKey;
}

async function embedText(input: string) {
  const response = await fetch(`${HACK_CLUB_BASE_URL}/embeddings`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getApiKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: DEFAULT_EMBEDDING_MODEL,
      input,
    }),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`Embedding request failed: ${response.status} ${message}`);
  }

  const data = (await response.json()) as { data?: { embedding: number[] }[] };
  const embedding = data.data?.[0]?.embedding;
  if (!embedding) throw new Error("Embedding API returned no vector.");
  return embedding;
}

function buildPageHref(href: string, page: number) {
  return `${href}#page=${page}`;
}

function normalizeText(text: string) {
  return text.replace(/\s+/g, " ").trim();
}

function combinedChunkText(chunk: Pick<RepeatChunk, "text" | "visualContext">) {
  return normalizeText([chunk.text, chunk.visualContext].filter(Boolean).join(" "));
}

function stripAdministrativePrefix(text: string) {
  let stripped = normalizeText(text);
  for (const pattern of ADMIN_PATTERNS) {
    if (pattern.test(stripped)) {
      stripped = stripped.replace(
        /^.*?(?:do not write personal requests!?|revaluation\.)\s*/i,
        ""
      );
      break;
    }
  }

  return stripped.replace(/©.*$/i, "").trim();
}

function hasDiagramSignal(text: string) {
  return DIAGRAM_PATTERNS.some((pattern) => pattern.test(text));
}

function isDiagramLikeChunk(chunk: Pick<RepeatChunk, "text" | "visualContext" | "chunkType" | "diagramSignals">) {
  return (
    chunk.chunkType === "diagram" ||
    hasDiagramSignal(chunk.text) ||
    hasDiagramSignal(chunk.visualContext ?? "") ||
    (chunk.diagramSignals?.length ?? 0) > 0
  );
}

function tokenizeForRanking(text: string) {
  return normalizeText(text)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 2 && !WORD_STOPWORDS.has(word));
}

function keywordOverlapScore(query: string, chunk: RepeatChunk) {
  const queryTokens = new Set(tokenizeForRanking(query));
  if (queryTokens.size === 0) return 0;
  const chunkTokens = new Set(tokenizeForRanking(combinedChunkText(chunk)));
  let overlap = 0;
  for (const token of queryTokens) {
    if (chunkTokens.has(token)) overlap += 1;
  }
  return overlap / queryTokens.size;
}

function questionTypeIntentBonus(prompt: string, chunk: RepeatChunk) {
  const normalized = prompt.toLowerCase();
  if (!chunk.questionType) return 0;
  if (/\bcompare\b/.test(normalized) && chunk.questionType === "compare") return 0.08;
  if (/\bcalculate|numerical|solve\b/.test(normalized) && chunk.answerMode === "numerical") return 0.08;
  if (/\bdefine|what is\b/.test(normalized) && chunk.questionType === "define") return 0.06;
  if (/\bdraw|diagram|circuit|waveform\b/.test(normalized) && isDiagramLikeChunk(chunk)) return 0.1;
  return 0;
}

function learningScore(
  chunk: RepeatChunk,
  snapshot: RepeatLearningSnapshot,
  queryStatsKey: string
) {
  const chunkStats = snapshot.chunkStats[chunk.chunkId];
  const clusterStats = chunk.clusterId ? snapshot.clusterStats[chunk.clusterId] : undefined;
  let score = 0;

  if (chunkStats) {
    score += chunkStats.supportRate * 0.18;
    score += Math.min(chunkStats.citationOpenCount, 6) * 0.01;
    score -= Math.min(chunkStats.wrongCitationCount, 4) * 0.04;
    score += Math.min(chunkStats.answerUsefulCount ?? 0, 4) * 0.02;
    score -= Math.min(chunkStats.answerNegativeCount ?? 0, 4) * 0.03;
    score -= Math.min(chunkStats.answerBadDiagramCount ?? 0, 3) * 0.035;
    if (isDiagramLikeChunk(chunk)) {
      score -= Math.min(chunkStats.answerBadDiagramCount ?? 0, 3) * 0.02;
    }
  }

  if (clusterStats) {
    score += Math.min(clusterStats.positiveAnswerCount, 6) * 0.015;
    score += Math.min(clusterStats.repeatQuestionClickCount, 6) * 0.012;
    score -= Math.min(clusterStats.negativeAnswerCount, 4) * 0.025;
    score -= Math.min(clusterStats.missedRepeatCount, 3) * 0.04;
  }

  if (queryStatsKey) {
    const queryStats = snapshot.queryStats[queryStatsKey];
    if (queryStats) {
      score += Math.min(queryStats.submittedCount, 5) * 0.004;
      score -= Math.min(queryStats.reformulationCount, 4) * 0.01;
    }
  }

  return score;
}

function adminSignalScore(text: string) {
  return ADMIN_PATTERNS.reduce((score, pattern) => score + (pattern.test(text) ? 0.32 : 0), 0);
}

function questionSignalScore(text: string) {
  const normalized = normalizeText(text);
  let score = 0;

  for (const pattern of QUESTION_PATTERNS) {
    if (pattern.test(normalized)) score += 0.12;
  }

  if (hasDiagramSignal(normalized)) score += 0.14;
  if (/\b(?:part\s*[ab]|any\s+\w+|answer all questions)\b/i.test(normalized)) score += 0.06;
  if (normalized.length > 80) score += 0.05;

  return score - adminSignalScore(normalized);
}

function isLikelyQuestionChunk(text: string) {
  return questionSignalScore(text) > 0.08;
}

function extractQuestionText(
  text: string,
  maxLength = 260,
  visualContext?: string
) {
  const stripped = stripAdministrativePrefix(combinedChunkText({ text, visualContext }));
  const match =
    stripped.match(/(?:q(?:uestion)?\.?\s*\d+[a-z]?\b|(?:^|\s)\d+[a-z]\.)[\s\S]*/i) ??
    stripped.match(/(?:calculate|determine|derive|explain|discuss|find|list|show that|define|what is|state|compare|mention)[\s\S]*/i);
  const snippet = normalizeText(match?.[0] ?? stripped);
  if (snippet.length <= maxLength) return snippet;
  return `${snippet.slice(0, maxLength).trimEnd()}...`;
}

function citationDedupKey(chunk: RepeatChunk) {
  return extractQuestionText(chunk.text, 180, chunk.visualContext).toLowerCase();
}

function buildRetrievedPapers(
  citations: RepeatCitation[],
  papersById: Map<string, RepeatPaperContext>
): RepeatRetrievedPaper[] {
  const grouped = new Map<string, number>();

  for (const citation of citations) {
    grouped.set(citation.paperId, (grouped.get(citation.paperId) ?? 0) + 1);
  }

  return Array.from(grouped.entries())
    .map(([paperId, chunkCount]) => {
      const paper = papersById.get(paperId);
      return {
        paperId,
        paperName: paper?.paperName ?? paperId,
        href: paper?.href ?? "#",
        normalizedYear: paper?.normalizedYear ?? null,
        subjectLabel: paper?.subjectLabel ?? "Unknown subject",
        collectionLabel: paper?.collectionLabel ?? "Unknown collection",
        chunkCount,
      };
    })
    .sort((a, b) => b.chunkCount - a.chunkCount);
}

function buildIntentPrompt(request: RepeatQueryRequest) {
  switch (request.intent) {
    case "repeat_questions":
      return "Find the strongest repeated exam questions across the selected subject papers. Prefer the closest question wording from the papers, group near-duplicates together, and explicitly mark when a diagram, sketch, graph, or figure is required.";
    case "common_topics":
      return "Identify the most common topics across the selected subject papers and explain how often they recur.";
    case "revision_list":
      return "Build a last-minute revision list ordered by likely exam payoff from the selected subject papers.";
    default:
      return request.prompt;
  }
}

function shouldRenderDiagram(
  request: RepeatQueryRequest,
  citations: RepeatCitation[]
) {
  const prompt = buildIntentPrompt(request);
  const asksForDiagram =
    /\b(draw|show|sketch|diagram|figure|circuit|block diagram|flowchart|waveform|phasor)\b/i.test(
      prompt
    );
  return asksForDiagram || citations.some((citation) => citation.diagramRequired);
}

function intentSpecificInstructions(request: RepeatQueryRequest) {
  switch (request.intent) {
    case "repeat_questions":
      return [
        "Intent repeat_questions: prioritize questions that appear with similar wording across multiple papers.",
        "In answerMarkdown, put the clearest repeated asks first; name papers or years only via citations [Cx].",
        "In repeatedQuestions, list distinct repeat patterns; each item needs citationIds tying to evidence.",
      ].join("\n");
    case "common_topics":
      return [
        "Intent common_topics: group evidence by topic or skill, and say how often the theme shows up (still cite [Cx] per claim).",
        "In commonTopics, use concise titles; detail should say what to revise and why it recurs.",
      ].join("\n");
    case "revision_list":
      return [
        "Intent revision_list: order by exam payoff—essentials first, then useful depth.",
        "Include a `## If time is short` section with the smallest set of high-yield bullets, each with at least one [Cx].",
        "In revisionList, mirror that priority; avoid duplicating the full answerMarkdown.",
      ].join("\n");
    default:
      return [
        "Intent custom (direct Q&A): answer only what the user asked, using the evidence chunks.",
        "Do not pivot into a survey of all repeating questions or topics across the subject unless they explicitly asked for that.",
        "Use markdown sections like `## Direct answer`, optional `## Working`, `## Diagram note`, `## Quick check` as needed.",
        "Do NOT use `## What repeats` for this intent.",
        "You MUST set repeatedQuestions, commonTopics, and revisionList to empty JSON arrays [].",
      ].join("\n");
  }
}

function buildSystemPrompt(request: RepeatQueryRequest) {
  const survey = isRepeatSurveyIntent(request.intent);
  const sectionHint = survey
    ? "Use short markdown sections when relevant in this order: `## Direct answer`, `## Key ideas`, `## What repeats`, `## Diagram note`, `## Quick takeaway`. In `## Key ideas` and `## What repeats`, each bullet must cite [Cx]."
    : "Keep the answer focused: prefer `## Direct answer` plus optional `## Working` or `## Diagram note`; skip corpus-wide repeat summaries.";

  return [
    "You are Repeat, a strict citation-grounded exam-paper tutor.",
    "Use only the supplied evidence chunks.",
    "Every substantive claim in bullets or numbered lists must include at least one citation ID like [C1] (same bullet may use multiple [Cx] if needed).",
    survey
      ? "In `## Key ideas` and `## What repeats`, each bullet must cite [Cx]; if you cannot cite, omit the bullet or say evidence is insufficient."
      : "Each bullet or numbered step that states a fact must cite [Cx] where possible.",
    "If the evidence is insufficient, say that directly and do not infer missing facts.",
    "Ignore administrative boilerplate like revaluation notes, answer-key warnings, copyright footers, and report metadata unless the user explicitly asks about instructions.",
    survey
      ? "For compare mode, extract the closest recurring question wording from the evidence instead of summarizing vaguely."
      : "Answer in a natural teaching tone appropriate for one exam-style question or short multi-part problem.",
    "If a question mentions a figure, diagram, sketch, graph, circuit, or waveform, explicitly say that a diagram is required.",
    "When a citation says diagram: yes, treat that as meaning the visual is on the cited PDF page even if the visual itself is not transcribed in the text chunk.",
    "If a citation includes visual context, use it to describe what surrounding diagram or circuit information is available from indexing.",
    "Do not say the whole question is unavailable merely because the diagram is not embedded. Instead state that the full visual must be inspected on the cited page.",
    intentSpecificInstructions(request),
    "Output valid JSON only with this shape:",
    JSON.stringify({
      answerMarkdown: "string",
      repeatedQuestions: [{ title: "string", detail: "string", citationIds: ["C1"] }],
      commonTopics: [{ title: "string", detail: "string", citationIds: ["C1"] }],
      revisionList: [{ title: "string", detail: "string", citationIds: ["C1"] }],
      notices: ["string"],
    }),
    survey
      ? "For survey intents, fill repeatedQuestions, commonTopics, and/or revisionList according to the active intent; leave unused arrays empty."
      : "For custom intent, repeatedQuestions, commonTopics, and revisionList must each be [].",
    "Make answerMarkdown feel like a study note, not a chatbot monologue.",
    sectionHint,
    "Keep paragraphs compact, prefer bullets for scannable points, and avoid repeating the same warning in multiple places.",
    ...(survey
      ? [
          "When compare mode finds strong repeats, lead with the exact or near-exact repeated asks before broader explanation.",
        ]
      : []),
    "When the question or explanation is diagram-heavy, include one ```mermaid fenced block with flowchart TD only (node→node edges).",
    "If the user asks to draw, show, sketch, explain visually, or if the evidence is marked diagram: yes, include a simple flowchart unless it would be misleading.",
    "Use only flowchart TD: alphanumeric node ids (A,B,C1) and a human-readable label in brackets on every node, e.g. A[\"Conductometric titration\"] --> B[\"Equivalence point\"]. Never emit bare A --> B (letters alone); readers cannot tell what A/B mean. Do not use sequenceDiagram, classDiagram, or other Mermaid diagram types.",
    "Use LaTeX for equations.",
    "Never emit raw HTML.",
  ].join("\n");
}

function learningHintLine(snapshot: RepeatLearningSnapshot, queryStatsKey: string) {
  if (!queryStatsKey) return null;
  const stats = snapshot.queryStats[queryStatsKey];
  if (!stats || stats.reformulationCount < 2) return null;
  return "Learner signal: similar queries are often refined after the first try—prefer distinct question wordings and separate bullets per variant, each cited with [Cx].";
}

function buildUserPrompt(
  request: RepeatQueryRequest,
  citations: RepeatCitation[],
  snapshot: RepeatLearningSnapshot,
  queryStatsKey: string
) {
  const subject = request.subjectKey ? getRepeatSubjectMap().get(request.subjectKey) : null;
  const history = (request.history ?? [])
    .slice(-6)
    .map((turn) => `${turn.role.toUpperCase()}: ${turn.content}`)
    .join("\n");

  const evidence = citations
    .map(
      (citation) =>
        `${citation.id} | ${citation.paperName} | pages ${citation.pageStart}-${citation.pageEnd} | diagram: ${citation.diagramRequired ? "yes" : "no"}\nQuestion: ${citation.questionText ?? citation.quote}\nSnippet: ${citation.quote}${citation.visualContext ? `\nVisual context: ${citation.visualContext}` : ""}\nOpen the cited page for the exact visual if diagram: yes.`
    )
    .join("\n\n");

  const hint = learningHintLine(snapshot, queryStatsKey);

  return [
    `Mode: ${request.mode}`,
    subject ? `Subject: ${subject.subjectLabel}` : "Subject: whole corpus",
    request.currentPaperId ? `Focus paper: ${request.currentPaperId}` : "Focus paper: none",
    `Diagram expected: ${shouldRenderDiagram(request, citations) ? "yes" : "no"}`,
    history ? `Conversation history:\n${history}` : "Conversation history: none",
    `Task:\n${buildIntentPrompt(request)}`,
    `Evidence:\n${evidence}`,
    shouldRenderDiagram(request, citations)
      ? "Include a Mermaid fenced code block if it will make the answer easier to understand."
      : "Use a Mermaid fenced code block only if it materially improves the answer.",
    isRepeatSurveyIntent(request.intent)
      ? "Write for a student doing revision: prioritize the repeated ask, the concept, and what to remember under exam pressure."
      : "Write for a student answering this specific question clearly; do not turn the reply into a subject-wide list of repeating questions.",
    !isRepeatSurveyIntent(request.intent)
      ? "Return repeatedQuestions, commonTopics, and revisionList as empty arrays []."
      : null,
    hint,
    "Return only JSON.",
  ]
    .filter(Boolean)
    .join("\n\n");
}

function extractJsonPayload(raw: string): ModelPayload {
  const trimmed = raw.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidates = [
    fenced?.[1],
    trimmed,
    trimmed.includes("{") && trimmed.includes("}")
      ? trimmed.slice(trimmed.indexOf("{"), trimmed.lastIndexOf("}") + 1)
      : null,
  ].filter((value): value is string => Boolean(value?.trim()));

  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate) as ModelPayload;
      return {
        answerMarkdown: parsed.answerMarkdown ?? "No answer returned.",
        repeatedQuestions: parsed.repeatedQuestions ?? [],
        commonTopics: parsed.commonTopics ?? [],
        revisionList: parsed.revisionList ?? [],
        notices: parsed.notices ?? [],
      };
    } catch {
      // Try the next strategy.
    }
  }

  const answerMarkdownMatch = trimmed.match(
    /"answerMarkdown"\s*:\s*"([\s\S]*?)"\s*,\s*"(?:repeatedQuestions|commonTopics|revisionList|notices)"/
  );

  if (answerMarkdownMatch?.[1]) {
    const looseMarkdown = answerMarkdownMatch[1]
      .replace(/\\"/g, '"')
      .replace(/\\n/g, "\n")
      .replace(/\\r/g, "\r")
      .replace(/\\t/g, "\t")
      .trim();

    return {
      answerMarkdown: looseMarkdown,
      repeatedQuestions: [],
      commonTopics: [],
      revisionList: [],
      notices: ["The model returned malformed structured data, so only the main answer could be recovered."],
    };
  }

  return {
    answerMarkdown: trimmed,
    repeatedQuestions: [],
    commonTopics: [],
    revisionList: [],
    notices: ["The model returned malformed structured data, so Repeat fell back to the raw answer."],
  };
}

function hasMermaidBlock(markdown: string) {
  return /```mermaid[\s\S]*?```/i.test(markdown);
}

async function completeAnswer(
  request: RepeatQueryRequest,
  citations: RepeatCitation[],
  snapshot: RepeatLearningSnapshot,
  queryStatsKey: string
) {
  const response = await fetch(`${HACK_CLUB_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getApiKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: DEFAULT_CHAT_MODEL,
      temperature: 0.2,
      messages: [
        { role: "system", content: buildSystemPrompt(request) },
        { role: "user", content: buildUserPrompt(request, citations, snapshot, queryStatsKey) },
      ],
    }),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`Chat completion failed: ${response.status} ${message}`);
  }

  const data = (await response.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("Chat completion returned no content.");
  return extractJsonPayload(content);
}

async function generateRequiredDiagram(
  request: RepeatQueryRequest,
  citations: RepeatCitation[],
  answerMarkdown: string
) {
  const response = await fetch(`${HACK_CLUB_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getApiKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: DEFAULT_CHAT_MODEL,
      temperature: 0.15,
      messages: [
        {
          role: "system",
          content: [
            "You output one ```mermaid code block containing only a flowchart TD (the app renders it with Cytoscape.js + Dagre, the same graph stack as Flowchart Fun — not the Mermaid web renderer).",
            "Use only the supplied evidence.",
            "Return exactly one fenced block and nothing else outside it.",
            "Only flowchart TD lines: every node must include a bracket label, e.g. A[\"Step name\"] --> B[\"Next step\"] or A -->|edge text| B. Do not use bare ids without [\"...\"] labels. No sequenceDiagram or other types.",
            "If the evidence is too weak for an exact circuit, use a simplified conceptual flowchart.",
            "For labeled edges, use `A -->|label| B`, never `A -- label --> B`.",
            "Keep node ids short alphanumeric (A, B, C, D1). Put readable text inside quoted node labels.",
          ].join("\n"),
        },
        {
          role: "user",
          content: [
            `Task: Create a Mermaid diagram for this answer.\n${buildIntentPrompt(request)}`,
            `Existing answer:\n${answerMarkdown}`,
            `Evidence:\n${citations
              .map(
                (citation) =>
                  `${citation.id} | diagram: ${citation.diagramRequired ? "yes" : "no"}\nQuestion: ${citation.questionText ?? citation.quote}\nSnippet: ${citation.quote}${citation.visualContext ? `\nVisual context: ${citation.visualContext}` : ""}`
              )
              .join("\n\n")}`,
          ].join("\n\n"),
        },
      ],
    }),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`Diagram completion failed: ${response.status} ${message}`);
  }

  const data = (await response.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  return data.choices?.[0]?.message?.content?.trim() ?? "";
}

function selectCitations(
  rankedChunks: { chunk: RepeatChunk; similarity: number }[],
  papersById: Map<string, RepeatPaperContext>,
  preferDiagram: boolean,
  limit = 12
) {
  const selected: { chunk: RepeatChunk; similarity: number }[] = [];
  const deduped = new Set<string>();
  const perPaper = new Map<string, number>();

  for (const entry of rankedChunks) {
    const dedupKey = citationDedupKey(entry.chunk);
    const currentPaperCount = perPaper.get(entry.chunk.paperId) ?? 0;
    const questionLike = isLikelyQuestionChunk(combinedChunkText(entry.chunk));

    if (deduped.has(dedupKey)) continue;
    if (currentPaperCount >= 2) continue;
    if (!questionLike && selected.length < Math.min(4, limit)) continue;

    selected.push(entry);
    deduped.add(dedupKey);
    perPaper.set(entry.chunk.paperId, currentPaperCount + 1);

    if (selected.length >= limit) break;
  }

  const selectedDiagramCount = selected.filter(
    ({ chunk }) => isDiagramLikeChunk(chunk)
  ).length;
  const minimumDiagramCount = preferDiagram ? Math.min(3, limit) : 0;

  if (selectedDiagramCount < minimumDiagramCount) {
    for (const entry of rankedChunks) {
      const dedupKey = citationDedupKey(entry.chunk);
      const diagramLike = isDiagramLikeChunk(entry.chunk);
      if (!diagramLike) continue;
      if (deduped.has(dedupKey)) continue;

      selected.push(entry);
      deduped.add(dedupKey);

      if (
        selected.filter(({ chunk }) => isDiagramLikeChunk(chunk)).length >= minimumDiagramCount ||
        selected.length >= limit
      ) {
        break;
      }
    }
  }

  if (selected.length < Math.min(6, limit)) {
    for (const entry of rankedChunks) {
      const dedupKey = citationDedupKey(entry.chunk);
      if (deduped.has(dedupKey)) continue;
      selected.push(entry);
      deduped.add(dedupKey);
      if (selected.length >= limit) break;
    }
  }

  return selected.map<RepeatCitation>(({ chunk, similarity }, idx) => {
    const paper = papersById.get(chunk.paperId);
    const questionText = extractQuestionText(chunk.text, 260, chunk.visualContext);
    const diagramRequired = isDiagramLikeChunk(chunk) || hasDiagramSignal(questionText);
    return {
      id: `C${idx + 1}`,
      chunkId: chunk.chunkId,
      paperId: chunk.paperId,
      paperName: paper?.paperName ?? chunk.paperId,
      href: paper?.href ?? chunk.href,
      pageHref: buildPageHref(paper?.href ?? chunk.href, chunk.pageStart),
      pageStart: chunk.pageStart,
      pageEnd: chunk.pageEnd,
      subjectLabel: paper?.subjectLabel ?? "Unknown subject",
      similarity,
      supportScore: similarity,
      quote: quoteChunk(stripAdministrativePrefix(chunk.text)),
      questionText,
      diagramRequired,
      visualContext: chunk.visualContext,
      clusterId: chunk.clusterId,
      questionType: chunk.questionType,
      answerMode: chunk.answerMode,
      topic: chunk.topic,
      occurrenceCount: chunk.occurrenceCount,
    };
  });
}

function buildDiagramSupport(
  request: RepeatQueryRequest,
  citations: RepeatCitation[]
): RepeatDiagramSupport | undefined {
  const diagramCitations = citations.filter((citation) => citation.diagramRequired);
  const visualContextCitations = citations.filter((citation) => citation.visualContext?.trim());
  const diagramExpected = shouldRenderDiagram(request, citations);

  if (!diagramExpected && diagramCitations.length === 0 && visualContextCitations.length === 0) {
    return undefined;
  }

  const keyCitationIds = citations
    .filter((citation) => citation.diagramRequired || citation.visualContext?.trim())
    .slice(0, 3)
    .map((citation) => citation.id);

  let summary = "The indexed evidence is mostly textual, so use the cited pages for exact visuals.";
  if (diagramCitations.length > 0 && visualContextCitations.length > 0) {
    summary = `Repeat found ${diagramCitations.length} diagram-linked citation${diagramCitations.length === 1 ? "" : "s"} and extracted visual hints for ${visualContextCitations.length} citation${visualContextCitations.length === 1 ? "" : "s"}.`;
  } else if (diagramCitations.length > 0) {
    summary = `Repeat found ${diagramCitations.length} citation${diagramCitations.length === 1 ? "" : "s"} that explicitly point to a diagram, figure, circuit, or sketch.`;
  } else if (visualContextCitations.length > 0) {
    summary = `Repeat found ${visualContextCitations.length} citation${visualContextCitations.length === 1 ? "" : "s"} with extracted visual context, but the exact diagram still lives on the PDF page.`;
  }

  return {
    diagramExpected,
    citedDiagramCount: diagramCitations.length,
    visualContextCount: visualContextCitations.length,
    keyCitationIds,
    summary,
    recommendedAction:
      diagramCitations.length > 0
        ? "Open the cited citation cards first. Use the Mermaid block as a study sketch, not as a replacement for the source diagram."
        : "Treat the answer as a text-first explanation. If the exam expects a drawing, verify the cited page before relying on the generated diagram.",
  };
}

function rankChunks(
  chunks: RepeatChunk[],
  queryEmbedding: number[],
  snapshot: RepeatLearningSnapshot,
  queryStatsKey: string,
  currentPaperId?: string,
  prompt = "",
  similaritySeed?: Map<string, number>
) {
  const promptNeedsDiagram = hasDiagramSignal(prompt);
  return chunks
    .map((chunk) => {
      const seeded = similaritySeed?.get(chunk.chunkId);
      const vectorSim =
        seeded !== undefined ? seeded : cosineSimilarity(getChunkEmbedding(chunk), queryEmbedding);
      return {
        chunk,
        similarity:
          vectorSim +
          keywordOverlapScore(prompt, chunk) * 0.22 +
          questionSignalScore(combinedChunkText(chunk)) +
          questionTypeIntentBonus(prompt, chunk) +
          learningScore(chunk, snapshot, queryStatsKey) +
          Math.min(chunk.occurrenceCount ?? 1, 6) * 0.015 +
          ((chunk.chunkType === "diagram" || hasDiagramSignal(combinedChunkText(chunk)))
            ? (promptNeedsDiagram ? 0.26 : 0.08)
            : 0) -
          adminSignalScore(combinedChunkText(chunk)) +
          (chunk.paperId === currentPaperId ? 0.03 : 0),
      };
    })
    .sort((a, b) => b.similarity - a.similarity);
}

function buildConfidence(
  citations: RepeatCitation[],
  lowConfidenceThreshold: number
) {
  if (citations.length === 0) {
    return {
      confidence: 0,
      lowConfidenceReasons: ["No grounded citations were retrieved for this answer."],
    };
  }

  const topSupport = citations.slice(0, 4).map((citation) => citation.supportScore ?? citation.similarity);
  const avgSupport = topSupport.reduce((sum, score) => sum + score, 0) / topSupport.length;
  const paperDiversity = new Set(citations.map((citation) => citation.paperId)).size;
  const clusterDiversity = new Set(citations.map((citation) => citation.clusterId).filter(Boolean)).size;
  let confidence = Math.max(0, Math.min(1, avgSupport / 1.4));
  confidence += Math.min(paperDiversity, 3) * 0.04;
  confidence += Math.min(clusterDiversity, 3) * 0.03;
  confidence += citations.some((citation) => citation.occurrenceCount && citation.occurrenceCount > 1) ? 0.05 : 0;
  confidence = Math.max(0, Math.min(1, confidence));

  const lowConfidenceReasons: string[] = [];
  if (citations.length < 4) lowConfidenceReasons.push("Few citations matched the query.");
  if (paperDiversity <= 1) lowConfidenceReasons.push("Evidence comes from a very small paper set.");
  if (avgSupport < 0.72) lowConfidenceReasons.push("Top citation support was weak relative to the query intent.");
  if (clusterDiversity <= 1) lowConfidenceReasons.push("Most evidence points to one cluster of wording.");

  return {
    confidence,
    lowConfidenceReasons: confidence < lowConfidenceThreshold ? lowConfidenceReasons : [],
  };
}

export async function answerRepeatQuery(
  request: RepeatQueryRequest
): Promise<RepeatQueryResponse> {
  const learningConfig = getRepeatLearningConfig();
  const snapshot = learningConfig.learningEnabled
    ? await readRepeatLearningSnapshot()
    : {
        generatedAt: new Date(0).toISOString(),
        eventCount: 0,
        chunkStats: {},
        clusterStats: {},
        queryStats: {},
      };
  const catalog = getRepeatCatalog();
  const catalogById = new Map(catalog.map((paper) => [paper.paperId, paper]));
  const candidates = filterCandidatePapers(catalog, request.subjectKey, request.currentPaperId);

  if (candidates.length === 0) {
    return {
      answerId: createRepeatAnswerId(`empty:${request.prompt}:${request.subjectKey ?? ""}`),
      answerMarkdown:
        "I could not find any papers for that selection. Choose a year and subject first.",
      confidence: 0,
      lowConfidenceReasons: ["No candidate papers matched the current selection."],
      citations: [],
      retrievedPapers: [],
      notices: ["No candidate papers matched the current selection."],
      queryIntent: request.intent ?? "custom",
    };
  }

  const candidatePaperIds = new Set(candidates.map((paper) => paper.paperId));
  const intentPrompt = buildIntentPrompt(request);
  const queryStatsKey = normalizeRepeatQueryKey(request.prompt);
  const queryEmbedding = await embedText(intentPrompt);

  let candidateChunks: RepeatChunk[];
  let similaritySeed: Map<string, number> | undefined;

  if (getRepeatIndexSource() === "supabase") {
    const fromDb = await fetchCandidateChunksSupabase([...candidatePaperIds], queryEmbedding);
    candidateChunks = fromDb.chunks;
    similaritySeed = fromDb.similaritySeed;
  } else {
    const index = await readRepeatIndex();
    const rawCandidateChunks = index.chunks.filter((chunk) => candidatePaperIds.has(chunk.paperId));
    const questionFirstChunks = rawCandidateChunks.filter((chunk) => isLikelyQuestionChunk(chunk.text));
    candidateChunks =
      questionFirstChunks.length >= Math.max(6, Math.floor(rawCandidateChunks.length * 0.2))
        ? questionFirstChunks
        : rawCandidateChunks;
    similaritySeed = undefined;
  }

  if (candidateChunks.length === 0) {
    return {
      answerId: createRepeatAnswerId(`missing-index:${request.prompt}:${request.subjectKey ?? ""}`),
      answerMarkdown:
        "The repeat index does not contain extracted text for the selected papers yet. Rebuild the index and try again.",
      confidence: 0,
      lowConfidenceReasons: ["Candidate papers were found, but no indexed chunks were available."],
      citations: [],
      retrievedPapers: [],
      queryIntent: request.intent ?? "custom",
      notices: ["Candidate papers were found, but no indexed chunks were available."],
    };
  }

  const rankedChunks = rankChunks(
    candidateChunks,
    queryEmbedding,
    snapshot,
    queryStatsKey,
    request.currentPaperId,
    intentPrompt,
    similaritySeed
  );
  const preferDiagram =
    hasDiagramSignal(buildIntentPrompt(request)) ||
    rankedChunks.slice(0, 10).some(({ chunk }) => isDiagramLikeChunk(chunk));
  const citations = selectCitations(rankedChunks, catalogById, preferDiagram);
  const retrievedPapers = buildRetrievedPapers(citations, catalogById);
  const payload = await completeAnswer(request, citations, snapshot, queryStatsKey);
  const diagramExpected = shouldRenderDiagram(request, citations);
  const diagramSupport = buildDiagramSupport(request, citations);
  const confidenceSummary = buildConfidence(citations, learningConfig.lowConfidenceThreshold);
  const answerId = createRepeatAnswerId(
    JSON.stringify({
      sessionId: request.sessionId ?? "anonymous",
      subjectKey: request.subjectKey ?? "",
      paperId: request.currentPaperId ?? "",
      prompt: request.prompt,
      citations: citations.map((citation) => citation.chunkId),
    })
  );

  if (diagramExpected && !hasMermaidBlock(payload.answerMarkdown)) {
    try {
      const diagramBlock = await generateRequiredDiagram(request, citations, payload.answerMarkdown);
      if (hasMermaidBlock(diagramBlock)) {
        payload.answerMarkdown = `${payload.answerMarkdown.trim()}\n\n${diagramBlock}`;
      }
    } catch {
      // Keep the original answer if a fallback diagram cannot be generated.
    }
  }

  const notices = [...(payload.notices ?? [])];
  if (citations.length < 4) {
    notices.push("Evidence is thin for this query, so the answer may be incomplete.");
  }
  if (confidenceSummary.lowConfidenceReasons.length > 0) {
    notices.push("Confidence is limited, so treat this as a narrowed, citation-grounded draft rather than a final answer.");
  }

  if (request.mode === "compare" && isRepeatSurveyIntent(request.intent)) {
    const related = groupChunksByPaper(candidateChunks);
    if (related.size <= 1) {
      notices.push("There is only one indexed paper for this subject, so common-question analysis is limited.");
    }
  }

  const queryIntent = request.intent ?? "custom";
  const surveyResponse = isRepeatSurveyIntent(queryIntent);
  const repeatedQuestions = surveyResponse ? (payload.repeatedQuestions ?? []) : [];
  const commonTopics = surveyResponse ? (payload.commonTopics ?? []) : [];
  const revisionList = surveyResponse ? (payload.revisionList ?? []) : [];

  return {
    answerId,
    answerMarkdown: payload.answerMarkdown,
    confidence: Number(confidenceSummary.confidence.toFixed(2)),
    lowConfidenceReasons: confidenceSummary.lowConfidenceReasons,
    citations,
    retrievedPapers,
    diagramSupport,
    repeatedQuestions,
    commonTopics,
    revisionList,
    notices,
    queryIntent,
  };
}
