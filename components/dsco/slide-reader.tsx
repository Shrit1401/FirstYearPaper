"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ChevronLeft, ChevronRight, Maximize, X } from "lucide-react";
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
  // full-screen presentation: which slide is showing (null = not presenting)
  const [present, setPresent] = useState<number | null>(null);
  const stage = useRef<HTMLDivElement>(null);
  const open = (i: number) => {
    setPresent(i);
    // real browser fullscreen where allowed; the overlay works on its own either way
    requestAnimationFrame(() => { void stage.current?.requestFullscreen?.().catch(() => {}); });
  };
  const close = () => {
    setPresent(null);
    if (document.fullscreenElement) void document.exitFullscreen().catch(() => {});
  };
  // leaving fullscreen with Esc (handled by the browser) also leaves presentation mode,
  // and you land on the slide you stopped at
  useEffect(() => {
    const onFs = () => {
      if (!document.fullscreenElement) setPresent((p) => {
        if (p !== null) scroller.current?.querySelector(`[data-slide-i="${p}"]`)?.scrollIntoView({ block: "center" });
        return null;
      });
    };
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

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
      const count = deck?.slides.length ?? 0;
      if (present !== null) {
        if (["ArrowRight", "ArrowDown", "PageDown", " "].includes(e.key)) { e.preventDefault(); setPresent((p) => Math.min(count - 1, (p ?? 0) + 1)); }
        else if (["ArrowLeft", "ArrowUp", "PageUp"].includes(e.key)) { e.preventDefault(); setPresent((p) => Math.max(0, (p ?? 0) - 1)); }
        else if (e.key === "Home") setPresent(0);
        else if (e.key === "End") setPresent(count - 1);
        else if (e.key === "Escape" || e.key === "f" || e.key === "F") close();
        return;
      }
      if ((e.key === "f" || e.key === "F") && count) { e.preventDefault(); open(0); }
      else if (e.key === "ArrowRight" && idx < lectures.length - 1) setLecture(lectures[idx + 1].id);
      else if (e.key === "ArrowLeft" && idx > 0) setLecture(lectures[idx - 1].id);
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [idx, lectures, present, deck]);

  return (
    <div className="flex h-dvh flex-col">
      <header className="relative z-10 border-b border-border/40 bg-background/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3 sm:px-6">
          <Link href="/dsco" className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-[13px] text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground">
            <ArrowLeft className="size-3.5" /> Modules
          </Link>
          <span className="text-muted-foreground/40">·</span>
          <div className="min-w-0 flex-1 truncate text-[13px]">
            <span className="font-mono text-muted-foreground">{module.number}</span> <span className="font-medium">{module.title}</span>
          </div>
          <button onClick={() => deck && open(0)} disabled={!deck} title="Present full screen (F)"
            className="flex shrink-0 items-center gap-1.5 rounded-full border border-border/50 bg-muted/40 px-3 py-1.5 text-[12px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground active:scale-[0.97] disabled:opacity-40">
            <Maximize className="size-3.5" /> Present
          </button>
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

      {present !== null && deck && (
        <div ref={stage} className="dsco-present fixed inset-0 z-[100] flex flex-col bg-black" onClick={(e) => { if (e.target === e.currentTarget) close(); }}>
          <div className="flex min-h-0 flex-1 items-center justify-center px-[3vw] py-[3vh]" onClick={(e) => { if (e.target === e.currentTarget) close(); }}>
            <div key={present} className="dsco-present-slide w-full" style={{ maxWidth: `calc(90vh / ${deck.aspect})` }}>
              <SlideView slide={deck.slides[present]} deck={deck} />
            </div>
          </div>
          <div className="flex items-center justify-between px-5 pb-4 text-[13px] text-white/60">
            <span className="truncate">{lectures[idx]?.title}</span>
            <div className="flex items-center gap-2">
              <button onClick={() => setPresent((p) => Math.max(0, (p ?? 0) - 1))} disabled={present === 0} className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 disabled:opacity-30" aria-label="Previous slide"><ChevronLeft className="size-4" /></button>
              <span className="w-16 text-center font-mono tabular-nums">{present + 1} / {deck.slides.length}</span>
              <button onClick={() => setPresent((p) => Math.min(deck.slides.length - 1, (p ?? 0) + 1))} disabled={present === deck.slides.length - 1} className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 disabled:opacity-30" aria-label="Next slide"><ChevronRight className="size-4" /></button>
            </div>
            <button onClick={close} className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-white/60 transition-colors hover:bg-white/10 hover:text-white" aria-label="Exit full screen">esc <X className="size-4" /></button>
          </div>
        </div>
      )}

      <div ref={scroller} className="dsco-scroll min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto max-w-4xl space-y-8 px-4 py-8 sm:px-6">
          {!deck && Array.from({ length: 3 }, (_, i) => <div key={i} className="dsco-shimmer aspect-video rounded-xl" />)}
          {deck?.slides.map((s, i) => (
            <section key={`${deck.id}-${i}`} data-slide-i={i} className="dsco-rise" style={{ ["--delay" as string]: `${Math.min(i, 4) * 60}ms` }}>
              <div className="mb-2 flex items-center justify-between px-0.5 font-mono text-[11px] tabular-nums text-muted-foreground/60">
                <span>slide {i + 1} of {deck.slides.length}</span>
                <button onClick={() => open(i)} className="flex items-center gap-1 font-sans text-[11.5px] text-muted-foreground/70 transition-colors hover:text-foreground"><Maximize className="size-3" /> full screen</button>
              </div>
              <button onClick={() => open(i)} className="block w-full cursor-zoom-in rounded-xl text-left transition-shadow duration-200 hover:shadow-[0_0_0_2px_oklch(1_0_0/0.25)]" aria-label={`Show slide ${i + 1} full screen`}>
                <SlideView slide={s} deck={deck} />
              </button>
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
