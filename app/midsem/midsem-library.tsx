"use client";

import Link from "next/link";
import { useState } from "react";
import { ChevronRight, FileText, Search } from "lucide-react";
import { PaperViewer } from "@/components/pdf-viewer";
import catalog from "@/public/midsem/second-year-index.json";

function examDate(period: string) {
  if (period === "undated") return "Date not recorded";
  if (period.length === 4) return period;
  const [year, month, day] = period.split("-").map(Number);
  return new Intl.DateTimeFormat("en-GB", {
    month: "short", year: "numeric", ...(day ? { day: "numeric" as const } : {}), timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, day || 1)));
}

export function MidsemLibrary({ initialBranch }: { initialBranch: "CSE" | "ECE" }) {
  const [query, setQuery] = useState("");
  const branchPapers = catalog.papers.filter(p => p.branch === initialBranch);
  const papers = branchPapers.filter(p =>
    `${p.subject} ${p.subjectCode} ${p.period} ${p.program}`.toLowerCase().includes(query.trim().toLowerCase()),
  ).sort((a, b) => b.period.localeCompare(a.period));
  const subjects = [...new Set(papers.map(p => p.subject))].sort();
  return (
    <main className="mx-auto max-w-3xl px-4 py-6 sm:px-6">
      <nav aria-label="Choose branch" className="flex gap-2">
        {(["CSE", "ECE"] as const).map(branch => (
          <Link key={branch} href={`/midsem?branch=${branch}`} aria-current={branch === initialBranch ? "page" : undefined}
            className={`rounded-full border px-5 py-2.5 text-sm font-medium transition-colors ${branch === initialBranch ? "border-foreground bg-foreground text-background" : "border-border text-muted-foreground hover:bg-muted"}`}>
            {branch} <span className="ml-2 opacity-60">{catalog.papers.filter(p => p.branch === branch).length}</span>
          </Link>
        ))}
      </nav>
      {initialBranch === "CSE" && <p className="mt-3 text-xs leading-5 text-muted-foreground">Includes related IT, CCE and DSE papers, labelled by their original course codes.</p>}
      <div className="relative mt-5">
        <Search aria-hidden="true" className="absolute left-3 top-3 size-4 text-muted-foreground" />
        <input aria-label="Search midsem papers" value={query} onChange={e => setQuery(e.target.value)} placeholder="Search subject, course code or year"
          className="h-10 w-full rounded-lg border border-border bg-background pl-10 pr-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring" />
      </div>
      <p aria-live="polite" className="mb-6 mt-3 text-xs text-muted-foreground">{papers.length} exam {papers.length === 1 ? "set" : "sets"}</p>
      <div className="space-y-8">
        {subjects.map(subject => (
          <section key={subject} aria-label={subject}>
            <h2 className="mb-3 text-base font-semibold">{subject}</h2>
            <div className="divide-y divide-border/60 overflow-hidden rounded-xl border border-border/60 bg-card">
              {papers.filter(p => p.subject === subject).map(paper => (
                <article id={paper.id} key={paper.id} className="scroll-mt-6">
                  <div className="px-4 pt-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h3 className="text-sm font-medium">{examDate(paper.period)}</h3>
                      <span className="text-xs text-muted-foreground">{paper.subjectCode} · {paper.program}</span>
                    </div>
                    {paper.examType === "Second sessional" && <p className="mt-2 text-xs text-muted-foreground">Second sessional</p>}
                    {paper.files.some(f => f.kind === "combined") && <p className="mt-2 text-xs text-muted-foreground">Answers are included in this paper.</p>}
                    {paper.notes && <p className="mt-2 text-xs leading-5 text-muted-foreground">{paper.notes}</p>}
                  </div>
                  <div className={`mt-2 grid ${paper.files.length > 1 ? "sm:grid-cols-2" : ""}`}>
                    {paper.files.map(file => (
                      <PaperViewer key={file.href} href={file.href} name={`${paper.subjectCode} · ${examDate(paper.period)} · ${file.label}`} showPracticeLink={false}>
                        <div className="flex min-h-14 items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/40">
                          <FileText className="size-4 shrink-0 text-muted-foreground" />
                          <span className="flex-1 text-sm font-medium">{file.label}</span>
                          <span className="text-xs text-muted-foreground">{file.pageCount} {file.pageCount === 1 ? "page" : "pages"}</span>
                          <ChevronRight className="size-4 text-muted-foreground" />
                        </div>
                      </PaperViewer>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          </section>
        ))}
        {papers.length === 0 && <p className="py-8 text-center text-sm text-muted-foreground">No matching papers. Try a subject or course code.</p>}
      </div>
      <p className="mt-8 text-xs leading-5 text-muted-foreground">Original exam formats are preserved. Check the course code and topics against your syllabus.</p>
    </main>
  );
}
