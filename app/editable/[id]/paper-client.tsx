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
  ScanText,
} from "lucide-react";

type EditablePage = {
  number: number;
  method: "text-layer" | "image-ocr";
  source: string;
  nativeCharacters: number;
  ocrCharacters: number;
};

export type EditablePaperDocument = {
  version: number;
  id: string;
  name: string;
  href: string;
  metadata: {
    year: string;
    semester: string;
    branch: string;
    examType: string;
    subject: string;
  };
  pages: EditablePage[];
  stats: {
    nativePageCount: number;
    ocrPageCount: number;
    lowConfidencePageCount: number;
  };
};

function escapeLatexText(value: string) {
  const replacements: Record<string, string> = {
    "\\": "\\textbackslash{}",
    "%": "\\%",
    "&": "\\&",
    "#": "\\#",
    "_": "\\_",
    "{": "\\{",
    "}": "\\}",
  };
  return Array.from(value, (character) => replacements[character] || character).join(
    "",
  );
}

function sourceToLatex(source: string) {
  const mathPattern =
    /((?<!\\)\$\$[\s\S]*?(?<!\\)\$\$|(?<!\\)\$[^$\n]+(?<!\\)\$)/g;
  let cursor = 0;
  let output = "";
  for (const match of source.matchAll(mathPattern)) {
    const index = match.index || 0;
    output += escapeLatexText(source.slice(cursor, index));
    output += match[0];
    cursor = index + match[0].length;
  }
  output += escapeLatexText(source.slice(cursor));
  return output.replace(/  \n/g, "\\\\\n");
}

function makeLatexDocument(document: EditablePaperDocument, sources: string[]) {
  const pageSections = sources
    .map(
      (source, index) =>
        "\\section*{Page " +
        (index + 1) +
        "}\n" +
        sourceToLatex(source),
    )
    .join("\n\n\\newpage\n\n");

  return [
    "\\documentclass[11pt]{article}",
    "\\usepackage[margin=0.8in]{geometry}",
    "\\usepackage{amsmath,amssymb}",
    "\\usepackage[T1]{fontenc}",
    "\\begin{document}",
    "\\begin{center}",
    "{\\Large\\bfseries " + escapeLatexText(document.name) + "}",
    "\\end{center}",
    pageSections,
    "\\end{document}",
    "",
  ].join("\n");
}

function PageEditor({
  page,
  source,
  editing,
  onToggle,
  onChange,
}: {
  page: EditablePage;
  source: string;
  editing: boolean;
  onToggle: () => void;
  onChange: (value: string) => void;
}) {
  return (
    <article className="overflow-hidden rounded-2xl border border-border/60 bg-card/75 shadow-sm">
      <div className="flex items-center justify-between border-b border-border/50 px-4 py-3">
        <div className="flex items-center gap-2.5">
          <span className="flex size-7 items-center justify-center rounded-lg bg-foreground text-[11px] font-semibold text-background">
            {page.number}
          </span>
          <span className="text-[11px] font-medium uppercase tracking-[0.1em] text-muted-foreground">
            Page {page.number}
          </span>
          <span className="rounded-full border border-border/60 bg-background/60 px-2 py-0.5 text-[10px] text-muted-foreground">
            {page.method === "image-ocr" ? "Image OCR" : "Text layer"}
          </span>
        </div>
        <button
          type="button"
          onClick={onToggle}
          className={
            "inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-[12px] font-medium transition-colors " +
            (editing
              ? "bg-foreground text-background"
              : "text-muted-foreground hover:bg-muted hover:text-foreground")
          }
        >
          {editing ? <Check className="size-3.5" /> : <Edit3 className="size-3.5" />}
          {editing ? "Done" : "Edit"}
        </button>
      </div>

      <div className={editing ? "grid xl:grid-cols-2" : "grid"}>
        {editing ? (
          <div className="border-b border-border/50 p-4 xl:border-b-0 xl:border-r">
            <label
              htmlFor={"page-source-" + page.number}
              className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/70"
            >
              Editable OCR and LaTeX
            </label>
            <textarea
              id={"page-source-" + page.number}
              value={source}
              onChange={(event) => onChange(event.target.value)}
              spellCheck
              className="min-h-[28rem] w-full resize-y rounded-xl border border-border/60 bg-background/70 p-3 font-mono text-[12px] leading-5 outline-none focus:border-foreground/30 focus:ring-2 focus:ring-foreground/10"
            />
            <p className="mt-2 text-[11px] text-muted-foreground/70">
              Use <code>$...$</code> inline or <code>$$...$$</code> for display math.
            </p>
          </div>
        ) : null}
        <div className="min-w-0 p-5 sm:p-7">
          {editing ? (
            <p className="mb-4 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/70">
              Live preview
            </p>
          ) : null}
          <div className="paper-question break-words text-[14px] leading-7 sm:text-[15px]">
            <ReactMarkdown
              remarkPlugins={[remarkMath]}
              rehypePlugins={[rehypeKatex]}
            >
              {source}
            </ReactMarkdown>
          </div>
        </div>
      </div>
    </article>
  );
}

export function EditablePaperClient({
  document,
}: {
  document: EditablePaperDocument;
}) {
  const storageKey =
    "editable-paper-v" + document.version + "-" + document.id;
  const originalSources = useMemo(
    () => document.pages.map((page) => page.source),
    [document.pages],
  );
  const [sources, setSources] = useState(originalSources);
  const [editingPage, setEditingPage] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let saved: string[] | null = null;
    try {
      const value = window.localStorage.getItem(storageKey);
      if (value) saved = JSON.parse(value) as string[];
    } catch {
      saved = null;
    }
    const timer = window.setTimeout(() => {
      if (saved?.length === document.pages.length) setSources(saved);
      setHydrated(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [document.pages.length, storageKey]);

  useEffect(() => {
    if (hydrated) {
      window.localStorage.setItem(storageKey, JSON.stringify(sources));
    }
  }, [hydrated, sources, storageKey]);

  function updateSource(index: number, value: string) {
    setSources((current) =>
      current.map((source, sourceIndex) =>
        sourceIndex === index ? value : source,
      ),
    );
  }

  function reset() {
    if (!window.confirm("Reset every page to the generated OCR copy?")) return;
    setSources(originalSources);
    setEditingPage(null);
    window.localStorage.removeItem(storageKey);
  }

  async function copyAll() {
    await navigator.clipboard.writeText(sources.join("\n\n---\n\n"));
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  }

  function downloadLatex() {
    posthog.capture("editable_paper_exported", {
      page_count: document.pages.length,
      ocr_page_count: document.stats.ocrPageCount,
    });
    const latex = makeLatexDocument(document, sources);
    const blob = new Blob([latex], { type: "application/x-tex" });
    const url = URL.createObjectURL(blob);
    const anchor = window.document.createElement("a");
    anchor.href = url;
    anchor.download =
      document.name.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "") +
      ".tex";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b border-border/50 bg-background/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[96rem] items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <Link
            href="/browse"
            className="inline-flex items-center gap-2 text-[13px] font-medium text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-4" />
            Archive
          </Link>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={copyAll}
              className="hidden h-9 items-center gap-1.5 rounded-lg px-3 text-[12px] font-medium text-muted-foreground hover:bg-muted hover:text-foreground sm:inline-flex"
            >
              {copied ? <Check className="size-3.5 text-emerald-500" /> : <Copy className="size-3.5" />}
              {copied ? "Copied" : "Copy all"}
            </button>
            <button
              type="button"
              onClick={downloadLatex}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-foreground px-3 text-[12px] font-semibold text-background hover:opacity-85"
            >
              <Download className="size-3.5" />
              Download .tex
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[96rem] px-4 pb-20 pt-8 sm:px-6">
        <section className="mb-7">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-card/70 px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
              <ScanText className="size-3.5" />
              OCR editable copy
            </span>
            <span className="rounded-full border border-border/60 bg-card/70 px-2.5 py-1 text-[10px] text-muted-foreground">
              {document.pages.length} pages
            </span>
            {document.stats.ocrPageCount > 0 ? (
              <span className="rounded-full border border-amber-500/25 bg-amber-500/10 px-2.5 py-1 text-[10px] text-amber-300">
                {document.stats.ocrPageCount} image OCR page
                {document.stats.ocrPageCount === 1 ? "" : "s"}
              </span>
            ) : null}
          </div>
          <h1 className="max-w-5xl text-2xl font-semibold leading-tight tracking-[-0.025em] sm:text-4xl">
            {document.name}
          </h1>
          <p className="mt-3 text-[13px] text-muted-foreground">
            {document.metadata.year} · {document.metadata.semester} ·{" "}
            {document.metadata.examType} · {document.metadata.subject}
          </p>
          <div className="mt-5 flex flex-wrap items-center gap-2">
            <a
              href={document.href}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border/60 bg-card/60 px-3 text-[12px] font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <ExternalLink className="size-3.5" />
              Original PDF
            </a>
            <button
              type="button"
              onClick={reset}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-[12px] font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <RotateCcw className="size-3.5" />
              Reset OCR
            </button>
          </div>
          <p className="mt-4 max-w-3xl text-[12px] leading-5 text-muted-foreground/70">
            This is an automatically generated starting copy. Equations, diagrams,
            and faint scans can need correction. Compare edits with the original PDF.
          </p>
        </section>

        <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(22rem,0.85fr)]">
          <div className="space-y-4">
            {document.pages.map((page, index) => (
              <PageEditor
                key={page.number}
                page={page}
                source={sources[index] || ""}
                editing={editingPage === page.number}
                onToggle={() =>
                  setEditingPage((current) =>
                    current === page.number ? null : page.number,
                  )
                }
                onChange={(value) => updateSource(index, value)}
              />
            ))}
          </div>

          <aside className="sticky top-[4.5rem] hidden h-[calc(100vh-5.5rem)] overflow-hidden rounded-2xl border border-border/60 bg-[#404040] shadow-sm lg:block">
            <div className="flex h-10 items-center gap-2 border-b border-white/10 bg-background px-3 text-[11px] font-medium text-muted-foreground">
              <FileText className="size-3.5" />
              Original paper
            </div>
            <iframe
              src={document.href + "#toolbar=1&navpanes=0&view=FitH"}
              title={"Original PDF: " + document.name}
              className="h-[calc(100%-2.5rem)] w-full border-0"
            />
          </aside>
        </div>
      </main>
    </div>
  );
}
