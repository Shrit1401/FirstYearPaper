"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ChevronRight, FileText, Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import type { FlattenedPaper } from "@/lib/papers";
import { PaperViewer } from "@/components/pdf-viewer";
import { isPaperYearDisabled } from "@/lib/paper-availability";
import posthog from "posthog-js";

type Props = {
  years: string[];
  papers: FlattenedPaper[];
};

const YEAR_META: Record<string, { dot: string; subtitle: string }> = {
  "Year 1": { dot: "bg-red-400", subtitle: "Sem 1 & 2 · mid-sem, end-sem, and makeup" },
  "Year 2": { dot: "bg-rose-400", subtitle: "Sem 3 & 4 · mid-sem, end-sem, and makeup" },
  "Year 3": { dot: "bg-amber-400", subtitle: "Sem 5 & 6 · all programs" },
  "Year 4": { dot: "bg-orange-400", subtitle: "Sem 7 · all programs" },
  "B.Tech Hons": { dot: "bg-violet-400", subtitle: "Honours question papers" },
  "M.Tech": { dot: "bg-sky-400", subtitle: "Postgraduate question papers" },
};

export function BrowseClient({ years, papers }: Props) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return papers.filter(
      (paper) =>
        paper.paperName.toLowerCase().includes(q) ||
        paper.subjectName.toLowerCase().includes(q) ||
        paper.streamName.toLowerCase().includes(q)
    );
  }, [query, papers]);

  const yearCounts = useMemo(() => {
    const counts = Object.fromEntries(years.map((year) => [year, 0])) as Record<string, number>;
    for (const paper of papers) {
      const year = paper.subjectPath.split("/")[0];
      if (year in counts) counts[year] += 1;
    }
    return counts;
  }, [papers, years]);

  const showResults = query.trim().length > 0;

  useEffect(() => {
    const normalizedQuery = query.trim();
    if (!normalizedQuery) return;

    const timer = window.setTimeout(() => {
      posthog.capture("paper_search_performed", {
        source: "browse",
        search_query: normalizedQuery.slice(0, 120),
        query_length: normalizedQuery.length,
        result_count: filtered.length,
        has_results: filtered.length > 0,
      });
    }, 600);

    return () => window.clearTimeout(timer);
  }, [filtered.length, query]);

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto max-w-3xl px-4 py-3 sm:px-6">
          <div className="flex items-center gap-2">
            <Link
              href="/"
              aria-label="Back home"
              className="flex size-9 shrink-0 items-center justify-center rounded-full border border-border/60 bg-card/70 text-muted-foreground transition-[background-color,color,border-color,opacity,transform] duration-150 hover:bg-muted/70 hover:text-foreground active:scale-[0.96]"
            >
              <ArrowLeft className="size-4" />
            </Link>

            <div className="search-input-wrap relative flex-1">
              <div className="search-icon-wrapper pointer-events-none absolute left-3 top-1/2 -translate-y-1/2">
                <Search className="size-3.5 text-muted-foreground" />
              </div>
              <Input
                ref={inputRef}
                type="search"
                placeholder="Search papers, subjects, branch..."
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className="h-10 rounded-full border-border/60 bg-card/70 pl-9 pr-9 text-[14px]"
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
              />
              {query ? (
                <button
                  onClick={() => {
                    posthog.capture("paper_search_cleared", {
                      previous_query: query.trim().slice(0, 120),
                      previous_result_count: filtered.length,
                    });
                    setQuery("");
                    inputRef.current?.focus();
                  }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/50 transition-colors hover:text-muted-foreground"
                  aria-label="Clear search"
                >
                  <X className="size-3.5" />
                </button>
              ) : null}
            </div>
          </div>

          <div className="mt-3">
            <h1 className="text-[1.45rem] font-semibold tracking-tight">Browse papers</h1>
            <p className="mt-1 text-[13px] text-muted-foreground">
              Search directly or start with a year.
            </p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-6 sm:px-6">
        {showResults ? (
          <section>
            <div className="mb-3 flex items-center justify-between px-0.5">
              <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground/60">
                {filtered.length === 0
                  ? "No results"
                  : `${filtered.length} result${filtered.length !== 1 ? "s" : ""}`}
              </p>
              {filtered.length > 80 ? (
                <p className="text-[11px] text-muted-foreground/50">Showing first 80</p>
              ) : null}
            </div>

            {filtered.length === 0 ? (
              <div className="search-result-enter rounded-[1.3rem] border border-border/60 bg-card/50 px-6 py-12 text-center">
                <p className="text-[15px] font-medium">No papers match &ldquo;{query}&rdquo;</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Try a subject code, branch, or a shorter paper title.
                </p>
              </div>
            ) : (
              <div className="stagger-list overflow-hidden rounded-[1.3rem] border border-border/60 bg-card/70 shadow-sm">
                {filtered.slice(0, 80).map((paper, index) => (
                  <PaperViewer
                    key={paper.href}
                    href={paper.href}
                    name={paper.paperName}
                    editableId={paper.editableId}
                    onOpen={() =>
                      posthog.capture("paper_search_result_opened", {
                        search_query: query.trim().slice(0, 120),
                        result_position: index + 1,
                        result_count: filtered.length,
                        paper_name: paper.paperName,
                        paper_href: paper.href,
                        subject: paper.subjectName,
                        stream: paper.streamName,
                      })
                    }
                  >
                    <div className="group flex cursor-pointer items-center gap-3 px-4 py-3.5 transition-[background-color,color,border-color,opacity,transform] duration-150 hover:bg-muted/45 active:scale-[0.997]">
                      <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-muted/70">
                        <FileText className="size-4 text-muted-foreground" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex min-w-0 items-center gap-2">
                          <p className="truncate text-sm font-medium tracking-tight">{paper.paperName}</p>
                          {paper.verified ? (
                            <span className="shrink-0 rounded-full border border-red-500/30 bg-red-500/10 px-2 py-0.5 text-[10px] text-red-300">
                              Archive copy
                            </span>
                          ) : paper.community ? (
                            <span className="shrink-0 rounded-full border border-border/60 bg-muted/40 px-2 py-0.5 text-[10px] text-muted-foreground">
                              Student scan
                            </span>
                          ) : null}
                        </div>
                        <p className="mt-1 truncate text-[12px] text-muted-foreground">
                          {paper.subjectName} · {paper.streamName}
                        </p>
                      </div>
                      <span className="shrink-0 text-[11px] text-muted-foreground/45 transition-colors group-hover:text-muted-foreground">
                        Open
                      </span>
                    </div>
                  </PaperViewer>
                ))}
              </div>
            )}
          </section>
        ) : (
          <section>
            <div className="mb-3 flex items-center justify-between px-0.5">
              <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground/60">
                Years
              </p>
              <p className="text-[11px] text-muted-foreground/50">Available years</p>
            </div>

            <div className="stagger-list overflow-hidden rounded-[1.3rem] border border-border/60 bg-card/70 shadow-sm">
              {years.map((year) => {
                const disabled = isPaperYearDisabled(year);
                const content = (
                  <>
                    <div className="flex min-w-0 items-center gap-3">
                      <span className={`size-2 shrink-0 rounded-full ${YEAR_META[year]?.dot ?? "bg-muted-foreground/40"}`} />
                      <div className="min-w-0">
                        <p className="text-sm font-medium tracking-tight">{year}</p>
                        <p className="truncate text-[12px] text-muted-foreground">
                          {YEAR_META[year]?.subtitle}
                        </p>
                      </div>
                    </div>
                    <div className="ml-3 flex items-center gap-3">
                      <span className="rounded-full border border-border/50 bg-background/70 px-2 py-1 text-[11px] text-muted-foreground">
                        {disabled ? "Coming soon" : (yearCounts[year] ?? 0)}
                      </span>
                      <ChevronRight className="size-4 text-muted-foreground/40 transition-transform duration-150 group-hover:translate-x-0.5 group-hover:text-muted-foreground" />
                    </div>
                  </>
                );

                if (disabled) {
                  return (
                    <div
                      key={year}
                      aria-disabled="true"
                      className="flex cursor-not-allowed items-center justify-between px-4 py-4 opacity-60"
                    >
                      {content}
                    </div>
                  );
                }

                return (
                  <Link
                    key={year}
                    href={`/browse/${encodeURIComponent(year)}`}
                    onClick={() =>
                      posthog.capture("paper_year_selected", {
                        year,
                        paper_count: yearCounts[year] ?? 0,
                        source: "browse_landing",
                      })
                    }
                    className="group flex items-center justify-between px-4 py-4 transition-[background-color,color,border-color,opacity,transform] duration-150 hover:bg-muted/45 active:scale-[0.997]"
                  >
                    {content}
                  </Link>
                );
              })}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
