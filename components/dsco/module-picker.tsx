"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ChevronRight, Download } from "lucide-react";
import { downloadDecksZip } from "./downloads";

type Card = { number: number; title: string; lectures: { id: string; title: string; slides: number }[] };

export function ModulePicker({ modules }: { modules: Card[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const downloadAll = async () => {
    if (busy) return;
    const decks = modules.flatMap((m) => m.lectures.map((l, i) => ({ id: l.id, module: m.number, lecture: i + 1, title: l.title })));
    setBusy("Preparing…");
    try { await downloadDecksZip(decks, "DSCO - all lecture slides (CSS 2104)", (d, t) => setBusy(`Fetching ${d}/${t}…`)); }
    catch (e) { alert((e as Error).message || "Download failed."); }
    setBusy(null);
  };
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLElement && (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA")) return;
      if (/^[1-9]$/.test(e.key)) router.push(`/dsco/${e.key}`);
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [router]);

  return (
    <div className="relative min-h-dvh overflow-hidden">
      <div className="pointer-events-none absolute left-1/2 top-0 h-[480px] w-[800px] -translate-x-1/2 opacity-[0.055]" style={{ background: "radial-gradient(ellipse 60% 50% at 50% 0%, var(--color-foreground) 0%, transparent 100%)" }} />
      <div className="pointer-events-none absolute inset-0 opacity-[0.025]" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)", backgroundSize: "28px 28px" }} />

      <header className="relative z-10 border-b border-border/40 bg-background/60 backdrop-blur-xl">
        <div className="mx-auto flex max-w-2xl items-center gap-2 px-4 py-3.5 sm:px-6">
          <Link href="/" className="text-sm font-semibold tracking-tight">Papers</Link>
          <span className="text-muted-foreground/40">·</span>
          <span className="truncate text-[11px] text-muted-foreground">DSCO slides</span>
        </div>
      </header>

      <main className="relative z-10 mx-auto w-full max-w-2xl px-4 pb-20 pt-10 sm:px-6 sm:pt-12">
        <h1 className="hero-title text-center text-[2.15rem] font-semibold leading-[1.05] tracking-[-0.03em] sm:text-[3.25rem]">
          DSCO lecture slides
          <br />
          <span className="text-muted-foreground">module by module.</span>
        </h1>
        <p className="hero-subtitle mt-4 text-center text-[15px] text-muted-foreground">
          Every lecture deck for CSS 2104, readable right here.
          <br className="hidden sm:block" /> Pick a module, or press <span className="dsco-kbd">1</span>–<span className="dsco-kbd">9</span>.
        </p>

        <div className="hero-subtitle mt-6 flex justify-center">
          <button onClick={downloadAll} disabled={!!busy}
            className="flex items-center gap-1.5 rounded-full border border-border/50 bg-muted/40 px-3.5 py-1.5 text-[12px] font-medium text-muted-foreground transition-[background-color,color,transform] duration-150 hover:bg-muted hover:text-foreground active:scale-[0.97] disabled:opacity-60">
            <Download className="size-3.5" /> {busy ?? "Download all slides"} {!busy && <span className="text-[10.5px] font-normal opacity-60">24 decks · .zip · 17 MB</span>}
          </button>
        </div>

        <p className="hero-streams mb-3 mt-12 px-0.5 text-[11px] font-medium uppercase tracking-[0.1em] text-muted-foreground/60">CSS 2104 · Digital Systems & Computer Organization</p>
        <div className="hero-streams flex flex-col divide-y divide-border/50 overflow-hidden rounded-2xl border border-border/60 bg-card/60 shadow-sm backdrop-blur-sm">
          {modules.map((m) => (
            <Link key={m.number} href={`/dsco/${m.number}`} className="group flex items-center gap-4 px-4 py-3.5 transition-colors duration-150 hover:bg-muted/50 active:bg-muted/70">
              <span className="w-5 shrink-0 font-mono text-[13px] tabular-nums text-muted-foreground/60 transition-colors group-hover:text-foreground">{m.number}</span>
              <div className="min-w-0 flex-1">
                <div className="text-[15px] font-medium tracking-tight">{m.title}</div>
                <div className="mt-0.5 truncate text-[12px] text-muted-foreground">{m.lectures.map((l) => l.title).join(" · ")}</div>
              </div>
              <span className="ml-2 hidden shrink-0 text-[11px] tabular-nums text-muted-foreground/60 sm:block">{m.lectures.reduce((n, l) => n + l.slides, 0)} slides</span>
              <ChevronRight className="size-4 shrink-0 text-muted-foreground/40 transition-transform duration-150 group-hover:translate-x-0.5 group-hover:text-foreground" />
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
