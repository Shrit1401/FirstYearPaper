"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  ArrowLeft,
  BookOpen,
  Brain,
  FileText,
  Image as ImageIcon,
  Layers,
  Loader2,
  MessageSquare,
  Plus,
  Search,
  Send,
  Sparkles,
  Target,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { PaperViewer } from "@/components/pdf-viewer";
import type {
  RepeatCitation,
  RepeatQueryRequest,
  RepeatQueryResponse,
  RepeatSubjectOption,
  RepeatVisualCitation,
} from "@/lib/repeat-types";
import { getRepeatSessionId } from "@/lib/repeat-events-client";
import { cn } from "@/lib/utils";
import posthog from "posthog-js";

type IndexPayload = {
  subjects: RepeatSubjectOption[];
  index: {
    ready: boolean;
    generatedAt?: string;
    paperCount?: number;
    chunkCount?: number;
  };
  scopeYear?: "Year 1";
};

type Turn = {
  role: "user" | "assistant";
  content: string;
  response?: RepeatQueryResponse;
};

type StreamStage = "retrieving_sources" | "drafting_answer" | "finalizing_citations";
type PendingEvidence = {
  citations?: number;
  visualCitations?: number;
};

const INTENTS: Array<{
  value: NonNullable<RepeatQueryRequest["intent"]>;
  label: string;
  icon: typeof Search;
  prompt: string;
}> = [
  {
    value: "repeat_questions",
    label: "Repeated",
    icon: Layers,
    prompt: "Find the most repeated questions for this subject.",
  },
  {
    value: "common_topics",
    label: "Topics",
    icon: Target,
    prompt: "Find high-frequency topics in this subject.",
  },
  {
    value: "revision_list",
    label: "Tonight",
    icon: Brain,
    prompt: "Make a study-tonight list for this subject.",
  },
  {
    value: "custom",
    label: "Ask",
    icon: MessageSquare,
    prompt: "",
  },
];

function shortPaperName(name: string) {
  return name.replace(/\.pdf$/i, "");
}

function subjectDisplay(subject: RepeatSubjectOption) {
  return [
    subject.branchName,
    subject.subjectName,
    subject.examType,
  ]
    .filter(Boolean)
    .join(" / ");
}

function shortSubjectDisplay(subject: RepeatSubjectOption) {
  return [subject.branchName, subject.subjectName].filter(Boolean).join(" / ");
}

function citationMeta(citation: RepeatCitation) {
  return [
    citation.subjectLabel,
    `page ${citation.pageStart}`,
    citation.occurrenceCount && citation.occurrenceCount > 1
      ? `${citation.occurrenceCount}x repeated`
      : null,
    citation.diagramRequired ? "visual" : null,
  ]
    .filter(Boolean)
    .join(" / ");
}

function visualTypeLabel(type: RepeatVisualCitation["type"]) {
  return type.charAt(0).toUpperCase() + type.slice(1);
}

function stageLabel(stage: StreamStage | null) {
  switch (stage) {
    case "retrieving_sources":
      return "Finding repeated Year 1 evidence...";
    case "drafting_answer":
      return "Writing a grounded answer...";
    case "finalizing_citations":
      return "Attaching paper and visual cards...";
    default:
      return "Reading Year 1 papers...";
  }
}

function stageDetail(stage: StreamStage | null, evidence: PendingEvidence) {
  switch (stage) {
    case "retrieving_sources":
      return "Scanning Year 1 paper chunks and visual signals.";
    case "drafting_answer":
      return "Using citations to write the short answer.";
    case "finalizing_citations":
      return `Preparing ${evidence.citations ?? 0} paper cards and ${evidence.visualCitations ?? 0} visual cards.`;
    default:
      return "Keeping the source pages attached.";
  }
}

function Reply({ response }: { response: RepeatQueryResponse }) {
  const insights =
    response.queryIntent === "repeat_questions"
      ? response.repeatedQuestions ?? []
      : response.queryIntent === "common_topics"
        ? response.commonTopics ?? []
        : response.queryIntent === "revision_list"
          ? response.revisionList ?? []
          : [];

  return (
    <div className="grid gap-6">
      <section className="px-1">
        <div className="repeat-markdown text-[15px]">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {response.answerMarkdown}
          </ReactMarkdown>
        </div>
      </section>

      {insights.length > 0 ? (
        <section className="grid gap-2.5">
          <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
            <Sparkles className="size-3.5" />
            Study Signals
          </div>
          <div className="grid gap-2">
            {insights.slice(0, 8).map((item, index) => (
              <div
                key={`${item.title}-${index}`}
                className="rounded-lg border border-white/10 bg-white/[0.035] p-3"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <p className="min-w-0 flex-1 text-sm font-medium">{item.title}</p>
                  {item.unit ? (
                    <span className="rounded-md border border-border/60 px-2 py-0.5 text-[11px] text-muted-foreground">
                      {item.unit}
                    </span>
                  ) : null}
                </div>
                {item.detail ? (
                  <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">
                    {item.detail}
                  </p>
                ) : null}
                <p className="mt-2 text-[11px] text-muted-foreground/70">
                  Evidence: {item.citationIds.join(", ")}
                </p>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {response.visualCitations.length > 0 ? (
        <section className="grid gap-2.5 xl:hidden">
          <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
            <ImageIcon className="size-3.5" />
            Visual Evidence
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {response.visualCitations.map((visual) => (
              <PaperViewer
                key={visual.id}
                href={visual.href}
                name={visual.paperName}
                viewerPage={visual.pageNumber}
                citationPageMarker
                contextTitle={`${visual.id} / ${visualTypeLabel(visual.type)} / page ${visual.pageNumber}`}
                contextTitleDetail={visual.relatedQuestionText}
                contextBody={visual.evidenceText}
                contextMeta={shortPaperName(visual.paperName)}
              >
                <div className="group min-h-44 rounded-lg border border-white/10 bg-white/[0.035] p-3 transition-[background-color,transform] duration-150 ease-out hover:bg-white/[0.055] active:scale-[0.99]">
                  <div className="flex items-start justify-between gap-3">
                    <span className="rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-[11px] font-medium text-amber-300">
                      {visual.id} / {visualTypeLabel(visual.type)}
                    </span>
                    <span className="text-[11px] text-muted-foreground">Page {visual.pageNumber}</span>
                  </div>
                  <div className="mt-4 flex aspect-[16/9] items-center justify-center rounded-md border border-dashed border-white/10 bg-black/25">
                    <ImageIcon className="size-8 text-muted-foreground/55" />
                  </div>
                  <p className="mt-3 line-clamp-2 text-sm font-medium">{visual.title}</p>
                  <p className="mt-1 line-clamp-3 text-[12px] leading-relaxed text-muted-foreground">
                    {visual.caption}
                  </p>
                </div>
              </PaperViewer>
            ))}
          </div>
        </section>
      ) : null}

      {response.citations.length > 0 ? (
        <section className="grid gap-2.5 xl:hidden">
          <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
            <FileText className="size-3.5" />
            Paper Evidence
          </div>
          <div className="grid gap-2">
            {response.citations.map((citation) => (
              <PaperViewer
                key={citation.id}
                href={citation.href}
                name={citation.paperName}
                viewerPage={citation.pageStart}
                citationPageMarker
                contextTitle={`${citation.id} / page ${citation.pageStart}`}
                contextTitleDetail={citation.questionText}
                contextBody={citation.quote}
                contextMeta={citationMeta(citation)}
              >
                <div className="group rounded-lg border border-white/10 bg-white/[0.035] p-3 transition-[background-color,transform] duration-150 ease-out hover:bg-white/[0.055] active:scale-[0.99]">
                  <div className="flex items-start gap-3">
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-white/[0.06]">
                      <FileText className="size-4 text-muted-foreground" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-md bg-primary/10 px-1.5 py-0.5 text-[11px] font-medium text-primary">
                          {citation.id}
                        </span>
                        <p className="min-w-0 truncate text-sm font-medium">
                          {shortPaperName(citation.paperName)}
                        </p>
                      </div>
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        {citationMeta(citation)}
                      </p>
                      <p className="mt-2 line-clamp-2 text-[12px] leading-relaxed text-muted-foreground">
                        {citation.questionText ?? citation.quote}
                      </p>
                    </div>
                  </div>
                </div>
              </PaperViewer>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

export function RepeatClient() {
  const [indexPayload, setIndexPayload] = useState<IndexPayload | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<string>("");
  const [intent, setIntent] = useState<NonNullable<RepeatQueryRequest["intent"]>>("repeat_questions");
  const [prompt, setPrompt] = useState(INTENTS[0].prompt);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [pending, setPending] = useState(false);
  const [pendingStage, setPendingStage] = useState<StreamStage | null>(null);
  const [pendingEvidence, setPendingEvidence] = useState<PendingEvidence>({});
  const [error, setError] = useState<string | null>(null);
  const responseRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function loadIndex() {
      try {
        const response = await fetch("/api/repeat/index", { cache: "no-store" });
        const payload = await response.json();
        if (!response.ok) {
          throw new Error(payload.error ?? "Could not load Repeat.");
        }
        if (!cancelled) {
          setIndexPayload(payload);
          setSelectedSubject(payload.subjects?.[0]?.subjectKey ?? "");
        }
      } catch (loadIndexError) {
        if (!cancelled) {
          setLoadError(loadIndexError instanceof Error ? loadIndexError.message : "Could not load Repeat.");
        }
      }
    }
    void loadIndex();
    return () => {
      cancelled = true;
    };
  }, []);

  const subjects = useMemo(() => indexPayload?.subjects ?? [], [indexPayload]);
  const selected = useMemo(
    () => subjects.find((subject) => subject.subjectKey === selectedSubject),
    [selectedSubject, subjects]
  );
  const lastResponse = [...turns].reverse().find((turn) => turn.response)?.response;

  function chooseIntent(nextIntent: NonNullable<RepeatQueryRequest["intent"]>) {
    setIntent(nextIntent);
    const preset = INTENTS.find((item) => item.value === nextIntent);
    if (preset?.prompt) setPrompt(preset.prompt);
  }

  async function submit(event?: FormEvent) {
    event?.preventDefault();
    const trimmedPrompt = prompt.trim();
    if (!trimmedPrompt || pending || loadError || !indexPayload) return;

    setPending(true);
    setPendingStage("retrieving_sources");
    setPendingEvidence({});
    setError(null);
    const userTurn: Turn = { role: "user", content: trimmedPrompt };
    setTurns((current) => [...current, userTurn]);

    try {
      const history = turns
        .slice(-8)
        .filter((turn) => turn.role === "user" || turn.role === "assistant")
        .map((turn) => ({ role: turn.role, content: turn.content }));
      const requestBody: RepeatQueryRequest & { stream: boolean } = {
        mode: intent === "custom" ? "chat" : "compare",
        intent,
        prompt: trimmedPrompt,
        subjectKey: selectedSubject || undefined,
        scopeYear: "Year 1",
        history,
        sessionId: getRepeatSessionId(),
        stream: true,
      };
      const response = await fetch("/api/repeat/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });
      if (!response.ok) {
        const payload = await response.json();
        throw new Error(payload.error ?? "Repeat could not answer that.");
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("Repeat stream could not start.");
      const decoder = new TextDecoder();
      let buffer = "";
      let answer: RepeatQueryResponse | null = null;

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split("\n\n");
        buffer = events.pop() ?? "";

        for (const eventBlock of events) {
          const eventLine = eventBlock
            .split("\n")
            .find((line) => line.startsWith("event: "));
          const dataLine = eventBlock
            .split("\n")
            .find((line) => line.startsWith("data: "));
          if (!eventLine || !dataLine) continue;

          const eventName = eventLine.slice("event: ".length);
          const data = JSON.parse(dataLine.slice("data: ".length));
          if (eventName === "stage") {
            setPendingStage(data.stage as StreamStage);
          } else if (eventName === "result") {
            answer = data as RepeatQueryResponse;
            setPendingEvidence({
              citations: answer.citations.length,
              visualCitations: answer.visualCitations.length,
            });
          } else if (eventName === "error") {
            throw new Error(data.error ?? "Repeat could not answer that.");
          }
        }
      }

      if (!answer) throw new Error("Repeat returned no answer.");
      setTurns((current) => [
        ...current,
        { role: "assistant", content: answer.answerMarkdown, response: answer },
      ]);
      posthog.capture("repeat_query_completed", {
        intent,
        mode: requestBody.mode,
        has_selected_subject: Boolean(selectedSubject),
        citation_count: answer.citations.length,
        visual_citation_count: answer.visualCitations.length,
        confidence: answer.confidence,
      });
      window.setTimeout(() => responseRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 80);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Repeat could not answer that.");
    } finally {
      setPending(false);
      setPendingStage(null);
      setPendingEvidence({});
    }
  }

  return (
    <div className="flex min-h-screen bg-[#050505] text-foreground">
      <aside className="hidden w-[280px] shrink-0 flex-col border-r border-white/10 bg-[#0b0b0b] lg:flex">
        <div className="flex h-14 items-center gap-2 px-3">
          <Button asChild variant="ghost" size="icon-sm" aria-label="Back to papers">
            <Link href="/browse/Year%201">
              <ArrowLeft className="size-4" />
            </Link>
          </Button>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold">Repeat</p>
              <span className="rounded-md border border-red-500/35 bg-red-500/10 px-1.5 py-0.5 text-[10px] text-red-300">
                Year 1
              </span>
            </div>
            <p className="truncate text-[11px] text-muted-foreground">Exam-paper intelligence</p>
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-3 pb-4">
          <Button
            type="button"
            variant="outline"
            className="h-10 justify-start border-white/10 bg-white/[0.03] text-sm hover:bg-white/[0.06] active:scale-[0.98]"
            onClick={() => {
              setTurns([]);
              setError(null);
              setPrompt(INTENTS.find((item) => item.value === intent)?.prompt ?? "");
            }}
          >
            <Plus className="size-4" />
            New chat
          </Button>

          <div className="grid gap-2">
            <p className="px-2 text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground/70">
              Subject
            </p>
            {loadError ? (
              <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-[12px] leading-relaxed text-red-200">
                {loadError}
              </div>
            ) : indexPayload ? (
              <>
                <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                  <SelectTrigger className="h-11 w-full justify-between border-white/10 bg-white/[0.035] text-left shadow-none">
                    <SelectValue placeholder="Choose subject" />
                  </SelectTrigger>
                  <SelectContent>
                    {subjects.map((subject) => (
                      <SelectItem key={subject.subjectKey} value={subject.subjectKey}>
                        {subjectDisplay(subject)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="grid grid-cols-2 gap-2 text-[12px]">
                  <div className="rounded-lg border border-white/10 bg-white/[0.025] p-3">
                    <p className="text-muted-foreground">Papers</p>
                    <p className="mt-1 text-xl font-semibold">{selected?.papers.length ?? 0}</p>
                  </div>
                  <div className="rounded-lg border border-white/10 bg-white/[0.025] p-3">
                    <p className="text-muted-foreground">Index</p>
                    <p className="mt-1 text-xl font-semibold">
                      {indexPayload.index.ready ? "Ready" : "Off"}
                    </p>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex items-center gap-2 px-2 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" />
                Loading Year 1
              </div>
            )}
          </div>

          <nav className="grid gap-1">
            <p className="px-2 pb-1 text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground/70">
              Modes
            </p>
            {INTENTS.map((item) => {
              const Icon = item.icon;
              const active = intent === item.value;
              return (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => chooseIntent(item.value)}
                  className={cn(
                    "flex h-10 items-center gap-2 rounded-lg px-3 text-left text-sm transition-[background-color,color,transform] duration-150 ease-out active:scale-[0.98]",
                    active
                      ? "bg-white text-black"
                      : "text-muted-foreground hover:bg-white/[0.055] hover:text-foreground"
                  )}
                >
                  <Icon className="size-4" />
                  {item.label}
                </button>
              );
            })}
          </nav>

          <div className="mt-auto rounded-lg border border-white/10 bg-white/[0.025] p-3 text-[12px] leading-relaxed text-muted-foreground">
            Real paper pages, repeat counts, and visual evidence stay attached to every useful answer.
          </div>
        </div>
      </aside>

      <section className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-white/10 bg-[#050505]/90 px-4 backdrop-blur-xl lg:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <Button asChild variant="ghost" size="icon-sm" aria-label="Back to papers" className="lg:hidden">
              <Link href="/browse/Year%201">
                <ArrowLeft className="size-4" />
              </Link>
            </Button>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-semibold">Repeat</h1>
                <span className="rounded-md border border-red-500/35 bg-red-500/10 px-1.5 py-0.5 text-[10px] text-red-300">
                  Year 1
                </span>
              </div>
              {indexPayload ? (
                <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                  <SelectTrigger className="h-5 w-36 border-0 bg-transparent p-0 text-[11px] text-muted-foreground shadow-none focus-visible:ring-0 lg:hidden">
                    <SelectValue placeholder="Subject" />
                  </SelectTrigger>
                  <SelectContent>
                    {subjects.map((subject) => (
                      <SelectItem key={subject.subjectKey} value={subject.subjectKey}>
                        {subjectDisplay(subject)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : null}
              <p className="hidden truncate text-[11px] text-muted-foreground lg:block">
                {selected ? shortSubjectDisplay(selected) : "Year 1 paper workspace"}
              </p>
            </div>
          </div>

          <Button asChild variant="outline" size="sm" className="h-9 border-white/10 bg-white/[0.03] hover:bg-white/[0.06]">
            <Link href="/browse/Year%201">
              <BookOpen className="size-4" />
              Papers
            </Link>
          </Button>
        </header>

        <div className="flex min-h-0 flex-1">
          <main className="flex min-w-0 flex-1 flex-col">
            <div ref={responseRef} className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-4 pb-64 pt-8 sm:px-6">
              {turns.length === 0 ? (
                <div className="flex flex-1 flex-col items-center justify-center py-16 text-center">
                  <div className="flex size-11 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04]">
                    <Sparkles className="size-5 text-red-300" />
                  </div>
                  <h2 className="mt-5 text-2xl font-semibold tracking-tight">What should we find?</h2>
                  <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
                    Ask about repeated questions, diagram-heavy prompts, high-frequency topics, or one exact exam answer.
                  </p>
                  <div className="mt-6 grid w-full max-w-2xl gap-2 sm:grid-cols-2">
                    {INTENTS.filter((item) => item.value !== "custom").map((item) => {
                      const Icon = item.icon;
                      return (
                        <button
                          key={item.value}
                          type="button"
                          onClick={() => chooseIntent(item.value)}
                          className="group rounded-lg border border-white/10 bg-white/[0.025] p-3 text-left transition-[background-color,transform] duration-150 ease-out hover:bg-white/[0.05] active:scale-[0.99]"
                        >
                          <div className="flex items-center gap-2 text-sm font-medium">
                            <Icon className="size-4 text-muted-foreground transition-colors group-hover:text-red-300" />
                            {item.label}
                          </div>
                          <p className="mt-1 line-clamp-2 text-[12px] leading-relaxed text-muted-foreground">
                            {item.prompt}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : (
                turns.map((turn, index) => (
                  <article key={index} className="grid gap-4">
                    {turn.role === "user" ? (
                      <div className="max-w-[82%] justify-self-end rounded-2xl bg-white px-4 py-2.5 text-[15px] leading-relaxed text-black shadow-sm">
                        {turn.content}
                      </div>
                    ) : turn.response ? (
                      <div className="grid grid-cols-[2rem_minmax(0,1fr)] gap-3">
                        <div className="flex size-8 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04]">
                          <Sparkles className="size-4 text-red-300" />
                        </div>
                        <Reply response={turn.response} />
                      </div>
                    ) : null}
                  </article>
                ))
              )}

              {pending ? (
                <div className="grid grid-cols-[2rem_minmax(0,1fr)] gap-3">
                  <div className="flex size-8 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04]">
                    <Loader2 className="size-4 animate-spin text-red-300" />
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/[0.025] px-4 py-3">
                    <p className="text-sm font-medium text-foreground">{stageLabel(pendingStage)}</p>
                    <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">
                      {stageDetail(pendingStage, pendingEvidence)}
                    </p>
                    <div className="mt-3 grid grid-cols-3 gap-1">
                      {(["retrieving_sources", "drafting_answer", "finalizing_citations"] as StreamStage[]).map((stage) => (
                        <div
                          key={stage}
                          className={cn(
                            "h-1 rounded-full transition-colors duration-150",
                            pendingStage === stage
                              ? "bg-red-300"
                              : "bg-white/10"
                          )}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              ) : null}

              {error ? (
                <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm leading-relaxed text-red-200">
                  {error}
                </div>
              ) : null}
            </div>

            <div className="sticky bottom-0 border-t border-white/0 bg-gradient-to-t from-[#050505] via-[#050505] to-transparent px-4 pb-4 pt-10 sm:px-6">
              <form onSubmit={submit} className="mx-auto max-w-3xl">
                <div className="rounded-2xl border border-white/12 bg-[#1f1f1f] p-2 shadow-[0_18px_50px_rgba(0,0,0,0.34)] transition-[border-color,box-shadow] duration-150 ease-out focus-within:border-white/20 focus-within:shadow-[0_18px_60px_rgba(0,0,0,0.48)]">
                  <Textarea
                    value={prompt}
                    onChange={(event) => setPrompt(event.target.value)}
                    placeholder="Ask Repeat..."
                    className="max-h-40 min-h-14 resize-none border-0 bg-transparent px-2 py-2 text-[15px] shadow-none focus-visible:ring-0"
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && !event.shiftKey) {
                        event.preventDefault();
                        void submit();
                      }
                    }}
                  />
                  <div className="flex items-center justify-between gap-3 px-1 pb-1">
                    <p className="min-w-0 truncate text-[12px] text-muted-foreground">
                      {selected ? subjectDisplay(selected) : "Year 1 corpus"}
                    </p>
                    <Button
                      type="submit"
                      size="icon-sm"
                      aria-label="Ask Repeat"
                      disabled={pending || !prompt.trim() || Boolean(loadError) || !indexPayload}
                      className="rounded-full bg-white text-black transition-transform duration-150 ease-out hover:bg-white/90 active:scale-[0.94]"
                    >
                      {pending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                    </Button>
                  </div>
                </div>
              </form>
            </div>
          </main>

          <aside className="hidden w-[320px] shrink-0 border-l border-white/10 bg-[#080808] xl:block">
            <div className="sticky top-14 grid gap-4 p-4">
              <div>
                <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground/75">
                  Latest Evidence
                </p>
                <p className="mt-2 text-[12px] leading-relaxed text-muted-foreground">
                  Paper, visual, and confidence signals from the last answer.
                </p>
              </div>

              {lastResponse ? (
                <div className="grid gap-3">
                  <div className="grid grid-cols-3 gap-2 text-center text-[12px]">
                    <div className="rounded-lg border border-white/10 bg-white/[0.025] p-2.5">
                      <p className="text-lg font-semibold">{lastResponse.citations.length}</p>
                      <p className="text-muted-foreground">Cites</p>
                    </div>
                    <div className="rounded-lg border border-white/10 bg-white/[0.025] p-2.5">
                      <p className="text-lg font-semibold">{lastResponse.visualCitations.length}</p>
                      <p className="text-muted-foreground">Visual</p>
                    </div>
                    <div className="rounded-lg border border-white/10 bg-white/[0.025] p-2.5">
                      <p className="text-lg font-semibold">{Math.round(lastResponse.confidence * 100)}%</p>
                      <p className="text-muted-foreground">Trust</p>
                    </div>
                  </div>

                  {lastResponse.diagramSupport ? (
                    <div className="rounded-lg border border-red-400/25 bg-red-500/10 p-3 text-[12px] leading-relaxed text-red-100/85">
                      {lastResponse.diagramSupport.summary}
                    </div>
                  ) : null}

                  {lastResponse.visualCitations.slice(0, 3).map((visual) => (
                    <PaperViewer
                      key={visual.id}
                      href={visual.href}
                      name={visual.paperName}
                      viewerPage={visual.pageNumber}
                      citationPageMarker
                      contextTitle={`${visual.id} / ${visualTypeLabel(visual.type)} / page ${visual.pageNumber}`}
                      contextTitleDetail={visual.relatedQuestionText}
                      contextBody={visual.evidenceText}
                      contextMeta={shortPaperName(visual.paperName)}
                    >
                      <div className="rounded-lg border border-white/10 bg-white/[0.025] p-3 transition-[background-color,transform] duration-150 ease-out hover:bg-white/[0.05] active:scale-[0.99]">
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-[11px] font-medium text-red-200">{visual.id} / {visualTypeLabel(visual.type)}</span>
                          <span className="text-[11px] text-muted-foreground">p.{visual.pageNumber}</span>
                        </div>
                        <p className="mt-2 line-clamp-2 text-[12px] leading-relaxed text-muted-foreground">
                          {visual.title}
                        </p>
                      </div>
                    </PaperViewer>
                  ))}

                  {lastResponse.citations.slice(0, 6).map((citation) => (
                    <PaperViewer
                      key={citation.id}
                      href={citation.href}
                      name={citation.paperName}
                      viewerPage={citation.pageStart}
                      citationPageMarker
                      contextTitle={`${citation.id} / page ${citation.pageStart}`}
                      contextTitleDetail={citation.questionText}
                      contextBody={citation.quote}
                      contextMeta={citationMeta(citation)}
                    >
                      <div className="rounded-lg border border-white/10 bg-white/[0.02] p-3 transition-[background-color,transform] duration-150 ease-out hover:bg-white/[0.045] active:scale-[0.99]">
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-[11px] font-medium text-foreground">{citation.id} / Paper</span>
                          <span className="text-[11px] text-muted-foreground">p.{citation.pageStart}</span>
                        </div>
                        <p className="mt-2 line-clamp-2 text-[12px] leading-relaxed text-muted-foreground">
                          {citation.questionText ?? citation.quote}
                        </p>
                      </div>
                    </PaperViewer>
                  ))}

                  {lastResponse.notices?.length ? (
                    <div className="grid gap-2">
                      {lastResponse.notices.slice(0, 2).map((notice) => (
                        <p key={notice} className="rounded-lg border border-white/10 bg-white/[0.025] p-3 text-[12px] leading-relaxed text-muted-foreground">
                          {notice}
                        </p>
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : (
                <div className="rounded-lg border border-white/10 bg-white/[0.025] p-4 text-sm leading-relaxed text-muted-foreground">
                  Evidence cards appear after the first answer.
                </div>
              )}
            </div>
          </aside>
        </div>
      </section>
    </div>
  );
}
