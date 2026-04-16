import Link from "next/link";
import { getYears } from "@/lib/papers";
import { ArrowRight, Brain, ChevronRight, Search } from "lucide-react";
import { ProfileCard } from "@/components/profile-card";
import { ProfileNavButton } from "@/components/profile-nav-button";
import { RepeatPromoCard } from "@/components/repeat-promo";
import { buildRepeatHref } from "@/lib/repeat-links";

const DRIVE_URL =
  "https://drive.google.com/drive/folders/1dURixLKCVwU-1MsvzgRpjdmG6b9-5L0W?usp=sharing";

const YEAR_SUBTITLES: Record<string, string> = {
  "Year 1": "Sem 1 & 2 · CSE, ECE, EEE",
  "Year 2": "Sem 3 & 4 · All branches",
  "Year 3": "Sem 5 & 6 · All branches",
  "Year 4": "Sem 7 · All branches",
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
              className="flex items-center gap-1.5 rounded-full border border-border/50 bg-muted/40 px-3 py-1.5 text-[12px] font-medium text-muted-foreground transition-all duration-150 hover:bg-muted hover:text-foreground active:scale-[0.97]"
            >
              <Brain className="size-3" />
              Repeat
            </Link>
            <Link
              href="/browse"
              className="flex items-center gap-1.5 rounded-full border border-border/50 bg-muted/40 px-3 py-1.5 text-[12px] font-medium text-muted-foreground transition-all duration-150 hover:bg-muted hover:text-foreground active:scale-[0.97]"
            >
              <Search className="size-3" />
              Search
            </Link>
            <ProfileNavButton />
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto flex w-full max-w-2xl flex-1 flex-col px-4 pb-16 pt-10 sm:px-6 sm:pt-12">
        {/* Hero */}
        <div className="mb-10">
          <div className="hero-badge mb-6 flex justify-center">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border/50 bg-muted/60 px-3 py-1 text-[11px] font-medium text-muted-foreground backdrop-blur-sm">
              <span className="relative flex size-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-60" />
                <span className="relative inline-flex size-1.5 rounded-full bg-green-500" />
              </span>
              80% of first years · 13.9k pageviews
            </span>
          </div>

          <h1 className="hero-title text-center text-[2.15rem] font-semibold leading-[1.05] tracking-[-0.03em] sm:text-[3.25rem]">
            Every past paper,
            <br />
            <span className="text-muted-foreground">up to year 3.</span>
          </h1>

          <p className="hero-subtitle mt-4 text-center text-[15px] text-muted-foreground">
            Mid-sem and end-sem question papers for all branches
            <br className="hidden sm:block" /> at MIT Bengaluru — organised by
            year, semester, and subject.
          </p>
        </div>

        {/* Your papers shortcut */}
        <ProfileCard />

        <div className="hero-streams mb-8">
          <RepeatPromoCard
            title="Use Repeat to study from the papers."
            body="See common questions, repeated topics, and quick revision guidance based on the paper set."
            href={buildRepeatHref({
              prompt: "What are the most repeated exam questions overall?",
            })}
            cta="Try Repeat"
            meta="Built from the actual papers"
          />
        </div>

        {/* Year picker */}
        <div className="hero-streams mb-10">
          <p className="mb-3 px-0.5 text-[11px] font-medium uppercase tracking-[0.1em] text-muted-foreground/60">
            Select your year
          </p>
          <div className="flex flex-col divide-y divide-border/50 overflow-hidden rounded-2xl border border-border/60 bg-card/60 shadow-sm backdrop-blur-sm">
            {years.map((year, i) => (
              <Link
                key={year}
                href={`/browse/${encodeURIComponent(year)}`}
                className="stream-row group flex items-center justify-between gap-3 px-4 py-4 transition-colors duration-150 hover:bg-muted/50 active:scale-[0.995] active:bg-muted/80 sm:px-5"
                style={{ animationDelay: `${240 + i * 40}ms` }}
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className="text-[15px] font-medium">{year}</span>
                  {YEAR_SUBTITLES[year] && (
                    <span className="truncate text-[12px] text-muted-foreground">
                      {YEAR_SUBTITLES[year]}
                    </span>
                  )}
                </div>
                <ChevronRight className="size-4 text-muted-foreground/40 transition-transform duration-150 group-hover:translate-x-0.5 group-hover:text-muted-foreground" />
              </Link>
            ))}
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
            Independent student project. Not affiliated with or endorsed by MAHE.
          </p>
        </div>
      </main>
    </div>
  );
}
