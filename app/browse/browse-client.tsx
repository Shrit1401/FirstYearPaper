"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ChevronRight, FileText, Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import type { FlattenedPaper } from "@/lib/papers";
import { PaperViewer } from "@/components/pdf-viewer";

type Props = {
  years: string[];
  papers: FlattenedPaper[];
};

const YEAR_META: Record<string, { dot: string; subtitle: string }> = {
  "Year 1": { dot: "bg-red-400", subtitle: "Sem 1 & 2 · CSE, ECE, EEE" },
  "Year 2": { dot: "bg-rose-400", subtitle: "Sem 3 & 4 · All branches" },
  "Year 3": { dot: "bg-amber-400", subtitle: "Sem 5 & 6 · All branches" },
  "Year 4": { dot: "bg-orange-400", subtitle: "Sem 7 · All branches" },
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

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto max-w-3xl px-4 py-3 sm:px-6">
          <div className="flex items-center gap-2">
            <Link
              href="/"
              aria-label="Back home"
              className="flex size-9 shrink-0 items-center justify-center rounded-full border border-border/60 bg-card/70 text-muted-foreground transition-all duration-150 hover:bg-muted/70 hover:text-foreground active:scale-[0.96]"
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
                {filtered.slice(0, 80).map((paper) => (
                  <PaperViewer key={paper.href} href={paper.href} name={paper.paperName}>
                    <div className="group flex cursor-pointer items-center gap-3 px-4 py-3.5 transition-all duration-150 hover:bg-muted/45 active:scale-[0.997]">
                      <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-muted/70">
                        <FileText className="size-4 text-muted-foreground" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex min-w-0 items-center gap-2">
                          <p className="truncate text-sm font-medium tracking-tight">{paper.paperName}</p>
                          {paper.verified ? (
                            <span className="shrink-0 rounded-full border border-red-500/30 bg-red-500/10 px-2 py-0.5 text-[10px] text-red-300">
                              Verified
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
              <p className="text-[11px] text-muted-foreground/50">Tap a year to continue</p>
            </div>

            <div className="stagger-list overflow-hidden rounded-[1.3rem] border border-border/60 bg-card/70 shadow-sm">
              {years.map((year) => (
                <Link
                  key={year}
                  href={`/browse/${encodeURIComponent(year)}`}
                  className="group flex items-center justify-between px-4 py-4 transition-all duration-150 hover:bg-muted/45 active:scale-[0.997]"
                >
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
                      {yearCounts[year] ?? 0}
                    </span>
                    <ChevronRight className="size-4 text-muted-foreground/40 transition-transform duration-150 group-hover:translate-x-0.5 group-hover:text-muted-foreground" />
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
