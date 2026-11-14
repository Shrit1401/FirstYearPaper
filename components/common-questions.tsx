"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Dialog, DialogBackdrop, DialogClose, DialogContent, DialogTitle, DialogTrigger } from "@ui-sdk/react/dialog";
import {
  ArrowLeft,
  ArrowUpRight,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Layers,
  X,
} from "lucide-react";
import { MathMarkdown } from "@/components/repeat/math-markdown";
import { resolvePublicPaperHref } from "@/lib/paper-url";
import { commonQuestionSummaries as summaries } from "@/lib/common-questions";

// ── Data ────────────────────────────────────────────────────────────────────

type Region = [page: number, x0: number, y0: number, x1: number, y1: number];
type Paper = { id: string; label: string; code: string; date: string | null; exam: string; href: string };
type Question = {
  id: string;
  paper: string;
  qno: string;
  marks: number | null;
  topic: string;
  skill: string;
  md: string;
  figure: boolean;
  regions: Region[];
};
type Topic = { name: string; papers: number; questions: number };
type Data = { key: string; title: string; papers: Paper[]; questions: Question[]; topics: Topic[] };

const cache = new Map<string, Promise<Data>>();

function load(key: string) {
  let pending = cache.get(key);
  if (!pending) {
    pending = fetch(`/common-questions/${key}.json`).then((r) => {
      if (!r.ok) throw new Error(`Could not load ${key}`);
      return r.json() as Promise<Data>;
    });
    pending.catch(() => cache.delete(key));
    cache.set(key, pending);
  }
  return pending;
}

const focusSpec = (q: Question) => q.regions.map(([p, ...r]) => `${p}:${r.join(",")}`).join(";");

// ── Entry card ──────────────────────────────────────────────────────────────

export function CommonQuestions({ dataKey, title }: { dataKey: string; title: string }) {
  const summary = summaries[dataKey];
  const [open, setOpen] = useState(false);
  if (!summary) return null;
  const years = summary.years.length > 1
    ? `${summary.years.at(-1)}–${summary.years[0]}`
    : summary.years[0];

  return (
    <Dialog open={open} onOpenChange={(next) => setOpen(next)}>
      <DialogTrigger
        onPointerEnter={() => void load(dataKey)}
        onFocus={() => void load(dataKey)}
        className="group flex w-full items-center gap-3.5 rounded-[1.3rem] border border-border/60 bg-card/70 px-4 py-4 text-left transition-[background-color,transform] duration-150 [transition-timing-function:var(--ease-out)] active:scale-[0.985] [@media(hover:hover)_and_(pointer:fine)]:hover:bg-muted/45"
      >
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-sky-500/10 text-sky-400">
          <Layers className="size-[18px]" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[14px] font-semibold tracking-tight">Common questions</span>
          <span className="mt-0.5 block truncate text-[12px] text-muted-foreground">
            {summary.questions} questions that keep coming back · from {summary.papers} papers ({years})
          </span>
        </span>
        <ChevronRight className="size-4 shrink-0 text-muted-foreground/60 transition-transform duration-150 [transition-timing-function:var(--ease-out)] group-hover:translate-x-0.5" />
      </DialogTrigger>

      <DialogBackdrop className="fixed inset-0 bg-black/55 transition-opacity duration-200 ease-out data-[ending-style]:duration-150 data-[starting-style]:opacity-0 data-[ending-style]:opacity-0 motion-reduce:transition-none" />
      <DialogContent className="group/cq fixed inset-0 flex h-dvh w-full max-w-none outline-none">
        <DialogTitle className="sr-only">Common questions · {title}</DialogTitle>
        <Workspace dataKey={dataKey} title={title} onClose={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}

// ── Two-pane workspace: paper on the left, questions on the right ───────────

function Workspace({ dataKey, title, onClose }: { dataKey: string; title: string; onClose: () => void }) {
  const [data, setData] = useState<Data | null>(null);
  const [failed, setFailed] = useState(false);
  const [topic, setTopic] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mobileDetail, setMobileDetail] = useState(false);

  useEffect(() => {
    let live = true;
    load(dataKey).then(
      (d) => {
        if (!live) return;
        setData(d);
        // On wide screens open the first question straight away, so the left
        // half is useful from the first frame.
        if (window.matchMedia("(min-width: 768px)").matches) {
          const first = d.questions.find((q) => q.topic === d.topics[0]?.name);
          setSelectedId(first?.id ?? null);
        }
      },
      () => live && setFailed(true),
    );
    return () => {
      live = false;
    };
  }, [dataKey]);

  const papers = useMemo(() => new Map(data?.papers.map((p) => [p.id, p])), [data]);
  const order = useMemo(() => {
    if (!data) return [];
    const rank = new Map(data.topics.map((t, i) => [t.name, i]));
    const paperRank = new Map(data.papers.map((p, i) => [p.id, i]));
    return data.questions
      .filter((q) => !topic || q.topic === topic)
      .sort(
        (a, b) =>
          (rank.get(a.topic) ?? 99) - (rank.get(b.topic) ?? 99) ||
          (paperRank.get(a.paper) ?? 0) - (paperRank.get(b.paper) ?? 0) ||
          a.qno.localeCompare(b.qno),
      );
  }, [data, topic]);

  const selected = data?.questions.find((q) => q.id === selectedId) ?? null;
  const position = selected ? order.findIndex((q) => q.id === selected.id) : -1;

  const select = useCallback((id: string) => {
    setSelectedId(id);
    setMobileDetail(true);
  }, []);
  const step = useCallback(
    (delta: number) => {
      if (!order.length) return;
      const next = order[Math.min(order.length - 1, Math.max(0, (position < 0 ? -1 : position) + delta))];
      if (next) setSelectedId(next.id);
    },
    [order, position],
  );

  // j/k or ↑/↓ move through questions. No animation on keyboard moves.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      if (target?.closest("input, textarea, [contenteditable=true]")) return;
      if (e.key === "ArrowDown" || e.key === "j") { e.preventDefault(); step(1); }
      if (e.key === "ArrowUp" || e.key === "k") { e.preventDefault(); step(-1); }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [step]);

  return (
    <>
      {/* Left half: the selected question and the paper it came from. */}
      <section
        aria-label="Selected question"
        onPointerDown={(e) => {
          if (e.target === e.currentTarget && !selected) onClose();
        }}
        className={`absolute inset-0 z-10 flex min-w-0 flex-col bg-background md:static md:z-auto md:w-1/2 md:bg-transparent md:p-3 md:pr-1.5 ${
          mobileDetail ? "translate-x-0" : "translate-x-full md:translate-x-0"
        } transition-transform duration-300 [transition-timing-function:var(--ease-drawer)] motion-reduce:transition-none md:transition-none`}
      >
        {selected && data ? (
          <QuestionDetail
            key={selected.paper}
            question={selected}
            paper={papers.get(selected.paper)!}
            topic={data.topics.find((t) => t.name === selected.topic)}
            totalPapers={data.papers.length}
            position={position}
            count={order.length}
            onStep={step}
            onBack={() => setMobileDetail(false)}
          />
        ) : (
          <div className="hidden flex-1 items-center justify-center md:flex">
            <p className="rounded-full bg-background/80 px-4 py-2 text-[12.5px] text-muted-foreground shadow-sm">
              {data ? "Pick a question to see it here, with its paper." : "Loading…"}
            </p>
          </div>
        )}
      </section>

      {/* Right half: every question, grouped by how often its topic is asked. */}
      <aside className="relative flex min-w-0 flex-1 flex-col border-border/60 bg-background shadow-2xl md:w-1/2 md:flex-none md:border-l transition-transform duration-300 [transition-timing-function:var(--ease-drawer)] group-data-[starting-style]/cq:translate-x-full group-data-[ending-style]/cq:translate-x-full group-data-[ending-style]/cq:duration-200 motion-reduce:transition-none">
        <header className="border-b border-border/50 px-5 pb-3 pt-4">
          <div className="flex items-start gap-3">
            <div className="min-w-0 flex-1">
              <h2 className="text-[17px] font-semibold tracking-tight">Common questions</h2>
              <p className="mt-0.5 truncate text-[12.5px] text-muted-foreground">
                {title}
                {data ? ` · the ${data.questions.length} most repeated questions in the last ${data.papers.length} papers` : ""}
              </p>
            </div>
            <DialogClose
              aria-label="Close"
              className="-mr-1.5 flex size-8 items-center justify-center rounded-full text-muted-foreground transition-[background-color,color,transform] duration-150 hover:bg-muted hover:text-foreground active:scale-[0.94]"
            >
              <X className="size-4" />
            </DialogClose>
          </div>
          {data ? (
            <div className="-mx-5 mt-3 flex gap-1.5 overflow-x-auto px-5 pb-0.5 [scrollbar-width:none]">
              <Chip active={topic === null} onClick={() => setTopic(null)}>
                All <span className="font-mono opacity-60">{data.questions.length}</span>
              </Chip>
              {data.topics.map((t) => (
                <Chip key={t.name} active={topic === t.name} onClick={() => setTopic(topic === t.name ? null : t.name)}>
                  {t.name} <span className="font-mono opacity-60">{t.questions}</span>
                </Chip>
              ))}
            </div>
          ) : null}
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 pb-6 pt-2">
          {failed ? (
            <p className="px-2 py-16 text-center text-[13px] text-muted-foreground">
              Couldn&apos;t load the questions. Check your connection and reopen.
            </p>
          ) : !data ? (
            <ListSkeleton />
          ) : (
            <TopicGroups
              data={data}
              order={order}
              papers={papers}
              selectedId={selectedId}
              onSelect={select}
            />
          )}
        </div>
      </aside>
    </>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-1.5 text-[12px] font-medium transition-[background-color,border-color,color,transform] duration-150 [transition-timing-function:var(--ease-out)] active:scale-[0.96] ${
        active
          ? "border-foreground bg-foreground text-background"
          : "border-border/60 bg-card text-muted-foreground [@media(hover:hover)_and_(pointer:fine)]:hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}

/** Small dots: in how many of the recent papers this topic appeared. */
function Frequency({ count, total }: { count: number; total: number }) {
  return (
    <span className="flex items-center gap-1.5" title={`Asked in ${count} of ${total} papers`}>
      <span className="flex gap-[3px]" aria-hidden>
        {Array.from({ length: total }, (_, i) => (
          <span key={i} className={`size-[5px] rounded-full ${i < count ? "bg-sky-400" : "bg-muted-foreground/25"}`} />
        ))}
      </span>
      <span className="text-[11px] tabular-nums text-muted-foreground">
        {count === total ? `Every paper` : `${count} of ${total} papers`}
      </span>
    </span>
  );
}

function TopicGroups({
  data,
  order,
  papers,
  selectedId,
  onSelect,
}: {
  data: Data;
  order: Question[];
  papers: Map<string, Paper>;
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const listRef = useRef<HTMLDivElement>(null);
  // Keep the selected row visible when moving with the keyboard.
  useEffect(() => {
    if (!selectedId) return;
    listRef.current
      ?.querySelector<HTMLElement>(`[data-qid="${CSS.escape(selectedId)}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [selectedId]);

  const groups: { topic: Topic; questions: Question[] }[] = [];
  for (const q of order) {
    const last = groups.at(-1);
    if (last?.topic.name === q.topic) last.questions.push(q);
    else groups.push({ topic: data.topics.find((t) => t.name === q.topic)!, questions: [q] });
  }

  return (
    <div ref={listRef} className="flex flex-col gap-5">
      {groups.map(({ topic, questions }) => (
        <section key={topic.name} aria-label={topic.name}>
          <div className="sticky top-0 z-[1] -mx-3 flex items-center justify-between gap-3 bg-background/95 px-5 py-2.5 backdrop-blur supports-[backdrop-filter]:bg-background/80">
            <h3 className="text-[13px] font-semibold tracking-tight">{topic.name}</h3>
            <Frequency count={topic.papers} total={data.papers.length} />
          </div>
          <div className="flex flex-col gap-1.5">
            {questions.map((q) => {
              const paper = papers.get(q.paper);
              const active = q.id === selectedId;
              return (
                <button
                  key={q.id}
                  type="button"
                  data-qid={q.id}
                  onClick={() => onSelect(q.id)}
                  aria-current={active ? "true" : undefined}
                  className={`relative w-full overflow-hidden rounded-2xl border px-4 py-3 text-left transition-[background-color,border-color,transform] duration-150 [transition-timing-function:var(--ease-out)] active:scale-[0.99] ${
                    active
                      ? "border-sky-500/50 bg-sky-500/[0.07]"
                      : "border-border/50 bg-card/60 [@media(hover:hover)_and_(pointer:fine)]:hover:bg-muted/40"
                  }`}
                >
                  <span className="mb-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-muted-foreground">
                    <span className="font-medium text-foreground/80">{q.skill || topic.name}</span>
                    <span aria-hidden>·</span>
                    <span>{paper?.label}</span>
                    {q.marks ? (
                      <>
                        <span aria-hidden>·</span>
                        <span className="tabular-nums">{q.marks} marks</span>
                      </>
                    ) : null}
                  </span>
                  <span className="block max-h-[4.6rem] overflow-hidden text-[13px] leading-[1.55rem] text-foreground/85 [mask-image:linear-gradient(to_bottom,black_70%,transparent)]">
                    <MathMarkdown className="cq-prose">{q.md}</MathMarkdown>
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}

function ListSkeleton() {
  return (
    <div className="flex flex-col gap-2 pt-2" aria-hidden>
      {Array.from({ length: 6 }, (_, i) => (
        <div key={i} className="h-[84px] animate-pulse rounded-2xl bg-muted/50" style={{ animationDelay: `${i * 60}ms` }} />
      ))}
    </div>
  );
}

// ── Left pane ───────────────────────────────────────────────────────────────

function QuestionDetail({
  question,
  paper,
  topic,
  totalPapers,
  position,
  count,
  onStep,
  onBack,
}: {
  question: Question;
  paper: Paper;
  topic: Topic | undefined;
  totalPapers: number;
  position: number;
  count: number;
  onStep: (delta: number) => void;
  onBack: () => void;
}) {
  const frameRef = useRef<HTMLIFrameElement>(null);
  const focus = focusSpec(question);
  const focusRef = useRef(focus);
  // The frame is keyed by paper, so its first highlight comes from the URL;
  // later questions in the same paper are sent as messages, without a reload.
  const [src] = useState(
    () =>
      `/vendor/paper-viewer/index.html?v=2&file=${encodeURIComponent(resolvePublicPaperHref(paper.href))}&focus=${encodeURIComponent(focus)}`,
  );
  const send = useCallback(() => {
    frameRef.current?.contentWindow?.postMessage(
      { type: "paper-focus", focus: focusRef.current },
      window.location.origin,
    );
  }, []);
  useEffect(() => {
    focusRef.current = focus;
    send();
  }, [focus, send]);
  useEffect(() => {
    function onMessage(e: MessageEvent) {
      if (e.source === frameRef.current?.contentWindow && e.data?.type === "paper-preview-ready") send();
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [send]);

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-background md:rounded-[1.4rem] md:border md:border-border/60 md:shadow-2xl transition-opacity duration-300 ease-out group-data-[starting-style]/cq:opacity-0 group-data-[ending-style]/cq:opacity-0 group-data-[ending-style]/cq:duration-150 motion-reduce:transition-none">
      <div className="flex items-center gap-2 border-b border-border/50 px-3 py-2.5 md:px-4">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1 rounded-full px-2 py-1.5 text-[12.5px] text-muted-foreground transition-[background-color,transform] duration-150 hover:bg-muted active:scale-[0.96] md:hidden"
        >
          <ArrowLeft className="size-4" /> Questions
        </button>
        <span className="hidden min-w-0 truncate text-[12px] text-muted-foreground md:block">
          {paper.code} · {paper.label}
        </span>
        <span className="ml-auto flex items-center gap-1">
          <span className="mr-1 text-[11.5px] tabular-nums text-muted-foreground">
            {position + 1} / {count}
          </span>
          <StepButton label="Previous question" disabled={position <= 0} onClick={() => onStep(-1)}>
            <ChevronUp className="size-4" />
          </StepButton>
          <StepButton label="Next question" disabled={position >= count - 1} onClick={() => onStep(1)}>
            <ChevronDown className="size-4" />
          </StepButton>
        </span>
      </div>

      <div className="max-h-[46%] shrink-0 overflow-y-auto border-b border-border/50 px-5 pb-5 pt-4">
        <div key={question.id} className="animate-in fade-in-0 duration-150 motion-reduce:animate-none">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-sky-500/10 px-2.5 py-1 text-[11px] font-medium text-sky-400">
              {question.topic}
            </span>
            {topic ? <Frequency count={topic.papers} total={totalPapers} /> : null}
          </div>
          <p className="mt-3 text-[12px] text-muted-foreground">
            Q{question.qno}
            {question.marks ? ` · ${question.marks} marks` : ""} · {paper.label}
            <span className="md:hidden"> · {paper.code}</span>
          </p>
          {question.skill ? (
            <h3 className="mt-1 text-[15px] font-semibold tracking-tight">{question.skill}</h3>
          ) : null}
          <div className="mt-3 text-[14.5px] leading-7 text-foreground/90">
            <MathMarkdown className="cq-prose">{question.md}</MathMarkdown>
          </div>
          {question.figure ? (
            <p className="mt-3 text-[12px] text-muted-foreground">The figure is highlighted in the paper below.</p>
          ) : null}
        </div>
      </div>

      <div className="relative min-h-0 flex-1 bg-[#404040]">
        <iframe
          ref={frameRef}
          src={src}
          title={`${paper.code} ${paper.label}`}
          className="absolute inset-0 size-full border-0"
        />
        <a
          href={`/vendor/paper-viewer/index.html?v=2&file=${encodeURIComponent(resolvePublicPaperHref(paper.href))}&focus=${encodeURIComponent(focus)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="absolute bottom-3 right-3 flex items-center gap-1 rounded-full bg-black/70 px-3 py-1.5 text-[11.5px] font-medium text-white backdrop-blur transition-[background-color,transform] duration-150 hover:bg-black/85 active:scale-[0.96]"
        >
          Full paper <ArrowUpRight className="size-3.5" />
        </a>
      </div>
    </div>
  );
}

function StepButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="flex size-8 items-center justify-center rounded-full border border-border/60 text-muted-foreground transition-[background-color,color,transform,opacity] duration-150 hover:bg-muted hover:text-foreground active:scale-[0.94] disabled:pointer-events-none disabled:opacity-35"
    >
      {children}
    </button>
  );
}
