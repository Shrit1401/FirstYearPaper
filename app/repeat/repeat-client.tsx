"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  BookOpen,
  Brain,
  FileText,
  Layers3,
  Loader2,
  LockKeyhole,
  SearchCheck,
  SendHorizontal,
  Sparkles,
} from "lucide-react";
import {
  isRepeatSurveyIntent,
  repeatSidebarInsights,
  type RepeatChatTurn,
  type RepeatIndexStatus,
  type RepeatQueryResponse,
  type RepeatSubjectOption,
} from "@/lib/repeat-types";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { RepeatAnswer } from "@/components/repeat-answer";
import { useAuth } from "@/components/auth-provider";
import { coerceIsPaid } from "@/lib/supabase/user-profile";
import { getRepeatSessionId } from "@/lib/repeat-events-client";
import { cn } from "@/lib/utils";

type IndexPayload = {
  subjects: RepeatSubjectOption[];
  index: RepeatIndexStatus;
};

type ConversationEntry =
  | { role: "user"; content: string }
  | {
      role: "assistant";
      content: string;
      queryText: string;
      response: RepeatQueryResponse;
    };

const QUICK_ACTIONS = [
  {
    intent: "repeat_questions" as const,
    label: "Common exam questions",
    description:
      "Cluster the asks that show up again and again for this subject.",
    prompt:
      "What are the common exam questions or repeating question patterns for this subject? Group near-duplicates together.",
    icon: SearchCheck,
  },
  {
    intent: "common_topics" as const,
    label: "High-frequency topics",
    description:
      "Show the concepts that dominate the paper set and how they recur.",
    prompt:
      "What are the most common topics for this subject across the available papers, and how do they show up?",
    icon: Brain,
  },
  {
    intent: "revision_list" as const,
    label: "Last-minute prep",
    description:
      "Turn the paper set into a focused revision list with likely payoff.",
    prompt:
      "Make a last-minute revision list for this subject based on the most common questions and topics.",
    icon: Sparkles,
  },
];

function extractCourseCode(subjectName: string) {
  const match = subjectName.match(/\b([A-Z]{2,5})\s?(\d{3,5}[A-Z]?)\b/);
  return match ? `${match[1]} ${match[2]}` : null;
}

function cleanSubjectTitle(subject: RepeatSubjectOption) {
  return (
    subject.subjectName
      .replace(/\b([A-Z]{2,5})\s?(\d{3,5}[A-Z]?)\b/g, "")
      .replace(/\s+/g, " ")
      .trim() || subject.subjectName
  );
}

export function RepeatClient() {
  const { isLoading: authLoading, profile, session, user } = useAuth();
  const searchParams = useSearchParams();
  const [sessionId, setSessionId] = useState("anonymous");
  const [data, setData] = useState<IndexPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedYear, setSelectedYear] = useState("");
  const [subjectKey, setSubjectKey] = useState("");
  const [prompt, setPrompt] = useState("");
  const [mobilePanel, setMobilePanel] = useState<"workspace" | "chat">("workspace");
  const [conversation, setConversation] = useState<ConversationEntry[]>([]);
  const [busy, startTransition] = useTransition();
  const isSignedIn = Boolean(user);
  const isPaidUser = Boolean(profile && coerceIsPaid(profile.is_paid));

  useEffect(() => {
    setSessionId(getRepeatSessionId());
  }, []);

  useEffect(() => {
    const token = session?.access_token;
    if (!token || !isPaidUser) {
      setData(null);
      return;
    }

    let cancelled = false;

    async function load() {
      try {
        const response = await fetch("/api/repeat/index", {
          cache: "no-store",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          const payload = (await response.json()) as { error?: string };
          throw new Error(payload.error ?? "Failed to load repeat index metadata.");
        }

        const payload = (await response.json()) as IndexPayload;
        if (cancelled) return;
        setData(payload);
        setError(null);
      } catch (loadError) {
        if (cancelled) return;
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Failed to load repeat index metadata.",
        );
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [isPaidUser, session?.access_token]);

  const subjects = useMemo(() => data?.subjects ?? [], [data]);
  const yearOptions = useMemo(
    () =>
      Array.from(
        new Set(
          subjects
            .map((subject) => subject.yearLabel)
            .filter((value): value is string => Boolean(value)),
        ),
      ).sort((a, b) => a.localeCompare(b)),
    [subjects],
  );
  const filteredSubjects = useMemo(
    () =>
      subjects.filter((subject) =>
        selectedYear ? subject.yearLabel === selectedYear : false,
      ),
    [selectedYear, subjects],
  );
  const selectedSubject = useMemo(
    () =>
      filteredSubjects.find((subject) => subject.subjectKey === subjectKey) ??
      null,
    [filteredSubjects, subjectKey],
  );
  const groupedSubjects = useMemo(() => {
    const groups = new Map<string, RepeatSubjectOption[]>();

    for (const subject of filteredSubjects) {
      const key = subject.collectionLabel;
      groups.set(key, [...(groups.get(key) ?? []), subject]);
    }

    return Array.from(groups.entries())
      .map(([label, items]) => ({
        label,
        items: items.sort((a, b) =>
          cleanSubjectTitle(a).localeCompare(cleanSubjectTitle(b)),
        ),
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [filteredSubjects]);
  const subjectPaperCount = selectedSubject?.papers.length ?? 0;
  const latestPaper = useMemo(() => {
    if (!selectedSubject?.papers.length) return null;
    return (
      [...selectedSubject.papers].sort((a, b) => {
        const yearA = a.normalizedYear ?? 0;
        const yearB = b.normalizedYear ?? 0;
        if (yearA !== yearB) return yearB - yearA;
        return b.paperName.localeCompare(a.paperName);
      })[0] ?? null
    );
  }, [selectedSubject]);
  const lastAssistantEntry = useMemo(
    () =>
      [...conversation]
        .reverse()
        .find(
          (entry): entry is Extract<ConversationEntry, { role: "assistant" }> =>
            entry.role === "assistant",
        ) ?? null,
    [conversation],
  );
  const latestAssistantResponse = lastAssistantEntry?.response ?? null;
  const sidebarQuestions = useMemo(() => {
    if (!lastAssistantEntry || !isRepeatSurveyIntent(lastAssistantEntry.response.queryIntent)) {
      return [];
    }
    return repeatSidebarInsights(lastAssistantEntry.response).slice(0, 5);
  }, [lastAssistantEntry]);
  const visualSnapshot = latestAssistantResponse?.diagramSupport ?? null;

  useEffect(() => {
    if (!selectedYear && yearOptions.length > 0) {
      setSelectedYear(yearOptions[0]!);
    }
  }, [selectedYear, yearOptions]);

  useEffect(() => {
    const queryYear = searchParams.get("year");
    if (queryYear && yearOptions.includes(queryYear)) {
      setSelectedYear(queryYear);
    }
  }, [searchParams, yearOptions]);

  useEffect(() => {
    if (!selectedYear) {
      setSubjectKey("");
      return;
    }

    const stillValid = filteredSubjects.some(
      (subject) => subject.subjectKey === subjectKey,
    );
    if (!stillValid) {
      setSubjectKey(filteredSubjects[0]?.subjectKey ?? "");
    }
  }, [filteredSubjects, selectedYear, subjectKey]);

  useEffect(() => {
    const querySubject = searchParams.get("subject");
    if (!querySubject || !filteredSubjects.length) return;

    const matched =
      filteredSubjects.find(
        (subject) => subject.subjectName === querySubject,
      ) ??
      filteredSubjects.find(
        (subject) =>
          cleanSubjectTitle(subject).toLowerCase() ===
          querySubject.toLowerCase(),
      ) ??
      null;

    if (matched && matched.subjectKey !== subjectKey) {
      setSubjectKey(matched.subjectKey);
    }
  }, [filteredSubjects, searchParams, subjectKey]);

  useEffect(() => {
    const queryPrompt = searchParams.get("prompt");
    if (queryPrompt && !prompt) {
      setPrompt(queryPrompt);
    }
  }, [searchParams, prompt]);

  const indexReady = data?.index.ready ?? false;

  async function submitQuery(args: {
    mode: "compare" | "chat";
    prompt: string;
    intent?: "repeat_questions" | "common_topics" | "revision_list" | "custom";
  }) {
    setMobilePanel("chat");
    setError(null);

    const userContent = args.prompt.trim();
    if (!userContent) return;

    const history: RepeatChatTurn[] = conversation.map((entry) => ({
      role: entry.role,
      content: entry.content,
    }));

    setConversation((entries) => [
      ...entries,
      { role: "user", content: userContent },
    ]);

    startTransition(async () => {
      try {
        if (!session?.access_token) {
          throw new Error("Please sign in again.");
        }

        const response = await fetch("/api/repeat/query", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            mode: args.mode,
            prompt: userContent,
            intent: args.intent ?? "custom",
            subjectKey: subjectKey || undefined,
            currentPaperId: latestPaper?.paperId,
            sessionId,
            history,
          }),
        });

        const payload = (await response.json()) as RepeatQueryResponse & {
          error?: string;
        };
        if (!response.ok)
          throw new Error(payload.error ?? "Repeat query failed.");

        setConversation((entries) => [
          ...entries,
          {
            role: "assistant",
            content: payload.answerMarkdown,
            queryText: userContent,
            response: payload,
          },
        ]);
        setPrompt("");
      } catch (queryError) {
        setError(
          queryError instanceof Error
            ? queryError.message
            : "Something went wrong while querying Repeat.",
        );
      }
    });
  }

  const canRunCompare = indexReady && Boolean(selectedYear && subjectKey);
  const canRunChat =
    indexReady && Boolean(subjectKey) && prompt.trim().length > 0;
  const readingWidthClass = conversation.length > 0 ? "max-w-6xl" : "max-w-4xl";

  if (authLoading) {
    return (
      <div className="repeat-shell min-h-screen bg-background">
        <div className="mx-auto flex min-h-screen max-w-2xl items-center justify-center px-6">
          <div className="text-sm text-muted-foreground">Loading Repeat access…</div>
        </div>
      </div>
    );
  }

  return (
    <div className="repeat-shell min-h-screen bg-background">
      <header className="sticky top-0 z-20 border-b border-white/6 bg-background/78 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1440px] items-center gap-3 px-4 py-3 sm:px-6">
          <Link
            href="/"
            className="flex size-9 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 text-muted-foreground transition-[transform,color,border-color,background-color] duration-150 [transition-timing-function:var(--ease-out)] hover:border-white/20 hover:bg-white/8 hover:text-foreground active:scale-[0.96]"
            aria-label="Back home"
          >
            <ArrowLeft className="size-4" />
          </Link>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-lg font-semibold tracking-[-0.03em]">
                Repeat
              </h1>
              {isPaidUser && selectedSubject ? (
                <Badge
                  variant="outline"
                  className="hidden rounded-full border-white/8 bg-white/[0.03] px-3 py-1 text-[11px] text-muted-foreground md:inline-flex"
                >
                  {cleanSubjectTitle(selectedSubject)}
                </Badge>
              ) : null}
            </div>
            <p className="mt-0.5 text-[11px] uppercase tracking-[0.18em] text-muted-foreground/42">
              Paper chat
            </p>
          </div>
          {isPaidUser && selectedSubject ? (
            <div className="hidden max-w-[12rem] truncate text-right text-[11px] text-muted-foreground/55 sm:block md:hidden">
              {cleanSubjectTitle(selectedSubject)}
            </div>
          ) : null}
          {isPaidUser && data ? (
            <div className="ml-auto hidden items-center gap-2 md:flex">
              <Badge
                variant="outline"
                className={cn(
                  "rounded-full border-white/8 px-3 py-1 text-[11px]",
                  data.index.ready
                    ? "bg-red-500/10 text-red-100"
                    : "bg-amber-500/10 text-amber-100",
                )}
              >
                {data.index.ready
                  ? `${data.index.paperCount} papers · ${data.index.chunkCount} chunks`
                  : "Index missing"}
              </Badge>
            </div>
          ) : null}
        </div>
      </header>

      {isPaidUser ? (
        <div className="border-b border-white/6 bg-background/60 px-4 py-3 lg:hidden">
          <div className="mx-auto flex max-w-[1600px] rounded-full border border-white/8 bg-white/[0.03] p-1">
            <button
              type="button"
              onClick={() => setMobilePanel("workspace")}
              className={cn(
                "flex-1 rounded-full px-3 py-2 text-sm font-medium transition-all duration-150",
                mobilePanel === "workspace"
                  ? "bg-white text-black shadow-sm"
                  : "text-muted-foreground"
              )}
            >
              Workspace
            </button>
            <button
              type="button"
              onClick={() => setMobilePanel("chat")}
              className={cn(
                "flex-1 rounded-full px-3 py-2 text-sm font-medium transition-all duration-150",
                mobilePanel === "chat"
                  ? "bg-white text-black shadow-sm"
                  : "text-muted-foreground"
              )}
            >
              Chat
            </button>
          </div>
        </div>
      ) : null}

      <main
        className={cn(
          "relative mx-auto grid max-w-[1600px] gap-0 lg:grid-cols-[280px_minmax(0,1fr)] lg:overflow-hidden",
          isPaidUser ? "lg:h-[calc(100vh-61px)]" : "min-h-screen lg:h-screen",
        )}
      >
        {!isPaidUser ? (
          <div className="repeat-paywall-overlay absolute inset-0 z-30 flex items-start justify-center overflow-y-auto bg-black/42 px-4 py-4 backdrop-blur-[2px] sm:px-5 sm:py-8 lg:items-center">
            <div className="repeat-paywall-card w-full max-w-4xl overflow-hidden rounded-[1.55rem] border border-white/10 bg-[#0c0c0d]/92 shadow-[0_30px_80px_rgba(0,0,0,0.45)] backdrop-blur-xl sm:rounded-[2rem]">
              <div className="grid gap-0 lg:grid-cols-[1.06fr_0.94fr]">
                <div className="relative min-h-[190px] border-b border-white/8 bg-[radial-gradient(circle_at_top,#171717,transparent_58%)] p-4 sm:min-h-[260px] sm:p-6 lg:min-h-full lg:border-b-0 lg:border-r lg:border-white/8 lg:p-8">
                  <Image
                    src="/repeat-lock-illustration.svg"
                    alt="Repeat locked preview"
                    width={640}
                    height={420}
                    className="h-full w-full rounded-[1.4rem] object-cover"
                    priority
                  />
                </div>

                <div className="flex flex-col justify-center p-5 sm:p-6 lg:p-8">
                  <div className="inline-flex w-fit items-center gap-2 rounded-full border border-amber-400/14 bg-amber-400/8 px-3 py-1 text-[11px] font-medium text-amber-100">
                    <LockKeyhole className="size-3.5 text-amber-300" />
                    Repeat Pro
                  </div>

                  <h2 className="mt-4 text-[1.7rem] font-semibold leading-[1.02] tracking-[-0.04em] text-white sm:mt-5 sm:text-[2rem]">
                    Buy Repeat for Rs. 39.
                  </h2>

                  <p className="mt-3 text-[14px] leading-6 text-zinc-300 sm:mt-4 sm:text-[15px] sm:leading-7">
                    Find what actually repeats across the papers, cut down your revision time, and focus on the questions most likely to matter.
                  </p>

                  <div className="mt-6 space-y-3 text-[13px] text-zinc-400">
                    <p>See which questions repeat most across a subject.</p>
                    <p>Find the topics that show up again and again.</p>
                    <p>Use the same workspace for quick revision follow-ups.</p>
                  </div>

                  <div className="mt-7 flex flex-col gap-3 sm:mt-8 sm:flex-row sm:flex-wrap">
                    <Button asChild className="w-full rounded-full px-5 sm:w-auto">
                      <Link href={!isSignedIn ? "/auth" : "/profile"}>
                        Buy for Rs. 39
                      </Link>
                    </Button>
                    <Button
                      asChild
                      variant="outline"
                      className="w-full rounded-full px-5 sm:w-auto"
                    >
                      <Link href="/logic">Learn more</Link>
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : null}
        <aside
          className={cn(
            "border-b border-white/6 bg-black/10 lg:h-full lg:min-h-0 lg:border-b-0 lg:border-r lg:border-white/6",
            mobilePanel !== "workspace" && "hidden lg:block"
          )}
        >
          <div
            className={cn(
              "flex h-full min-h-0 flex-col",
              !isPaidUser &&
                "pointer-events-none select-none blur-[10px] saturate-50",
            )}
          >
            <div className="px-4 py-4 sm:px-5 sm:py-5">
              <div className="rounded-[1.5rem] bg-white/[0.02] p-4 ring-1 ring-white/6">
                <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground/45">
                  Workspace
                </p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Choose a year, then a subject. The latest paper stays in focus
                  automatically.
                </p>
              </div>
            </div>

            <ScrollArea className="lg:h-0 lg:min-h-0 lg:flex-1">
              <div className="space-y-4 px-4 py-4 sm:space-y-5 sm:px-5 sm:py-5">
                <Card className="overflow-hidden border-0 bg-transparent shadow-none">
                  <CardContent className="space-y-4 p-0">
                    {!data ? (
                      <>
                        <Skeleton className="h-10 w-full rounded-xl" />
                        <Skeleton className="h-10 w-full rounded-xl" />
                        <Skeleton className="h-10 w-full rounded-xl" />
                      </>
                    ) : (
                      <>
                        <div className="space-y-2">
                          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground/60">
                            Year
                          </p>
                          <Select
                            value={selectedYear}
                            onValueChange={setSelectedYear}
                          >
                            <SelectTrigger className="w-full rounded-xl border-white/8 bg-white/[0.03] shadow-none">
                              <SelectValue placeholder="Choose your year" />
                            </SelectTrigger>
                            <SelectContent>
                              {yearOptions.map((year) => (
                                <SelectItem key={year} value={year}>
                                  {year}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-3">
                          <div className="flex items-center justify-between gap-3">
                            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground/60">
                              Subjects
                            </p>
                            {selectedYear ? (
                              <Badge
                                variant="secondary"
                                className="rounded-full px-2.5"
                              >
                                {selectedYear}
                              </Badge>
                            ) : null}
                          </div>
                          <div className="space-y-3">
                            {groupedSubjects.map((group) => (
                              <div
                                key={group.label}
                                className="rounded-[1.2rem] bg-white/[0.02] p-3 ring-1 ring-white/6"
                              >
                                <div className="mb-3 flex items-center gap-2">
                                  <Layers3 className="size-3.5 text-muted-foreground" />
                                  <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground/65">
                                    {group.label}
                                  </p>
                                </div>
                                <div className="grid grid-cols-1 gap-2 min-[430px]:grid-cols-2">
                                  {group.items.map((subject) => {
                                    const active =
                                      subject.subjectKey === subjectKey;
                                    const code = extractCourseCode(
                                      subject.subjectName,
                                    );
                                    return (
                                      <button
                                        key={subject.subjectKey}
                                        type="button"
                                        onClick={() =>
                                          setSubjectKey(subject.subjectKey)
                                        }
                                        className={cn(
                                          "group min-w-0 rounded-[1.05rem] px-3 py-2.5 text-left transition-[transform,background-color,color,box-shadow] duration-180 [transition-timing-function:var(--ease-out)]",
                                          "hover:-translate-y-0.5 active:scale-[0.985]",
                                          active
                                            ? "bg-red-400/10 text-foreground shadow-[inset_0_0_0_1px_rgba(248,113,113,0.22)]"
                                            : "bg-white/[0.02] text-muted-foreground shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06)] hover:bg-white/[0.045] hover:text-foreground",
                                        )}
                                      >
                                        <div className="min-w-0">
                                          <p className="truncate text-sm font-medium">
                                            {cleanSubjectTitle(subject)}
                                          </p>
                                          <p className="mt-1 text-[11px] text-muted-foreground">
                                            {code ??
                                              `${subject.papers.length} papers`}
                                          </p>
                                        </div>
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="repeat-summary rounded-[1.4rem] p-4 ring-1 ring-white/6">
                          <div className="min-w-0">
                            <p className="truncate text-base font-semibold tracking-tight">
                              {selectedSubject
                                ? cleanSubjectTitle(selectedSubject)
                                : "Pick a subject"}
                            </p>
                            <p className="mt-1 text-sm text-muted-foreground">
                              {selectedSubject
                                ? `${selectedSubject.collectionLabel} · ${subjectPaperCount} papers`
                                : "Repeat maps common asks, likely topics, and grounded follow-ups."}
                            </p>
                          </div>

                          <Separator className="my-4 bg-white/6" />

                          <div className="grid gap-2">
                            <div className="rounded-xl border border-border/50 bg-background/55 px-3 py-2.5">
                              <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground/55">
                                Current scope
                              </p>
                              <p className="mt-1 text-sm text-foreground">
                                {selectedSubject
                                  ? `${cleanSubjectTitle(selectedSubject)} inside ${selectedYear}`
                                  : "Waiting for your subject"}
                              </p>
                            </div>
                            <div className="rounded-xl border border-border/50 bg-background/55 px-3 py-2.5">
                              <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground/55">
                                Latest paper anchor
                              </p>
                              <p className="mt-1 truncate text-sm text-foreground">
                                {latestPaper?.paperName ??
                                  "Auto-selected from the newest paper in this subject"}
                              </p>
                            </div>
                          </div>
                          {selectedSubject ? (
                            <Button
                              type="button"
                              onClick={() => setMobilePanel("chat")}
                              className="mt-4 w-full rounded-full lg:hidden"
                            >
                              Open chat
                            </Button>
                          ) : null}
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>

                {!data ? null : !data.index.ready ? (
                  <div className="rounded-2xl bg-amber-500/10 px-4 py-3 text-sm text-amber-100 ring-1 ring-amber-500/20">
                    Run <code className="font-mono">npm run repeat:index</code>{" "}
                    first.
                  </div>
                ) : null}

                <Card className="border-0 bg-white/[0.02] shadow-none ring-1 ring-white/6">
                  <CardContent className="space-y-4 p-4">
                    <div className="flex items-center gap-2">
                      <BookOpen className="size-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-semibold tracking-tight">
                          Subject snapshot
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Fills after Common exam questions, High-frequency topics, or Last-minute prep.
                        </p>
                      </div>
                    </div>
                    {sidebarQuestions.length ? (
                      <div className="grid gap-2">
                        {sidebarQuestions.map((item, index) => (
                          <div
                            key={`${item.title}-${item.citationIds.join("-")}-${index}`}
                            className="rounded-[1rem] border border-border/50 bg-background/45 px-3 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]"
                          >
                            <p className="text-sm font-medium leading-5 text-foreground">
                              {item.title}
                            </p>
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              {item.citationIds.map((citationId) => (
                                <Badge
                                  key={citationId}
                                  variant="secondary"
                                  className="rounded-full px-2 text-[10px]"
                                >
                                  {citationId}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="rounded-xl border border-dashed border-border/55 bg-background/45 px-3 py-4 text-sm leading-relaxed text-muted-foreground">
                        {lastAssistantEntry && !isRepeatSurveyIntent(lastAssistantEntry.response.queryIntent)
                          ? "Direct Q&A replies stay in the chat. Use “Common exam questions” (or Topics / Prep) to fill this crib sheet."
                          : "Use an overview action above and the latest highlights land here."}
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card className="border-0 bg-white/[0.02] shadow-none ring-1 ring-white/6">
                  <CardContent className="space-y-3 p-4">
                    <div className="flex items-center gap-2">
                      <FileText className="size-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-semibold tracking-tight">
                          Visual snapshot
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Current diagram support at a glance.
                        </p>
                      </div>
                    </div>
                    {visualSnapshot ? (
                      <div className="rounded-[1.2rem] border border-sky-500/20 bg-sky-500/[0.07] p-3">
                        <div className="flex flex-wrap gap-2">
                          <Badge
                            variant="outline"
                            className="border-sky-400/30 bg-sky-400/10 text-sky-100"
                          >
                            {visualSnapshot.citedDiagramCount} diagram cites
                          </Badge>
                          <Badge variant="secondary">
                            {visualSnapshot.visualContextCount} visual hints
                          </Badge>
                        </div>
                        <p className="mt-3 text-sm leading-6 text-foreground/90">
                          {visualSnapshot.summary}
                        </p>
                      </div>
                    ) : (
                      <div className="rounded-xl border border-dashed border-border/55 bg-background/45 px-3 py-4 text-sm text-muted-foreground">
                        Ask a diagram-heavy question and this panel will show
                        whether the answer is grounded in real visual evidence.
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </ScrollArea>
          </div>
        </aside>

        <section
          className={cn(
            "min-w-0 lg:h-full lg:min-h-0",
            mobilePanel !== "chat" && "hidden lg:block"
          )}
        >
          <div
            className={cn(
              "flex min-h-[calc(100vh-61px)] flex-col lg:h-full lg:min-h-0",
              !isPaidUser &&
                "pointer-events-none select-none blur-[10px] saturate-50",
            )}
          >
            {isPaidUser ? (
              <div className="border-b border-white/6 bg-white/[0.02] px-4 py-3 lg:hidden">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold tracking-tight text-foreground">
                      {selectedSubject
                        ? cleanSubjectTitle(selectedSubject)
                        : "Pick a subject to begin"}
                    </p>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      {selectedSubject
                        ? `${subjectPaperCount} papers in this workspace`
                        : "Open Workspace to choose a year and subject"}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setMobilePanel("workspace")}
                    className="rounded-full border-white/10 bg-white/[0.03] px-3 text-xs"
                  >
                    Workspace
                  </Button>
                </div>
              </div>
            ) : null}
            <ScrollArea className="lg:h-0 lg:min-h-0 lg:flex-1">
              <div className="px-4 py-5 sm:px-6 sm:py-8 lg:px-8">
                <div
                  className={cn(
                    "mx-auto flex w-full flex-1 flex-col",
                    readingWidthClass,
                  )}
                >
                  {error ? (
                    <div className="mb-4 flex items-start gap-3 rounded-[1.1rem] border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
                      <AlertCircle className="mt-0.5 size-4 shrink-0" />
                      <p>{error}</p>
                    </div>
                  ) : null}

                  {conversation.length === 0 ? (
                    <div className="flex flex-1 flex-col items-center justify-center py-16 text-center">
                      <div className="mb-6 flex flex-wrap items-center justify-center gap-2">
                        {selectedSubject ? (
                          <Badge
                            variant="outline"
                            className="rounded-full border-white/8 bg-white/[0.03] px-3 py-1 text-[11px] text-muted-foreground"
                          >
                            {cleanSubjectTitle(selectedSubject)} ·{" "}
                            {subjectPaperCount} papers
                          </Badge>
                        ) : null}
                        {latestPaper ? (
                          <Badge
                            variant="outline"
                            className="max-w-[22rem] truncate rounded-full border-white/8 bg-white/[0.03] px-3 py-1 text-[11px] text-muted-foreground"
                          >
                            Latest paper · {latestPaper.paperName}
                          </Badge>
                        ) : null}
                      </div>
                      <div className="repeat-empty-orb mb-6 flex size-16 items-center justify-center rounded-[1.8rem]">
                        <Sparkles className="size-5 text-foreground" />
                      </div>
                      <h2 className="text-[2rem] font-semibold tracking-[-0.04em] text-foreground sm:text-[2.35rem]">
                        Ask Repeat
                      </h2>
                      <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
                        Repeated questions, common topics, or a direct
                        explanation grounded in the selected papers.
                      </p>
                      <div className="mt-8 grid w-full max-w-3xl gap-3 sm:grid-cols-3">
                        {QUICK_ACTIONS.map((action, index) => {
                          const Icon = action.icon;
                          return (
                            <button
                              key={action.intent}
                              type="button"
                              disabled={!canRunCompare || busy}
                              onClick={() =>
                                submitQuery({
                                  mode: "compare",
                                  prompt: action.prompt,
                                  intent: action.intent,
                                })
                              }
                              className={cn(
                                "repeat-action-card group rounded-[1.25rem] p-4 text-left outline-none ring-1 ring-white/6",
                                "transition-[transform,background-color,box-shadow] duration-200 [transition-timing-function:var(--ease-out)] hover:-translate-y-0.5 hover:bg-white/[0.04] active:scale-[0.985] disabled:cursor-not-allowed disabled:opacity-50",
                                "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
                              )}
                              style={{ animationDelay: `${index * 35}ms` }}
                            >
                              <span className="mb-4 flex size-10 items-center justify-center rounded-2xl bg-black/16 text-muted-foreground transition-colors group-hover:text-foreground">
                                <Icon className="size-4" />
                              </span>
                              <p className="text-sm font-semibold tracking-tight">
                                {action.label}
                              </p>
                              <p className="mt-2 text-xs leading-5 text-muted-foreground">
                                {action.description}
                              </p>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <div className="min-w-0 space-y-5 pb-6">
                      {conversation.map((entry, index) =>
                        entry.role === "user" ? (
                          <div
                            key={`${entry.role}-${index}`}
                            className="flex justify-end"
                          >
                            <div className="repeat-user-bubble max-w-2xl rounded-[1.35rem] px-4 py-3 text-sm shadow-sm">
                              {entry.content}
                            </div>
                          </div>
                        ) : (
                          <div
                            key={`${entry.role}-${index}`}
                            className="w-full"
                          >
                            <RepeatAnswer
                              response={entry.response}
                              sessionId={sessionId}
                              subjectKey={subjectKey || undefined}
                              queryText={entry.queryText}
                            />
                          </div>
                        ),
                      )}
                      {busy ? (
                        <div className="repeat-loading-card rounded-[1.45rem] border border-white/[0.06] bg-white/[0.02] px-4 py-3.5 ring-1 ring-white/[0.05]">
                          <div className="flex items-center gap-3">
                            <span className="relative flex size-9 shrink-0 items-center justify-center rounded-full bg-red-500/10 ring-1 ring-red-500/20">
                              <Loader2 className="size-4 animate-spin text-red-400/90" />
                            </span>
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-foreground/90">Working on your answer</p>
                              <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                                Retrieving citations and drafting a grounded reply—usually a few seconds.
                              </p>
                            </div>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  )}
                </div>
              </div>
            </ScrollArea>

            <div className="sticky bottom-0 bg-[linear-gradient(180deg,rgba(11,12,14,0),rgba(11,12,14,0.9)_18%,rgba(11,12,14,0.98))] px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 sm:px-6 sm:pb-5 sm:pt-5 lg:px-8">
              <div className={cn("mx-auto w-full", readingWidthClass)}>
                <div className="repeat-composer rounded-[1.85rem] p-4 ring-1 ring-white/7">
                  {conversation.length > 0 ? (
                    <div className="mb-3 flex flex-wrap gap-2">
                      {QUICK_ACTIONS.map((action) => (
                        <button
                          key={`quick-inline-${action.intent}`}
                          type="button"
                          disabled={!canRunCompare || busy}
                          onClick={() =>
                            submitQuery({
                              mode: "compare",
                              prompt: action.prompt,
                              intent: action.intent,
                            })
                          }
                          className="rounded-full bg-white/[0.03] px-3 py-1.5 text-xs text-muted-foreground shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)] transition-[transform,background-color,color,box-shadow] duration-150 [transition-timing-function:var(--ease-out)] hover:bg-white/[0.05] hover:text-foreground active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {action.label}
                        </button>
                      ))}
                    </div>
                  ) : null}
                  <Textarea
                    value={prompt}
                    onChange={(event) => setPrompt(event.target.value)}
                    placeholder="Ask Repeat anything about this subject..."
                    className="min-h-24 resize-y rounded-[1.35rem] border-white/6 bg-black/16 shadow-none sm:min-h-28"
                  />
                  <div className="mt-3 flex flex-col items-stretch gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
                    <p className="text-xs leading-5 text-muted-foreground">
                      {selectedSubject
                        ? `Grounded in ${selectedSubject.subjectName}${latestPaper ? ` · latest paper: ${latestPaper.paperName}` : ""}.`
                        : "Choose a year and subject first."}
                    </p>
                    <Button
                      onClick={() =>
                        submitQuery({
                          mode: "chat",
                          prompt,
                          intent: "custom",
                        })
                      }
                      disabled={!canRunChat || busy}
                      className="w-full rounded-full px-4 sm:w-auto"
                    >
                      {busy ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <SendHorizontal className="size-4" />
                      )}
                      Ask Repeat
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
