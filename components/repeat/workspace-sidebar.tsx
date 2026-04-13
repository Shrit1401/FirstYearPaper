"use client";

import { ArrowLeft, BookOpen, FileText, Layers3, MessageSquare, SquarePen } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { isRepeatSurveyIntent, repeatSidebarInsights, type RepeatQueryResponse, type RepeatSubjectOption } from "@/lib/repeat-types";

type GroupedSubjects = {
  label: string;
  items: RepeatSubjectOption[];
};

export type SidebarChatThread = {
  id: string;
  title: string;
  updatedAt: number;
};

type Props = {
  isPaidUser: boolean;
  mobileVisible: boolean;
  dataReady: boolean;
  indexReady: boolean;
  indexSource?: "local" | "supabase";
  indexSummary?: string | null;
  onNewChat?: () => void;
  chatThreads?: SidebarChatThread[];
  activeThreadId?: string;
  onSelectThread?: (threadId: string) => void;
  selectedYear: string;
  setSelectedYear: (value: string) => void;
  yearOptions: string[];
  groupedSubjects: GroupedSubjects[];
  subjectKey: string;
  setSubjectKey: (value: string) => void;
  selectedSubject: RepeatSubjectOption | null;
  selectedSubjectTitle: string;
  subjectPaperCount: number;
  latestPaperName?: string | null;
  onOpenChatMobile: () => void;
  latestAssistantResponse: RepeatQueryResponse | null;
  cleanSubjectTitle: (subject: RepeatSubjectOption) => string;
  extractCourseCode: (subjectName: string) => string | null;
};

export function WorkspaceSidebar({
  isPaidUser,
  mobileVisible,
  dataReady,
  indexReady,
  indexSource,
  indexSummary,
  onNewChat,
  chatThreads = [],
  activeThreadId,
  onSelectThread,
  selectedYear,
  setSelectedYear,
  yearOptions,
  groupedSubjects,
  subjectKey,
  setSubjectKey,
  selectedSubject,
  selectedSubjectTitle,
  subjectPaperCount,
  latestPaperName,
  onOpenChatMobile,
  latestAssistantResponse,
  cleanSubjectTitle,
  extractCourseCode,
}: Props) {
  const sidebarQuestions =
    latestAssistantResponse && isRepeatSurveyIntent(latestAssistantResponse.queryIntent)
      ? repeatSidebarInsights(latestAssistantResponse).slice(0, 5)
      : [];
  const visualSnapshot = latestAssistantResponse?.diagramSupport ?? null;

  return (
    <aside
      className={cn(
        "repeat-chat-sidebar border-b border-border/60 lg:h-full lg:min-h-0 lg:border-b-0 lg:border-r",
        !mobileVisible && "hidden lg:block",
      )}
    >
      <div className={cn("flex h-full min-h-0 flex-col", !isPaidUser && "pointer-events-none select-none blur-[10px] saturate-50")}>
        <div className="flex shrink-0 items-center gap-1 border-b border-border/50 px-2 py-2">
          <Link
            href="/"
            className="flex size-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
            aria-label="Back home"
          >
            <ArrowLeft className="size-4" />
          </Link>
          {onNewChat ? (
            <button
              type="button"
              onClick={onNewChat}
              className="flex size-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
              aria-label="New chat"
              title="New chat"
            >
              <SquarePen className="size-4" />
            </button>
          ) : null}
        </div>

        {chatThreads.length > 0 && onSelectThread && activeThreadId ? (
          <div className="shrink-0 border-b border-border/50 px-3 pb-3 pt-1">
            <div className="flex items-center gap-2">
              <MessageSquare className="size-3.5 text-muted-foreground" />
              <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground/60">Chats</p>
            </div>
            <div className="mt-2 max-h-[min(32vh,220px)] space-y-0.5 overflow-y-auto overscroll-contain pr-0.5">
              {chatThreads.map((thread) => {
                const active = thread.id === activeThreadId;
                return (
                  <button
                    key={thread.id}
                    type="button"
                    onClick={() => onSelectThread(thread.id)}
                    className={cn(
                      "flex w-full min-w-0 rounded-lg px-2.5 py-2 text-left text-[13px] leading-snug transition-colors duration-150",
                      active
                        ? "bg-muted/80 font-medium text-foreground"
                        : "text-muted-foreground hover:bg-muted/45 hover:text-foreground",
                    )}
                  >
                    <span className="truncate">{thread.title}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}

        <div className="px-3 py-3">
          <p className="text-xs font-medium text-foreground">Workspace</p>
          <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
            Year, subject, then chat. Latest paper is the default anchor.
          </p>
        </div>

        <ScrollArea className="lg:h-0 lg:min-h-0 lg:flex-1">
          <div className="space-y-3 px-3 pb-4 pt-1 sm:space-y-4">
            <Card className="overflow-hidden border-0 bg-transparent shadow-none">
              <CardContent className="space-y-4 p-0">
                {!dataReady ? (
                  <>
                    <Skeleton className="h-10 w-full rounded-xl" />
                    <Skeleton className="h-10 w-full rounded-xl" />
                    <Skeleton className="h-10 w-full rounded-xl" />
                  </>
                ) : (
                  <>
                    <div className="space-y-2">
                      <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground/60">Year</p>
                      <Select value={selectedYear} onValueChange={setSelectedYear}>
                        <SelectTrigger className="w-full rounded-xl border-border/60 bg-muted/30 shadow-none">
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
                        <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground/60">Subjects</p>
                        {selectedYear ? (
                          <Badge variant="secondary" className="rounded-full px-2.5">
                            {selectedYear}
                          </Badge>
                        ) : null}
                      </div>
                      <div className="space-y-3">
                        {groupedSubjects.map((group) => (
                          <div key={group.label} className="rounded-xl border border-border/50 bg-muted/20 p-3">
                            <div className="mb-3 flex items-center gap-2">
                              <Layers3 className="size-3.5 text-muted-foreground" />
                              <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground/65">
                                {group.label}
                              </p>
                            </div>
                            <div className="grid grid-cols-1 gap-2 min-[430px]:grid-cols-2">
                              {group.items.map((subject) => {
                                const active = subject.subjectKey === subjectKey;
                                const code = extractCourseCode(subject.subjectName);
                                return (
                                  <button
                                    key={subject.subjectKey}
                                    type="button"
                                    onClick={() => setSubjectKey(subject.subjectKey)}
                                    className={cn(
                                      "group min-w-0 rounded-lg px-3 py-2 text-left text-sm transition-colors duration-150",
                                      active
                                        ? "bg-muted/80 text-foreground"
                                        : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
                                    )}
                                  >
                                    <div className="min-w-0">
                                      <p className="truncate text-sm font-medium">{cleanSubjectTitle(subject)}</p>
                                      <p className="mt-1 text-[11px] text-muted-foreground">{code ?? `${subject.papers.length} papers`}</p>
                                    </div>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="repeat-summary rounded-xl border border-border/50 p-3">
                      <div className="min-w-0">
                        <p className="truncate text-base font-semibold tracking-tight">{selectedSubjectTitle || "Pick a subject"}</p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {selectedSubject
                            ? `${selectedSubject.collectionLabel} · ${subjectPaperCount} papers`
                            : "Repeat maps common asks, likely topics, and grounded follow-ups."}
                        </p>
                      </div>
                      <Separator className="my-3 bg-border/60" />
                      <div className="grid gap-2">
                        <div className="rounded-xl border border-border/50 bg-background/55 px-3 py-2.5">
                          <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground/55">Current scope</p>
                          <p className="mt-1 text-sm text-foreground">
                            {selectedSubject ? `${selectedSubjectTitle} inside ${selectedYear}` : "Waiting for your subject"}
                          </p>
                        </div>
                        <div className="rounded-xl border border-border/50 bg-background/55 px-3 py-2.5">
                          <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground/55">Latest paper anchor</p>
                          <p className="mt-1 truncate text-sm text-foreground">
                            {latestPaperName ?? "Auto-selected from the newest paper in this subject"}
                          </p>
                        </div>
                      </div>
                      {selectedSubject ? (
                        <Button type="button" onClick={onOpenChatMobile} className="mt-4 w-full rounded-full lg:hidden">
                          Open chat
                        </Button>
                      ) : null}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {!dataReady ? null : !indexReady ? (
              <div className="rounded-2xl bg-amber-500/10 px-4 py-3 text-sm text-amber-100 ring-1 ring-amber-500/20">
                {indexSource === "supabase" ? (
                  <>
                    Repeat is set to load embeddings from Supabase, but <code className="font-mono">repeat_papers</code> /{" "}
                    <code className="font-mono">repeat_chunks</code> are empty or metadata is missing.
                  </>
                ) : (
                  <>Run <code className="font-mono">npm run repeat:index</code> first.</>
                )}
              </div>
            ) : null}

            <Card className="border border-border/50 bg-transparent shadow-none">
              <CardContent className="space-y-3 p-3">
                <div className="flex items-center gap-2">
                  <BookOpen className="size-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-semibold tracking-tight">Subject snapshot</p>
                    <p className="text-xs text-muted-foreground">Fills after overview actions.</p>
                  </div>
                </div>
                {sidebarQuestions.length ? (
                  <div className="grid gap-2">
                    {sidebarQuestions.map((item, index) => (
                      <div
                        key={`${item.title}-${item.citationIds.join("-")}-${index}`}
                        className="rounded-[1rem] border border-border/50 bg-background/45 px-3 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]"
                      >
                        <p className="text-sm font-medium leading-5 text-foreground">{item.title}</p>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {item.citationIds.map((citationId) => (
                            <Badge key={citationId} variant="secondary" className="rounded-full px-2 text-[10px]">
                              {citationId}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-border/55 bg-background/45 px-3 py-4 text-sm leading-relaxed text-muted-foreground">
                    Use an overview action and the latest highlights land here.
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border border-border/50 bg-transparent shadow-none">
              <CardContent className="space-y-3 p-3">
                <div className="flex items-center gap-2">
                  <FileText className="size-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-semibold tracking-tight">Visual snapshot</p>
                    <p className="text-xs text-muted-foreground">Current diagram support at a glance.</p>
                  </div>
                </div>
                {visualSnapshot ? (
                  <div className="rounded-lg border border-sky-500/20 bg-sky-500/10 p-3">
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline" className="border-sky-400/30 bg-sky-400/10 text-sky-100">
                        {visualSnapshot.citedDiagramCount} diagram cites
                      </Badge>
                      <Badge variant="secondary">{visualSnapshot.visualContextCount} visual hints</Badge>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-foreground/90">{visualSnapshot.summary}</p>
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-border/55 bg-background/45 px-3 py-4 text-sm text-muted-foreground">
                    Ask a diagram-heavy question and this panel will show whether the answer is grounded in real visual evidence.
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </ScrollArea>

        {indexSummary ? (
          <div className="shrink-0 border-t border-border/50 px-3 py-2.5">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground/70">Index</p>
            <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{indexSummary}</p>
          </div>
        ) : null}
      </div>
    </aside>
  );
}
