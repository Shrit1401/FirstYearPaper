"use client";
import topics from "@/public/midsem/topics.json";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/components/auth-provider";
import { RepeatPassCard } from "@/components/repeat/repeat-pass-card";
import { MathMarkdown } from "@/components/repeat/math-markdown";
import type { MidsemPaper } from "@/lib/midsem";
export default function Practice({ papers }: { papers: MidsemPaper[] }) {
  const { profile } = useAuth();
  const paid = !!(profile?.isPaid || profile?.midsemPaid);
  const progress = useQuery(api.practice.mine, paid ? {} : "skip");
  const save = useMutation(api.practice.save);
  const [paperId, setPaperId] = useState(papers[0].id);
  const [qid, setQid] = useState(papers[0].questions[0].id);
  const [query, setQuery] = useState("");
  const [retry, setRetry] = useState(false);
  const [answer, setAnswer] = useState("");
  const [reveal, setReveal] = useState(false);
  const [hint, setHint] = useState(false);
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);
  const [deadline, setDeadline] = useState<number | null>(null);
  const [seconds, setSeconds] = useState(5400);
  useEffect(() => {
    if (!deadline) return;
    const tick = () =>
      setSeconds(Math.max(0, Math.ceil((deadline - Date.now()) / 1000)));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [deadline]);
  const paper = papers.find((p) => p.id === paperId)!;
  const question =
    paper.questions.find((q) => q.id === qid) ?? paper.questions[0];
  const rows = new Map((progress ?? []).map((r) => [r.questionId, r]));
  const matched = paper.questions.filter(
    (q) =>
      (!retry || rows.get(q.id)?.status === "retry") &&
      (q.title + " " + q.markdown).toLowerCase().includes(query.toLowerCase()),
  );
  function select(p: MidsemPaper, id: string) {
    setPaperId(p.id);
    setQid(id);
    setAnswer(rows.get(id)?.answer ?? "");
    setReveal(false);
    setHint(false);
    setNotice("");
  }
  async function record(status: "attempted" | "retry" | "understood") {
    setSaving(true);
    try {
      await save({ questionId: question.id, answer, status });
      setNotice(
        status === "attempted"
          ? "Attempt saved. Compare your reasoning on the right."
          : status === "retry"
            ? "Added to your retry list."
            : "Marked understood.",
      );
      if (status === "attempted") setReveal(true);
    } catch {
      setNotice("Could not save. Your text is still here. Try again.");
    } finally {
      setSaving(false);
    }
  }
  return (
    <main className="mx-auto max-w-[1500px] px-5 py-10">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <Link href="/" className="font-semibold">
          papers
        </Link>
        <nav className="flex gap-5 text-sm">
          <Link href="/midsem">Free papers + solutions</Link>
          <Link href="/repeat/library">AI exam workspace</Link>
          <Link href="/profile">Account</Link>
        </nav>
      </header>
      <div className="my-10 grid gap-8 lg:grid-cols-[1fr_370px]">
        <div>
          <p className="text-sm tracking-widest text-orange-500">
            REPEAT 2.0 · MIDSEM
          </p>
          <h1 className="mt-4 max-w-2xl text-4xl font-semibold tracking-tight md:text-5xl">
            The next attempt
            <br />
            should feel easier.
          </h1>
          <p className="mt-5 max-w-xl text-muted-foreground">
            Pick a question. Work it out. Compare the steps, then revisit what
            needs work. A practice space built around your papers.
          </p>
          <div className="mt-6 flex flex-wrap gap-6 text-sm">
            <span>{papers.length} practice papers</span>
            <span>{papers.reduce((count, paper) => count + paper.questions.length, 0)} worked solutions</span>
            <span>5 subjects</span>
          </div>
        </div>
        <RepeatPassCard />
      </div>
      <details className="mb-6 rounded-2xl border p-5">
        <summary className="cursor-pointer font-medium">
          What topics appear across past midsem papers?
        </summary>
        <p className="my-4 text-sm text-muted-foreground">
          Observed topic matches across 48 papers, not a prediction. Topics may
          belong to different subjects and semesters.
        </p>
        <div className="grid gap-3 md:grid-cols-3">
          {topics.map((t) => (
            <details key={t.title} className="rounded-xl border p-4">
              <summary className="cursor-pointer text-sm">
                {t.title}
                <span className="mt-1 block text-xs text-muted-foreground">
                  {t.paperCount} papers · {t.questionCount} question matches
                </span>
              </summary>
              {t.examples.map((e, i) => (
                <a
                  key={i}
                  href={e.href}
                  className="mt-3 block text-xs underline"
                >
                  {e.subject} · Q{e.number} · {e.paper}
                </a>
              ))}
            </details>
          ))}
        </div>
      </details>
      <section className="rounded-2xl border p-5">
        <div className="flex flex-wrap items-end gap-4">
          <label className="flex min-w-60 flex-1 flex-col gap-2 text-xs text-muted-foreground">
            PAPER
            <select
              value={paperId}
              onChange={(e) => {
                const p = papers.find((p) => p.id === e.target.value)!;
                select(p, p.questions[0].id);
                setDeadline(null);
              }}
              className="rounded-lg border bg-background p-3 text-sm text-foreground"
            >
              {papers.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.subject} · {p.authorLabel}
                </option>
              ))}
            </select>
          </label>
          <label className="flex min-w-60 flex-1 flex-col gap-2 text-xs text-muted-foreground">
            FIND QUESTIONS
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Try CRC, linked list, probability..."
              className="rounded-lg border bg-background p-3 text-sm text-foreground"
            />
          </label>
          <button
            disabled={!paid}
            aria-pressed={retry}
            onClick={() => setRetry(!retry)}
            className={
              "rounded-lg border px-4 py-3 text-sm disabled:opacity-40 " +
              (retry ? "bg-foreground text-background" : "")
            }
          >
            Retry list (
            {(progress ?? []).filter((r) => r.status === "retry").length})
          </button>
        </div>
        <p className="mt-4 text-xs text-muted-foreground">{paper.provenance}</p>
        <div className="mt-5 flex flex-wrap gap-2">
          {matched.map((q) => (
            <button
              key={q.id}
              onClick={() => select(paper, q.id)}
              aria-pressed={q.id === question.id}
              className={
                "rounded-lg border px-3 py-2 text-sm " +
                (q.id === question.id ? "bg-foreground text-background" : "")
              }
            >
              {q.number} · {q.marks}m{" "}
              {rows.get(q.id)?.status === "understood"
                ? "✓"
                : rows.get(q.id)?.status === "retry"
                  ? "↻"
                  : ""}
            </button>
          ))}
          {!matched.length && (
            <p className="text-sm text-muted-foreground">
              No matching questions. Clear the search or turn off the retry
              filter.
            </p>
          )}
        </div>
      </section>
      <div className="my-5 flex flex-wrap items-center justify-between gap-3 text-sm">
        <p>
          {(progress ?? []).filter((r) => r.status === "understood").length} of
          91 marked understood
        </p>
        {paid && (
          <button
            onClick={() => {
              setDeadline(deadline ? null : Date.now() + 5400000);
              setSeconds(5400);
            }}
            className="rounded-lg border px-4 py-2"
          >
            {deadline
              ? `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")} remaining · Stop timer`
              : "Start 90-minute paper timer"}
          </button>
        )}
      </div>
      {deadline && seconds === 0 && (
        <p role="status" className="mb-4 rounded-lg bg-orange-500/10 p-4">
          Time is up. Save your attempt and compare the worked solutions.
        </p>
      )}
      <div className="grid items-start gap-5 lg:grid-cols-2">
        <section className="min-w-0 rounded-2xl border p-6">
          <p className="mb-5 text-xs uppercase tracking-widest text-muted-foreground">
            Question {question.number} · {question.marks} marks
          </p>
          <MathMarkdown>{question.markdown}</MathMarkdown>
          {paid ? (
            <>
              {rows.get(question.id)?.answer && (
                <button
                  className="mt-6 text-sm underline"
                  onClick={() => setAnswer(rows.get(question.id)?.answer ?? "")}
                >
                  Load saved attempt
                </button>
              )}
              <label className="mt-8 block text-sm" htmlFor="attempt">
                Your working
              </label>
              <textarea
                id="attempt"
                value={answer}
                maxLength={12000}
                onChange={(e) => setAnswer(e.target.value)}
                placeholder="Write your approach, calculations, or code before checking the answer."
                className="mt-3 min-h-52 w-full rounded-xl border bg-background p-4"
              />
              <div className="mt-4 flex flex-wrap gap-3">
                <button
                  disabled={saving}
                  onClick={() => record("attempted")}
                  className="rounded-lg bg-foreground px-4 py-2 text-background"
                >
                  {saving ? "Saving..." : "Save + compare"}
                </button>
                <button
                  onClick={() => setHint(!hint)}
                  className="rounded-lg border px-4 py-2"
                >
                  {hint ? "Hide approach" : "Show approach"}
                </button>
              </div>
              {hint && (
                <p className="mt-4 rounded-lg bg-muted p-4 text-sm">
                  {question.hint}
                </p>
              )}
            </>
          ) : (
            <p className="mt-8 rounded-xl bg-muted p-5 text-sm">
              Saved attempts, the retry list and timed practice are included in
              the ₹29 midsem pass.{" "}
              <Link className="underline" href={paper.solutionsUrl}>
                Read this paper and every solution free →
              </Link>
            </p>
          )}
        </section>
        <section className="min-w-0 rounded-2xl border bg-muted/20 p-6">
          <p className="mb-5 text-xs uppercase tracking-widest text-muted-foreground">
            Worked solution · AI generated
          </p>
          {paid && reveal ? (
            <>
              <MathMarkdown>{question.solution}</MathMarkdown>
              <p className="mt-8 text-sm text-muted-foreground">
                Compare your steps, then assess your own attempt.
              </p>
              <div className="mt-4 flex gap-3">
                <button
                  disabled={saving}
                  onClick={() => record("retry")}
                  className="rounded-lg border px-4 py-2"
                >
                  Try again later
                </button>
                <button
                  disabled={saving}
                  onClick={() => record("understood")}
                  className="rounded-lg border px-4 py-2"
                >
                  I understand this
                </button>
              </div>
            </>
          ) : (
            <>
              <h2 className="text-xl font-medium">
                Give the question a first attempt.
              </h2>
              <p className="mt-3 text-sm text-muted-foreground">
                The solution will be here when you are ready to compare. This is
                self-assessment, not automatic grading.
              </p>
              {paid && (
                <button
                  onClick={() => setReveal(true)}
                  className="mt-5 rounded-lg border px-4 py-2 text-sm"
                >
                  Reveal solution
                </button>
              )}
              <Link
                className="mt-5 block text-sm underline"
                href={paper.solutionsUrl}
              >
                Open the free solution PDF
              </Link>
            </>
          )}
          <p role="status" className="mt-4 text-sm">
            {notice}
          </p>
        </section>
      </div>
      <p className="mt-8 text-xs text-muted-foreground">
        by paper.shrit.in · AI generated practice papers. Past
        questions indicate practice topics, not predictions of your next
        examination.
      </p>
    </main>
  );
}
