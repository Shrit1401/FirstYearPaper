"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ChevronDown, Download, ExternalLink, Maximize } from "lucide-react";
import { downloadDeck, downloadDecksZip, type DeckRef } from "./downloads";

export type LectureMeta = { id: string; title: string; slides: number };

// The decks are shown as real PowerPoint through Microsoft's Office web viewer, which has to
// fetch the .pptx from a public URL — so it always reads them from the live site.
const PUBLIC_ORIGIN = "https://paper.shrit.in";
const officeEmbed = (id: string) =>
  `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(`${PUBLIC_ORIGIN}/dsco/pptx/${id}.pptx`)}&wdAr=1.7777777777777777`;
const officeView = (id: string) =>
  `https://view.officeapps.live.com/op/view.aspx?src=${encodeURIComponent(`${PUBLIC_ORIGIN}/dsco/pptx/${id}.pptx`)}`;

/** A module's lecture decks, shown as the actual PowerPoint files. */
export function SlideReader({ module, lectures }: { module: { number: number; title: string }; lectures: LectureMeta[] }) {
  const [lecture, setLecture] = useState(lectures[0]?.id ?? "");
  const idx = Math.max(0, lectures.findIndex((l) => l.id === lecture));
  const [loading, setLoading] = useState(true);
  const frameBox = useRef<HTMLDivElement>(null);

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

  const pick = (i: number) => { if (lectures[i].id !== lecture) { setLoading(true); setLecture(lectures[i].id); } };
  const fullscreen = () => { void frameBox.current?.requestFullscreen?.().catch(() => {}); };

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
          <a href={officeView(lecture)} target="_blank" rel="noreferrer" title="Open in PowerPoint for the web"
            className="hidden shrink-0 items-center gap-1.5 rounded-full border border-border/50 bg-muted/40 px-3 py-1.5 text-[12px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground sm:flex">
            <ExternalLink className="size-3.5" /> Open
          </a>
          <button onClick={fullscreen} title="Full screen"
            className="flex shrink-0 items-center gap-1.5 rounded-full border border-border/50 bg-muted/40 px-3 py-1.5 text-[12px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground active:scale-[0.97]">
            <Maximize className="size-3.5" /> Full screen
          </button>
        </div>
        <div className="flex items-center gap-1 overflow-x-auto px-4 pb-2.5 sm:px-5 dsco-scroll">
          {lectures.map((l, i) => (
            <button key={l.id} onClick={() => pick(i)}
              className={`shrink-0 rounded-lg px-3 py-1.5 text-[12.5px] transition-colors ${l.id === lecture ? "bg-foreground text-background" : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"}`}>
              <span className="mr-1.5 font-mono text-[11px] opacity-60">{i + 1}</span>{l.title}
              <span className="ml-1.5 font-mono text-[10.5px] opacity-50">{l.slides}</span>
            </button>
          ))}
        </div>
      </header>

      {/* the actual PowerPoint, rendered by Microsoft's Office viewer, framed as a card that keeps the slide's 16:9 shape */}
      <div className="dsco-stage relative min-h-0 flex-1 p-4 sm:p-8">
        <div ref={frameBox} className="dsco-deck relative mx-auto overflow-hidden rounded-2xl bg-[#262626] shadow-[0_0_0_1px_oklch(1_0_0/0.08),0_40px_100px_-40px_oklch(0_0_0/0.9)]">
          {loading && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 text-[13px] text-muted-foreground">
              <div className="dsco-shimmer absolute inset-0" />
              <span className="relative">Opening {lectures[idx]?.title}…</span>
            </div>
          )}
          <iframe
            key={lecture}
            src={officeEmbed(lecture)}
            title={`${lectures[idx]?.title} (PowerPoint)`}
            className={`absolute inset-0 h-full w-full border-0 transition-opacity duration-500 ${loading ? "opacity-0" : "opacity-100"}`}
            allowFullScreen
            onLoad={() => setLoading(false)}
          />
        </div>
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
