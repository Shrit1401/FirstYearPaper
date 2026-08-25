import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Sparkles } from "lucide-react";

export const metadata: Metadata = {
  title: "Repeat V2 Coming Soon",
  description: "Repeat V2 is coming soon to MIT Bengaluru Papers.",
  robots: { index: false, follow: false },
};

export default function RepeatPage() {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4 py-16 text-foreground">
      <div
        className="pointer-events-none absolute left-1/2 top-0 h-[520px] w-[760px] -translate-x-1/2 opacity-[0.08]"
        style={{
          background:
            "radial-gradient(ellipse 60% 50% at 50% 0%, rgb(248 113 113) 0%, transparent 100%)",
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

      <section className="relative z-10 w-full max-w-xl text-center">
        <div className="mx-auto flex size-12 items-center justify-center rounded-2xl border border-red-500/25 bg-red-500/10 text-red-200 shadow-sm">
          <Sparkles className="size-5" />
        </div>

        <div className="mt-6 inline-flex items-center rounded-full border border-red-500/25 bg-red-500/10 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.12em] text-red-200">
          In development
        </div>

        <h1 className="mt-5 text-[2.35rem] font-semibold leading-tight tracking-[-0.035em] sm:text-5xl">
          Repeat V2
          <span className="block text-muted-foreground">coming soon.</span>
        </h1>

        <p className="mx-auto mt-5 max-w-md text-[15px] leading-7 text-muted-foreground">
          A better way to find repeated questions, common topics, and focused
          revision lists from real MIT papers is on the way.
        </p>

        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href="/"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-border/60 bg-card/70 px-4 text-[13px] font-medium text-muted-foreground transition-all duration-150 hover:bg-muted/70 hover:text-foreground active:scale-[0.97]"
          >
            <ArrowLeft className="size-3.5" />
            Back home
          </Link>
          <Link
            href="/browse"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-red-500/25 bg-red-500/10 px-4 text-[13px] font-medium text-red-100 transition-all duration-150 hover:bg-red-500/15 active:scale-[0.97]"
          >
            Browse papers
            <ArrowRight className="size-3.5" />
          </Link>
        </div>
      </section>
    </main>
  );
}
