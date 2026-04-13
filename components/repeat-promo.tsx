"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, Brain, Sparkles, X } from "lucide-react";
import { cn } from "@/lib/utils";

type RepeatPromoProps = {
  title: string;
  body: string;
  href: string;
  cta?: string;
  meta?: string;
  compact?: boolean;
  className?: string;
};

export function RepeatPromoCard({
  title,
  body,
  href,
  cta = "Try Repeat",
  meta,
  compact = false,
  className,
}: RepeatPromoProps) {
  return (
    <div
      className={cn(
        "repeat-promo-card overflow-hidden rounded-[1.45rem] border border-border/60 bg-card/62 shadow-sm backdrop-blur-sm",
        compact ? "p-4" : "p-5",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="inline-flex items-center gap-2 rounded-full border border-border/50 bg-background/55 px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
            <Sparkles className="size-3.5 text-amber-400" />
            Repeat
          </div>
          <h3 className={cn("mt-3 font-semibold tracking-tight", compact ? "text-[1rem]" : "text-[1.1rem]")}>
            {title}
          </h3>
          <p className={cn("mt-2 max-w-2xl text-muted-foreground", compact ? "text-[13px] leading-6" : "text-[14px] leading-6")}>
            {body}
          </p>
        </div>
        <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-muted/60">
          <Brain className="size-4 text-foreground" />
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        {meta ? (
          <p className="text-[12px] text-muted-foreground">{meta}</p>
        ) : (
          <span />
        )}
        <Link
          href={href}
          className="group inline-flex min-h-10 items-center gap-2 rounded-full border border-border/60 bg-background/60 px-3.5 py-2 text-[12px] font-medium text-foreground transition-all duration-150 hover:bg-muted/60 active:scale-[0.97]"
        >
          {cta}
          <ArrowRight className="size-3.5 transition-transform duration-150 group-hover:translate-x-0.5" />
        </Link>
      </div>
    </div>
  );
}

type ViewerNudgeProps = {
  href: string;
  title: string;
  body: string;
};

export function RepeatViewerNudge({ href, title, body }: ViewerNudgeProps) {
  const [dismissed, setDismissed] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.sessionStorage.getItem("repeat-viewer-nudge-dismissed") === "1";
  });

  function dismiss() {
    setDismissed(true);
    if (typeof window !== "undefined") {
      window.sessionStorage.setItem("repeat-viewer-nudge-dismissed", "1");
    }
  }

  if (dismissed) return null;

  return (
    <div className="repeat-viewer-nudge absolute right-4 top-4 z-20 w-[min(22rem,calc(100%-2rem))] rounded-[1.35rem] border border-white/10 bg-black/62 p-4 text-white shadow-2xl backdrop-blur-md">
      <button
        type="button"
        onClick={dismiss}
        className="absolute right-3 top-3 rounded-full p-1 text-white/40 transition-colors duration-150 hover:text-white/80 active:scale-[0.94]"
        aria-label="Dismiss Repeat prompt"
      >
        <X className="size-4" />
      </button>
      <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-medium text-white/72">
        <Sparkles className="size-3.5 text-amber-300" />
        Try Repeat
      </div>
      <h4 className="mt-3 pr-6 text-sm font-semibold tracking-tight">{title}</h4>
      <p className="mt-2 text-[13px] leading-6 text-white/72">{body}</p>
      <Link
        href={href}
        className="group mt-4 inline-flex min-h-10 items-center gap-2 rounded-full bg-white px-3.5 py-2 text-[12px] font-semibold text-black transition-[transform,opacity] duration-150 hover:opacity-92 active:scale-[0.97]"
      >
        Open Repeat
        <ArrowRight className="size-3.5 transition-transform duration-150 group-hover:translate-x-0.5" />
      </Link>
    </div>
  );
}
