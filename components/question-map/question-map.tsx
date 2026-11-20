"use client";

import { useId, useMemo, useState } from "react";
import type { Difficulty, SubjectTags, TaggedQuestion } from "./types";

const DIFFS: Difficulty[] = ["Easy", "Medium", "Hard"];

// Semantic difficulty colours (LeetCode convention). Everything else uses the site's shadcn tokens.
const DIFF_STYLE: Record<Difficulty, { bar: string; pill: string; chipOn: string }> = {
  Easy: {
    bar: "bg-emerald-500",
    pill: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
    chipOn: "border-emerald-500 bg-emerald-500 text-white",
  },
  Medium: {
    bar: "bg-amber-500",
    pill: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
    chipOn: "border-amber-500 bg-amber-500 text-white",
  },
  Hard: {
    bar: "bg-rose-500",
    pill: "bg-rose-500/15 text-rose-700 dark:text-rose-400",
    chipOn: "border-rose-500 bg-rose-500 text-white",
  },
};

// Styling for optional text_html, using only the site's tokens.
const RICH = [
  "flex max-w-prose min-w-0 flex-col gap-2 break-words text-sm leading-relaxed",
  "[&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_strong]:font-semibold",
  "[&_table]:block [&_table]:w-max [&_table]:max-w-full [&_table]:overflow-x-auto [&_table]:border-collapse [&_table]:text-left",
  "[&_th]:border [&_th]:border-border [&_th]:bg-muted [&_th]:px-3 [&_th]:py-1 [&_th]:font-semibold [&_td]:border [&_td]:border-border [&_td]:px-3 [&_td]:py-1",
  "[&_math[display=block]]:max-w-full [&_math[display=block]]:overflow-x-auto",
].join(" ");

type Row = TaggedQuestion & { paperId: string; paperLabel: string; pdf: string };

type BarCount = Record<Difficulty, number> & { n: number };

function paperLabel(p: { exam_type: string | null; date: string | null }) {
  const d = p.date ? new Date(p.date + "T00:00:00").toLocaleDateString("en-IN", { month: "short", year: "numeric" }) : "";
  return [p.exam_type, d].filter(Boolean).join(" · ");
}

function countBy(rows: Row[], key: (r: Row) => string) {
  const m = new Map<string, BarCount>();
  for (const r of rows) {
    const k = key(r);
    const c = m.get(k) ?? { Easy: 0, Medium: 0, Hard: 0, n: 0 };
    if (r.difficulty) c[r.difficulty]++;
    c.n++;
    m.set(k, c);
  }
  return m;
}

// Subjects whose questions carry a `module` (e.g. CSS 2103) get a module map instead of the topic map:
// one bar per module, and clicking a bar shows only that module's questions. Everything else is the original map.
export function QuestionMap({ data, className = "" }: { data: SubjectTags; className?: string }) {
  const [topic, setTopic] = useState<string | null>(null);
  const [diff, setDiff] = useState<Difficulty | null>(null);
  const [paper, setPaper] = useState<string | null>(null);

  const rows: Row[] = useMemo(
    () =>
      data.papers.flatMap((p) =>
        p.questions.map((q) => ({ ...q, paperId: p.pdf_path, paperLabel: paperLabel(p), pdf: p.pdf_path })),
      ),
    [data],
  );
  const hasDiff = rows.some((r) => r.difficulty);
  const byModule = rows.some((r) => r.module != null);

  // Bars: topics sorted by count, or every module in module order (including modules with no questions).
  const bars = useMemo(() => {
    if (!byModule) return [...countBy(rows, (r) => r.topic).entries()].map(([k, c]) => ({ key: k, label: k, c })).sort((a, b) => b.c.n - a.c.n);
    const counts = countBy(rows, (r) => String(r.module ?? ""));
    const titles = new Map((data.modules ?? []).map((m) => [m.number, m.title]));
    const nums = [...new Set([...titles.keys(), ...rows.flatMap((r) => (r.module != null ? [r.module] : []))])].sort((a, b) => a - b);
    return nums.map((n) => ({
      key: String(n),
      label: `Module ${n}${titles.get(n) ? ` · ${titles.get(n)}` : ""}`,
      c: counts.get(String(n)) ?? { Easy: 0, Medium: 0, Hard: 0, n: 0 },
    }));
  }, [rows, byModule, data]);
  const max = Math.max(1, ...bars.map((b) => b.c.n));

  // `topic` holds the selected bar key: a topic name, or a module number as a string.
  const barOf = (r: Row) => (byModule ? String(r.module ?? "") : r.topic);
  const shown = rows.filter(
    (r) => (!topic || barOf(r) === topic) && (!diff || r.difficulty === diff) && (!paper || r.paperId === paper),
  );
  const groups = bars.map((b) => [b.label, shown.filter((r) => barOf(r) === b.key)] as const).filter(([, qs]) => qs.length);
  if (byModule) {
    const loose = shown.filter((r) => r.module == null);
    if (loose.length) groups.push(["No module", loose] as const);
  }

  const chip = "rounded-full border border-border px-3 py-1 text-sm transition-colors hover:bg-muted";
  const chipOff = "bg-card text-foreground";
  const chipOnNeutral = "border-primary bg-primary text-primary-foreground";

  return (
    <section className={`flex flex-col gap-6 ${className}`} aria-label={byModule ? "Questions by module" : "Questions by topic"}>
      <div className="rounded-xl border border-border bg-card p-4 sm:p-5">
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-base font-semibold">{byModule ? "How often each module is asked" : "How often each topic is asked"}</h2>
          {hasDiff && (
            <div className="flex gap-3 text-xs text-muted-foreground">
              {DIFFS.map((d) => (
                <span key={d} className="flex items-center gap-1.5">
                  <span className={`size-2.5 rounded-sm ${DIFF_STYLE[d].bar}`} />
                  {d}
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="flex flex-col gap-0.5">
          {bars.map(({ key, label, c }) => (
            <button
              key={key}
              type="button"
              onClick={() => setTopic(topic === key ? null : key)}
              aria-pressed={topic === key}
              className={`grid ${byModule ? "grid-cols-[minmax(6rem,11rem)_1fr_3rem] sm:grid-cols-[minmax(8rem,16rem)_1fr_3rem]" : "grid-cols-[minmax(6rem,11rem)_1fr_3rem]"} items-center gap-3 rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-muted ${
                topic === key ? "bg-muted shadow-[inset_3px_0_0_var(--color-primary)]" : ""
              }`}
            >
              <span className="truncate font-medium">{label}</span>
              <span className="flex h-3 overflow-hidden rounded-sm bg-muted" style={{ width: `${(c.n / max) * 100}%` }}>
                {hasDiff ? (
                  DIFFS.map((d) =>
                    c[d] ? <span key={d} className={DIFF_STYLE[d].bar} style={{ width: `${(c[d] / c.n) * 100}%` }} title={`${c[d]} ${d}`} /> : null,
                  )
                ) : (
                  <span className="w-full bg-primary" />
                )}
              </span>
              <span className="text-right font-mono text-xs tabular-nums text-muted-foreground">{c.n} q</span>
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {byModule && (
          <>
            <button type="button" aria-pressed={!topic} onClick={() => setTopic(null)} className={`${chip} ${!topic ? chipOnNeutral : chipOff}`}>
              All modules
            </button>
            <span className="mx-1 h-5 w-px bg-border" />
          </>
        )}
        {hasDiff && (
          <>
            {DIFFS.map((d) => (
              <button key={d} type="button" aria-pressed={diff === d} onClick={() => setDiff(diff === d ? null : d)}
                className={`${chip} ${diff === d ? DIFF_STYLE[d].chipOn : chipOff}`}>
                {d}
              </button>
            ))}
            <span className="mx-1 h-5 w-px bg-border" />
          </>
        )}
        {data.papers.map((p) => (
          <button key={p.pdf_path} type="button" aria-pressed={paper === p.pdf_path} onClick={() => setPaper(paper === p.pdf_path ? null : p.pdf_path)}
            className={`${chip} ${paper === p.pdf_path ? "border-primary bg-primary text-primary-foreground" : chipOff}`}>
            {paperLabel(p)}
          </button>
        ))}
        <span className="ml-auto font-mono text-xs text-muted-foreground">
          {shown.length} of {rows.length} questions
        </span>
      </div>

      {groups.length === 0 && (
        <p className="py-10 text-center text-sm text-muted-foreground">No questions match these filters. Clear one to see more.</p>
      )}

      {groups.map(([t, qs]) => (
        <div key={t} className="flex flex-col gap-2">
          <h3 className="text-sm font-semibold">
            {t} <span className="font-mono font-normal text-muted-foreground">{qs.length}</span>
          </h3>
          {qs.map((q) => (
            // With one module selected, cards open so the student can practise straight away.
            <QuestionCard key={q.pdf + q.qno} q={q} defaultOpen={byModule && topic != null} />
          ))}
        </div>
      ))}
    </section>
  );
}

function QuestionCard({ q, defaultOpen = false }: { q: Row; defaultOpen?: boolean }) {
  const card = (
    <details className={q.method ? "group" : "group rounded-lg border border-border bg-card"} open={defaultOpen || undefined}>
      <summary className="grid cursor-pointer list-none grid-cols-[auto_1fr_auto] items-start gap-3 p-3 sm:p-4 [&::-webkit-details-marker]:hidden">
        <span className="font-mono text-sm text-primary">
          Q{q.qno}
          <span className="block text-[11px] text-muted-foreground">{q.paperLabel}</span>
        </span>
        {q.method ? (
          // Cards with a Reveal test hint show no topic or subtopic here, because those give the test away.
          <span className="min-w-0">
            <span className="line-clamp-1 text-sm text-muted-foreground group-open:hidden">{firstLine(q.text)}</span>
          </span>
        ) : (
          <span className="min-w-0">
            <span className="text-sm font-medium">{q.subtopic || q.topic}</span>
            {q.module != null && q.subtopic && q.topic && (
              <span className="ml-2 inline-block rounded-full bg-muted px-2 py-0.5 align-middle text-[11px] text-muted-foreground">{q.topic}</span>
            )}
            <span className="mt-0.5 line-clamp-2 text-sm text-muted-foreground group-open:hidden">{q.text}</span>
          </span>
        )}
        <span className="flex flex-col items-end gap-1">
          {q.difficulty && <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${DIFF_STYLE[q.difficulty].pill}`}>{q.difficulty}</span>}
          {q.marks != null && <span className="font-mono text-xs text-muted-foreground">{q.marks} marks</span>}
        </span>
      </summary>
      <div className="flex flex-col gap-3 border-t border-dashed border-border px-3 pb-4 pt-3 sm:px-4">
        {q.text_html ? (
          // Pipeline-generated and sanitized at build time (tables, native MathML), so no extra CSS or packages.
          <div className={RICH} dangerouslySetInnerHTML={{ __html: q.text_html }} />
        ) : hasTable(q.text) ? (
          <TextWithTables text={q.text} />
        ) : (
          <p className="max-w-prose whitespace-pre-wrap break-words text-sm leading-relaxed">{q.text}</p>
        )}
        <div className="flex flex-wrap gap-x-4 gap-y-1 font-mono text-xs text-muted-foreground">
          {q.module != null && <span>Module {q.module}</span>}
          {q.co && <span>{q.co}</span>}
          {q.cognitive_level && <span>{q.cognitive_level}</span>}
          <a href={encodeURI(q.pdf)} target="_blank" rel="noopener noreferrer" className="underline-offset-2 hover:underline">
            Open paper ↗
          </a>
        </div>
        {q.reason && q.difficulty && (
          <p className="text-xs text-muted-foreground">
            Why {q.difficulty}: {q.reason}
          </p>
        )}
        {q.leetcode && q.leetcode.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {q.leetcode.map((l) => (
              <a key={l.id} href={`https://leetcode.com/problems/${l.slug}/`} target="_blank" rel="noopener noreferrer"
                className="rounded-md border border-primary/40 px-2.5 py-1 text-xs font-medium text-primary hover:bg-primary/10">
                {l.id}. {l.title} ↗
              </a>
            ))}
          </div>
        )}
      </div>
    </details>
  );
  if (!q.method) return card;
  // Reveal test sits outside <details>, so it is on every card whether or not the card is open.
  return (
    <div className="rounded-lg border border-border bg-card">
      {card}
      <div className="border-t border-dashed border-border px-3 py-2.5 sm:px-4">
        <TestReveal method={q.method} approach={q.approach} topic={[q.topic, q.subtopic].filter(Boolean).join(" · ")} />
      </div>
    </div>
  );
}

/** First non-empty line of the question, skipping table rows, for the collapsed one-line preview. */
function firstLine(text: string) {
  return text.split("\n").find((l) => l.trim() && !TABLE_ROW.test(l))?.trim() ?? text;
}

/** Hint: which test or technique to use, with the approach in short. Not rendered until revealed. */
function TestReveal({ method, approach, topic }: { method: string; approach?: string; topic?: string }) {
  const [shown, setShown] = useState(false);
  const id = useId();
  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={() => setShown(!shown)}
        aria-expanded={shown}
        aria-controls={id}
        className="w-fit rounded-md border border-primary/40 px-2.5 py-1 text-xs font-medium text-primary outline-none hover:bg-primary/10 focus-visible:ring-2 focus-visible:ring-primary"
      >
        {shown ? "Hide test" : "Reveal test"}
      </button>
      <div id={id} hidden={!shown}>
        {shown && (
          <div className="max-w-prose rounded-md border border-dashed border-primary/40 bg-primary/5 px-3 py-2 text-sm">
            {topic && <p className="mb-1 text-xs text-muted-foreground">{topic}</p>}
            <p className="font-semibold">{method}</p>
            {approach && <p className="mt-1 whitespace-pre-wrap break-words text-xs leading-relaxed text-muted-foreground">{approach}</p>}
          </div>
        )}
      </div>
    </div>
  );
}

// Question text may contain markdown pipe tables (e.g. transaction logs). Render those as real tables; everything
// else stays plain text. Plain React text nodes only, no HTML injection.
const TABLE_ROW = /^\s*\|.*\|\s*$/;
const hasTable = (text: string) => text.split("\n").some((l) => TABLE_ROW.test(l));
const cells = (line: string) => line.trim().replace(/^\||\|$/g, "").split("|").map((c) => c.trim());

function TextWithTables({ text }: { text: string }) {
  const blocks: { table: boolean; lines: string[] }[] = [];
  for (const line of text.split("\n")) {
    const table = TABLE_ROW.test(line);
    const last = blocks[blocks.length - 1];
    if (last && last.table === table) last.lines.push(line);
    else blocks.push({ table, lines: [line] });
  }
  return (
    <div className="flex max-w-prose min-w-0 flex-col gap-3 text-sm leading-relaxed">
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
        return (
          <div key={i} className="max-w-full overflow-x-auto">
            <table className="border-collapse text-left text-sm">
              <thead>
                <tr>
                  {head.map((c, j) => (
                    <th key={j} className="border border-border bg-muted px-3 py-1 font-semibold">{c}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {body.map((r, k) => (
                  <tr key={k}>
                    {r.map((c, j) => (
                      <td key={j} className="border border-border px-3 py-1">{c}</td>
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
