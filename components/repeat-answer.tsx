"use client";

import { useMemo, useState } from "react";
import { Check, ChevronDown, Copy, ExternalLink, FileText, Sparkles } from "lucide-react";
import type { RepeatInsight, RepeatQueryResponse } from "@/lib/repeat-types";
import { isRepeatSurveyIntent } from "@/lib/repeat-types";
import { RepeatMarkdown } from "./repeat-markdown";
import { RepeatCitationCard } from "./repeat-citation-card";
import { postRepeatEvent } from "@/lib/repeat-events-client";
import { resolvePublicPaperHref } from "@/lib/paper-url";

type Props = {
  response: RepeatQueryResponse;
  sessionId: string;
  subjectKey?: string;
  queryText?: string;
  loading?: boolean;
  onRegenerate?: () => void;
  onEditPrompt?: () => void;
  onAskQuestion?: (prompt: string) => void;
};

function RepeatedQuestionsList({ items, onAskQuestion }: { items: RepeatInsight[]; onAskQuestion?: (prompt: string) => void }) {
  // Group by unit; items with no unit go under a fallback group
  const groups = useMemo(() => {
    const map = new Map<string, RepeatInsight[]>();
    for (const item of items) {
      const key = item.unit?.trim() || "";
      map.set(key, [...(map.get(key) ?? []), item]);
    }
    // Sort: named units first (alphabetically), unnamed last
    return Array.from(map.entries()).sort(([a], [b]) => {
      if (!a && b) return 1;
      if (a && !b) return -1;
      return a.localeCompare(b);
    });
  }, [items]);

  const hasUnits = groups.some(([key]) => key !== "");

  if (!hasUnits) {
    // No unit data — flat list
    return (
      <div className="divide-y divide-border/30 rounded-[1.2rem] border border-border/50 bg-background/30">
        {items.map((item, i) => (
          onAskQuestion ? (
            <button
              key={i}
              type="button"
              onClick={() => onAskQuestion(item.title)}
              className="group flex w-full cursor-pointer items-start justify-between gap-3 px-4 py-3 text-left transition-colors duration-100 hover:bg-muted/40 active:bg-muted/60"
            >
              <p className="text-[13px] leading-[1.55] text-foreground/80 transition-colors group-hover:text-foreground">{item.title}</p>
              <div className="mt-0.5 flex shrink-0 items-center gap-1.5">
                {item.citationIds.length > 1 ? (
                  <span className="rounded-full bg-muted/50 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">×{item.citationIds.length}</span>
                ) : null}
                <span className="translate-x-0 text-[12px] text-sky-400/0 transition-all duration-150 group-hover:translate-x-0.5 group-hover:text-sky-400/80">→</span>
              </div>
            </button>
          ) : (
            <div key={i} className="flex items-start justify-between gap-3 px-4 py-3">
              <p className="text-[13px] leading-[1.55] text-foreground">{item.title}</p>
              {item.citationIds.length > 1 ? (
                <span className="shrink-0 rounded-full bg-muted/50 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">×{item.citationIds.length}</span>
              ) : null}
            </div>
          )
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {groups.map(([unit, groupItems]) => (
        <div key={unit || "__no_unit"} className="overflow-hidden rounded-[1.2rem] border border-border/50">
          {unit ? (
            <div className="border-b border-border/40 bg-muted/20 px-4 py-2">
              <p className="text-[11px] font-semibold text-foreground/70">{unit}</p>
            </div>
          ) : null}
          <div className="divide-y divide-border/25 bg-background/30">
            {groupItems.map((item, i) => (
              onAskQuestion ? (
                <button
                  key={i}
                  type="button"
                  onClick={() => onAskQuestion(item.title)}
                  className="flex w-full items-start justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/30 active:bg-muted/50"
                >
                  <p className="text-[13px] leading-[1.55] text-foreground">{item.title}</p>
                  <span className="mt-0.5 shrink-0 text-[11px] text-muted-foreground/40">→</span>
                </button>
              ) : (
                <div key={i} className="flex items-start justify-between gap-3 px-4 py-3">
                  <p className="text-[13px] leading-[1.55] text-foreground">{item.title}</p>
                  {item.citationIds.length > 1 ? (
                    <span className="shrink-0 text-[11px] text-muted-foreground/50">{item.citationIds.length}×</span>
                  ) : null}
                </div>
              )
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

const CITATION_PREVIEW_COUNT = 2;

export function RepeatAnswer({
  response,
  sessionId,
  subjectKey,
  queryText,
  onRegenerate,
  onEditPrompt,
  onAskQuestion,
}: Props) {
  const surveyChrome = isRepeatSurveyIntent(response.queryIntent);
  const selectedCitationIds = response.citations.map((c) => c.id);
  const selectedChunkIds = response.citations.map((c) => c.chunkId);
  const [copied, setCopied] = useState(false);
  const [feedbackSent, setFeedbackSent] = useState(false);
  const [showAllCitations, setShowAllCitations] = useState(false);

  const citationJumpTargets = useMemo(
    () =>
      response.citations.map((c) => ({
        id: c.id,
        paperName: c.paperName,
        pageStart: c.pageStart,
      })),
    [response.citations],
  );

  // Derive follow-up suggestion chips from the response content
  const followUpChips = useMemo(() => {
    const repeatedQuestions = response.repeatedQuestions ?? [];
    const commonTopics = response.commonTopics ?? [];
    const revisionList = response.revisionList ?? [];
    const pool = [...repeatedQuestions, ...commonTopics, ...revisionList];
    // Pick the top 3 highest-frequency items (by citationIds count)
    const sorted = [...pool].sort((a, b) => b.citationIds.length - a.citationIds.length);
    return sorted.slice(0, 3).map((item) => item.title);
  }, [response.repeatedQuestions, response.commonTopics, response.revisionList]);

  // Replace [C1] and [C4, C7, C10] groups with plain numbered scroll links
  const markdownWithCitationAnchors = useMemo(() => {
    const indexMap = new Map(response.citations.map((c, i) => [c.id, i + 1]));
    return response.answerMarkdown.replace(
      /\[(C\d+(?:,\s*C\d+)*)\]/g,
      (_match, group: string) => {
        const ids = group.split(",").map((s) => s.trim());
        const links = ids
          .map((id) => {
            const num = indexMap.get(id);
            return num != null ? `[source ${num}](#repeat-citation-${id})` : "";
          })
          .filter(Boolean);
        return links.length ? links.join(" ") : "";
      },
    );
  }, [response.answerMarkdown, response.citations]);

  async function sendAnswerFeedback(
    value: "useful" | "not_useful" | "bad_diagram" | "incomplete" | "missed_repeat_question",
  ) {
    setFeedbackSent(true);
    await postRepeatEvent("/api/repeat/feedback/answer", {
      sessionId,
      subjectKey,
      queryText,
      answerId: response.answerId,
      selectedCitationIds,
      selectedChunkIds,
      clusterId: response.citations[0]?.clusterId,
      value,
    });
  }

  async function copyAnswerMarkdown() {
    try {
      await navigator.clipboard.writeText(response.answerMarkdown);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  // ─── Direct Q&A (non-survey) ───────────────────────────────────────────────
  if (!surveyChrome) {
    return (
      <div className="min-w-0 space-y-3">
        {response.notices?.length ? (
          <div className="rounded-xl border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-[13px] text-amber-100">
            {response.notices.map((n) => <p key={n}>{n}</p>)}
          </div>
        ) : null}

        <div className="rounded-2xl border border-border/35 bg-card/40 px-4 py-3.5 sm:px-5 sm:py-4">
          <RepeatMarkdown markdown={markdownWithCitationAnchors} citationJumpTargets={citationJumpTargets} />
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => void copyAnswerMarkdown()}
            className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
          >
            {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
            {copied ? "Copied" : "Copy"}
          </button>
          {onRegenerate ? (
            <button
              type="button"
              onClick={onRegenerate}
              className="rounded-md px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
            >
              Regenerate
            </button>
          ) : null}
          {onEditPrompt ? (
            <button
              type="button"
              onClick={onEditPrompt}
              className="rounded-md px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
            >
              Edit
            </button>
          ) : null}
        </div>

        {response.citations.length > 0 ? (
          <div className="space-y-2">
            <p className="px-0.5 text-[13px] font-semibold text-foreground/70">Papers cited</p>
            <div className="grid gap-2">
              {(showAllCitations ? response.citations : response.citations.slice(0, CITATION_PREVIEW_COUNT)).map((citation) => (
                <RepeatCitationCard
                  key={citation.id}
                  citation={citation}
                  sessionId={sessionId}
                  subjectKey={subjectKey}
                  queryText={queryText}
                  answerId={response.answerId}
                  selectedCitationIds={selectedCitationIds}
                />
              ))}
            </div>
            {response.citations.length > CITATION_PREVIEW_COUNT ? (
              <button
                type="button"
                onClick={() => setShowAllCitations((v) => !v)}
                className="flex items-center gap-1 px-0.5 text-[12px] text-muted-foreground/60 transition-colors hover:text-foreground"
              >
                <ChevronDown className={`size-3.5 transition-transform ${showAllCitations ? "rotate-180" : ""}`} />
                {showAllCitations ? "Show less" : `Show ${response.citations.length - CITATION_PREVIEW_COUNT} more`}
              </button>
            ) : null}
          </div>
        ) : null}

        {response.retrievedPapers.length > 0 ? (
          <div className="space-y-2">
            <p className="px-0.5 text-[13px] font-semibold text-foreground/70">Source papers</p>
            <div className="flex flex-wrap gap-1.5">
              {response.retrievedPapers.map((paper) => (
                <a
                  key={paper.paperId}
                  href={resolvePublicPaperHref(paper.href)}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-full border border-border/50 bg-background/45 px-3 py-1 text-[11px] text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
                >
                  <ExternalLink className="size-3 shrink-0" />
                  <span className="max-w-[14rem] truncate">{paper.paperName}</span>
                </a>
              ))}
            </div>
          </div>
        ) : null}

        {onAskQuestion && followUpChips.length > 0 ? (
          <div className="space-y-2">
            <p className="px-0.5 text-[11px] text-muted-foreground/40">Ask a follow-up</p>
            <div className="flex flex-wrap gap-1.5">
              {followUpChips.map((chip, i) => (
                <button
                  key={`chip-${i}`}
                  type="button"
                  onClick={() => onAskQuestion(chip)}
                  className="rounded-full border border-border/50 bg-background/40 px-3 py-1 text-[12px] text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
                >
                  {chip.length > 60 ? `${chip.slice(0, 60)}…` : chip}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        <div className="flex items-center gap-3 rounded-xl border border-border/30 bg-muted/10 px-3 py-2.5">
          {feedbackSent ? (
            <p className="text-[12px] text-muted-foreground">Thanks for the feedback!</p>
          ) : (
            <>
              <p className="text-[12px] text-muted-foreground">Was this helpful?</p>
              <div className="flex flex-wrap items-center gap-1.5">
                <button type="button" onClick={() => void sendAnswerFeedback("useful")} className="rounded-full border border-border/50 bg-background/60 px-2.5 py-0.5 text-[11px] text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground">👍 Useful</button>
                <button type="button" onClick={() => void sendAnswerFeedback("not_useful")} className="rounded-full border border-border/50 bg-background/60 px-2.5 py-0.5 text-[11px] text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground">👎 Not useful</button>
                <button type="button" onClick={() => void sendAnswerFeedback("incomplete")} className="rounded-full border border-border/50 px-2 py-0.5 text-[10px] text-muted-foreground/60 transition-colors hover:text-foreground">Incomplete</button>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  // ─── Survey / overview response ────────────────────────────────────────────
  const repeatedQuestions = response.repeatedQuestions ?? [];
  const commonTopics = response.commonTopics ?? [];
  const revisionList = response.revisionList ?? [];

  return (
    <div className="min-w-0 space-y-6">

      {/* Notices */}
      {response.notices?.length ? (
        <div className="rounded-xl border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-[13px] text-amber-100">
          {response.notices.map((n) => <p key={n}>{n}</p>)}
        </div>
      ) : null}

      {/* ── 1. Short summary line — strip any markdown/code the AI might emit ── */}
      {response.answerMarkdown ? (
        <p className="text-[13px] leading-6 text-muted-foreground">
          {response.answerMarkdown
            .replace(/```[\s\S]*?```/g, "")   // remove code/mermaid blocks
            .replace(/^#+\s*/gm, "")           // remove ## headers
            .replace(/\*\*(.+?)\*\*/g, "$1")  // remove bold markers
            .replace(/\[.*?\]\(.*?\)/g, "")   // remove markdown links
            .replace(/\s{2,}/g, " ")
            .trim()
            .slice(0, 220)}
        </p>
      ) : null}

      {/* ── 2. Repeated questions — the core feature ── */}
      {repeatedQuestions.length > 0 ? (
        <section className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Sparkles className="size-3.5 text-muted-foreground/60" />
              <p className="text-[13px] font-semibold text-foreground/70">Repeated questions</p>
            </div>
            {onAskQuestion ? (
              <p className="text-[10px] text-sky-400/60">tap to fill</p>
            ) : null}
          </div>
          <RepeatedQuestionsList items={repeatedQuestions} onAskQuestion={onAskQuestion} />
        </section>
      ) : null}

      {/* ── 3. Paper sources — tap to open PDF ── */}
      {response.citations.length > 0 ? (
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <FileText className="size-3.5 text-muted-foreground/60" />
            <p className="text-[13px] font-semibold text-foreground/70">Papers — tap to open</p>
          </div>
          <div className="grid gap-2.5">
            {(showAllCitations ? response.citations : response.citations.slice(0, CITATION_PREVIEW_COUNT)).map((citation) => (
              <RepeatCitationCard
                key={citation.id}
                citation={citation}
                sessionId={sessionId}
                subjectKey={subjectKey}
                queryText={queryText}
                answerId={response.answerId}
                selectedCitationIds={selectedCitationIds}
              />
            ))}
          </div>
          {response.citations.length > CITATION_PREVIEW_COUNT ? (
            <button
              type="button"
              onClick={() => setShowAllCitations((v) => !v)}
              className="flex items-center gap-1 px-0.5 text-[12px] text-muted-foreground/60 transition-colors hover:text-foreground"
            >
              <ChevronDown className={`size-3.5 transition-transform ${showAllCitations ? "rotate-180" : ""}`} />
              {showAllCitations ? "Show less" : `Show ${response.citations.length - CITATION_PREVIEW_COUNT} more`}
            </button>
          ) : null}
        </section>
      ) : null}

      {/* ── 4. Common topics ── */}
      {commonTopics.length > 0 ? (
        <section className="space-y-2">
          <p className="text-[13px] font-semibold text-foreground/70">Common topics</p>
          <div className="divide-y divide-border/30 rounded-[1.2rem] border border-border/50 bg-background/30">
            {commonTopics.map((item, i) => (
              <div key={`ct-${i}`} className="flex items-start justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <p className="text-[13px] font-medium leading-5 text-foreground">{item.title}</p>
                  {item.detail ? (
                    <p className="mt-0.5 text-[12px] leading-[1.5] text-muted-foreground">{item.detail}</p>
                  ) : null}
                </div>
                {item.citationIds.length > 1 ? (
                  <span className="shrink-0 rounded-full bg-muted/50 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                    ×{item.citationIds.length}
                  </span>
                ) : null}
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {/* ── 5. Revision list ── */}
      {revisionList.length > 0 ? (
        <section className="space-y-2">
          <p className="text-[13px] font-semibold text-foreground/70">Revise these</p>
          <div className="divide-y divide-border/30 rounded-[1.2rem] border border-border/50 bg-background/30">
            {revisionList.map((item, i) => (
              <div key={`rl-${i}`} className="flex items-start justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <p className="text-[13px] font-medium leading-5 text-foreground">{item.title}</p>
                  {item.detail ? (
                    <p className="mt-0.5 text-[12px] leading-[1.5] text-muted-foreground">{item.detail}</p>
                  ) : null}
                </div>
                {item.citationIds.length > 1 ? (
                  <span className="shrink-0 rounded-full bg-muted/50 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                    ×{item.citationIds.length}
                  </span>
                ) : null}
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {/* ── 6. Follow-up chips ── */}
      {onAskQuestion && followUpChips.length > 0 ? (
        <div className="space-y-2">
          <p className="px-0.5 text-[11px] text-muted-foreground/40">Ask a follow-up</p>
          <div className="flex flex-wrap gap-1.5">
            {followUpChips.map((chip) => (
              <button
                key={chip}
                type="button"
                onClick={() => onAskQuestion(chip)}
                className="rounded-full border border-border/50 bg-background/40 px-3 py-1 text-[12px] text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
              >
                {chip.length > 60 ? `${chip.slice(0, 60)}…` : chip}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {/* Feedback */}
      <div className="flex items-center gap-3 rounded-xl border border-border/30 bg-muted/10 px-3 py-2.5">
        {feedbackSent ? (
          <p className="text-[12px] text-muted-foreground">Thanks for the feedback!</p>
        ) : (
          <>
            <p className="text-[12px] text-muted-foreground">Was this helpful?</p>
            <div className="flex flex-wrap items-center gap-1.5">
              <button type="button" onClick={() => void sendAnswerFeedback("useful")} className="rounded-full border border-border/50 bg-background/60 px-2.5 py-0.5 text-[11px] text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground">👍 Useful</button>
              <button type="button" onClick={() => void sendAnswerFeedback("not_useful")} className="rounded-full border border-border/50 bg-background/60 px-2.5 py-0.5 text-[11px] text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground">👎 Not useful</button>
              <button type="button" onClick={() => void sendAnswerFeedback("incomplete")} className="rounded-full border border-border/50 px-2 py-0.5 text-[10px] text-muted-foreground/60 transition-colors hover:text-foreground">Incomplete</button>
              <button type="button" onClick={() => void sendAnswerFeedback("missed_repeat_question")} className="rounded-full border border-border/50 px-2 py-0.5 text-[10px] text-muted-foreground/60 transition-colors hover:text-foreground">Missed a repeat</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
