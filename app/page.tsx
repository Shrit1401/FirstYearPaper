import Link from "next/link";
import { getYears } from "@/lib/papers";
import { TestimonialMarquee } from "@/components/testimonial-marquee";
import { ArrowRight, Brain, ChevronRight, Search, Sparkles } from "lucide-react";
import { isPaperYearDisabled } from "@/lib/paper-availability";

const DRIVE_URL =
  "https://drive.google.com/drive/folders/1dURixLKCVwU-1MsvzgRpjdmG6b9-5L0W?usp=sharing";

const YEAR_SUBTITLES: Record<string, string> = {
  "Year 1": "25 Semester 1 mid-sem papers available",
  "Year 2": "Mid-sem papers in process",
  "Year 3": "Sem 5 & 6 · All programs",
  "Year 4": "Sem 7 · All programs",
  "B.Tech Hons": "Honours question papers",
  "M.Tech": "Postgraduate question papers",
};

export default function Home() {
  const years = getYears();
  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-background">
      {/* Ambient glow */}
      <div
        className="pointer-events-none absolute left-1/2 top-0 h-[480px] w-[800px] -translate-x-1/2 opacity-[0.055]"
        style={{
          background:
            "radial-gradient(ellipse 60% 50% at 50% 0%, var(--color-foreground) 0%, transparent 100%)",
        }}
      />
      {/* Dot grid */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.025]"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)`,
          backgroundSize: "28px 28px",
        }}
      />

      {/* Header */}
      <header className="relative z-10 border-b border-border/40 bg-background/60 backdrop-blur-xl">
        <div className="mx-auto flex max-w-2xl flex-wrap items-center justify-between gap-3 px-4 py-3.5 sm:px-6">
          <div className="flex min-w-0 items-center gap-2">
            <span className="text-sm font-semibold tracking-tight">Papers</span>
            <span className="text-muted-foreground/40">·</span>
            <span className="truncate text-[11px] text-muted-foreground">
              MIT Bengaluru
            </span>
          </div>
          <div className="flex w-full flex-wrap items-center justify-end gap-2 sm:w-auto">
            <Link
              href="/repeat"
              className="flex items-center gap-1.5 rounded-full border border-red-500/25 bg-red-500/10 px-3 py-1.5 text-[12px] font-medium text-red-200 transition-all duration-150 hover:bg-red-500/15 hover:text-red-100 active:scale-[0.97]"
            >
              <Brain className="size-3" />
              Repeat V2
              <span className="text-[10px] font-normal text-red-200/60">Coming soon</span>
            </Link>
            <Link
              href="/browse"
              className="flex items-center gap-1.5 rounded-full border border-border/50 bg-muted/40 px-3 py-1.5 text-[12px] font-medium text-muted-foreground transition-all duration-150 hover:bg-muted hover:text-foreground active:scale-[0.97]"
            >
              <Search className="size-3" />
              Search
            </Link>
          </div>
        </div>
      </header>

      <main className="relative z-10 flex w-full flex-1 flex-col">
        <div className="mx-auto w-full max-w-2xl px-4 pb-0 pt-10 sm:px-6 sm:pt-12">
        {/* Hero */}
        <div className="mb-10">
          <h1 className="hero-title text-center text-[2.15rem] font-semibold leading-[1.05] tracking-[-0.03em] sm:text-[3.25rem]">
            Every past paper,
            <br />
            <span className="text-muted-foreground">from 2021 to 2026.</span>
          </h1>

          <p className="hero-subtitle mt-4 text-center text-[15px] text-muted-foreground">
            Regular and makeup question papers for all programs
            <br className="hidden sm:block" /> at MIT Bengaluru - organised by
            year, semester, and subject.
          </p>
          <p className="mt-2 text-center text-[12px] font-medium text-muted-foreground/70">
            Compute sponsored by MAHE.
          </p>
        </div>

        </div>

        <div className="mx-auto w-full max-w-2xl px-4 pb-16 pt-0 sm:px-6">

        {/* Year picker */}
        <div className="hero-streams mb-10">
          <p className="mb-3 px-0.5 text-[11px] font-medium uppercase tracking-[0.1em] text-muted-foreground/60">
            Select your year
          </p>
          <div className="flex flex-col divide-y divide-border/50 overflow-hidden rounded-2xl border border-border/60 bg-card/60 shadow-sm backdrop-blur-sm">
            {years.map((year, i) => {
              const disabled = isPaperYearDisabled(year);
              const rowContent = (
                <>
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="text-[15px] font-medium">{year}</span>
                    {YEAR_SUBTITLES[year] && (
                      <span className="truncate text-[12px] text-muted-foreground">
                        {YEAR_SUBTITLES[year]}
                      </span>
                    )}
                  </div>
                  <div className="ml-3 flex shrink-0 items-center gap-3">
                    {disabled ? (
                      <span className="rounded-full border border-border/50 bg-background/70 px-2 py-1 text-[11px] text-muted-foreground">
                        Coming soon
                      </span>
                    ) : null}
                    <ChevronRight className="size-4 text-muted-foreground/40 transition-transform duration-150 group-hover:translate-x-0.5 group-hover:text-muted-foreground" />
                  </div>
                </>
              );

              if (disabled) {
                return (
                  <div
                    key={year}
                    aria-disabled="true"
                    className="stream-row flex cursor-not-allowed items-center justify-between gap-3 px-4 py-4 opacity-60 sm:px-5"
                    style={{ animationDelay: `${240 + i * 40}ms` }}
                  >
                    {rowContent}
                  </div>
                );
              }

              return (
                <Link
                  key={year}
                  href={`/browse/${encodeURIComponent(year)}`}
                  className="stream-row group flex items-center justify-between gap-3 px-4 py-4 transition-colors duration-150 hover:bg-muted/50 active:scale-[0.995] active:bg-muted/80 sm:px-5"
                  style={{ animationDelay: `${240 + i * 40}ms` }}
                >
                  {rowContent}
                </Link>
              );
            })}
          </div>
        </div>

        {/* Search CTA */}
        <div className="hero-cta mb-16 text-center">
          <Link
            href="/browse"
            className="inline-flex items-center gap-1.5 rounded-xl border border-border/50 bg-muted/40 px-4 py-2.5 text-[13px] font-medium text-muted-foreground shadow-sm backdrop-blur-sm transition-all duration-150 hover:border-border hover:bg-muted/70 hover:text-foreground active:scale-[0.98]"
          >
            Or search across all papers
            <ArrowRight className="size-3.5" />
          </Link>
        </div>

        <div className="hero-streams mb-10">
          <div className="overflow-hidden rounded-[1.45rem] border border-red-500/20 bg-red-500/[0.055] p-5 shadow-sm backdrop-blur-sm">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="inline-flex items-center gap-2 rounded-full border border-red-500/25 bg-red-500/10 px-2.5 py-1 text-[11px] font-medium text-red-200">
                  <Sparkles className="size-3.5" />
                  Repeat V2
                </div>
                <h3 className="mt-3 text-[1.1rem] font-semibold tracking-tight">
                  Repeat V2 coming soon.
                </h3>
                <p className="mt-2 max-w-xl text-[14px] leading-6 text-muted-foreground">
                  A better way to find repeated questions, common topics, and focused revision lists from real MIT papers.
                </p>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-4">
              <span className="text-[12px] text-muted-foreground/60">
                The current Repeat experience remains active
              </span>
              <Link
                href="/repeat"
                className="inline-flex items-center gap-1.5 rounded-full border border-red-500/25 bg-red-500/10 px-3.5 py-2 text-[12px] font-medium text-red-100 transition-all duration-150 hover:bg-red-500/15 active:scale-[0.97]"
              >
                Open Repeat
                <ArrowRight className="size-3.5" />
              </Link>
            </div>
          </div>
        </div>

        <div className="w-[calc(100vw-2rem)] max-w-6xl -translate-x-1/2 relative left-1/2 sm:w-[calc(100vw-3rem)]">
          <TestimonialMarquee />
        </div>

        {/* Footer meta */}
        <div className="hero-footer mt-auto flex flex-col items-center gap-2 text-center">
          <p className="text-[12px] text-muted-foreground/50">
            Community archive based on{" "}
            <a
              href={DRIVE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2 transition-colors duration-100 hover:text-muted-foreground"
            >
              Manipal OSF
            </a>
            {" · "}made by{" "}
            <span className="text-muted-foreground/70">shrit</span>
            {" · "}shoutout super382946, mymaster2006
          </p>
          <p className="text-[11px] text-muted-foreground/35">
            Papers sourced from{" "}
            <a
              href="https://github.com/Magniquick/mit-question-bank"
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2 transition-colors duration-100 hover:text-muted-foreground/60"
            >
              Magniquick/mit-question-bank
            </a>
            {" · "}
            <Link
              href="/legal"
              className="underline underline-offset-2 transition-colors duration-100 hover:text-muted-foreground/60"
            >
              legal and takedown
            </Link>
          </p>
          <p className="text-[11px] text-muted-foreground/35">
            Compute sponsored by MAHE.
          </p>
        </div>
        </div>
      </main>
    </div>
  );
}
