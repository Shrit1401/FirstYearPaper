"use client";

import { useMemo, useState } from "react";
import { BookOpen, Check, Copy, Eye, Quote, Sparkles, ThumbsDown, ThumbsUp } from "lucide-react";
import type { RepeatQueryResponse } from "@/lib/repeat-types";
import { isRepeatSurveyIntent } from "@/lib/repeat-types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
};

function InsightSection({
  title,
  items,
}: {
  title: string;
  items: NonNullable<RepeatQueryResponse["repeatedQuestions"]>;
}) {
  if (!items?.length) return null;

  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2">
        <Sparkles className="size-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold">{title}</h3>
      </div>
      <div className="grid gap-2.5">
        {items.map((item) => (
          <div
            key={`${title}-${item.title}`}
            className="rounded-[1.15rem] border border-border/60 bg-background/40 px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]"
          >
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-[13px] font-medium leading-5">{item.title}</p>
              {item.citationIds.map((citationId) => (
                <Badge key={citationId} variant="secondary" className="rounded-full px-2 py-0.5 text-[10px]">
                  {citationId}
                </Badge>
              ))}
            </div>
            <p className="mt-1.5 text-[13px] leading-5 text-muted-foreground">{item.detail}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function QuestionDrillSection({
  items,
  onChipClick,
}: {
  items: NonNullable<RepeatQueryResponse["repeatedQuestions"]>;
  onChipClick: (item: NonNullable<RepeatQueryResponse["repeatedQuestions"]>[number]) => void;
}) {
  if (!items?.length) return null;

  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2">
        <Sparkles className="size-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold">Solve These Common Questions First</h3>
      </div>
      <div className="grid gap-2.5">
        {items.map((item, index) => (
          <div
            key={`${item.title}-${item.citationIds.join("-")}-${index}`}
            className="rounded-[1.15rem] border border-border/60 bg-background/40 px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[13px] font-semibold leading-5 text-foreground">{item.title}</p>
                <p className="mt-1.5 text-[13px] leading-5 text-muted-foreground">{item.detail}</p>
              </div>
              <span className="inline-flex size-6 shrink-0 items-center justify-center rounded-full border border-border/60 bg-background text-[10px] text-muted-foreground">
                {index + 1}
              </span>
            </div>
            <div className="mt-2.5 flex flex-wrap gap-2">
              {item.citationIds.map((citationId) => (
                <Badge key={citationId} variant="secondary" className="rounded-full px-2 py-0.5 text-[10px]">
                  {citationId}
                </Badge>
              ))}
              <button
                type="button"
                onClick={() => onChipClick(item)}
                className="rounded-full border border-border/60 px-3 py-1 text-[10px] text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
              >
                Mark as important
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function StudyCards({ response }: { response: RepeatQueryResponse }) {
  const cards = [
    response.repeatedQuestions?.[0]
      ? {
          label: "Most repeated",
          title: response.repeatedQuestions[0].title,
          detail: response.repeatedQuestions[0].detail,
        }
      : null,
    response.commonTopics?.[0]
      ? {
          label: "Core topic",
          title: response.commonTopics[0].title,
          detail: response.commonTopics[0].detail,
        }
      : null,
    response.revisionList?.[0]
      ? {
          label: "Study first",
          title: response.revisionList[0].title,
          detail: response.revisionList[0].detail,
        }
      : null,
  ].filter(Boolean) as { label: string; title: string; detail: string }[];

  if (!cards.length) return null;

  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2">
        <BookOpen className="size-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold">Study view</h3>
      </div>
      <div className="grid gap-2.5 md:grid-cols-3">
        {cards.map((card) => (
          <div
            key={`${card.label}-${card.title}`}
            className="rounded-[1.15rem] border border-border/60 bg-background/40 px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]"
          >
            <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground/60">
              {card.label}
            </p>
            <p className="mt-1.5 text-[13px] font-semibold leading-5 text-foreground">{card.title}</p>
            <p className="mt-1.5 text-[13px] leading-5 text-muted-foreground">{card.detail}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

export function RepeatAnswer({ response, sessionId, subjectKey, queryText }: Props) {
  const surveyChrome = isRepeatSurveyIntent(response.queryIntent);
  const diagramSupport = response.diagramSupport;
  const selectedCitationIds = response.citations.map((citation) => citation.id);
  const citationJumpTargets = useMemo(
    () =>
      response.citations.map((citation) => ({
        id: citation.id,
        paperName: citation.paperName,
        pageStart: citation.pageStart,
      })),
    [response.citations],
  );
  const selectedChunkIds = response.citations.map((citation) => citation.chunkId);
  const [copied, setCopied] = useState(false);

  async function sendAnswerFeedback(
    value: "useful" | "not_useful" | "bad_diagram" | "incomplete" | "missed_repeat_question"
  ) {
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

  function trackRepeatQuestionClick(
    item: NonNullable<RepeatQueryResponse["repeatedQuestions"]>[number]
  ) {
    return postRepeatEvent("/api/repeat/events", {
      sessionId,
      subjectKey,
      queryText,
      answerId: response.answerId,
      selectedCitationIds,
      eventType: "repeat_question_click",
      payload: {
        title: item.title,
        clusterId:
          response.citations.find((citation) => item.citationIds.includes(citation.id))?.clusterId,
      },
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

  const hasStudyStructure =
    surveyChrome &&
    Boolean(
      response.repeatedQuestions?.length ||
        response.commonTopics?.length ||
        response.revisionList?.length
    );

  return (
    <Card className="border-border/60 bg-card/65 shadow-[0_14px_36px_rgba(0,0,0,0.12)]">
      <CardHeader className="gap-2.5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <CardTitle className="text-base">{surveyChrome ? "Answer" : "Reply"}</CardTitle>
            <Badge
              variant="secondary"
              className="rounded-full px-2 py-0.5 text-[9px] font-medium uppercase tracking-wider text-muted-foreground"
            >
              {surveyChrome ? "Subject overview" : "Your question"}
            </Badge>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <Badge variant="outline" className="ml-1 rounded-full px-2 py-0.5 text-[10px]">
              {Math.round(response.confidence * 100)}% confidence
            </Badge>
          </div>
        </div>
        {response.notices?.length ? (
          <div className="flex flex-col gap-1.5 rounded-[1.1rem] border border-amber-500/30 bg-amber-500/10 px-3 py-2.5 text-[13px] text-amber-100">
            {response.notices.map((notice) => (
              <p key={notice}>{notice}</p>
            ))}
          </div>
        ) : null}
        {response.lowConfidenceReasons?.length ? (
          <div className="rounded-[1.1rem] border border-border/60 bg-background/50 px-3 py-2.5 text-[13px] text-muted-foreground">
            {response.lowConfidenceReasons.join(" ")}
          </div>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-5">
        <section className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Sparkles className="size-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold">
                {surveyChrome ? "Study explanation" : "Explanation"}
              </h3>
            </div>
            <button
              type="button"
              onClick={() => void copyAnswerMarkdown()}
              className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-background/40 px-3 py-1 text-[10px] text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
            >
              {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
              {copied ? "Copied" : surveyChrome ? "Copy answer" : "Copy reply"}
            </button>
          </div>
          <div className="rounded-[1.2rem] border border-border/60 bg-background/30 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]">
            <RepeatMarkdown
              markdown={response.answerMarkdown}
              citationJumpTargets={citationJumpTargets}
            />
          </div>
        </section>

        {hasStudyStructure ? (
          <details className="group rounded-[1.15rem] border border-border/60 bg-background/20 [&_summary::-webkit-details-marker]:hidden">
            <summary className="cursor-pointer list-none px-4 py-3 text-sm font-semibold text-foreground outline-none transition-colors hover:text-foreground/90">
              <span className="inline-flex items-center gap-2">
                <BookOpen className="size-4 text-muted-foreground" />
                More study structure
                <span className="text-[10px] font-normal text-muted-foreground">(tap to expand)</span>
              </span>
            </summary>
            <div className="space-y-5 border-t border-border/50 px-4 pb-4 pt-4">
              <StudyCards response={response} />
              <QuestionDrillSection
                items={response.repeatedQuestions ?? []}
                onChipClick={(item) => void trackRepeatQuestionClick(item)}
              />
            </div>
          </details>
        ) : null}

        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <Quote className="size-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold">Open these citations</h3>
          </div>
          <div className="grid gap-3">
            {response.citations.map((citation) => (
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
        </section>

        {diagramSupport ? (
          <section className="rounded-[1.15rem] border border-sky-500/20 bg-sky-500/5 p-3.5">
            <div className="flex items-start gap-3">
              <div className="rounded-xl border border-sky-400/20 bg-sky-400/10 p-2 text-sky-100">
                <Eye className="size-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-sm font-semibold text-foreground">Visual evidence</h3>
                  {diagramSupport.diagramExpected ? (
                    <Badge variant="outline" className="rounded-full border-sky-400/30 bg-sky-400/10 px-2 py-0.5 text-[10px] text-sky-100">
                      Diagram expected
                    </Badge>
                  ) : null}
                  <Badge variant="secondary" className="rounded-full px-2 py-0.5 text-[10px]">{diagramSupport.citedDiagramCount} diagram citations</Badge>
                  <Badge variant="secondary" className="rounded-full px-2 py-0.5 text-[10px]">{diagramSupport.visualContextCount} visual hints</Badge>
                </div>
                <p className="mt-1.5 text-[13px] leading-5 text-foreground/90">{diagramSupport.summary}</p>
                <p className="mt-1.5 text-[13px] leading-5 text-muted-foreground">
                  {diagramSupport.recommendedAction}
                </p>
                {diagramSupport.keyCitationIds.length ? (
                  <div className="mt-2.5 flex flex-wrap gap-2">
                    {diagramSupport.keyCitationIds.map((citationId) => (
                      <Badge key={citationId} variant="outline" className="rounded-full px-2 py-0.5 text-[10px]">
                        Check {citationId}
                      </Badge>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
          </section>
        ) : null}

        {surveyChrome ? (
          <>
            <InsightSection title="Common topics" items={response.commonTopics ?? []} />
            <InsightSection title="Revision list" items={response.revisionList ?? []} />
          </>
        ) : null}

        <section className="space-y-3">
          <h3 className="text-sm font-semibold">Source papers</h3>
          <div className="flex flex-wrap gap-2">
            {response.retrievedPapers.map((paper) => (
              <a
                key={paper.paperId}
                href={resolvePublicPaperHref(paper.href)}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/45 px-3 py-1 text-[10px] text-muted-foreground transition-[transform,background-color,color] duration-150 [transition-timing-function:var(--ease-out)] hover:-translate-y-0.5 hover:bg-background/80 hover:text-foreground active:scale-[0.97]"
              >
                <span className="max-w-[14rem] truncate">{paper.paperName}</span>
                <Badge variant="secondary" className="rounded-full px-2 text-[10px]">
                  {paper.chunkCount}
                </Badge>
              </a>
            ))}
          </div>
        </section>

        <div className="flex flex-wrap items-center gap-2 border-t border-border/60 pt-2">
          <button
            type="button"
            onClick={() => void sendAnswerFeedback("useful")}
            className="inline-flex items-center gap-1 rounded-full border border-border/60 px-2.5 py-1 text-[10px] text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
          >
            <ThumbsUp className="size-3" />
            Useful
          </button>
          <button
            type="button"
            onClick={() => void sendAnswerFeedback("not_useful")}
            className="inline-flex items-center gap-1 rounded-full border border-border/60 px-2.5 py-1 text-[10px] text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
          >
            <ThumbsDown className="size-3" />
            Not useful
          </button>
          {diagramSupport?.diagramExpected ? (
            <button
              type="button"
              onClick={() => void sendAnswerFeedback("bad_diagram")}
              className="rounded-full border border-border/60 px-2.5 py-1 text-[10px] text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
            >
              Bad diagram
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => void sendAnswerFeedback("incomplete")}
            className="rounded-full border border-border/60 px-2.5 py-1 text-[10px] text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
          >
            Incomplete
          </button>
          {surveyChrome ? (
            <button
              type="button"
              onClick={() => void sendAnswerFeedback("missed_repeat_question")}
              className="rounded-full border border-border/60 px-2.5 py-1 text-[10px] text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
            >
              Missed repeat
            </button>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
