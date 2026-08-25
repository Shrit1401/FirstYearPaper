"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import posthog from "posthog-js";
import {
  ArrowLeft,
  Check,
  Copy,
  Download,
  Edit3,
  ExternalLink,
  FileText,
  RotateCcw,
  Search,
  X,
} from "lucide-react";

type Question = {
  id: string;
  marks: number;
  source: string;
};

const ORIGINAL_QUESTIONS: Question[] = [
  {
    id: "1A",
    marks: 4,
    source:
      "Find the maximum and minimum values of\n\n$$f(x,y)=x^2+2xy+2y^2+2x+y.$$",
  },
  {
    id: "1B",
    marks: 3,
    source:
      "Evaluate $\\displaystyle \\lim_{x \\to 0} \\left(\\frac{x-\\log(1+x)}{x^2}\\right)$.",
  },
  {
    id: "1C",
    marks: 3,
    source:
      "Expand $f(x,y)=e^x\\cos y$ in powers of $x$ and $y$ up to third degree terms.",
  },
  {
    id: "2A",
    marks: 4,
    source:
      "Find the equation of the sphere having the circle\n\n$$x^2+y^2+z^2+10y-4z-8=0, \\qquad x+y+z=3$$\n\nas a great circle.",
  },
  {
    id: "2B",
    marks: 3,
    source:
      "Using Euler's theorem, show that, if\n\n$$u=\\sin^{-1}\\left(\\frac{x+y}{\\sqrt{x}+\\sqrt{y}}\\right),$$\n\nthen\n\n$$x\\frac{\\partial u}{\\partial x}+y\\frac{\\partial u}{\\partial y}=\\frac{1}{2}\\tan u.$$",
  },
  {
    id: "2C",
    marks: 3,
    source:
      "Using beta and gamma functions, find $\\displaystyle \\int_0^1 x^4\\sqrt{1-x^2}\\,dx$.",
  },
  {
    id: "3A",
    marks: 4,
    source:
      "Using Laplace transforms, solve the differential equation\n\n$$y''-5y'+6y=0$$\n\nwith initial conditions $y(0)=0$ and $y'(0)=1$.",
  },
  {
    id: "3B",
    marks: 3,
    source:
      "Change the order of integration and evaluate\n\n$$\\int_{x=0}^{2}\\int_{y=0}^{2-x}xy\\,dy\\,dx.$$",
  },
  {
    id: "3C",
    marks: 3,
    source:
      "If $u=F(x-y,y-z,z-x)$, then prove that\n\n$$\\frac{\\partial u}{\\partial x}+\\frac{\\partial u}{\\partial y}+\\frac{\\partial u}{\\partial z}=0.$$",
  },
  {
    id: "4A",
    marks: 4,
    source:
      "Test for convergence of the series\n\n$$\\sum_{n=1}^{\\infty}\\frac{2n-1}{n(n+1)(n+2)}.$$",
  },
  {
    id: "4B",
    marks: 3,
    source:
      "Using double integrals, find the area of the region enclosed by the parabola $y=x^2$ and the line $y=x$.",
  },
  {
    id: "4C",
    marks: 3,
    source:
      "Find $\\displaystyle \\mathcal{L}^{-1}\\left(\\frac{s+1}{(s+5)(s-7)}\\right)$.",
  },
  {
    id: "5A",
    marks: 4,
    source:
      "Using Ratio test, discuss the nature of the series\n\n$$\\frac{1}{3}+\\frac{2^2}{3^2}+\\frac{3^2}{3^3}+\\frac{4^2}{3^4}+\\cdots.$$",
  },
  {
    id: "5B",
    marks: 3,
    source:
      "Evaluate\n\n$$\\int_{x=1}^{2}\\int_{y=2}^{3}\\int_{z=1}^{3}(x^2y+z)\\,dz\\,dy\\,dx.$$",
  },
  {
    id: "5C",
    marks: 3,
    source:
      "Find the Laplace transform of $f(t)=t\\sin 4t+4t^{5/2}$.",
  },
];

const STORAGE_KEY = "mat-1271-chm-b-editable-questions-v1";
const PDF_PATH =
  "/YEAR1/CSE/CM-II%20Endsem/(verified)%20MAT%201271-CHM-B%20%20Engineering%20Mathematics%20-2%20(Chemistry%20group).pdf";

function makeLatexDocument(questions: Question[]) {
  const body = questions
    .map(function (question) {
      return (
        "\\item[" +
        question.id +
        ")] " +
        question.source +
        " \\hfill (" +
        question.marks +
        ")"
      );
    })
    .join("\n\n");

  return [
    "\\documentclass[12pt]{article}",
    "\\usepackage[margin=1in]{geometry}",
    "\\usepackage{amsmath,amssymb}",
    "\\begin{document}",
    "\\begin{center}",
    "{\\Large\\bfseries MANIPAL ACADEMY OF HIGHER EDUCATION}\\\\[6pt]",
    "{\\bfseries ENGINEERING MATHEMATICS - II [MAT 1271-CHM]}\\\\",
    "Second Semester B.Tech. Examinations - June/July 2023",
    "\\end{center}",
    "\\noindent Marks: 50 \\hfill Duration: 180 minutes",
    "\\section*{Section A}",
    "Answer all the questions.",
    "\\begin{description}",
    body,
    "\\end{description}",
    "\\end{document}",
    "",
  ].join("\n");
}

function QuestionCard({
  question,
  editing,
  copied,
  onEdit,
  onChange,
  onCopy,
}: {
  question: Question;
  editing: boolean;
  copied: boolean;
  onEdit: () => void;
  onChange: (value: string) => void;
  onCopy: () => void;
}) {
  const gridClass = editing ? "grid lg:grid-cols-2" : "grid grid-cols-1";

  return (
    <article className="group overflow-hidden rounded-2xl border border-border/60 bg-card/75 shadow-sm backdrop-blur-sm transition-colors hover:border-border">
      <div className="flex items-center justify-between border-b border-border/50 px-4 py-3 sm:px-5">
        <div className="flex items-center gap-3">
          <span className="flex size-8 items-center justify-center rounded-lg bg-foreground text-[12px] font-semibold text-background">
            {question.id}
          </span>
          <span className="text-[11px] font-medium uppercase tracking-[0.1em] text-muted-foreground">
            {question.marks} marks
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onCopy}
            className="inline-flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label={"Copy question " + question.id}
            title="Copy LaTeX source"
          >
            {copied ? (
              <Check className="size-3.5 text-emerald-500" />
            ) : (
              <Copy className="size-3.5" />
            )}
          </button>
          <button
            type="button"
            onClick={onEdit}
            className={
              "inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-[12px] font-medium transition-colors " +
              (editing
                ? "bg-foreground text-background"
                : "text-muted-foreground hover:bg-muted hover:text-foreground")
            }
          >
            {editing ? <X className="size-3.5" /> : <Edit3 className="size-3.5" />}
            {editing ? "Done" : "Edit"}
          </button>
        </div>
      </div>

      <div className={gridClass}>
        {editing && (
          <div className="border-b border-border/50 p-4 lg:border-b-0 lg:border-r sm:p-5">
            <label className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/70">
              Editable text and LaTeX
            </label>
            <textarea
              aria-label="Editable text and LaTeX"
              value={question.source}
              onChange={(event) => onChange(event.target.value)}
              spellCheck
              className="min-h-44 w-full resize-y rounded-xl border border-border/60 bg-background/70 p-3 font-mono text-[13px] leading-6 text-foreground outline-none transition-shadow focus:border-foreground/30 focus:ring-2 focus:ring-foreground/10"
            />
            <p className="mt-2 text-[11px] text-muted-foreground/70">
              Use <code className="font-mono">$...$</code> inline and{" "}
              <code className="font-mono">$$...$$</code> for display math.
            </p>
          </div>
        )}
        <div className="min-w-0 p-5 sm:p-7">
          {editing && (
            <p className="mb-4 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/70">
              Live preview
            </p>
          )}
          <div className="paper-question text-[15px] leading-7 sm:text-[16px]">
            <ReactMarkdown
              remarkPlugins={[remarkMath]}
              rehypePlugins={[rehypeKatex]}
            >
              {question.source}
            </ReactMarkdown>
          </div>
        </div>
      </div>
    </article>
  );
}

export function MathPaperEditor() {
  const [questions, setQuestions] = useState<Question[]>(ORIGINAL_QUESTIONS);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let savedQuestions: Question[] | null = null;
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved) savedQuestions = JSON.parse(saved) as Question[];
    } catch {
      // Keep the verified transcription when saved data is invalid.
    }
    const timer = window.setTimeout(() => {
      if (savedQuestions) setQuestions(savedQuestions);
      setHydrated(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (hydrated) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(questions));
    }
  }, [hydrated, questions]);

  const filteredQuestions = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return questions;
    return questions.filter(
      (question) =>
        question.id.toLowerCase().includes(normalized) ||
        question.source.toLowerCase().includes(normalized),
    );
  }, [query, questions]);

  function updateQuestion(id: string, source: string) {
    setQuestions((current) =>
      current.map((question) =>
        question.id === id ? { ...question, source } : question,
      ),
    );
  }

  async function copyQuestion(question: Question) {
    await navigator.clipboard.writeText(question.source);
    setCopiedId(question.id);
    window.setTimeout(() => setCopiedId(null), 1400);
  }

  function resetQuestions() {
    if (!window.confirm("Reset every question to the verified transcription?")) {
      return;
    }
    setQuestions(ORIGINAL_QUESTIONS);
    setEditingId(null);
    window.localStorage.removeItem(STORAGE_KEY);
  }

  function downloadLatex() {
    posthog.capture("math_paper_exported", {
      question_count: questions.length,
    });
    const blob = new Blob([makeLatexDocument(questions)], {
      type: "application/x-tex",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "MAT-1271-CHM-B-July-2023.tex";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <div
        className="pointer-events-none fixed inset-0 opacity-[0.025]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)",
          backgroundSize: "28px 28px",
        }}
      />

      <header className="sticky top-0 z-20 border-b border-border/50 bg-background/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <Link
            href="/browse"
            className="inline-flex items-center gap-2 text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="size-4" />
            Papers
          </Link>
          <div className="flex items-center gap-2">
            <a
              href={PDF_PATH}
              target="_blank"
              rel="noreferrer"
              className="hidden items-center gap-1.5 rounded-lg px-2.5 py-2 text-[12px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground sm:inline-flex"
            >
              Original PDF <ExternalLink className="size-3.5" />
            </a>
            <button
              type="button"
              onClick={downloadLatex}
              className="inline-flex items-center gap-1.5 rounded-lg bg-foreground px-3 py-2 text-[12px] font-semibold text-background transition-opacity hover:opacity-85 active:scale-[0.98]"
            >
              <Download className="size-3.5" />
              Download .tex
            </button>
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-5xl px-4 pb-24 pt-10 sm:px-6 sm:pt-14">
        <section className="mb-9">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-border/60 bg-card/70 px-3 py-1.5 text-[11px] font-medium text-muted-foreground shadow-sm">
            <FileText className="size-3.5" />
            OCR verified against the original PDF
          </div>
          <h1 className="max-w-3xl text-3xl font-semibold leading-tight tracking-[-0.035em] sm:text-5xl">
            Engineering Mathematics II
          </h1>
          <p className="mt-3 text-[15px] text-muted-foreground sm:text-[16px]">
            MAT 1271-CHM-B · Second Semester B.Tech. · June/July 2023
          </p>

          <div className="mt-7 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-border/60 bg-border/60 sm:grid-cols-4">
            {[
              ["Exam date", "12 Jul 2023"],
              ["Duration", "180 minutes"],
              ["Maximum marks", "50"],
              ["Questions", "15 parts"],
            ].map(([label, value]) => (
              <div key={label} className="bg-card/90 px-4 py-4">
                <p className="text-[10px] font-medium uppercase tracking-[0.1em] text-muted-foreground/70">
                  {label}
                </p>
                <p className="mt-1 text-[13px] font-semibold sm:text-[14px]">
                  {value}
                </p>
              </div>
            ))}
          </div>
        </section>

        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative min-w-0 flex-1 sm:max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground/60" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search questions"
              className="h-10 w-full rounded-xl border border-border/60 bg-card/70 pl-9 pr-3 text-[13px] outline-none transition-shadow placeholder:text-muted-foreground/60 focus:border-foreground/20 focus:ring-2 focus:ring-foreground/10"
            />
          </div>
          <button
            type="button"
            onClick={resetQuestions}
            className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl px-3 text-[12px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <RotateCcw className="size-3.5" />
            Reset transcription
          </button>
        </div>

        <div className="mb-4 flex items-center justify-between px-0.5">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/70">
              Section A
            </p>
            <p className="mt-1 text-[13px] text-muted-foreground">
              Answer all the questions.
            </p>
          </div>
          <span className="rounded-full border border-border/60 bg-card/60 px-2.5 py-1 text-[11px] text-muted-foreground">
            {filteredQuestions.length} shown
          </span>
        </div>

        <div className="space-y-4">
          {filteredQuestions.map((question) => (
            <QuestionCard
              key={question.id}
              question={question}
              editing={editingId === question.id}
              copied={copiedId === question.id}
              onEdit={() =>
                setEditingId((current) =>
                  current === question.id ? null : question.id,
                )
              }
              onChange={(source) => updateQuestion(question.id, source)}
              onCopy={() => copyQuestion(question)}
            />
          ))}
        </div>

        {filteredQuestions.length === 0 && (
          <div className="rounded-2xl border border-dashed border-border p-12 text-center">
            <p className="text-sm font-medium">No matching questions</p>
            <button
              type="button"
              onClick={() => setQuery("")}
              className="mt-2 text-[12px] text-muted-foreground underline underline-offset-4"
            >
              Clear search
            </button>
          </div>
        )}

        <p className="mt-10 text-center text-[11px] leading-5 text-muted-foreground/60">
          Edits are saved in this browser. This is an unofficial transcription.
          Refer to the original PDF if a symbol appears ambiguous.
        </p>
      </main>
    </div>
  );
}
