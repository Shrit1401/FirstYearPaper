"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ChevronLeft, ChevronRight } from "lucide-react";
import { SlideView, type Deck } from "./slide-view";

export type LectureMeta = { id: string; title: string; slides: number };

const deckCache = new Map<string, Promise<Deck>>();
const loadDeck = (id: string) => {
  let p = deckCache.get(id);
  if (!p) { p = fetch(`/dsco/decks/${id}.json`).then((r) => r.json()); deckCache.set(id, p); }
  return p;
};

/** A module's lecture slides: lecture tabs on top, the slides in one readable column. */
export function SlideReader({ module, lectures }: { module: { number: number; title: string }; lectures: LectureMeta[] }) {
  const [lecture, setLecture] = useState(lectures[0]?.id ?? "");
  const [loaded, setLoaded] = useState<Deck | null>(null);
  const deck = loaded?.id === lecture ? loaded : null;
  const scroller = useRef<HTMLDivElement>(null);
  const idx = lectures.findIndex((l) => l.id === lecture);

  useEffect(() => {
    let live = true;
    loadDeck(lecture).then((d) => { if (!live) return; setLoaded(d); scroller.current?.scrollTo({ top: 0 }); });
    // warm the next lecture so switching is instant
    const next = lectures[lectures.findIndex((l) => l.id === lecture) + 1];
    if (next) void loadDeck(next.id);
    return () => { live = false; };
  }, [lecture, lectures]);

  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLElement && (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA")) return;
      if (e.key === "ArrowRight" && idx < lectures.length - 1) setLecture(lectures[idx + 1].id);
      else if (e.key === "ArrowLeft" && idx > 0) setLecture(lectures[idx - 1].id);
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [idx, lectures]);

  return (
    <div className="flex h-dvh flex-col">
      <header className="relative z-10 border-b border-border/40 bg-background/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3 sm:px-6">
          <Link href="/dsco" className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-[13px] text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground">
            <ArrowLeft className="size-3.5" /> Modules
          </Link>
          <span className="text-muted-foreground/40">·</span>
          <div className="min-w-0 truncate text-[13px]">
            <span className="font-mono text-muted-foreground">{module.number}</span> <span className="font-medium">{module.title}</span>
          </div>
        </div>
        <div className="mx-auto flex max-w-5xl items-center gap-1 overflow-x-auto px-4 pb-2.5 sm:px-6 dsco-scroll">
          {lectures.map((l, i) => (
            <button key={l.id} onClick={() => setLecture(l.id)}
              className={`shrink-0 rounded-lg px-3 py-1.5 text-[12.5px] transition-colors ${l.id === lecture ? "bg-foreground text-background" : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"}`}>
              <span className="mr-1.5 font-mono text-[11px] opacity-60">{i + 1}</span>{l.title}
            </button>
          ))}
        </div>
      </header>

      <div ref={scroller} className="dsco-scroll min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto max-w-4xl space-y-8 px-4 py-8 sm:px-6">
          {!deck && Array.from({ length: 3 }, (_, i) => <div key={i} className="dsco-shimmer aspect-video rounded-xl" />)}
          {deck?.slides.map((s, i) => (
            <section key={`${deck.id}-${i}`} className="dsco-rise" style={{ ["--delay" as string]: `${Math.min(i, 4) * 60}ms` }}>
              <div className="mb-2 px-0.5 font-mono text-[11px] tabular-nums text-muted-foreground/60">slide {i + 1} of {deck.slides.length}</div>
              <SlideView slide={s} deck={deck} />
            </section>
          ))}
          {deck && (
            <div className="flex items-center justify-between border-t border-border/40 pt-6 text-[13px]">
              {idx > 0 ? (
                <button onClick={() => setLecture(lectures[idx - 1].id)} className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground"><ChevronLeft className="size-4" /> {lectures[idx - 1].title}</button>
              ) : <span />}
              {idx < lectures.length - 1 ? (
                <button onClick={() => setLecture(lectures[idx + 1].id)} className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground">{lectures[idx + 1].title} <ChevronRight className="size-4" /></button>
              ) : <span />}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
