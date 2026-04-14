"use client";

import { useEffect, useState } from "react";
import { FileText } from "lucide-react";
import type { RepeatCitation } from "@/lib/repeat-types";
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

function questionHighlightLabel(full: string, page: number, diagram: boolean): string {
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
  const [iframeError, setIframeError] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    setIsMobile(window.innerWidth < 768);
  }, []);
  const questionLabel = citation.questionText ?? citation.quote;
  const highlightLabel = questionHighlightLabel(questionLabel, citation.pageStart, Boolean(citation.diagramRequired));
  const contextMeta = `${citation.subjectLabel} · page ${citation.pageStart}${citation.diagramRequired ? " · diagram question" : ""}`;

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
          payload: { chunkId: citation.chunkId, clusterId: citation.clusterId },
        });
        void postRepeatEvent("/api/repeat/events", {
          sessionId,
          subjectKey,
          paperId: citation.paperId,
          queryText,
          answerId,
          selectedCitationIds,
          eventType: "paper_open",
          payload: { chunkId: citation.chunkId, clusterId: citation.clusterId },
        });
      }}
    >
      <div
        id={`repeat-citation-${citation.id}`}
        className={`repeat-citation-card scroll-mt-28 rounded-[1.2rem] border p-3 transition-[transform,background-color] duration-150 ease-out hover:-translate-y-0.5 hover:bg-background/80 ${
          citation.diagramRequired
            ? "border-sky-500/25 bg-sky-500/[0.05]"
            : "border-border/50 bg-background/40"
        }`}
      >
        <div className="flex gap-3">
          {/* PDF thumbnail */}
          <div className="w-[5.5rem] shrink-0 overflow-hidden rounded-[0.8rem] border border-border/50 bg-[#3a3a3a]">
            {isMobile || iframeError ? (
              <div className="flex h-[4.5rem] items-center justify-center">
                <FileText className="size-7 text-white/20" />
              </div>
            ) : (
              <div className="pointer-events-none relative h-[4.5rem] overflow-hidden">
                <iframe
                  src={previewHref}
                  title={`${citation.paperName} p.${citation.pageStart}`}
                  className="h-[300px] w-full origin-top scale-[1.0] border-0 bg-white"
                  loading="lazy"
                  onError={() => setIframeError(true)}
                />
                <div className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-white/5" />
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-6 bg-gradient-to-t from-black/40 to-transparent" />
              </div>
            )}
            <div className="border-t border-white/6 px-2 py-1.5 text-center">
              <p className="text-[9px] font-medium text-white/50">p.{citation.pageStart}</p>
            </div>
          </div>

          {/* Info */}
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-semibold leading-5 text-foreground">
              {citation.paperName}
            </p>
            <p className="mt-0.5 text-[11px] text-muted-foreground/70">
              {citation.subjectLabel}
            </p>

            {citation.questionText ? (
              <p className="mt-2 line-clamp-2 text-[12px] leading-[1.55] text-muted-foreground">
                {citation.questionText}
              </p>
            ) : null}

            <div className="mt-2.5 flex flex-wrap items-center gap-2">
              {citation.diagramRequired ? (
                <span className="rounded-full border border-sky-400/25 bg-sky-400/8 px-2 py-0.5 text-[10px] text-sky-200/80">
                  Has diagram
                </span>
              ) : null}
              {citation.occurrenceCount && citation.occurrenceCount > 1 ? (
                <span className="text-[11px] text-muted-foreground/50">
                  asked {citation.occurrenceCount}× across papers
                </span>
              ) : null}
              <span className="ml-auto text-[11px] font-medium text-sky-300/80">
                Open PDF →
              </span>
            </div>
          </div>
        </div>
      </div>
    </PaperViewer>
  );
}
