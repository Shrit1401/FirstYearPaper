"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  Brain,
  ChevronDown,
  Clock,
  LockKeyhole,
  SearchCheck,
} from "lucide-react";
import {
  type RepeatChatTurn,
  type RepeatIndexStatus,
  type RepeatQueryResponse,
  type RepeatSubjectOption,
} from "@/lib/repeat-types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { WorkspaceSidebar } from "@/components/repeat/workspace-sidebar";
import { ChatThread } from "@/components/repeat/chat-thread";
import { ChatComposer } from "@/components/repeat/chat-composer";
import { useAuth } from "@/components/auth-provider";
import { coerceIsPaid } from "@/lib/supabase/user-profile";
import { getRepeatSessionId } from "@/lib/repeat-events-client";
import { cn } from "@/lib/utils";
import { useRepeatQuery } from "@/app/repeat/use-repeat-query";

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

type RepeatThreadRecord = {
  id: string;
  title: string;
  updatedAt: number;
  messages: ConversationEntry[];
};

type ThreadBundle = {
  activeThreadId: string;
  threads: RepeatThreadRecord[];
};

const THREADS_STORAGE_PREFIX = "repeat-threads:";
const LEGACY_CONVERSATION_PREFIX = "repeat-conversation:";

function deriveThreadTitle(messages: ConversationEntry[]): string {
  const first = messages.find((m) => m.role === "user");
  if (!first || first.role !== "user") return "New chat";
  const raw = first.content.replace(/\s+/g, " ").trim();
  if (!raw) return "New chat";
  return raw.length > 50 ? `${raw.slice(0, 50)}…` : raw;
}

function createEmptyThreadBundle(): ThreadBundle {
  const id =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `t-${Date.now()}`;
  return {
    activeThreadId: id,
    threads: [{ id, title: "New chat", updatedAt: Date.now(), messages: [] }],
  };
}

function loadThreadBundle(workspaceKey: string): ThreadBundle {
  if (typeof window === "undefined") return createEmptyThreadBundle();
  try {
    const raw = window.localStorage.getItem(
      `${THREADS_STORAGE_PREFIX}${workspaceKey}`,
    );
    if (raw) {
      const parsed = JSON.parse(raw) as ThreadBundle;
      if (parsed?.threads?.length && parsed.activeThreadId) {
        const hasActive = parsed.threads.some(
          (t) => t.id === parsed.activeThreadId,
        );
        return {
          ...parsed,
          activeThreadId: hasActive
            ? parsed.activeThreadId
            : parsed.threads[0]!.id,
        };
      }
    }
    const legacy = window.localStorage.getItem(
      `${LEGACY_CONVERSATION_PREFIX}${workspaceKey}`,
    );
    if (legacy) {
      const messages = JSON.parse(legacy) as ConversationEntry[];
      if (Array.isArray(messages) && messages.length > 0) {
        const id =
          typeof crypto !== "undefined" && "randomUUID" in crypto
            ? crypto.randomUUID()
            : `m-${Date.now()}`;
        const bundle: ThreadBundle = {
          activeThreadId: id,
          threads: [
            {
              id,
              title: deriveThreadTitle(messages),
              updatedAt: Date.now(),
              messages,
            },
          ],
        };
        try {
          window.localStorage.setItem(
            `${THREADS_STORAGE_PREFIX}${workspaceKey}`,
            JSON.stringify(bundle),
          );
          window.localStorage.removeItem(
            `${LEGACY_CONVERSATION_PREFIX}${workspaceKey}`,
          );
        } catch {
          // ignore
        }
        return bundle;
      }
    }
  } catch {
    // fall through
  }
  return createEmptyThreadBundle();
}

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
    label: "Study tonight",
    description:
      "1-2 hours before your exam — highest-priority topics ordered by payoff.",
    prompt:
      "I have limited time before my exam. Give me the absolute highest-priority topics and most repeated questions to focus on right now, ordered by exam payoff.",
    icon: Clock,
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
  const {
    busy,
    error: queryError,
    stage,
    submit,
    cancel,
    setError: setQueryError,
  } = useRepeatQuery();
  const [sessionId, setSessionId] = useState("anonymous");
  const [data, setData] = useState<IndexPayload | null>(null);
  const [indexError, setIndexError] = useState<string | null>(null);
  const [selectedYear, setSelectedYear] = useState("");
  const [selectedBranch, setSelectedBranch] = useState("");
  const [subjectKey, setSubjectKey] = useState("");
  const [prompt, setPrompt] = useState("");
  const [mobilePanel, setMobilePanel] = useState<"workspace" | "chat">(
    "workspace",
  );
  const [threadBundle, setThreadBundle] = useState<ThreadBundle>(() =>
    createEmptyThreadBundle(),
  );
  const isSignedIn = Boolean(user);
  const isPaidUser = Boolean(profile && coerceIsPaid(profile.is_paid));
  // True while we're still waiting for auth or profile to settle — prevents paywall flash
  const accessLoading = authLoading || Boolean(session && !profile);
  const workspaceStorageKey = useMemo(
    () => (selectedYear && subjectKey ? `${selectedYear}:${subjectKey}` : null),
    [selectedYear, subjectKey],
  );

  const conversation = useMemo(() => {
    const t = threadBundle.threads.find(
      (x) => x.id === threadBundle.activeThreadId,
    );
    return t?.messages ?? [];
  }, [threadBundle]);

  function patchActiveThreadMessages(
    updater:
      | ConversationEntry[]
      | ((prev: ConversationEntry[]) => ConversationEntry[]),
  ) {
    setThreadBundle((prev) => {
      const threads = prev.threads.map((t) => {
        if (t.id !== prev.activeThreadId) return t;
        const messages =
          typeof updater === "function" ? updater(t.messages) : updater;
        return {
          ...t,
          messages,
          updatedAt: Date.now(),
          title: deriveThreadTitle(messages),
        };
      });
      return { ...prev, threads };
    });
  }

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
          throw new Error(
            payload.error ?? "Failed to load repeat index metadata.",
          );
        }

        const payload = (await response.json()) as IndexPayload;
        if (cancelled) return;
        setData(payload);
        setIndexError(null);
      } catch (loadError) {
        if (cancelled) return;
        setIndexError(
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
  const branchOptions = useMemo(
    () =>
      Array.from(
        new Set(
          filteredSubjects
            .map((subject) => subject.branchName)
            .filter((value): value is string => Boolean(value)),
        ),
      ).sort((a, b) => a.localeCompare(b)),
    [filteredSubjects],
  );
  const branchFilteredSubjects = useMemo(
    () =>
      selectedBranch
        ? filteredSubjects.filter((subject) => subject.branchName === selectedBranch)
        : filteredSubjects,
    [filteredSubjects, selectedBranch],
  );
  const selectedSubject = useMemo(
    () =>
      filteredSubjects.find((subject) => subject.subjectKey === subjectKey) ??
      null,
    [filteredSubjects, subjectKey],
  );
  const groupedSubjects = useMemo(() => {
    const groups = new Map<string, RepeatSubjectOption[]>();

    for (const subject of branchFilteredSubjects) {
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
  }, [branchFilteredSubjects]);
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
  const latestAssistantResponse = useMemo(
    () =>
      [...conversation]
        .reverse()
        .find(
          (entry): entry is Extract<ConversationEntry, { role: "assistant" }> =>
            entry.role === "assistant",
        )?.response ?? null,
    [conversation],
  );

  useEffect(() => {
    if (!selectedYear && yearOptions.length > 0) {
      setSelectedYear(yearOptions[0]!);
    }
  }, [selectedYear, yearOptions]);

  useEffect(() => {
    if (branchOptions.length > 0) {
      setSelectedBranch((prev) =>
        branchOptions.includes(prev) ? prev : (branchOptions[0] ?? ""),
      );
    } else {
      setSelectedBranch("");
    }
  }, [branchOptions]);

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

  useEffect(() => {
    if (!workspaceStorageKey) return;
    setThreadBundle(loadThreadBundle(workspaceStorageKey));
  }, [workspaceStorageKey]);

  useEffect(() => {
    if (!workspaceStorageKey) return;
    try {
      window.localStorage.setItem(
        `${THREADS_STORAGE_PREFIX}${workspaceStorageKey}`,
        JSON.stringify(threadBundle),
      );
    } catch {
      // Ignore storage failures.
    }
  }, [threadBundle, workspaceStorageKey]);

  const indexReady = data?.index.ready ?? false;

  const indexSummary = useMemo(() => {
    if (!data) return null;
    if (data.index.ready) {
      const papers = data.index.paperCount ?? "?";
      const chunks = data.index.chunkCount ?? "?";
      return `${papers} papers · ${chunks} chunks`;
    }
    return data.index.source === "supabase"
      ? "Supabase index empty"
      : "Local index missing";
  }, [data]);

  function handleNewChat() {
    const id =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `t-${Date.now()}`;
    setThreadBundle((prev) => ({
      activeThreadId: id,
      threads: [
        { id, title: "New chat", updatedAt: Date.now(), messages: [] },
        ...prev.threads,
      ].slice(0, 50),
    }));
    setPrompt("");
    setQueryError(null);
    setMobilePanel("chat");
  }

  function handleSelectThread(threadId: string) {
    setThreadBundle((prev) => ({ ...prev, activeThreadId: threadId }));
    setPrompt("");
    setQueryError(null);
    setMobilePanel("chat");
  }

  async function submitQuery(args: {
    mode: "compare" | "chat";
    prompt: string;
    intent?: "repeat_questions" | "common_topics" | "revision_list" | "custom";
  }) {
    setMobilePanel("chat");

    const userContent = args.prompt.trim();
    if (!userContent) return;

    const history: RepeatChatTurn[] = conversation.map((entry) => ({
      role: entry.role,
      content: entry.content,
    }));

    patchActiveThreadMessages((entries) => [
      ...entries,
      { role: "user", content: userContent },
    ]);

    try {
      if (!session?.access_token) throw new Error("Please sign in again.");
      const payload = await submit({
        mode: args.mode,
        prompt: userContent,
        intent: args.intent ?? "custom",
        subjectKey: subjectKey || undefined,
        currentPaperId: latestPaper?.paperId,
        sessionId,
        history,
        token: session.access_token,
      });
      patchActiveThreadMessages((entries) => [
        ...entries,
        {
          role: "assistant",
          content: payload.answerMarkdown,
          queryText: userContent,
          response: payload,
        },
      ]);
      setPrompt("");
    } catch {
      patchActiveThreadMessages((entries) => {
        const last = entries[entries.length - 1];
        if (last?.role === "user" && last.content === userContent) {
          return entries.slice(0, -1);
        }
        return entries;
      });
    }
  }

  const canRunCompare = indexReady && Boolean(selectedYear && subjectKey);
  const canRunChat =
    indexReady && Boolean(subjectKey) && prompt.trim().length > 0;
  const readingWidthClass = "max-w-3xl";
  const selectedSubjectTitle = selectedSubject
    ? cleanSubjectTitle(selectedSubject)
    : "";
  const uiError = indexError ?? queryError;

  if (accessLoading) {
    return (
      <div className="repeat-chatgpt-shell min-h-dvh bg-background">
        <div className="mx-auto flex min-h-dvh max-w-2xl items-center justify-center px-6">
          <div className="text-sm text-muted-foreground">
            Loading Repeat access…
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "repeat-chatgpt-shell flex min-h-dvh flex-col bg-background",
        isPaidUser && "lg:h-dvh lg:overflow-hidden",
      )}
    >
      <header
        className={cn(
          "sticky top-0 z-20 shrink-0 border-b border-border/50 bg-background/95 backdrop-blur-sm",
          isPaidUser && "lg:hidden",
        )}
      >
        <div className="mx-auto flex max-w-[1600px] items-center gap-3 px-4 py-2.5 sm:px-5">
          <Link
            href="/"
            className="flex size-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
            aria-label="Back home"
          >
            <ArrowLeft className="size-4" />
          </Link>
          <div className="min-w-0 flex-1">
            <h1 className="text-base font-semibold tracking-tight">Repeat</h1>
            <p className="text-[11px] text-muted-foreground">
              Paper-grounded chat
            </p>
          </div>
          {!isPaidUser && data ? (
            <Badge
              variant="outline"
              className={cn(
                "shrink-0 rounded-full px-2.5 py-0.5 text-[10px]",
                data.index.ready
                  ? "border-emerald-500/30 text-emerald-200"
                  : "border-amber-500/30 text-amber-100",
              )}
            >
              {data.index.ready ? "Index ready" : "Index"}
            </Badge>
          ) : null}
        </div>
      </header>

      {isPaidUser ? (
        <div className="shrink-0 border-b border-border/50 bg-muted/20 px-3 py-2 lg:hidden">
          <div className="mx-auto flex max-w-lg rounded-full bg-muted/50 p-0.5">
            <button
              type="button"
              onClick={() => setMobilePanel("workspace")}
              className={cn(
                "flex-1 rounded-full px-3 py-2 text-sm font-medium transition-colors",
                mobilePanel === "workspace"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground",
              )}
            >
              Workspace
            </button>
            <button
              type="button"
              onClick={() => setMobilePanel("chat")}
              className={cn(
                "flex-1 rounded-full px-3 py-2 text-sm font-medium transition-colors",
                mobilePanel === "chat"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground",
              )}
            >
              Chat
            </button>
          </div>
        </div>
      ) : null}

      <main
        className={cn(
          "relative mx-auto w-full max-w-[1600px] flex-1 lg:grid lg:grid-cols-[280px_minmax(0,1fr)]",
          isPaidUser ? "min-h-0 lg:overflow-hidden" : "min-h-0",
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
                    Find what actually repeats across the papers, cut down your
                    revision time, and focus on the questions most likely to
                    matter.
                  </p>

                  <div className="mt-6 space-y-3 text-[13px] text-zinc-400">
                    <p>See which questions repeat most across a subject.</p>
                    <p>Find the topics that show up again and again.</p>
                    <p>Use the same workspace for quick revision follow-ups.</p>
                  </div>

                  <div className="mt-7 flex flex-col gap-3 sm:mt-8 sm:flex-row sm:flex-wrap">
                    <Button
                      asChild
                      className="w-full rounded-full px-5 sm:w-auto"
                    >
                      {isSignedIn ? (
                        <button
                          type="button"
                          onClick={() => {
                            alert(
                              "We're making the payment portal. Stay tuned!",
                            );
                          }}
                        >
                          Buy for Rs. 39
                        </button>
                      ) : (
                        <Link href="/auth">Buy for Rs. 39</Link>
                      )}
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
        <WorkspaceSidebar
          isPaidUser={isPaidUser}
          mobileVisible={mobilePanel === "workspace"}
          dataReady={Boolean(data)}
          indexReady={indexReady}
          indexSource={data?.index.source}
          indexSummary={isPaidUser ? indexSummary : null}
          onNewChat={isPaidUser ? handleNewChat : undefined}
          chatThreads={
            isPaidUser && workspaceStorageKey
              ? [...threadBundle.threads].sort(
                  (a, b) => b.updatedAt - a.updatedAt,
                )
              : []
          }
          activeThreadId={threadBundle.activeThreadId}
          onSelectThread={isPaidUser ? handleSelectThread : undefined}
          selectedYear={selectedYear}
          setSelectedYear={setSelectedYear}
          yearOptions={yearOptions}
          selectedBranch={selectedBranch}
          setSelectedBranch={setSelectedBranch}
          branchOptions={branchOptions}
          groupedSubjects={groupedSubjects}
          subjectKey={subjectKey}
          setSubjectKey={setSubjectKey}
          selectedSubject={selectedSubject}
          selectedSubjectTitle={selectedSubjectTitle}
          subjectPaperCount={subjectPaperCount}
          latestPaperName={latestPaper?.paperName}
          onOpenChatMobile={() => setMobilePanel("chat")}
          latestAssistantResponse={latestAssistantResponse}
          cleanSubjectTitle={cleanSubjectTitle}
          extractCourseCode={extractCourseCode}
        />

        <section
          className={cn(
            "flex min-h-0 min-w-0 flex-col border-border/40 lg:min-h-0 lg:border-l",
            mobilePanel !== "chat" && "hidden lg:flex",
          )}
        >
          <div
            className={cn(
              "flex min-h-0 flex-1 flex-col",
              !isPaidUser &&
                "pointer-events-none select-none blur-[10px] saturate-50",
            )}
          >
            {isPaidUser ? (
              <>
                <div className="hidden h-12 shrink-0 items-center justify-center border-b border-border/40 px-4 lg:flex">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        className="inline-flex max-w-xs items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-semibold text-foreground transition-colors hover:bg-muted/50"
                      >
                        <span className="truncate">
                          {selectedSubject ? cleanSubjectTitle(selectedSubject) : "Pick a subject"}
                        </span>
                        <ChevronDown className="size-3.5 shrink-0 opacity-50" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="center" className="w-64">
                      <DropdownMenuLabel className="text-[11px] uppercase tracking-wider text-muted-foreground/70">
                        {selectedBranch
                          ? `${selectedYear} · ${selectedBranch}`
                          : selectedYear || "Subjects"}
                      </DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      {branchFilteredSubjects.length === 0 ? (
                        <DropdownMenuItem disabled>
                          Select year & branch in sidebar
                        </DropdownMenuItem>
                      ) : (
                        branchFilteredSubjects.map((subject) => (
                          <DropdownMenuItem
                            key={subject.subjectKey}
                            onClick={() => setSubjectKey(subject.subjectKey)}
                            className={cn(
                              subject.subjectKey === subjectKey && "bg-muted/60 font-medium",
                            )}
                          >
                            {cleanSubjectTitle(subject)}
                          </DropdownMenuItem>
                        ))
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <div className="border-b border-border/40 bg-muted/15 px-4 py-2.5 lg:hidden">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">
                        {selectedSubject
                          ? cleanSubjectTitle(selectedSubject)
                          : "Pick a subject"}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {selectedSubject
                          ? `${subjectPaperCount} papers`
                          : "Open Workspace first"}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setMobilePanel("workspace")}
                      className="shrink-0 rounded-full text-xs"
                    >
                      Workspace
                    </Button>
                  </div>
                </div>
              </>
            ) : null}
            <div className="min-h-0 flex-1">
              <ChatThread
                conversation={conversation}
                busy={busy}
                stage={stage}
                error={uiError}
                readingWidthClass={readingWidthClass}
                selectedSubjectLabel={selectedSubjectTitle}
                subjectPaperCount={subjectPaperCount}
                latestPaperName={latestPaper?.paperName}
                quickActions={QUICK_ACTIONS}
                canRunCompare={canRunCompare}
                onQuickAction={(action) =>
                  void submitQuery({
                    mode: "compare",
                    prompt: action.prompt,
                    intent: action.intent,
                  })
                }
                onRegenerate={(query) =>
                  void submitQuery({
                    mode: "chat",
                    prompt: query,
                    intent: "custom",
                  })
                }
                onEditPrompt={(query) => setPrompt(query)}
                onAskQuestion={(question) => {
                  setPrompt(question);
                  setMobilePanel("chat");
                  // Focus the textarea after state update
                  window.setTimeout(() => {
                    const el = document.querySelector<HTMLTextAreaElement>(".repeat-composer-textarea");
                    if (el) { el.focus(); el.setSelectionRange(el.value.length, el.value.length); }
                  }, 50);
                }}
                sessionId={sessionId}
                subjectKey={subjectKey || undefined}
                workspaceKey={workspaceStorageKey}
                activeThreadId={threadBundle.activeThreadId}
              />
            </div>

            <div className="shrink-0 border-t border-border/40 bg-background px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 sm:px-6 sm:pb-4 sm:pt-4">
              <div className={cn("mx-auto w-full", readingWidthClass)}>
                <ChatComposer
                  prompt={prompt}
                  setPrompt={setPrompt}
                  busy={busy}
                  canRunChat={canRunChat}
                  canRunCompare={canRunCompare}
                  quickActions={QUICK_ACTIONS.map((action) => ({
                    intent: action.intent,
                    label: action.label,
                    description: action.description,
                    prompt: action.prompt,
                  }))}
                  subjectLine={
                    selectedSubject
                      ? `Grounded in ${selectedSubject.subjectName}${latestPaper ? ` · latest paper: ${latestPaper.paperName}` : ""}.`
                      : "Choose a year and subject first."
                  }
                  onSubmitChat={() =>
                    void submitQuery({
                      mode: "chat",
                      prompt,
                      intent: "custom",
                    })
                  }
                  onQuickAction={(action) =>
                    void submitQuery({
                      mode: "compare",
                      prompt: action.prompt,
                      intent: action.intent,
                    })
                  }
                  onCancel={cancel}
                />
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
