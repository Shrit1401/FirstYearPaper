import Link from "next/link";
import { FileText, ChevronRight, ArrowLeft } from "lucide-react";
import { PaperViewer } from "@/components/pdf-viewer";
import { midsemPapers } from "@/lib/midsem";
export const metadata = { title: "CSE Semester 3 midsem PDFs | Papers" };
export default function MidsemPage() {
  const subjects = [...new Set(midsemPapers.map((p) => p.subject))];
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/50">
        <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6">
          <Link
            href="/browse/Year%202/Semester%203/CSE"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground"
          >
            <ArrowLeft className="size-4" /> CSE · Semester 3
          </Link>
          <h1 className="mt-5 text-2xl font-semibold tracking-tight">
            Mid-sem papers
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            10 practice papers · Question and answer PDFs · Free to view and
            download
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Each paper starts with 5 MCQs worth 1 mark each, followed by 25 marks
            of theory questions.
          </p>
        </div>
      </header>
      <main className="mx-auto max-w-3xl space-y-7 px-4 py-6 sm:px-6">
        {subjects.map((subject) => (
          <section key={subject}>
            <h2 className="mb-3 text-sm font-medium">{subject}</h2>
            <div className="overflow-hidden rounded-xl border border-border/60 bg-card">
              {midsemPapers
                .filter((p) => p.subject === subject)
                .map((p) => (
                  <div
                    key={p.id}
                    id={p.id}
                    className="border-b border-border/50 last:border-b-0"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 px-4 pb-2 pt-4">
                      <span className="text-xs text-muted-foreground">
                        {p.subjectCode} · {p.authorLabel}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        30 marks · 90 minutes
                      </span>
                    </div>
                    <div className="grid sm:grid-cols-2">
                      {[
                        { label: "Question PDF", href: p.paperUrl },
                        { label: "Answer PDF", href: p.solutionsUrl },
                      ].map((file) => (
                        <PaperViewer
                          key={file.label}
                          href={file.href}
                          name={`${p.subject} · ${p.authorLabel} · ${file.label}`}
                          repeatPaperId={p.id}
                        >
                          <div className="flex min-h-14 items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/40">
                            <FileText className="size-4 shrink-0 text-muted-foreground" />
                            <span className="flex-1 text-sm font-medium">
                              {file.label}
                            </span>
                            <ChevronRight className="size-4 text-muted-foreground" />
                          </div>
                        </PaperViewer>
                      ))}
                    </div>
                    <Link
                      href={`/repeat/library?paper=${encodeURIComponent(p.id)}`}
                      className="flex items-center justify-between border-t border-border/40 px-4 py-3 text-xs text-muted-foreground transition-colors hover:bg-muted/40"
                    >
                      <span>Practice with Repeat 2.0</span>
                      <ChevronRight className="size-3.5" />
                    </Link>
                  </div>
                ))}
            </div>
          </section>
        ))}
        <p className="text-xs leading-5 text-muted-foreground">
          Endsem Papers: adapted theory questions with newly authored MCQs. AI generated: newly
          authored questions. Both include AI-authored answers. Unofficial
          practice papers by paper.shrit.in.
        </p>
      </main>
    </div>
  );
}
