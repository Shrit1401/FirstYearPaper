"use client";

import { ChevronDown, ExternalLink } from "lucide-react";
import type { RepeatCitation } from "@/lib/repeat-types";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { PaperViewer } from "@/components/pdf-viewer";
import { postRepeatEvent } from "@/lib/repeat-events-client";
import { resolvePublicPaperHref } from "@/lib/paper-url";

type Props = {
  citation: RepeatCitation;
  sessionId: string;
  subjectKey?: string;
  queryText?: string;
  answerId?: string;
  selectedCitationIds?: string[];
};

/** Compact label for the PDF chrome; full wording stays in the tooltip + search highlight. */
function questionHighlightLabel(
  full: string,
  page: number,
  diagram: boolean
): string {
  const normalized = full.replace(/\s+/g, " ").trim();
  const qMatch = normalized.match(/\bQ(?:uestion)?\.?\s*(\d+[a-z]?)\b/i);
  if (qMatch) {
    const bits = [`Q${qMatch[1]}`, `p.${page}`];
    if (diagram) bits.push("diagram");
    return bits.join(" · ");
  }
  const clipped = normalized.slice(0, 52);
  return clipped.length < normalized.length ? `${clipped}…` : clipped;
}

/** Page-only: phrase search in PDF.js often fails (OCR, hyphenation, wording). We jump to the page and mark externally. */
function buildPdfViewerHref(fileHref: string, page: number) {
  const resolved = resolvePublicPaperHref(fileHref);
  const fileParam = encodeURIComponent(resolved);
  const hash = new URLSearchParams();
  hash.set("page", String(page));
  return `/vendor/pdf-viewer/web/viewer.html?file=${fileParam}#${hash.toString()}`;
}

function buildPdfPreviewHref(fileHref: string, page: number) {
  const resolved = resolvePublicPaperHref(fileHref);
  return `${resolved}#page=${page}&view=FitH&toolbar=0&navpanes=0&statusbar=0&messages=0`;
}

export function RepeatCitationCard({
  citation,
  sessionId,
  subjectKey,
  queryText,
  answerId,
  selectedCitationIds,
}: Props) {
  const viewerHref = buildPdfViewerHref(citation.href, citation.pageStart);
  const previewHref = buildPdfPreviewHref(citation.href, citation.pageStart);
  const questionLabel = citation.questionText ?? citation.quote;
  const highlightLabel = questionHighlightLabel(
    questionLabel,
    citation.pageStart,
    Boolean(citation.diagramRequired)
  );
  const contextMeta = `${citation.subjectLabel} · page ${citation.pageStart}${citation.diagramRequired ? " · diagram question" : ""}`;
  const hasVisualContext = Boolean(citation.visualContext?.trim());
  const supportPercent = Math.round((citation.supportScore ?? citation.similarity) * 100);

  async function sendCitationFeedback(value: "helpful" | "wrong_citation") {
    await postRepeatEvent("/api/repeat/feedback/citation", {
      sessionId,
      subjectKey,
      paperId: citation.paperId,
      queryText,
      answerId,
      selectedCitationIds,
      chunkId: citation.chunkId,
      clusterId: citation.clusterId,
      value,
    });
  }

  return (
    <PaperViewer
      href={citation.href}
      viewerHref={viewerHref}
      viewerPage={citation.pageStart}
      citationPageMarker
      externalHref={viewerHref}
      downloadHref={citation.href}
      name={citation.paperName}
      contextTitle={highlightLabel}
      contextTitleDetail={questionLabel}
      contextMeta={contextMeta}
      onOpen={() => {
        void postRepeatEvent("/api/repeat/events", {
          sessionId,
          subjectKey,
          paperId: citation.paperId,
          queryText,
          answerId,
          selectedCitationIds,
          eventType: "citation_open",
          payload: {
            chunkId: citation.chunkId,
            clusterId: citation.clusterId,
          },
        });
        void postRepeatEvent("/api/repeat/events", {
          sessionId,
          subjectKey,
          paperId: citation.paperId,
          queryText,
          answerId,
          selectedCitationIds,
          eventType: "paper_open",
          payload: {
            chunkId: citation.chunkId,
            clusterId: citation.clusterId,
          },
        });
      }}
    >
      <div
        id={`repeat-citation-${citation.id}`}
        className={`repeat-citation-card scroll-mt-28 rounded-[1.35rem] border p-3.5 transition-[transform,background-color,border-color,box-shadow] duration-200 [transition-timing-function:var(--ease-out)] hover:-translate-y-0.5 hover:bg-background/80 ${
          citation.diagramRequired
            ? "border-sky-500/30 bg-sky-500/[0.06]"
            : "border-border/60 bg-background/50"
        }`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className="rounded-full px-2 py-0.5 text-[10px]">
                {citation.id}
              </Badge>
              {citation.diagramRequired ? (
                <Badge variant="outline" className="rounded-full border-sky-400/30 bg-sky-400/10 px-2 py-0.5 text-[10px] text-sky-100">
                  Diagram
                </Badge>
              ) : null}
              {hasVisualContext ? <Badge variant="outline" className="rounded-full px-2 py-0.5 text-[10px]">Visual context</Badge> : null}
              {citation.questionType ? <Badge variant="outline" className="rounded-full px-2 py-0.5 text-[10px]">{citation.questionType}</Badge> : null}
              <Badge variant="outline" className="rounded-full px-2 py-0.5 text-[10px]">{supportPercent}% support</Badge>
            </div>
            <p className="mt-1.5 truncate text-[13px] font-medium leading-5">{citation.paperName}</p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              {citation.subjectLabel} · opens at page {citation.pageStart}
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <span className="rounded-full border border-border/60 bg-background/60 px-2.5 py-1 text-[10px] text-foreground/90">
                Page {citation.pageStart}
              </span>
              {citation.pageEnd > citation.pageStart ? (
                <span className="rounded-full border border-border/60 bg-background/60 px-2.5 py-1 text-[10px] text-foreground/90">
                  Through page {citation.pageEnd}
                </span>
              ) : null}
              {citation.occurrenceCount ? (
                <span className="rounded-full border border-border/60 bg-background/60 px-2.5 py-1 text-[10px] text-foreground/90">
                  {citation.occurrenceCount} repeats
                </span>
              ) : null}
            </div>
          </div>
          <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-full border border-border/60 bg-background/55 text-muted-foreground">
            <ExternalLink className="size-3.5" />
          </span>
        </div>

        <div className="mt-3 flex gap-3">
          <div className="w-[11rem] shrink-0 overflow-hidden rounded-[0.95rem] border border-border/60 bg-[#3f3f3f] shadow-[0_8px_18px_rgba(0,0,0,0.12)]">
            <div className="flex items-center justify-between border-b border-white/8 bg-black/30 px-2.5 py-2">
              <p className="text-[10px] uppercase tracking-[0.18em] text-white/45">Preview</p>
              <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[9px] text-white/70">
                P{citation.pageStart}
              </span>
            </div>
            <div className="pointer-events-none relative h-24 overflow-hidden bg-[#4a4a4a]">
              <iframe
                src={previewHref}
                title={`${citation.paperName} preview page ${citation.pageStart}`}
                className="h-[340px] w-full origin-top scale-[1.02] border-0 bg-white"
                loading="lazy"
              />
              <div className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-white/6" />
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-black/35 to-transparent" />
            </div>
          </div>

          <div className="min-w-0 flex-1">
            {citation.questionText ? (
              <p className="text-[13px] font-medium leading-5 text-foreground/92 line-clamp-2">{citation.questionText}</p>
            ) : null}
            <p className="mt-2 line-clamp-2 text-[13px] leading-5 text-muted-foreground">{citation.quote}</p>
            {citation.diagramRequired ? (
              <p className="mt-2 text-[11px] text-sky-100/80">
                Open page {citation.pageStart} first for the visual.
              </p>
            ) : null}

            <div className="mt-3 flex flex-wrap gap-2">
              <span className="rounded-full border border-sky-400/20 bg-sky-400/10 px-2.5 py-1 text-[10px] text-sky-100">
                Open cited page
              </span>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  void sendCitationFeedback("helpful");
                }}
                className="rounded-full border border-border/60 px-2.5 py-1 text-[10px] text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
              >
                Helpful
              </button>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  void sendCitationFeedback("wrong_citation");
                }}
                className="rounded-full border border-border/60 px-2.5 py-1 text-[10px] text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
              >
                Wrong
              </button>
            </div>

            {(citation.visualContext || citation.diagramRequired) ? (
              <Collapsible>
                <CollapsibleTrigger
                  className="mt-2 inline-flex items-center gap-1 text-[11px] text-muted-foreground transition-colors hover:text-foreground"
                  onClick={(event) => event.stopPropagation()}
                >
                  More context
                  <ChevronDown className="size-3" />
                </CollapsibleTrigger>
                <CollapsibleContent
                  className="mt-2 space-y-2"
                  onClick={(event) => event.stopPropagation()}
                >
                  {citation.diagramRequired ? (
                    <div className="rounded-[0.9rem] border border-sky-400/20 bg-sky-400/10 px-3 py-2">
                      <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-sky-100/80">
                        Visual focus
                      </p>
                      <p className="mt-1 text-xs leading-5 text-sky-50/90">
                        This citation likely depends on a circuit, figure, waveform, or drawn explanation.
                      </p>
                    </div>
                  ) : null}
                  {citation.visualContext ? (
                    <div className="rounded-[0.9rem] border border-border/50 bg-background/50 px-3 py-2">
                      <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground/60">
                        Indexed visual context
                      </p>
                      <p className="mt-1 line-clamp-3 text-xs leading-5 text-muted-foreground/90">{citation.visualContext}</p>
                    </div>
                  ) : null}
                </CollapsibleContent>
              </Collapsible>
            ) : null}
          </div>
        </div>
      </div>
    </PaperViewer>
  );
}
