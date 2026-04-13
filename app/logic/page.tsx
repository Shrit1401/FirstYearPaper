import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Binary,
  BookCopy,
  BrainCircuit,
  Sparkles,
} from "lucide-react";

export const metadata: Metadata = {
  title: "How Repeat Works",
  description:
    "A visual overview of how Repeat turns past papers into grounded study help.",
};

function SectionBadge({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] font-medium text-muted-foreground">
      {children}
    </span>
  );
}

export default function LogicPage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <div
        className="pointer-events-none absolute left-1/2 top-0 h-[460px] w-[820px] -translate-x-1/2 opacity-[0.06]"
        style={{
          background:
            "radial-gradient(ellipse 60% 50% at 50% 0%, var(--color-foreground) 0%, transparent 100%)",
        }}
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.025]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)",
          backgroundSize: "28px 28px",
        }}
      />

      <header className="relative z-10 border-b border-border/40 bg-background/60 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-3.5">
          <Link
            href="/repeat"
            className="inline-flex items-center gap-2 rounded-full border border-border/50 bg-muted/40 px-3 py-1.5 text-[12px] font-medium text-muted-foreground transition-[transform,background-color,color] duration-150 hover:bg-muted hover:text-foreground active:scale-[0.97]"
          >
            <ArrowLeft className="size-3.5" />
            Back to Repeat
          </Link>
          <span className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground/50">
            Logic
          </span>
        </div>
      </header>

      <main className="relative z-10 mx-auto flex w-full max-w-5xl flex-col px-6 pb-20 pt-14">
        <div className="mx-auto max-w-3xl text-center">
          <SectionBadge>
            <Sparkles className="size-3.5" />
            How Repeat Works
          </SectionBadge>
          <h1 className="mt-6 text-[2.8rem] font-semibold leading-[1.04] tracking-[-0.05em] sm:text-[4rem]">
            What you&apos;re paying for
          </h1>
          <p className="mt-5 text-[15px] leading-7 text-muted-foreground sm:text-[17px]">
            Repeat is not just a chat box. It reads the paper set, turns it
            into searchable meaning, and then answers with the papers still in
            the loop.
          </p>
        </div>

        <div className="mt-14 grid gap-5 lg:grid-cols-3">
          <section className="rounded-[2rem] border border-white/8 bg-white/[0.03] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
            <div className="mb-5 flex size-11 items-center justify-center rounded-2xl bg-white/[0.05]">
              <BookCopy className="size-5 text-foreground" />
            </div>
            <h2 className="text-lg font-semibold tracking-tight">
              1. The papers are structured
            </h2>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              We first organize the paper set by year, subject, and the latest
              paper context so Repeat is working inside the right workspace.
            </p>
            <div className="mt-5 space-y-2 rounded-[1.5rem] border border-white/8 bg-black/20 p-4">
              <div className="flex items-center justify-between rounded-xl bg-white/[0.03] px-3 py-2">
                <span className="text-xs text-zinc-300">Year 1</span>
                <span className="text-[11px] text-zinc-500">workspace</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-xl border border-red-400/18 bg-red-400/[0.08] px-3 py-3 text-left">
                  <p className="text-sm font-medium text-red-50">ACE</p>
                  <p className="mt-1 text-[11px] text-red-100/60">
                    20 papers
                  </p>
                </div>
                <div className="rounded-xl border border-white/8 bg-white/[0.03] px-3 py-3 text-left">
                  <p className="text-sm font-medium text-zinc-200">APE</p>
                  <p className="mt-1 text-[11px] text-zinc-500">21 papers</p>
                </div>
              </div>
              <div className="rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2.5">
                <p className="text-[11px] uppercase tracking-[0.16em] text-zinc-500">
                  Latest paper anchor
                </p>
                <p className="mt-1 text-sm text-zinc-200">
                  Engineering Chemistry_4
                </p>
              </div>
            </div>
          </section>

          <section className="rounded-[2rem] border border-white/8 bg-white/[0.03] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
            <div className="mb-5 flex size-11 items-center justify-center rounded-2xl bg-white/[0.05]">
              <Binary className="size-5 text-foreground" />
            </div>
            <h2 className="text-lg font-semibold tracking-tight">
              2. Meaning gets mapped as vectors
            </h2>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              Each chunk is turned into a vector so Repeat can find papers that
              are semantically close, not just exact keyword matches.
            </p>
            <div className="mt-5 rounded-[1.5rem] border border-white/8 bg-black/20 p-4">
              <div className="relative h-44 overflow-hidden rounded-[1.2rem] border border-white/8 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.08),transparent_32%),linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.01))]">
                <div className="absolute left-[18%] top-[22%] size-3 rounded-full bg-red-300 shadow-[0_0_24px_rgba(248,113,113,0.55)]" />
                <div className="absolute left-[25%] top-[32%] size-2.5 rounded-full bg-red-200/85" />
                <div className="absolute left-[31%] top-[26%] size-2 rounded-full bg-red-100/80" />
                <div className="absolute left-[59%] top-[32%] size-3 rounded-full bg-sky-300 shadow-[0_0_24px_rgba(125,211,252,0.45)]" />
                <div className="absolute left-[65%] top-[26%] size-2.5 rounded-full bg-sky-200/85" />
                <div className="absolute left-[69%] top-[39%] size-2 rounded-full bg-sky-100/80" />
                <div className="absolute left-[42%] top-[69%] size-3 rounded-full bg-amber-200 shadow-[0_0_24px_rgba(253,230,138,0.4)]" />
                <div className="absolute left-[49%] top-[76%] size-2.5 rounded-full bg-amber-100/85" />
                <div className="absolute bottom-3 left-3 rounded-full border border-white/10 bg-black/35 px-2.5 py-1 text-[10px] text-zinc-300">
                  similar questions cluster together
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-[2rem] border border-white/8 bg-white/[0.03] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
            <div className="mb-5 flex size-11 items-center justify-center rounded-2xl bg-white/[0.05]">
              <BrainCircuit className="size-5 text-foreground" />
            </div>
            <h2 className="text-lg font-semibold tracking-tight">
              3. Answers stay grounded
            </h2>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              When you ask something, Repeat pulls the most relevant paper
              chunks into the answer so the response stays tied to the source
              material.
            </p>
            <div className="mt-5 space-y-3 rounded-[1.5rem] border border-white/8 bg-black/20 p-4">
              <div className="rounded-[1.1rem] border border-white/8 bg-white/[0.03] p-3">
                <p className="text-[11px] uppercase tracking-[0.14em] text-zinc-500">
                  Your question
                </p>
                <p className="mt-2 text-sm text-zinc-200">
                  Which questions repeat the most in ACE?
                </p>
              </div>
              <div className="flex justify-center">
                <ArrowDown />
              </div>
              <div className="rounded-[1.1rem] border border-red-400/18 bg-red-400/[0.08] p-3">
                <p className="text-[11px] uppercase tracking-[0.14em] text-red-100/65">
                  Grounded answer
                </p>
                <p className="mt-2 text-sm leading-6 text-red-50">
                  Repeat returns recurring patterns with citations from the
                  underlying papers, not just generic AI guesses.
                </p>
              </div>
            </div>
          </section>
        </div>

        <section className="mt-12 grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="rounded-[2rem] border border-white/8 bg-white/[0.03] p-6">
            <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground/55">
              Why it costs
            </p>
            <h2 className="mt-3 text-[1.8rem] font-semibold tracking-[-0.04em]">
              The price is mainly covering AI usage
            </h2>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-muted-foreground">
              Every query runs through paper retrieval and AI generation. The
              Rs. 39 charge is there to cover token costs and keep Repeat fast,
              usable, and worth maintaining.
            </p>
            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <div className="rounded-[1.4rem] border border-white/8 bg-black/20 p-4">
                <p className="text-sm font-medium text-foreground">
                  Paper-aware answers
                </p>
                <p className="mt-2 text-xs leading-6 text-muted-foreground">
                  Responses use the selected paper set instead of a blank chat.
                </p>
              </div>
              <div className="rounded-[1.4rem] border border-white/8 bg-black/20 p-4">
                <p className="text-sm font-medium text-foreground">
                  Better revision payoff
                </p>
                <p className="mt-2 text-xs leading-6 text-muted-foreground">
                  See what repeats, what matters most, and where to focus.
                </p>
              </div>
              <div className="rounded-[1.4rem] border border-white/8 bg-black/20 p-4">
                <p className="text-sm font-medium text-foreground">
                  Cleaner than searching manually
                </p>
                <p className="mt-2 text-xs leading-6 text-muted-foreground">
                  The interface compresses dozens of papers into one workflow.
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-[2rem] border border-white/8 bg-white/[0.03] p-6">
            <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground/55">
              Access
            </p>
            <h2 className="mt-3 text-[1.8rem] font-semibold tracking-[-0.04em]">
              One simple unlock
            </h2>
            <p className="mt-4 text-sm leading-7 text-muted-foreground">
              If Repeat feels useful, unlock it and use the full workspace.
              You&apos;ll get the same interface you saw in the preview, just
              fully interactive.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                href="/repeat"
                className="inline-flex items-center gap-2 rounded-full bg-foreground px-5 py-2.5 text-sm font-medium text-background transition-transform duration-150 hover:scale-[1.01] active:scale-[0.98]"
              >
                Buy now for Rs. 39
                <ArrowRight className="size-4" />
              </Link>
              <Link
                href="/"
                className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-5 py-2.5 text-sm font-medium text-foreground transition-[transform,background-color] duration-150 hover:bg-white/[0.06] active:scale-[0.98]"
              >
                Back home
              </Link>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

function ArrowDown() {
  return (
    <div className="flex size-8 items-center justify-center rounded-full border border-white/10 bg-white/[0.03] text-zinc-400">
      <svg
        width="14"
        height="14"
        viewBox="0 0 14 14"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M7 2.5V11.5M7 11.5L10.5 8M7 11.5L3.5 8"
          stroke="currentColor"
          strokeWidth="1.25"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}
