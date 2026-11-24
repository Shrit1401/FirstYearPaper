"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ChevronDown, ChevronLeft, ChevronRight, Download, Maximize, X } from "lucide-react";
import { SlideView, type Deck } from "./slide-view";
import { downloadDeck, downloadDecksZip, type DeckRef } from "./downloads";

export type LectureMeta = { id: string; title: string; slides: number };

const deckCache = new Map<string, Promise<Deck>>();
const loadDeck = (id: string) => {
  let p = deckCache.get(id);
  if (!p) { p = fetch(`/dsco/decks/${id}.json`).then((r) => r.json()); deckCache.set(id, p); }
  return p;
};

/** A module's lecture slides in a PowerPoint-style view: thumbnails on the left, the current slide large. */
export function SlideReader({ module, lectures }: { module: { number: number; title: string }; lectures: LectureMeta[] }) {
  const [lecture, setLecture] = useState(lectures[0]?.id ?? "");
  const [loaded, setLoaded] = useState<Deck | null>(null);
  const deck = loaded?.id === lecture ? loaded : null;
  const scroller = useRef<HTMLDivElement>(null);
  const idx = lectures.findIndex((l) => l.id === lecture);
  // the slide being viewed (PowerPoint "normal view")
  const [cur, setCur] = useState(0);
  const thumbs = useRef<HTMLDivElement>(null);
  const count = deck?.slides.length ?? 0;
  const goLecture = (i: number, slide = 0) => { setLecture(lectures[i].id); setCur(slide); };
  /** move by one slide; walking past either end carries on into the neighbouring lecture */
  const step = (d: 1 | -1) => {
    if (d > 0) { if (cur < count - 1) setCur(cur + 1); else if (idx < lectures.length - 1) goLecture(idx + 1, 0); }
    else { if (cur > 0) setCur(cur - 1); else if (idx > 0) goLecture(idx - 1, Math.max(0, lectures[idx - 1].slides - 1)); }
  };
  useEffect(() => {
    thumbs.current?.querySelector<HTMLElement>(`[data-thumb="${cur}"]`)?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [cur, lecture]);
  // downloads
  const [busy, setBusy] = useState<string | null>(null);
  const [menu, setMenu] = useState(false);
  const ref = (i: number): DeckRef => ({ id: lectures[i].id, module: module.number, lecture: i + 1, title: lectures[i].title });
  const run = async (label: string, job: (progress: (d: number, t: number) => void) => Promise<void>) => {
    if (busy) return;
    setMenu(false);
    setBusy(label);
    try { await job((d, t) => setBusy(`${label} ${Math.min(d + 1, t)}/${t}`)); }
    catch (e) { setBusy(null); alert((e as Error).message || "Download failed."); return; }
    setBusy(null);
  };
  useEffect(() => {
    if (!menu) return;
    const off = (e: PointerEvent) => { if (!(e.target as HTMLElement).closest("[data-dl-menu]")) setMenu(false); };
    window.addEventListener("pointerdown", off);
    return () => window.removeEventListener("pointerdown", off);
  }, [menu]);

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
        if (p !== null) setCur(p);
        return null;
      });
    };
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  useEffect(() => {
    let live = true;
    loadDeck(lecture).then((d) => { if (!live) return; setLoaded(d); setCur((c) => Math.min(c, d.slides.length - 1)); });
    // warm the next lecture so switching is instant
    const next = lectures[lectures.findIndex((l) => l.id === lecture) + 1];
    if (next) void loadDeck(next.id);
    return () => { live = false; };
  }, [lecture, lectures]);

  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLElement && (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA")) return;
      if (present !== null) {
        if (["ArrowRight", "ArrowDown", "PageDown", " "].includes(e.key)) { e.preventDefault(); setPresent((p) => Math.min(count - 1, (p ?? 0) + 1)); }
        else if (["ArrowLeft", "ArrowUp", "PageUp"].includes(e.key)) { e.preventDefault(); setPresent((p) => Math.max(0, (p ?? 0) - 1)); }
        else if (e.key === "Home") setPresent(0);
        else if (e.key === "End") setPresent(count - 1);
        else if (e.key === "Escape" || e.key === "f" || e.key === "F") close();
        return;
      }
      if ((e.key === "f" || e.key === "F") && count) { e.preventDefault(); open(cur); }
      else if (["ArrowRight", "ArrowDown", "PageDown"].includes(e.key)) { e.preventDefault(); step(1); }
      else if (["ArrowLeft", "ArrowUp", "PageUp"].includes(e.key)) { e.preventDefault(); step(-1); }
      else if (e.key === "Home") setCur(0);
      else if (e.key === "End") setCur(Math.max(0, count - 1));
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [idx, lectures, present, deck, cur]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="flex h-dvh flex-col">
      <header className="relative z-10 border-b border-border/40 bg-background/70 backdrop-blur-xl">
        <div className="flex items-center gap-3 px-4 py-3 sm:px-5">
          <Link href="/dsco" className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-[13px] text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground">
            <ArrowLeft className="size-3.5" /> Modules
          </Link>
          <span className="text-muted-foreground/40">·</span>
          <div className="min-w-0 flex-1 truncate text-[13px]">
            <span className="font-mono text-muted-foreground">{module.number}</span> <span className="font-medium">{module.title}</span>
          </div>
          <div className="relative shrink-0" data-dl-menu>
            <button onClick={() => setMenu((m) => !m)} disabled={!!busy}
              className="flex items-center gap-1.5 rounded-full border border-border/50 bg-muted/40 px-3 py-1.5 text-[12px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground active:scale-[0.97] disabled:opacity-60">
              <Download className="size-3.5" /> {busy ?? "Download"} {!busy && <ChevronDown className="size-3" />}
            </button>
            {menu && (
              <div className="dsco-rise absolute right-0 top-[calc(100%+6px)] z-30 w-64 overflow-hidden rounded-xl border border-border/60 bg-popover/95 p-1 shadow-xl backdrop-blur-xl">
                <MenuItem title="This lecture" sub={`${lectures[idx]?.title} · .pptx`} onClick={() => void run("Downloading", () => downloadDeck(ref(idx)))} />
                <MenuItem title={`All of module ${module.number}`} sub={`${lectures.length} decks · .pptx in a .zip`} onClick={() => void run("Zipping", (p) => downloadDecksZip(lectures.map((_, i) => ref(i)), `DSCO Module ${module.number} - ${module.title}`, p))} />
              </div>
            )}
          </div>
          <button onClick={() => deck && open(cur)} disabled={!deck} title="Present full screen (F)"
            className="flex shrink-0 items-center gap-1.5 rounded-full border border-border/50 bg-muted/40 px-3 py-1.5 text-[12px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground active:scale-[0.97] disabled:opacity-40">
            <Maximize className="size-3.5" /> Present
          </button>
        </div>
        <div className="flex items-center gap-1 overflow-x-auto px-4 pb-2.5 sm:px-5 dsco-scroll">
          {lectures.map((l, i) => (
            <button key={l.id} onClick={() => goLecture(i)}
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
            <div className="flex items-center gap-1">
              <button onClick={close} className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-white/60 transition-colors hover:bg-white/10 hover:text-white" aria-label="Exit full screen">esc <X className="size-4" /></button>
            </div>
          </div>
        </div>
      )}

      <div ref={scroller} className="flex min-h-0 flex-1">
        {/* thumbnails, like PowerPoint's slide pane */}
        <aside ref={thumbs} className="dsco-scroll hidden w-[200px] shrink-0 overflow-y-auto border-r border-border/40 px-3 py-4 md:block lg:w-[232px]">
          {!deck && Array.from({ length: 6 }, (_, i) => <div key={i} className="dsco-shimmer mb-3 ml-5 aspect-video rounded-md" />)}
          {deck?.slides.map((sl, i) => (
            <button key={`${deck.id}-${i}`} data-thumb={i} onClick={() => setCur(i)} className="group mb-3 flex w-full items-start gap-2 text-left">
              <span className={`w-4 shrink-0 pt-0.5 text-right font-mono text-[10.5px] tabular-nums transition-colors ${i === cur ? "text-foreground" : "text-muted-foreground/50"}`}>{i + 1}</span>
              <span className={`dsco-thumb block min-w-0 flex-1 overflow-hidden rounded-[7px] transition-[box-shadow,opacity] duration-200 ${i === cur ? "is-current" : "opacity-70 group-hover:opacity-100"}`}>
                <SlideView slide={sl} deck={deck} />
              </span>
            </button>
          ))}
        </aside>

        {/* the slide */}
        <main className="relative flex min-w-0 flex-1 flex-col">
          <div className="flex min-h-0 flex-1 items-center justify-center px-4 py-6 sm:px-10">
            {!deck ? (
              <div className="dsco-shimmer aspect-video w-full max-w-5xl rounded-xl" />
            ) : (
              <button key={`${deck.id}-${cur}`} onClick={() => open(cur)} aria-label="Show full screen"
                className="dsco-stage-slide block w-full cursor-zoom-in text-left" style={{ maxWidth: `min(1100px, calc((100dvh - 230px) / ${deck.aspect}))` }}>
                <SlideView slide={deck.slides[cur]} deck={deck} />
              </button>
            )}
          </div>
          <div className="flex items-center justify-between gap-3 border-t border-border/40 px-4 py-2.5 text-[12.5px] text-muted-foreground sm:px-6">
            <span className="min-w-0 truncate">{lectures[idx]?.title}</span>
            <div className="flex shrink-0 items-center gap-1.5">
              <button onClick={() => step(-1)} disabled={cur === 0 && idx === 0} className="flex h-8 w-8 items-center justify-center rounded-full transition-colors hover:bg-muted/60 hover:text-foreground disabled:opacity-30" aria-label="Previous slide"><ChevronLeft className="size-4" /></button>
              <span className="w-[4.5rem] text-center font-mono tabular-nums">{count ? `${cur + 1} / ${count}` : "…"}</span>
              <button onClick={() => step(1)} disabled={cur >= count - 1 && idx === lectures.length - 1} className="flex h-8 w-8 items-center justify-center rounded-full transition-colors hover:bg-muted/60 hover:text-foreground disabled:opacity-30" aria-label="Next slide"><ChevronRight className="size-4" /></button>
            </div>
            <span className="hidden shrink-0 items-center gap-1.5 text-[11px] text-muted-foreground/70 sm:flex"><span className="dsco-kbd">←</span><span className="dsco-kbd">→</span> slides <span className="dsco-kbd">F</span> full screen</span>
          </div>
        </main>
      </div>
    </div>
  );
}

function MenuItem({ title, sub, onClick, disabled }: { title: string; sub: string; onClick: () => void; disabled?: boolean }) {
  return (
    <button onClick={onClick} disabled={disabled} className="flex w-full flex-col items-start rounded-lg px-3 py-2 text-left transition-colors hover:bg-muted/60 disabled:opacity-40">
      <span className="text-[13px] text-foreground">{title}</span>
      <span className="text-[11.5px] text-muted-foreground">{sub}</span>
    </button>
  );
}
