import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Binary,
  BookCopy,
  BrainCircuit,
  LockKeyhole,
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
      {/* glow */}
      <div
        className="pointer-events-none absolute left-1/2 top-0 h-[500px] w-[900px] -translate-x-1/2 opacity-[0.07]"
        style={{
          background:
            "radial-gradient(ellipse 60% 50% at 50% 0%, var(--color-foreground) 0%, transparent 100%)",
        }}
      />
      {/* dot grid */}
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

      <main className="relative z-10 mx-auto flex w-full max-w-5xl flex-col px-6 pb-24 pt-14">
        {/* hero text */}
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

        {/* ── VIDEO ── */}
        <div className="mt-14 overflow-hidden rounded-[2rem] border border-white/10 bg-black shadow-[0_0_0_1px_rgba(255,255,255,0.04),0_32px_80px_rgba(0,0,0,0.55)]">
          {/* chrome bar */}
          <div className="flex items-center gap-2 border-b border-white/8 px-5 py-3">
            <div className="size-2.5 rounded-full bg-white/15" />
            <div className="size-2.5 rounded-full bg-white/10" />
            <div className="size-2.5 rounded-full bg-white/8" />
            <span className="ml-2 text-[12px] text-white/30">Repeat — product demo</span>
          </div>
          <video
            src="/vid.mp4"
            controls
            playsInline
            className="h-auto w-full"
          />
        </div>

        {/* ── HOW IT WORKS cards ── */}
        <div className="mt-14 grid gap-5 lg:grid-cols-3">
          <section className="group relative overflow-hidden rounded-[2rem] border border-white/8 bg-white/[0.02] p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] transition-colors duration-200 hover:border-white/14 hover:bg-white/[0.035]">
            <div className="pointer-events-none absolute -right-8 -top-8 size-40 rounded-full bg-white/[0.02] blur-2xl" />
            <div className="mb-5 flex size-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.06]">
              <BookCopy className="size-5 text-foreground" />
            </div>
            <h2 className="text-[1.05rem] font-semibold tracking-tight">
              1. The papers are structured
            </h2>
            <p className="mt-3 text-[13px] leading-6 text-muted-foreground">
              We organize the paper set by year, subject, and the latest
              paper context so Repeat is working inside the right workspace.
            </p>
            <div className="mt-5 space-y-2 rounded-[1.4rem] border border-white/8 bg-black/30 p-4">
              <div className="flex items-center justify-between rounded-xl bg-white/[0.04] px-3 py-2">
                <span className="text-xs font-medium text-zinc-300">Year 1</span>
                <span className="rounded-full border border-white/8 bg-white/[0.03] px-2 py-0.5 text-[10px] text-zinc-500">workspace</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-xl border border-red-400/20 bg-red-400/[0.08] px-3 py-3">
                  <p className="text-sm font-semibold text-red-100">ACE</p>
                  <p className="mt-0.5 text-[11px] text-red-200/50">20 papers</p>
                </div>
                <div className="rounded-xl border border-white/8 bg-white/[0.03] px-3 py-3">
                  <p className="text-sm font-semibold text-zinc-200">APE</p>
                  <p className="mt-0.5 text-[11px] text-zinc-500">21 papers</p>
                </div>
              </div>
              <div className="rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2.5">
                <p className="text-[10px] uppercase tracking-[0.16em] text-zinc-500">Latest paper anchor</p>
                <p className="mt-1 text-[13px] text-zinc-200">Engineering Chemistry_4</p>
              </div>
            </div>
          </section>

          <section className="group relative overflow-hidden rounded-[2rem] border border-white/8 bg-white/[0.02] p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] transition-colors duration-200 hover:border-white/14 hover:bg-white/[0.035]">
            <div className="pointer-events-none absolute -right-8 -top-8 size-40 rounded-full bg-sky-400/[0.03] blur-2xl" />
            <div className="mb-5 flex size-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.06]">
              <Binary className="size-5 text-foreground" />
            </div>
            <h2 className="text-[1.05rem] font-semibold tracking-tight">
              2. Meaning gets mapped as vectors
            </h2>
            <p className="mt-3 text-[13px] leading-6 text-muted-foreground">
              Each chunk is turned into a vector so Repeat can find papers that
              are semantically close, not just exact keyword matches.
            </p>
            <div className="mt-5 rounded-[1.4rem] border border-white/8 bg-black/30 p-4">
              <div className="relative h-44 overflow-hidden rounded-[1.2rem] border border-white/8 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.06),transparent_40%)]">
                <div className="absolute left-[18%] top-[22%] size-3 rounded-full bg-red-300 shadow-[0_0_20px_rgba(248,113,113,0.6)]" />
                <div className="absolute left-[25%] top-[32%] size-2.5 rounded-full bg-red-200/80" />
                <div className="absolute left-[31%] top-[26%] size-2 rounded-full bg-red-100/70" />
                <div className="absolute left-[59%] top-[32%] size-3 rounded-full bg-sky-300 shadow-[0_0_20px_rgba(125,211,252,0.5)]" />
                <div className="absolute left-[65%] top-[26%] size-2.5 rounded-full bg-sky-200/80" />
                <div className="absolute left-[69%] top-[39%] size-2 rounded-full bg-sky-100/70" />
                <div className="absolute left-[42%] top-[69%] size-3 rounded-full bg-amber-200 shadow-[0_0_20px_rgba(253,230,138,0.45)]" />
                <div className="absolute left-[49%] top-[76%] size-2.5 rounded-full bg-amber-100/80" />
                <div className="absolute bottom-3 left-3 rounded-full border border-white/10 bg-black/40 px-2.5 py-1 text-[10px] text-zinc-300 backdrop-blur-sm">
                  similar questions cluster together
                </div>
              </div>
            </div>
          </section>

          <section className="group relative overflow-hidden rounded-[2rem] border border-white/8 bg-white/[0.02] p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] transition-colors duration-200 hover:border-white/14 hover:bg-white/[0.035]">
            <div className="pointer-events-none absolute -right-8 -top-8 size-40 rounded-full bg-amber-400/[0.03] blur-2xl" />
            <div className="mb-5 flex size-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.06]">
              <BrainCircuit className="size-5 text-foreground" />
            </div>
            <h2 className="text-[1.05rem] font-semibold tracking-tight">
              3. Answers stay grounded
            </h2>
            <p className="mt-3 text-[13px] leading-6 text-muted-foreground">
              When you ask something, Repeat pulls the most relevant paper
              chunks into the answer so the response stays tied to the source
              material.
            </p>
            <div className="mt-5 space-y-2.5 rounded-[1.4rem] border border-white/8 bg-black/30 p-4">
              <div className="rounded-[1.1rem] border border-white/8 bg-white/[0.03] p-3">
                <p className="text-[10px] uppercase tracking-[0.14em] text-zinc-500">Your question</p>
                <p className="mt-1.5 text-[13px] text-zinc-200">
                  Which questions repeat the most in ACE?
                </p>
              </div>
              <div className="flex justify-center py-0.5">
                <ArrowDown />
              </div>
              <div className="rounded-[1.1rem] border border-red-400/20 bg-red-400/[0.07] p-3">
                <p className="text-[10px] uppercase tracking-[0.14em] text-red-200/60">Grounded answer</p>
                <p className="mt-1.5 text-[13px] leading-6 text-red-50/90">
                  Repeat returns recurring patterns with citations from the
                  underlying papers, not just generic AI guesses.
                </p>
              </div>
            </div>
          </section>
        </div>

        {/* ── BOTTOM CARDS ── */}
        <section className="mt-8 grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="relative overflow-hidden rounded-[2rem] border border-white/8 bg-white/[0.02] p-7 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
            <div className="pointer-events-none absolute -right-16 -top-16 size-56 rounded-full bg-white/[0.025] blur-3xl" />
            <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground/50">
              Why it costs
            </p>
            <h2 className="mt-3 text-[1.75rem] font-semibold leading-tight tracking-[-0.04em]">
              The price mainly covers AI usage
            </h2>
            <p className="mt-4 max-w-2xl text-[13px] leading-7 text-muted-foreground">
              Every query runs through paper retrieval and AI generation. The
              Rs. 39 charge is there to cover token costs and keep Repeat fast,
              usable, and worth maintaining.
            </p>
            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              {[
                {
                  title: "Paper-aware answers",
                  desc: "Responses use the selected paper set instead of a blank chat.",
                },
                {
                  title: "Better revision payoff",
                  desc: "See what repeats, what matters most, and where to focus.",
                },
                {
                  title: "Cleaner workflow",
                  desc: "Dozens of papers compressed into one interface.",
                },
              ].map((item) => (
                <div
                  key={item.title}
                  className="rounded-[1.4rem] border border-white/8 bg-black/25 p-4 transition-colors duration-150 hover:border-white/14"
                >
                  <p className="text-[13px] font-semibold text-foreground">{item.title}</p>
                  <p className="mt-2 text-[12px] leading-5 text-muted-foreground">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="relative flex flex-col overflow-hidden rounded-[2rem] border border-white/8 bg-white/[0.02] p-7 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
            <div className="pointer-events-none absolute -left-12 -top-12 size-48 rounded-full bg-amber-400/[0.04] blur-3xl" />
            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-amber-400/16 bg-amber-400/8 px-3 py-1 text-[11px] font-medium text-amber-100">
              <LockKeyhole className="size-3 text-amber-300" />
              Repeat Pro
            </div>
            <p className="mt-4 text-[10px] uppercase tracking-[0.2em] text-muted-foreground/50">
              Access
            </p>
            <h2 className="mt-3 text-[1.75rem] font-semibold leading-tight tracking-[-0.04em]">
              One simple unlock
            </h2>
            <p className="mt-4 text-[13px] leading-7 text-muted-foreground">
              If Repeat feels useful, unlock it and use the full workspace —
              fully interactive, same interface.
            </p>
            <div className="mt-auto pt-8 flex flex-wrap gap-3">
              <Link
                href="/repeat"
                className="inline-flex items-center gap-2 rounded-full bg-foreground px-5 py-2.5 text-[13px] font-semibold text-background transition-transform duration-150 hover:scale-[1.02] active:scale-[0.98]"
              >
                Buy now for Rs. 39
                <ArrowRight className="size-4" />
              </Link>
              <Link
                href="/"
                className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-5 py-2.5 text-[13px] font-medium text-foreground transition-[transform,background-color] duration-150 hover:bg-white/[0.07] active:scale-[0.98]"
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
    <div className="flex size-7 items-center justify-center rounded-full border border-white/10 bg-white/[0.03] text-zinc-500">
      <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
        <path
          d="M7 2.5V11.5M7 11.5L10.5 8M7 11.5L3.5 8"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}
