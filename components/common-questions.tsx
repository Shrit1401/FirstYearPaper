"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { BookOpen, ChevronRight, ExternalLink } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { Bank, BankQuestion } from "@/lib/question-banks";

const DIFF_PILL: Record<string, string> = {
  Easy: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  Medium: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  Hard: "bg-rose-500/15 text-rose-600 dark:text-rose-400",
};

function QuestionCard({
  q,
  index,
}: {
  q: BankQuestion;
  index: number;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="overflow-hidden rounded-2xl border border-border/60 bg-card/80">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="grid w-full grid-cols-[auto_1fr_auto] items-start gap-3 px-3.5 py-3.5 text-left transition-[background-color,transform] duration-150 [transition-timing-function:var(--ease-out)] active:scale-[0.99] [@media(hover:hover)_and_(pointer:fine)]:hover:bg-muted/40"
      >
        <span className="pt-0.5 font-mono text-[12px] tabular-nums text-muted-foreground">
          {String(index + 1).padStart(2, "0")}
        </span>
        <span className="min-w-0">
          <span className="mb-1.5 flex flex-wrap gap-1.5">
            <span className="rounded-md bg-muted/70 px-1.5 py-0.5 text-[10.5px] text-muted-foreground">
              {q.year}
            </span>
            <span
              className={`rounded-md px-1.5 py-0.5 text-[10.5px] font-medium ${
                DIFF_PILL[q.difficulty] ?? "bg-muted text-muted-foreground"
              }`}
            >
              {q.difficulty}
            </span>
          </span>
          <span
            className={`text-[13.5px] leading-6 text-foreground/90 ${
              open ? "whitespace-pre-wrap break-words" : "line-clamp-3"
            }`}
          >
            {q.text.trim()}
          </span>
        </span>
        <ChevronRight
          className={`mt-1 size-4 shrink-0 text-muted-foreground/50 transition-transform duration-150 [transition-timing-function:var(--ease-out)] ${
            open ? "rotate-90" : ""
          }`}
        />
      </button>
      {open && q.images?.length ? (
        <div className="grid gap-3 border-t border-border/40 px-3.5 pb-4 pt-3">
          {q.images.map((src, i) => (
            <a
              key={src}
              href={src}
              target="_blank"
              rel="noopener noreferrer"
              className="overflow-hidden rounded-xl bg-white p-2"
            >
              <Image
                src={src}
                alt={`Diagram ${i + 1}`}
                width={1200}
                height={800}
                unoptimized
                className="h-auto max-h-[420px] w-auto max-w-full object-contain"
              />
            </a>
          ))}
        </div>
      ) : null}
      {open && q.solution ? (
        <div className="border-t border-border/40 px-3.5 pb-4 pt-3">
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            Solution
          </p>
          <p className="mt-1.5 whitespace-pre-wrap text-[13px] leading-6 text-foreground/85">
            {q.solution}
          </p>
        </div>
      ) : null}
    </div>
  );
}

export function CommonQuestions({
  title,
  bank,
}: {
  title: string;
  bank: Bank | null;
}) {
  const [open, setOpen] = useState(false);
  const [diff, setDiff] = useState<string | null>(null);

  const years = useMemo(
    () =>
      bank
        ? [...new Set(bank.questions.map((q) => q.year))].sort().reverse()
        : [],
    [bank],
  );

  const shown = useMemo(() => {
    if (!bank) return [];
    return bank.questions.filter((q) => !diff || q.difficulty === diff);
  }, [bank, diff]);

  if (!bank || bank.questions.length === 0) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="group flex w-full items-center gap-3 rounded-2xl border border-border/60 bg-card/70 px-4 py-4 text-left transition-[background-color,transform] duration-150 [transition-timing-function:var(--ease-out)] active:scale-[0.99] [@media(hover:hover)_and_(pointer:fine)]:hover:bg-muted/45"
      >
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-sky-500/10 text-sky-400">
          <BookOpen className="size-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold tracking-tight">
            Common questions
          </span>
          <span className="mt-1 block text-[12px] text-muted-foreground">
            {bank.questions.length} frequently asked · {years.join(", ")}
          </span>
        </span>
        <span className="flex items-center gap-1 text-[12px] text-muted-foreground transition-colors group-hover:text-foreground">
          Open
          <ChevronRight className="size-3.5 transition-transform duration-150 group-hover:translate-x-0.5" />
        </span>
      </button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="right"
          className="w-full gap-0 border-border/60 p-0 sm:max-w-lg data-[state=open]:duration-300 data-[state=closed]:duration-200 [transition-timing-function:var(--ease-drawer)]"
        >
          <SheetHeader className="border-b border-border/50 px-5 py-4 pr-12 text-left">
            <SheetTitle className="text-[17px] tracking-tight">
              Common questions
            </SheetTitle>
            <SheetDescription className="text-[12.5px]">
              {title} · {bank.questions.length} questions students see often
            </SheetDescription>
            <div className="mt-3 flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => setDiff(null)}
                className={`rounded-full border px-2.5 py-1 text-[11.5px] font-medium transition-[background-color,border-color,transform] duration-150 [transition-timing-function:var(--ease-out)] active:scale-[0.97] ${
                  diff == null
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border/60 bg-card text-muted-foreground"
                }`}
              >
                All
              </button>
              {["Easy", "Medium", "Hard"].map((d) => {
                const n = bank.questions.filter((q) => q.difficulty === d).length;
                if (!n) return null;
                return (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDiff(diff === d ? null : d)}
                    className={`rounded-full border px-2.5 py-1 text-[11.5px] font-medium transition-[background-color,border-color,transform] duration-150 [transition-timing-function:var(--ease-out)] active:scale-[0.97] ${
                      diff === d
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border/60 bg-card text-muted-foreground"
                    }`}
                  >
                    {d}
                    <span className="ml-1 font-mono opacity-70">{n}</span>
                  </button>
                );
              })}
            </div>
          </SheetHeader>

          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
            <div className="flex flex-col gap-2.5">
              {shown.map((q, i) => (
                <QuestionCard key={q.id} q={q} index={i} />
              ))}
            </div>
            {!shown.length ? (
              <p className="py-12 text-center text-[13px] text-muted-foreground">
                No questions for this filter.
              </p>
            ) : null}
          </div>

          {bank.source ? (
            <div className="border-t border-border/50 px-5 py-3">
              <a
                href={bank.source}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground transition-colors hover:text-foreground"
              >
                Source collection
                <ExternalLink className="size-3 opacity-60" />
              </a>
            </div>
          ) : null}
        </SheetContent>
      </Sheet>
    </>
  );
}
