"use client";

import { Maximize2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { buildCytoscapeElements, flowchartFunLikeStylesheet } from "@/lib/repeat-flowchart-cy";
import {
  buildGraphSteps,
  createFallbackSummary,
  normalizeFlowchartSource,
  parseFlowEdges,
} from "@/lib/repeat-diagram-parse";

export type CitationJumpTarget = {
  id: string;
  paperName: string;
  pageStart: number;
};

type Props = {
  chart: string;
  citationJumpTargets?: CitationJumpTarget[];
};

function FallbackFlow({ steps }: { steps: string[] }) {
  return (
    <div className="space-y-2">
      {steps.map((step, index) => (
        <div key={`${step}-${index}`} className="space-y-2">
          <div className="rounded-xl border border-border/50 bg-background/60 px-3.5 py-3 text-sm leading-6 text-foreground/90">
            <div className="flex items-start gap-3">
              <span className="inline-flex size-6 shrink-0 items-center justify-center rounded-full border border-border/50 bg-background text-[11px] text-muted-foreground">
                {index + 1}
              </span>
              <span>{step}</span>
            </div>
          </div>
          {index < steps.length - 1 ? (
            <div className="flex justify-center text-xs text-muted-foreground/70">↓</div>
          ) : null}
        </div>
      ))}
    </div>
  );
}

function StructuredStudyGraph({ chart }: { chart: string }) {
  const edges = parseFlowEdges(chart);
  const steps = buildGraphSteps(edges);

  if (!steps.length) {
    return <FallbackFlow steps={createFallbackSummary(chart)} />;
  }

  return (
    <div className="space-y-4">
      {steps.map((step, index) => (
        <div key={`${step.id}-${index}`} className="space-y-3">
          <div className="rounded-[1.35rem] border border-border/50 bg-[linear-gradient(180deg,rgba(255,255,255,0.02),rgba(255,255,255,0.01))] px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
            <div className="flex items-start gap-3">
              <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-full border border-border/50 bg-background/80 text-[11px] font-medium text-muted-foreground">
                {index + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm leading-6 text-foreground/92">{step.label}</p>
              </div>
            </div>
          </div>
          {index < steps.length - 1 ? (
            <div className="flex flex-col items-center gap-1.5">
              {steps[index + 1]?.edgeLabel ? (
                <span className="rounded-full border border-border/40 bg-background/80 px-2.5 py-1 text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                  {steps[index + 1].edgeLabel}
                </span>
              ) : null}
              <div className="flex flex-col items-center">
                <div className="h-6 w-px bg-border/70" />
                <div className="text-xs text-muted-foreground/70">↓</div>
              </div>
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}

function DiagramPreview({
  children,
  sourceLabel,
  footnote,
}: {
  children: ReactNode;
  sourceLabel: string;
  footnote?: ReactNode;
}) {
  return (
    <div className="space-y-3">
      <Dialog>
        <div>
          <DialogTrigger asChild>
            <button
              type="button"
              className="group block w-full text-left transition-transform duration-200 ease-out hover:-translate-y-0.5 active:scale-[0.995]"
            >
              <div className="rounded-2xl border border-border/60 bg-background/60 p-4">{children}</div>
              <div className="pointer-events-none mt-2 flex items-center justify-between text-xs text-muted-foreground">
                <span>{sourceLabel}</span>
                <span className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-background/70 px-2.5 py-1 text-[11px] transition-colors group-hover:text-foreground">
                  <Maximize2 className="size-3" />
                  Expand
                </span>
              </div>
            </button>
          </DialogTrigger>
          {footnote ? <div className="mt-2 px-0.5">{footnote}</div> : null}
        </div>
        <DialogContent className="max-w-5xl border-white/10 bg-background/96 p-0 sm:max-w-5xl">
          <DialogHeader className="border-b border-white/8 px-6 py-4">
            <DialogTitle className="text-base">Diagram view</DialogTitle>
            <DialogDescription>
              Rendered with Cytoscape.js (same engine family as{" "}
              <a
                href="https://flowchart.fun/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-foreground underline decoration-white/25 underline-offset-2"
              >
                Flowchart&nbsp;Fun
              </a>
              ). Open a citation card for the PDF page.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[80vh] overflow-auto p-6">
            <div className="rounded-3xl border border-border/60 bg-background/60 p-6">{children}</div>
          </div>
        </DialogContent>
      </Dialog>
      <p className="text-xs leading-5 text-muted-foreground">
        Simplified study sketch. Open a citation card below, then open the PDF — it jumps to the cited page (no
        phrase search).
      </p>
    </div>
  );
}

function CitationJumpStrip({ targets }: { targets: CitationJumpTarget[] }) {
  function scrollToCitation(id: string) {
    document.getElementById(`repeat-citation-${id}`)?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }

  return (
    <div className="mt-3 flex flex-col gap-2 rounded-xl border border-border/50 bg-background/50 px-3 py-2.5">
      <p className="text-[11px] font-medium text-foreground/90">Jump to cited PDF (opens from card)</p>
      <div className="flex flex-wrap gap-2">
        {targets.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => scrollToCitation(t.id)}
            className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-border/60 bg-background/80 px-3 py-1.5 text-left text-[11px] text-foreground/90 transition-colors hover:border-white/20 hover:bg-background"
          >
            <span className="font-mono text-[10px] text-muted-foreground">{t.id}</span>
            <span className="truncate">p.{t.pageStart}</span>
            <span className="truncate text-muted-foreground">· {t.paperName}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

const diagramIdFootnote = (
  <p className="text-[11px] leading-relaxed text-muted-foreground">
    Single-letter boxes are <span className="text-foreground/80">graph ids</span> (A, B, …). Readable titles appear
    when the diagram uses{" "}
    <code className="rounded bg-muted/60 px-1 py-0.5 font-mono text-[10px]">A[&quot;Your label&quot;]</code> for each
    node — same idea as{" "}
    <a
      href="https://flowchart.fun/"
      target="_blank"
      rel="noopener noreferrer"
      className="text-foreground/85 underline decoration-white/20 underline-offset-2"
    >
      Flowchart&nbsp;Fun
    </a>
    .
  </p>
);

function RepeatCytoscapeCanvas({ normalized }: { normalized: string }) {
  const edges = useMemo(() => parseFlowEdges(normalized), [normalized]);
  const hostRef = useRef<HTMLDivElement>(null);
  const [cyError, setCyError] = useState<string | null>(null);
  const [booting, setBooting] = useState(true);

  useEffect(() => {
    const el = hostRef.current;
    if (!el || edges.length === 0) {
      setBooting(false);
      return;
    }

    let cancelled = false;
    let cyInstance: import("cytoscape").Core | null = null;
    let ro: ResizeObserver | null = null;

    setCyError(null);
    setBooting(true);

    void (async () => {
      try {
        const cytoscape = (await import("cytoscape")).default;
        const dagreExt = (await import("cytoscape-dagre")).default;
        cytoscape.use(dagreExt);

        if (cancelled || !hostRef.current) return;

        const elements = buildCytoscapeElements(edges);
        cyInstance = cytoscape({
          container: hostRef.current,
          elements,
          style: flowchartFunLikeStylesheet,
          layout: {
            name: "dagre",
            rankDir: "TB",
            nodeSep: 44,
            rankSep: 72,
            edgeSep: 14,
            padding: 28,
            animate: false,
          } as import("cytoscape").LayoutOptions,
          wheelSensitivity: 0.32,
          minZoom: 0.15,
          maxZoom: 2.25,
        });

        cyInstance.fit(undefined, 32);

        ro = new ResizeObserver(() => {
          if (!cyInstance || cancelled) return;
          cyInstance.resize();
          cyInstance.fit(undefined, 32);
        });
        ro.observe(hostRef.current);
      } catch (e) {
        if (!cancelled) {
          setCyError(e instanceof Error ? e.message : "Diagram failed to load.");
        }
      } finally {
        if (!cancelled) setBooting(false);
      }
    })();

    return () => {
      cancelled = true;
      ro?.disconnect();
      cyInstance?.destroy();
    };
  }, [normalized, edges]);

  if (cyError) {
    return (
      <div className="rounded-xl border border-amber-500/25 bg-amber-500/5 p-4 text-sm text-amber-100/90">
        <p className="font-medium">Could not render the flowchart.</p>
        <p className="mt-1 text-xs text-muted-foreground">{cyError}</p>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-xl border border-white/12">
      <div
        ref={hostRef}
        className="repeat-cyto-flow h-[min(26rem,52vh)] min-h-[220px] w-full"
        style={{
          background:
            "radial-gradient(ellipse 120% 90% at 50% 0%, rgba(58, 58, 66, 0.55), #101012 70%)",
        }}
      />
      {booting ? (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-xl bg-background/35 text-sm text-muted-foreground backdrop-blur-[1px]">
          Preparing diagram…
        </div>
      ) : null}
    </div>
  );
}

/**
 * Renders Mermaid-style flowchart fences with Cytoscape.js + Dagre (Flowchart Fun uses the same graph stack).
 */
export function RepeatDiagramBlock({ chart, citationJumpTargets }: Props) {
  const normalized = useMemo(() => normalizeFlowchartSource(chart), [chart]);
  const edges = useMemo(() => parseFlowEdges(normalized), [normalized]);

  if (edges.length === 0) {
    return (
      <div className="space-y-3 rounded-2xl border border-border/60 bg-background/40 p-4">
        <DiagramPreview sourceLabel="Step list (no links parsed)">
          <StructuredStudyGraph chart={normalized} />
        </DiagramPreview>
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-2xl border border-border/60 bg-background/40 p-4">
      <DiagramPreview sourceLabel="Flowchart — tap to expand" footnote={diagramIdFootnote}>
        <RepeatCytoscapeCanvas normalized={normalized} />
      </DiagramPreview>
      {citationJumpTargets?.length ? <CitationJumpStrip targets={citationJumpTargets} /> : null}
    </div>
  );
}

/** Kept for markdown code fence `mermaid` compatibility (content is rendered with Cytoscape, not Mermaid). */
export function MermaidBlock(props: Props) {
  return <RepeatDiagramBlock {...props} />;
}
