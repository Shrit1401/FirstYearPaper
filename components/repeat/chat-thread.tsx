"use client";

import { AlertCircle, Loader2, Sparkles } from "lucide-react";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RepeatAnswer } from "@/components/repeat-answer";
import type { RepeatQueryResponse } from "@/lib/repeat-types";
import { cn } from "@/lib/utils";

type ConversationEntry =
  | { role: "user"; content: string }
  | { role: "assistant"; content: string; queryText: string; response: RepeatQueryResponse };

type QuickAction = {
  intent: "repeat_questions" | "common_topics" | "revision_list";
  label: string;
  description: string;
  prompt: string;
  icon: React.ComponentType<{ className?: string }>;
};

type Props = {
  conversation: ConversationEntry[];
  busy: boolean;
  stage: string;
  error?: string | null;
  readingWidthClass: string;
  selectedSubjectLabel?: string;
  subjectPaperCount: number;
  latestPaperName?: string | null;
  quickActions: QuickAction[];
  canRunCompare: boolean;
  onQuickAction: (action: QuickAction) => void;
  onRegenerate: (prompt: string) => void;
  onEditPrompt: (prompt: string) => void;
  sessionId: string;
  subjectKey?: string;
  /** Scroll to bottom when workspace or active thread changes */
  workspaceKey: string | null;
  activeThreadId: string;
};

function scrollThreadViewportToBottom(el: HTMLElement | null) {
  if (!el) return;
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      el.scrollTop = el.scrollHeight;
    });
  });
}

const STAGE_LABELS: Record<string, string> = {
  retrieving_sources: "Reading your papers…",
  drafting_answer: "Writing an answer…",
  finalizing_citations: "Checking citations…",
  done: "Done",
  cancelled: "Stopped",
};

export function ChatThread({
  conversation,
  busy,
  stage,
  error,
  readingWidthClass,
  selectedSubjectLabel,
  subjectPaperCount,
  latestPaperName,
  quickActions,
  canRunCompare,
  onQuickAction,
  onRegenerate,
  onEditPrompt,
  sessionId,
  subjectKey,
  workspaceKey,
  activeThreadId,
}: Props) {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const [showJump, setShowJump] = useState(false);
  const initialScrollDoneRef = useRef(false);
  const prevBusyRef = useRef(busy);

  const stageText = STAGE_LABELS[stage] ?? "Thinking…";
  const latestAssistant = useMemo(
    () =>
      [...conversation]
        .reverse()
        .find((entry): entry is Extract<ConversationEntry, { role: "assistant" }> => entry.role === "assistant") ??
      null,
    [conversation],
  );

  useLayoutEffect(() => {
    initialScrollDoneRef.current = false;
    scrollThreadViewportToBottom(viewportRef.current);
  }, [activeThreadId, workspaceKey]);

  useLayoutEffect(() => {
    if (conversation.length === 0) {
      initialScrollDoneRef.current = false;
      return;
    }
    if (!initialScrollDoneRef.current) {
      initialScrollDoneRef.current = true;
      scrollThreadViewportToBottom(viewportRef.current);
    }
  }, [conversation.length, workspaceKey, activeThreadId]);

  useLayoutEffect(() => {
    if (prevBusyRef.current && !busy && conversation.length > 0) {
      scrollThreadViewportToBottom(viewportRef.current);
    }
    prevBusyRef.current = busy;
  }, [busy, conversation.length]);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const threshold = 140;
    const distanceFromBottom = viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight;
    if (distanceFromBottom < threshold) {
      viewport.scrollTo({ top: viewport.scrollHeight, behavior: "smooth" });
    }
  }, [conversation, busy]);

  return (
    <div className="relative h-full min-h-0">
      <div
        ref={viewportRef}
        className="h-full min-h-0 overflow-y-auto overscroll-contain px-4 py-6 sm:px-6"
        onScroll={(event) => {
          const el = event.currentTarget;
          const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
          setShowJump(distanceFromBottom > 200);
        }}
      >
        <div className={cn("mx-auto flex w-full flex-col", readingWidthClass)}>
          {error ? (
            <div className="mb-4 flex items-start gap-3 rounded-xl border border-destructive/25 bg-destructive/10 p-3 text-sm text-destructive">
              <AlertCircle className="mt-0.5 size-4 shrink-0" />
              <p>{error}</p>
            </div>
          ) : null}

          {conversation.length === 0 ? (
            <div className="flex min-h-[min(420px,50vh)] flex-col items-center justify-center py-12 text-center">
              <div className="mb-8 flex size-14 items-center justify-center rounded-2xl bg-muted/50 text-muted-foreground">
                <Sparkles className="size-6" />
              </div>
              <h2 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                What do you want to revise?
              </h2>
              <p className="mt-2 max-w-md text-sm text-muted-foreground">
                Ask anything about the selected subject, or run an overview to see what repeats across papers.
              </p>
              <div className="mt-3 flex flex-wrap justify-center gap-2">
                {selectedSubjectLabel ? (
                  <Badge variant="secondary" className="rounded-full px-3 py-1 text-xs font-normal">
                    {selectedSubjectLabel} · {subjectPaperCount} papers
                  </Badge>
                ) : null}
                {latestPaperName ? (
                  <Badge variant="outline" className="max-w-xs truncate rounded-full px-3 py-1 text-xs font-normal">
                    {latestPaperName}
                  </Badge>
                ) : null}
              </div>
              <div className="mt-10 grid w-full max-w-2xl gap-2 sm:grid-cols-3 sm:gap-3">
                {quickActions.map((action) => {
                  const Icon = action.icon;
                  return (
                    <button
                      key={action.intent}
                      type="button"
                      disabled={!canRunCompare || busy}
                      onClick={() => onQuickAction(action)}
                      className="repeat-suggestion-tile flex flex-col items-start gap-3 p-4 text-left outline-none disabled:pointer-events-none disabled:opacity-40"
                    >
                      <span className="flex size-8 items-center justify-center rounded-lg bg-muted/60 text-muted-foreground">
                        <Icon className="size-4" />
                      </span>
                      <span>
                        <span className="block text-sm font-medium text-foreground">{action.label}</span>
                        <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">{action.description}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="min-w-0 space-y-6 pb-8">
              {conversation.map((entry, index) =>
                entry.role === "user" ? (
                  <div key={`${entry.role}-${index}`} className="flex justify-end">
                    <div className="repeat-user-pill max-w-[min(100%,36rem)] px-4 py-2.5 text-[15px] leading-relaxed">
                      {entry.content}
                    </div>
                  </div>
                ) : (
                  <div key={`${entry.role}-${index}`} className="w-full">
                    <RepeatAnswer
                      response={entry.response}
                      sessionId={sessionId}
                      subjectKey={subjectKey}
                      queryText={entry.queryText}
                      onRegenerate={() => onRegenerate(entry.queryText)}
                      onEditPrompt={() => onEditPrompt(entry.queryText)}
                    />
                  </div>
                ),
              )}
              {busy ? (
                <div className="flex items-center gap-3 rounded-xl border border-border/40 bg-muted/20 px-4 py-3">
                  <Loader2 className="size-4 shrink-0 animate-spin text-muted-foreground" />
                  <div className="min-w-0">
                    <p className="text-sm text-foreground">Repeat</p>
                    <p className="text-xs text-muted-foreground">{stageText}</p>
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </div>
      </div>

      {showJump && conversation.length > 0 ? (
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="absolute bottom-4 right-4 rounded-full border border-border/60 shadow-md"
          onClick={() => {
            const viewport = viewportRef.current;
            if (!viewport) return;
            viewport.scrollTo({ top: viewport.scrollHeight, behavior: "smooth" });
          }}
        >
          Jump to latest
        </Button>
      ) : null}

      {latestAssistant?.response.citations.length === 0 ? (
        <p className="sr-only">No citations available.</p>
      ) : null}
    </div>
  );
}
