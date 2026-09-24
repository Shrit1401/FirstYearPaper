"use client";
import { REPEAT_VISIBLE } from "@/lib/feature-visibility";
import { useState } from "react";
import Link from "next/link";
import type { MidsemPaper } from "@/lib/midsem";
import { MathMarkdown } from "@/components/repeat/math-markdown";
export default function Reader({ paper }: { paper: MidsemPaper }) {
  const [selected, setSelected] = useState(0);
  const [search, setSearch] = useState("");
  const q = paper.questions[selected];
  return (
    <main className="mx-auto max-w-[1500px] px-4 py-8">
      <Link prefetch={false} href="/midsem" className="text-sm text-muted-foreground">
        ← All free midsem papers
      </Link>
      <header className="my-6">
        <p className="text-sm text-muted-foreground">
          {paper.subjectCode} · {paper.authorLabel} · normal
        </p>
        <h1 className="mt-2 text-3xl font-semibold">{paper.subject}</h1>
        <p className="mt-3 max-w-3xl text-sm text-muted-foreground">
          {paper.provenance}
        </p>
        <p className="mt-2 text-sm text-muted-foreground">{paper.scope}</p>
        <details className="mt-2 text-xs text-muted-foreground">
          <summary className="cursor-pointer">Syllabus scope note</summary>
          <p className="mt-2">{paper.scopeNote}</p>
        </details>
        <div className="mt-4 flex flex-wrap gap-5 text-sm underline underline-offset-4">
          <a href={paper.paperUrl}>Question PDF</a>
          <a href={paper.solutionsUrl}>Solution PDF</a>
          {REPEAT_VISIBLE && <Link prefetch={false} href="/repeat">Repeat 2.0 practice</Link>}
        </div>
      </header>
      <input
        aria-label="Find a question in this paper"
        placeholder="Find a question or topic..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="mb-4 w-full rounded-xl border bg-background px-4 py-3"
      />
      <nav aria-label="Questions" className="mb-5 flex flex-wrap gap-2">
        {paper.questions.map(
          (item, i) =>
            (item.title + " " + item.markdown)
              .toLowerCase()
              .includes(search.toLowerCase()) && (
              <button
                key={item.id}
                onClick={() => setSelected(i)}
                aria-pressed={i === selected}
                className={
                  "rounded-lg border px-3 py-2 text-sm " +
                  (i === selected ? "bg-foreground text-background" : "")
                }
              >
                {item.number} · {item.marks} marks
              </button>
            ),
        )}
      </nav>
      <div className="grid items-start gap-5 lg:grid-cols-2">
        <section className="min-w-0 rounded-2xl border p-5 md:p-8">
          <p className="mb-5 text-xs uppercase tracking-widest text-muted-foreground">
            Question {q.number} · {q.marks} marks
          </p>
          <MathMarkdown>{q.markdown}</MathMarkdown>
          {q.source && (
            <p className="mt-8 text-xs text-muted-foreground">
              Source: {q.source.paper} · {q.source.question}
            </p>
          )}
        </section>
        <section className="min-w-0 rounded-2xl border bg-muted/20 p-5 md:p-8">
          <p className="mb-5 text-xs uppercase tracking-widest text-muted-foreground">
            Worked solution · AI generated
          </p>
          <MathMarkdown>{q.solution}</MathMarkdown>
        </section>
      </div>
      <div className="my-6 flex justify-between">
        <button
          disabled={selected === 0}
          onClick={() => setSelected((i) => i - 1)}
          className="rounded-lg border px-4 py-2 disabled:opacity-30"
        >
          ← Previous
        </button>
        <button
          disabled={selected === paper.questions.length - 1}
          onClick={() => setSelected((i) => i + 1)}
          className="rounded-lg border px-4 py-2 disabled:opacity-30"
        >
          Next →
        </button>
      </div>
      <p className="text-xs text-muted-foreground">
        by paper.shrit.in · Computational and code checks cover applicable
        answers. Check interpretation-dependent answers against your course
        conventions.
      </p>
    </main>
  );
}
