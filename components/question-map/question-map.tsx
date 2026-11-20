"use client";

import { useId, useMemo, useState } from "react";
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

// Categorical module colours (subjects tagged by module, e.g. CSS 2103). Literal class names so
// Tailwind keeps them.
const MODULE_STYLES = [
  { bar: "bg-sky-500", chipOn: "border-sky-500/60 bg-sky-500 text-white" },
  { bar: "bg-violet-500", chipOn: "border-violet-500/60 bg-violet-500 text-white" },
  { bar: "bg-teal-500", chipOn: "border-teal-500/60 bg-teal-500 text-white" },
  { bar: "bg-amber-500", chipOn: "border-amber-500/60 bg-amber-500 text-white" },
  { bar: "bg-pink-500", chipOn: "border-pink-500/60 bg-pink-500 text-white" },
];
const moduleStyle = (n: number) =>
  MODULE_STYLES[(((n - 1) % MODULE_STYLES.length) + MODULE_STYLES.length) % MODULE_STYLES.length];

// Styling for optional text_html (pipeline-generated, sanitized), using only the site's tokens.
const RICH = [
  "flex min-w-0 flex-col gap-2 break-words text-[13px] leading-6 text-foreground/90",
  "[&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_strong]:font-semibold",
  "[&_table]:block [&_table]:w-max [&_table]:max-w-full [&_table]:overflow-x-auto [&_table]:border-collapse [&_table]:text-left",
  "[&_th]:border [&_th]:border-border [&_th]:bg-muted [&_th]:px-2.5 [&_th]:py-1 [&_th]:font-semibold [&_td]:border [&_td]:border-border [&_td]:px-2.5 [&_td]:py-1",
  "[&_math[display=block]]:max-w-full [&_math[display=block]]:overflow-x-auto",
].join(" ");

type Row = TaggedQuestion & { paperId: string; paperLabel: string; pdf: string };
type TopicCount = Record<Difficulty, number> & { n: number };
type Bar = { key: string; label: string; counts: TopicCount; module?: number };

const emptyCount = (): TopicCount => ({ Easy: 0, Medium: 0, Hard: 0, n: 0 });

function countBy(rows: Row[], key: (r: Row) => string) {
  const m = new Map<string, TopicCount>();
  for (const r of rows) {
    const k = key(r);
    const c = m.get(k) ?? emptyCount();
    if (r.difficulty) c[r.difficulty]++;
    c.n++;
    m.set(k, c);
  }
  return m;
}

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
  hasDiff,
  wide,
  color,
  onOpen,
}: {
  topic: string;
  counts: TopicCount;
  max: number;
  index: number;
  hasDiff: boolean;
  wide: boolean;
  color?: string;
  onOpen: () => void;
}) {
  const width = counts.n ? Math.max(12, (counts.n / max) * 100) : 0;
  return (
    <button
      type="button"
      onClick={onOpen}
      disabled={counts.n === 0}
      className={`group grid w-full ${
        wide
          ? "grid-cols-[minmax(7rem,11rem)_1fr_auto] sm:grid-cols-[minmax(9rem,15rem)_1fr_auto]"
          : "grid-cols-[minmax(5.5rem,9.5rem)_1fr_auto]"
      } items-center gap-3 rounded-xl px-2.5 py-2 text-left transition-[background-color,transform] duration-150 [transition-timing-function:var(--ease-out)] active:scale-[0.985] disabled:opacity-50 disabled:active:scale-100 [@media(hover:hover)_and_(pointer:fine)]:enabled:hover:bg-muted/70 motion-reduce:transition-none motion-reduce:active:scale-100`}
      style={{
        animation: `fade-up 280ms var(--ease-out) both`,
        animationDelay: `${Math.min(index, 10) * 40}ms`,
      }}
    >
      <span className="truncate text-[13px] font-medium tracking-tight" title={topic}>
        {topic}
      </span>
      <span
        className="relative flex h-2.5 overflow-hidden rounded-full bg-muted/80"
        style={{ width: `${width}%` }}
        aria-hidden
      >
        {hasDiff ? (
          DIFFS.map((d) =>
            counts[d] ? (
              <span
                key={d}
                className={`${DIFF_STYLE[d].bar} h-full transition-[width] duration-300 [transition-timing-function:var(--ease-out)]`}
                style={{ width: `${(counts[d] / counts.n) * 100}%` }}
                title={`${counts[d]} ${d}`}
              />
            ) : null,
          )
        ) : (
          <span className={`h-full w-full ${color ?? "bg-primary"}`} />
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
              {previewText(q.text)}
            </span>
          ) : null}
        </span>
        <span className="flex flex-col items-end gap-1.5">
          {q.difficulty ? (
            <span
              className={`rounded-full px-2 py-0.5 text-[10.5px] font-semibold ${DIFF_STYLE[q.difficulty].pill}`}
            >
              {q.difficulty}
            </span>
          ) : null}
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
            {q.text_html ? (
              // Pipeline-generated and sanitized at build time (tables, native MathML).
              <div className={RICH} dangerouslySetInnerHTML={{ __html: q.text_html }} />
            ) : hasTable(q.text) ? (
              <TextWithTables text={q.text} />
            ) : (
              <p className="whitespace-pre-wrap break-words text-[13px] leading-6 text-foreground/90">
                {q.text}
              </p>
            )}
            <div className="flex flex-wrap gap-x-3 gap-y-1 font-mono text-[11px] text-muted-foreground">
              {q.module != null ? <span>Module {q.module}</span> : null}
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
            {q.reason && q.difficulty ? (
              <p className="rounded-xl bg-muted/50 px-3 py-2 text-[12px] leading-5 text-muted-foreground">
                <span className="font-medium text-foreground/80">Why {q.difficulty}: </span>
                {q.reason}
              </p>
            ) : null}
            {q.leetcode && q.leetcode.length > 0 ? (
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
      {q.method ? (
        // Outside the collapsible part, so the hint is on every card whether or not it is open.
        <div className="border-t border-dashed border-border/60 px-3.5 py-2.5">
          <TestReveal method={q.method} approach={q.approach} />
        </div>
      ) : null}
    </div>
  );
}

/** Hint: which test or technique to use, with the approach in short. Not rendered until revealed. */
function TestReveal({ method, approach }: { method: string; approach?: string }) {
  const [shown, setShown] = useState(false);
  const id = useId();
  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={() => setShown((v) => !v)}
        aria-expanded={shown}
        aria-controls={id}
        className="w-fit rounded-lg border border-primary/30 bg-primary/5 px-2.5 py-1 text-[11.5px] font-medium text-primary outline-none transition-[background-color,transform] duration-150 [transition-timing-function:var(--ease-out)] focus-visible:ring-2 focus-visible:ring-primary active:scale-[0.97] [@media(hover:hover)_and_(pointer:fine)]:hover:bg-primary/10 motion-reduce:active:scale-100"
      >
        {shown ? "Hide test" : "Reveal test"}
      </button>
      <div id={id} hidden={!shown}>
        {shown ? (
          <div className="rounded-xl border border-dashed border-primary/30 bg-primary/5 px-3 py-2">
            <p className="text-[13px] font-semibold">{method}</p>
            {approach ? (
              <p className="mt-1 whitespace-pre-wrap break-words text-[12px] leading-5 text-muted-foreground">
                {approach}
              </p>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}

// Question text may contain markdown pipe tables (e.g. transaction logs). Render those as real
// tables; everything else stays plain text. Plain React text nodes only, no HTML injection.
const TABLE_ROW = /^\s*\|.*\|\s*$/;
const hasTable = (text: string) => text.split("\n").some((l) => TABLE_ROW.test(l));
// One-line preview: drop table rows so the collapsed card doesn't show raw pipes.
const previewText = (text: string) =>
  hasTable(text)
    ? text
        .split("\n")
        .filter((l) => !TABLE_ROW.test(l))
        .join(" ")
        .replace(/\s+/g, " ")
        .trim()
    : text;
const cells = (line: string) =>
  line
    .trim()
    .replace(/^\||\|$/g, "")
    .split("|")
    .map((c) => c.trim());

function TextWithTables({ text }: { text: string }) {
  const blocks: { table: boolean; lines: string[] }[] = [];
  for (const line of text.split("\n")) {
    const table = TABLE_ROW.test(line);
    const last = blocks[blocks.length - 1];
    if (last && last.table === table) last.lines.push(line);
    else blocks.push({ table, lines: [line] });
  }
  return (
    <div className="flex min-w-0 flex-col gap-3 text-[13px] leading-6 text-foreground/90">
      {blocks.map((b, i) => {
        if (!b.table) {
          const t = b.lines.join("\n").trim();
          return t ? (
            <p key={i} className="whitespace-pre-wrap break-words">
              {t}
            </p>
          ) : null;
        }
        const rows = b.lines.map(cells).filter((r) => !r.every((c) => /^:?-{2,}:?$/.test(c)));
        const [head, ...body] = rows;
        if (!head) return null;
        return (
          <div key={i} className="max-w-full overflow-x-auto">
            <table className="border-collapse text-left text-[12.5px]">
              <thead>
                <tr>
                  {head.map((c, j) => (
                    <th key={j} className="border border-border bg-muted px-2.5 py-1 font-semibold">
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {body.map((r, k) => (
                  <tr key={k}>
                    {r.map((c, j) => (
                      <td key={j} className="border border-border px-2.5 py-1">
                        {c}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      })}
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
  const [marks, setMarks] = useState<number | null>(null);
  const [moduleFilter, setModuleFilter] = useState<number | null>(null);

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

  const hasDiff = rows.some((r) => r.difficulty);
  // Subjects whose questions carry a `module` (e.g. CSS 2103) keep the topic map, but each bar
  // is coloured by its module and the module chips narrow the list.
  const byModule = rows.some((r) => r.module != null);

  const modules = useMemo(() => {
    if (!byModule) return [];
    const titles = new Map((data.modules ?? []).map((m) => [m.number, m.title]));
    const counts = new Map<number, number>();
    for (const r of rows) if (r.module != null) counts.set(r.module, (counts.get(r.module) ?? 0) + 1);
    return [...counts.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([number, n]) => ({ number, n, title: titles.get(number) ?? "" }));
  }, [rows, byModule, data]);
  const moduleLabel = (n: number) => {
    const t = modules.find((m) => m.number === n)?.title;
    return `Module ${n}${t ? ` · ${t}` : ""}`;
  };

  const allBars: Bar[] = useMemo(() => {
    const counts = countBy(rows, (r) => r.topic);
    const moduleOf = new Map<string, number | undefined>();
    for (const r of rows) if (!moduleOf.has(r.topic)) moduleOf.set(r.topic, r.module);
    return [...counts.entries()]
      .map(([key, c]) => ({ key, label: key, counts: c, module: moduleOf.get(key) }))
      .sort(
        (a, b) =>
          b.counts.n - a.counts.n ||
          (a.module ?? 0) - (b.module ?? 0) ||
          a.label.localeCompare(b.label),
      );
  }, [rows]);
  const bars = moduleFilter == null ? allBars : allBars.filter((b) => b.module === moduleFilter);
  const max = Math.max(1, ...allBars.map((b) => b.counts.n));

  const topicQuestions = useMemo(
    () => (activeTopic ? rows.filter((r) => r.topic === activeTopic) : []),
    [rows, activeTopic],
  );
  const sheetQuestions = topicQuestions.filter(
    (r) => (!diff || r.difficulty === diff) && (marks == null || r.marks === marks),
  );
  const marksOptions = [
    ...new Set(topicQuestions.flatMap((r) => (r.marks != null ? [r.marks] : []))),
  ].sort((a, b) => a - b);

  const activeBar = activeTopic ? allBars.find((b) => b.key === activeTopic) : undefined;
  const activeCounts = activeBar?.counts;

  const chipBase =
    "rounded-full border px-2.5 py-1 text-[11.5px] font-medium transition-[background-color,border-color,transform,color] duration-150 [transition-timing-function:var(--ease-out)] active:scale-[0.97] motion-reduce:active:scale-100";
  const chipOff = "border-border/60 bg-card text-muted-foreground [@media(hover:hover)_and_(pointer:fine)]:hover:text-foreground";
  const chipOnNeutral = "border-primary bg-primary text-primary-foreground";

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
              {byModule
                ? "Colour shows the module. Tap a bar to practise that topic's questions."
                : "Tap a bar to open every question for that topic."}
            </p>
          </div>
          {hasDiff ? (
            <div className="flex gap-3 text-[11px] text-muted-foreground">
              {DIFFS.map((d) => (
                <span key={d} className="flex items-center gap-1.5">
                  <span className={`size-2 rounded-sm ${DIFF_STYLE[d].bar}`} />
                  {d}
                </span>
              ))}
            </div>
          ) : null}
        </div>

        {byModule ? (
          <div
            className="flex flex-wrap gap-1.5 border-b border-border/50 px-4 py-2.5 sm:px-5"
            role="group"
            aria-label="Filter by module"
          >
            <button
              type="button"
              aria-pressed={moduleFilter == null}
              onClick={() => setModuleFilter(null)}
              className={`${chipBase} ${moduleFilter == null ? chipOnNeutral : chipOff}`}
            >
              All modules
              <span className="ml-1 font-mono opacity-70">{rows.length}</span>
            </button>
            {modules.map((m) => {
              const on = moduleFilter === m.number;
              const style = moduleStyle(m.number);
              return (
                <button
                  key={m.number}
                  type="button"
                  aria-pressed={on}
                  title={moduleLabel(m.number)}
                  onClick={() => setModuleFilter(on ? null : m.number)}
                  className={`${chipBase} inline-flex max-w-full items-center gap-1.5 ${on ? style.chipOn : chipOff}`}
                >
                  <span className={`size-2 shrink-0 rounded-sm ${on ? "bg-white/90" : style.bar}`} />
                  <span className="truncate">
                    M{m.number}
                    <span className="hidden sm:inline">{m.title ? ` · ${m.title}` : ""}</span>
                  </span>
                  <span className="font-mono opacity-70">{m.n}</span>
                </button>
              );
            })}
          </div>
        ) : null}

        <div className="flex flex-col gap-0.5 px-2 py-2 sm:px-3">
          {bars.map((b, i) => (
            <TopicBar
              key={`${moduleFilter ?? "all"}-${b.key}`}
              topic={b.label}
              counts={b.counts}
              max={max}
              index={i}
              hasDiff={hasDiff}
              wide={byModule}
              color={b.module != null ? moduleStyle(b.module).bar : undefined}
              onOpen={() => {
                setDiff(null);
                setMarks(null);
                setActiveTopic(b.key);
              }}
            />
          ))}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/50 px-4 py-2.5 sm:px-5">
          <p className="font-mono text-[11px] tabular-nums text-muted-foreground">
            {rows.length} questions · {data.papers.length} papers
            {byModule ? ` · ${allBars.length} topics` : ""}
          </p>
          <a
            href="https://rishi.boo"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-[11px] text-muted-foreground/80 transition-[color,opacity] duration-150 [transition-timing-function:var(--ease-out)] hover:text-foreground"
          >
            made by rishi
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
            setMarks(null);
          }
        }}
      >
        <SheetContent className="w-full gap-0 border-border/60 p-0 sm:max-w-md">
          <SheetHeader className="border-b border-border/50 px-5 py-4 pr-12 text-left">
            {activeBar?.module != null ? (
              <p className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground/80">
                <span className={`size-2 shrink-0 rounded-sm ${moduleStyle(activeBar.module).bar}`} />
                {moduleLabel(activeBar.module)}
              </p>
            ) : null}
            <SheetTitle className="text-[17px] tracking-tight">{activeTopic}</SheetTitle>
            <SheetDescription className="text-[12.5px]">
              {activeCounts
                ? `${activeCounts.n} question${activeCounts.n === 1 ? "" : "s"} across ${data.papers.length} papers`
                : "Questions for this topic"}
            </SheetDescription>
            {activeCounts && hasDiff ? (
              <div className="mt-3 flex h-2 overflow-hidden rounded-full bg-muted">
                {DIFFS.map((d) =>
                  activeCounts[d] ? (
                    <span
                      key={d}
                      className={DIFF_STYLE[d].bar}
                      style={{ width: `${(activeCounts[d] / activeCounts.n) * 100}%` }}
                    />
                  ) : null,
                )}
              </div>
            ) : null}
            {hasDiff ? (
              <div className="mt-3 flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => setDiff(null)}
                  className={`${chipBase} ${diff == null ? chipOnNeutral : "border-border/60 bg-card text-muted-foreground"}`}
                >
                  All
                </button>
                {DIFFS.map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDiff(diff === d ? null : d)}
                    className={`${chipBase} ${diff === d ? DIFF_STYLE[d].chipOn : "border-border/60 bg-card text-muted-foreground"}`}
                  >
                    {d}
                    {activeCounts ? (
                      <span className="ml-1 font-mono opacity-70">{activeCounts[d]}</span>
                    ) : null}
                  </button>
                ))}
              </div>
            ) : marksOptions.length > 1 ? (
              <div className="mt-3 flex flex-wrap gap-1.5">
                <button
                  type="button"
                  aria-pressed={marks == null}
                  onClick={() => setMarks(null)}
                  className={`${chipBase} ${marks == null ? chipOnNeutral : chipOff}`}
                >
                  All
                </button>
                {marksOptions.map((m) => (
                  <button
                    key={m}
                    type="button"
                    aria-pressed={marks === m}
                    onClick={() => setMarks(marks === m ? null : m)}
                    className={`${chipBase} ${marks === m ? chipOnNeutral : chipOff}`}
                  >
                    {m} marks
                    <span className="ml-1 font-mono opacity-70">
                      {topicQuestions.filter((r) => r.marks === m).length}
                    </span>
                  </button>
                ))}
              </div>
            ) : null}
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
              href="https://rishi.boo"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between gap-2 text-[11px] text-muted-foreground transition-colors duration-150 hover:text-foreground"
            >
              <span>
                made by <span className="font-medium text-foreground/80">rishi</span>
              </span>
              <ExternalLink className="size-3.5 shrink-0 opacity-50" />
            </a>
          </div>
        </SheetContent>
      </Sheet>
    </section>
  );
}
