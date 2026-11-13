"use client";

import { useMemo, useState } from "react";
import { ChevronRight, ExternalLink } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { Difficulty, SubjectTags, TaggedQuestion } from "./types";

const DIFFS: Difficulty[] = ["Easy", "Medium", "Hard"];

const DIFF_STYLE: Record<
  Difficulty,
  { bar: string; pill: string; chipOn: string; soft: string }
> = {
  Easy: {
    bar: "bg-emerald-500",
    pill: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
    chipOn: "border-emerald-500/60 bg-emerald-500 text-white",
    soft: "bg-emerald-500/20",
  },
  Medium: {
    bar: "bg-amber-500",
    pill: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
    chipOn: "border-amber-500/60 bg-amber-500 text-white",
    soft: "bg-amber-500/20",
  },
  Hard: {
    bar: "bg-rose-500",
    pill: "bg-rose-500/15 text-rose-700 dark:text-rose-400",
    chipOn: "border-rose-500/60 bg-rose-500 text-white",
    soft: "bg-rose-500/20",
  },
};

type Row = TaggedQuestion & { paperId: string; paperLabel: string; pdf: string };
type TopicCount = Record<Difficulty, number> & { n: number };

function paperLabel(p: { exam_type: string | null; date: string | null }) {
  const d = p.date
    ? new Date(p.date + "T00:00:00").toLocaleDateString("en-IN", {
        month: "short",
        year: "numeric",
      })
    : "";
  return [p.exam_type, d].filter(Boolean).join(" · ");
}

function TopicBar({
  topic,
  counts,
  max,
  index,
  onOpen,
}: {
  topic: string;
  counts: TopicCount;
  max: number;
  index: number;
  onOpen: () => void;
}) {
  const width = Math.max(12, (counts.n / max) * 100);
  return (
    <button
      type="button"
      onClick={onOpen}
      className="group grid w-full grid-cols-[minmax(5.5rem,9.5rem)_1fr_auto] items-center gap-3 rounded-xl px-2.5 py-2 text-left transition-[background-color,transform] duration-150 [transition-timing-function:var(--ease-out)] active:scale-[0.985] [@media(hover:hover)_and_(pointer:fine)]:hover:bg-muted/70 motion-reduce:transition-none motion-reduce:active:scale-100"
      style={{
        animation: `fade-up 280ms var(--ease-out) both`,
        animationDelay: `${Math.min(index, 10) * 40}ms`,
      }}
    >
      <span className="truncate text-[13px] font-medium tracking-tight">{topic}</span>
      <span
        className="relative flex h-2.5 overflow-hidden rounded-full bg-muted/80"
        style={{ width: `${width}%` }}
        aria-hidden
      >
        {DIFFS.map((d) =>
          counts[d] ? (
            <span
              key={d}
              className={`${DIFF_STYLE[d].bar} h-full transition-[width] duration-300 [transition-timing-function:var(--ease-out)]`}
              style={{ width: `${(counts[d] / counts.n) * 100}%` }}
              title={`${counts[d]} ${d}`}
            />
          ) : null,
        )}
      </span>
      <span className="flex items-center gap-1 font-mono text-[11px] tabular-nums text-muted-foreground">
        {counts.n}
        <ChevronRight className="size-3.5 opacity-35 transition-[opacity,transform] duration-150 [transition-timing-function:var(--ease-out)] group-hover:translate-x-0.5 group-hover:opacity-80" />
      </span>
    </button>
  );
}

function QuestionCard({ q, index }: { q: Row; index: number }) {
  const [open, setOpen] = useState(false);
  return (
    <div
      className="overflow-hidden rounded-2xl border border-border/60 bg-card/80"
      style={{
        animation: `fade-up 260ms var(--ease-out) both`,
        animationDelay: `${Math.min(index, 8) * 35}ms`,
      }}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="grid w-full grid-cols-[auto_1fr_auto] items-start gap-3 px-3.5 py-3.5 text-left transition-[background-color,transform] duration-150 [transition-timing-function:var(--ease-out)] active:scale-[0.99] [@media(hover:hover)_and_(pointer:fine)]:hover:bg-muted/40 motion-reduce:active:scale-100"
      >
        <span className="font-mono text-[12px] font-medium text-primary">
          Q{q.qno}
          <span className="mt-0.5 block text-[10px] font-normal text-muted-foreground">
            {q.paperLabel}
          </span>
        </span>
        <span className="min-w-0">
          <span className="block text-[13px] font-medium leading-5">
            {q.subtopic || q.topic}
          </span>
          {!open ? (
            <span className="mt-1 line-clamp-2 text-[12.5px] leading-5 text-muted-foreground">
              {q.text}
            </span>
          ) : null}
        </span>
        <span className="flex flex-col items-end gap-1.5">
          <span
            className={`rounded-full px-2 py-0.5 text-[10.5px] font-semibold ${DIFF_STYLE[q.difficulty].pill}`}
          >
            {q.difficulty}
          </span>
          {q.marks != null ? (
            <span className="font-mono text-[10.5px] text-muted-foreground">
              {q.marks} marks
            </span>
          ) : null}
        </span>
      </button>

      <div
        className={`grid transition-[grid-template-rows,opacity] duration-200 [transition-timing-function:var(--ease-out)] motion-reduce:transition-none ${
          open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        }`}
      >
        <div className="min-h-0 overflow-hidden">
          <div className="flex flex-col gap-3 border-t border-border/50 px-3.5 pb-4 pt-3">
            <p className="whitespace-pre-wrap break-words text-[13px] leading-6 text-foreground/90">
              {q.text}
            </p>
            <div className="flex flex-wrap gap-x-3 gap-y-1 font-mono text-[11px] text-muted-foreground">
              {q.co ? <span>{q.co}</span> : null}
              {q.cognitive_level ? <span>{q.cognitive_level}</span> : null}
              <a
                href={encodeURI(q.pdf)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-primary transition-opacity duration-150 hover:opacity-80"
              >
                Open paper <ExternalLink className="size-3" />
              </a>
            </div>
            {q.reason ? (
              <p className="rounded-xl bg-muted/50 px-3 py-2 text-[12px] leading-5 text-muted-foreground">
                <span className="font-medium text-foreground/80">Why {q.difficulty}: </span>
                {q.reason}
              </p>
            ) : null}
            {q.leetcode.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {q.leetcode.map((l) => (
                  <a
                    key={l.id}
                    href={`https://leetcode.com/problems/${l.slug}/`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 rounded-lg border border-primary/30 bg-primary/5 px-2.5 py-1 text-[11.5px] font-medium text-primary transition-[background-color,transform] duration-150 [transition-timing-function:var(--ease-out)] active:scale-[0.97] [@media(hover:hover)_and_(pointer:fine)]:hover:bg-primary/10"
                  >
                    {l.id}. {l.title}
                    <ExternalLink className="size-3 opacity-70" />
                  </a>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

export function QuestionMap({
  data,
  className = "",
}: {
  data: SubjectTags;
  className?: string;
}) {
  const [activeTopic, setActiveTopic] = useState<string | null>(null);
  const [diff, setDiff] = useState<Difficulty | null>(null);

  const rows: Row[] = useMemo(
    () =>
      data.papers.flatMap((p) =>
        p.questions.map((q) => ({
          ...q,
          paperId: p.pdf_path,
          paperLabel: paperLabel(p),
          pdf: p.pdf_path,
        })),
      ),
    [data],
  );

  const topics = useMemo(() => {
    const m = new Map<string, TopicCount>();
    for (const r of rows) {
      const c = m.get(r.topic) ?? { Easy: 0, Medium: 0, Hard: 0, n: 0 };
      c[r.difficulty]++;
      c.n++;
      m.set(r.topic, c);
    }
    return [...m.entries()].sort((a, b) => b[1].n - a[1].n);
  }, [rows]);
  const max = topics[0]?.[1].n ?? 1;

  const sheetQuestions = useMemo(() => {
    if (!activeTopic) return [];
    return rows.filter(
      (r) => r.topic === activeTopic && (!diff || r.difficulty === diff),
    );
  }, [rows, activeTopic, diff]);

  const activeCounts = activeTopic
    ? topics.find(([t]) => t === activeTopic)?.[1]
    : undefined;

  return (
    <section className={`flex flex-col gap-3 ${className}`} aria-label="Questions by topic">
      <div className="overflow-hidden rounded-[1.35rem] border border-border/60 bg-card/70 shadow-sm backdrop-blur-sm">
        <div className="flex flex-wrap items-end justify-between gap-3 border-b border-border/50 px-4 py-3.5 sm:px-5">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground/70">
              Topic map
            </p>
            <h2 className="mt-0.5 text-[15px] font-semibold tracking-tight">
              How often each topic is asked
            </h2>
            <p className="mt-1 text-[12px] text-muted-foreground">
              Tap a bar to open every question for that topic.
            </p>
          </div>
          <div className="flex gap-3 text-[11px] text-muted-foreground">
            {DIFFS.map((d) => (
              <span key={d} className="flex items-center gap-1.5">
                <span className={`size-2 rounded-sm ${DIFF_STYLE[d].bar}`} />
                {d}
              </span>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-0.5 px-2 py-2 sm:px-3">
          {topics.map(([t, c], i) => (
            <TopicBar
              key={t}
              topic={t}
              counts={c}
              max={max}
              index={i}
              onOpen={() => {
                setDiff(null);
                setActiveTopic(t);
              }}
            />
          ))}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/50 px-4 py-2.5 sm:px-5">
          <p className="font-mono text-[11px] tabular-nums text-muted-foreground">
            {rows.length} questions · {data.papers.length} papers
          </p>
          <a
            href="https://github.com/Shanmuud"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-[11px] text-muted-foreground/80 transition-[color,opacity] duration-150 [transition-timing-function:var(--ease-out)] hover:text-foreground"
          >
            Tagged by Shanmuud
            <ExternalLink className="size-3 opacity-60" />
          </a>
        </div>
      </div>

      <Sheet
        open={activeTopic != null}
        onOpenChange={(open) => {
          if (!open) {
            setActiveTopic(null);
            setDiff(null);
          }
        }}
      >
        <SheetContent
          side="right"
          className="w-full gap-0 border-border/60 p-0 sm:max-w-md data-[state=open]:duration-300 data-[state=closed]:duration-200 [transition-timing-function:var(--ease-drawer)]"
        >
          <SheetHeader className="border-b border-border/50 px-5 py-4 pr-12 text-left">
            <SheetTitle className="text-[17px] tracking-tight">{activeTopic}</SheetTitle>
            <SheetDescription className="text-[12.5px]">
              {activeCounts
                ? `${activeCounts.n} question${activeCounts.n === 1 ? "" : "s"} across ${data.papers.length} papers`
                : "Questions for this topic"}
            </SheetDescription>
            {activeCounts ? (
              <div className="mt-3 flex h-2 overflow-hidden rounded-full bg-muted">
                {DIFFS.map((d) =>
                  activeCounts[d] ? (
                    <span
                      key={d}
                      className={DIFF_STYLE[d].bar}
                      style={{
                        width: `${(activeCounts[d] / activeCounts.n) * 100}%`,
                      }}
                    />
                  ) : null,
                )}
              </div>
            ) : null}
            <div className="mt-3 flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => setDiff(null)}
                className={`rounded-full border px-2.5 py-1 text-[11.5px] font-medium transition-[background-color,border-color,transform,color] duration-150 [transition-timing-function:var(--ease-out)] active:scale-[0.97] ${
                  diff == null
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border/60 bg-card text-muted-foreground"
                }`}
              >
                All
              </button>
              {DIFFS.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDiff(diff === d ? null : d)}
                  className={`rounded-full border px-2.5 py-1 text-[11.5px] font-medium transition-[background-color,border-color,transform,color] duration-150 [transition-timing-function:var(--ease-out)] active:scale-[0.97] ${
                    diff === d
                      ? DIFF_STYLE[d].chipOn
                      : "border-border/60 bg-card text-muted-foreground"
                  }`}
                >
                  {d}
                  {activeCounts ? (
                    <span className="ml-1 font-mono opacity-70">{activeCounts[d]}</span>
                  ) : null}
                </button>
              ))}
            </div>
          </SheetHeader>

          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
            {sheetQuestions.length === 0 ? (
              <p className="py-12 text-center text-[13px] text-muted-foreground">
                No questions match this filter.
              </p>
            ) : (
              <div className="flex flex-col gap-2.5">
                {sheetQuestions.map((q, i) => (
                  <QuestionCard key={`${q.pdf}-${q.qno}`} q={q} index={i} />
                ))}
              </div>
            )}
          </div>

          <div className="border-t border-border/50 px-5 py-3">
            <a
              href="https://github.com/Shanmuud/prshrit"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between gap-2 text-[11px] text-muted-foreground transition-colors duration-150 hover:text-foreground"
            >
              <span>
                Topic tags &amp; difficulty by{" "}
                <span className="font-medium text-foreground/80">Shanmuud</span>
              </span>
              <ExternalLink className="size-3.5 shrink-0 opacity-50" />
            </a>
          </div>
        </SheetContent>
      </Sheet>
    </section>
  );
}
