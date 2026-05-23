import Link from "next/link";
import { ArrowLeft, Brain, Sparkles } from "lucide-react";

export function RepeatClosed() {
  return (
    <div className="relative flex min-h-dvh flex-col overflow-hidden bg-background">
      <div
        className="pointer-events-none absolute left-1/2 top-0 h-[420px] w-[720px] -translate-x-1/2 opacity-[0.07]"
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

      <main className="relative z-10 flex flex-1 items-center justify-center px-4 py-12 sm:px-6">
        <div className="w-full max-w-md">
          <div className="overflow-hidden rounded-[1.55rem] border border-border/60 bg-card/70 p-6 shadow-sm backdrop-blur-sm sm:p-8">
            <div className="flex items-start justify-between gap-4">
              <div className="inline-flex items-center gap-2 rounded-full border border-border/50 bg-background/55 px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
                <Sparkles className="size-3.5 text-amber-400" />
                Repeat
              </div>
              <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-muted/60">
                <Brain className="size-5 text-foreground/80" />
              </div>
            </div>

            <h1 className="mt-5 text-[1.65rem] font-semibold leading-[1.08] tracking-[-0.03em] sm:text-[1.85rem]">
              That&apos;s a wrap.
              <span className="block text-muted-foreground">Thank you.</span>
            </h1>

            <div className="mt-5 space-y-3 text-[14px] leading-6 text-muted-foreground">
              <p>
                Repeat is done for the semester. Genuinely, thank you so much
                for the support. It meant a lot.
              </p>
              <p>
                If you bought Repeat, I&apos;ll personally reach out soon for
                feedback.
              </p>
            </div>

            <div className="mt-5 rounded-xl border border-border/50 bg-background/45 px-4 py-3 text-[13px] leading-6 text-muted-foreground">
              See you next sem with something even better. ✌️
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-border/50 pt-5">
              <span className="text-[12px] text-muted-foreground/60">
                MIT Bengaluru · Sem 2, 2025–26
              </span>
              <Link
                href="/"
                className="group inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/60 px-4 py-2 text-[12px] font-medium text-foreground transition-all duration-150 hover:bg-muted/60 active:scale-[0.97]"
              >
                <ArrowLeft className="size-3.5 transition-transform duration-150 group-hover:-translate-x-0.5" />
                Back to papers
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
