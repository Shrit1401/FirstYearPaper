"use client";

import { useState } from "react";
import { Check, Download, Loader2 } from "lucide-react";
import posthog from "posthog-js";
import { resolvePublicPaperHref } from "@/lib/paper-url";

export type DownloadFile = { href: string; filename: string };

type Status =
  | { kind: "idle" }
  | { kind: "working"; done: number }
  | { kind: "done"; missed: number }
  | { kind: "error" };

const CONCURRENCY = 3;

async function fetchPdf(href: string): Promise<Uint8Array | null> {
  try {
    const res = await fetch(resolvePublicPaperHref(href));
    if (!res.ok) return null;
    return new Uint8Array(await res.arrayBuffer());
  } catch {
    return null;
  }
}

export function DownloadAll({ title, files }: { title: string; files: DownloadFile[] }) {
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  if (files.length < 2) return null;

  async function run() {
    if (status.kind === "working") return;
    setStatus({ kind: "working", done: 0 });
    const results: (Uint8Array | null)[] = new Array(files.length).fill(null);
    let next = 0;
    let done = 0;
    await Promise.all(
      Array.from({ length: Math.min(CONCURRENCY, files.length) }, async () => {
        while (next < files.length) {
          const i = next++;
          results[i] = await fetchPdf(files[i].href);
          done += 1;
          setStatus({ kind: "working", done });
        }
      }),
    );
    const entries: Record<string, [Uint8Array, { level: 0 }]> = {};
    files.forEach((f, i) => {
      const data = results[i];
      if (data) entries[f.filename] = [data, { level: 0 }];
    });
    const saved = Object.keys(entries).length;
    if (saved === 0) {
      setStatus({ kind: "error" });
      return;
    }
    // PDFs are already compressed, so storing them is as small and much faster.
    const { zipSync } = await import("fflate");
    const zip = zipSync(entries);
    const url = URL.createObjectURL(new Blob([zip.slice().buffer], { type: "application/zip" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `${title.replace(/[\\/:*?"<>|]+/g, " ").trim()} - papers.zip`;
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
    setStatus({ kind: "done", missed: files.length - saved });
    posthog.capture("subject_papers_downloaded", {
      subject: title,
      files: saved,
      missed: files.length - saved,
      source_path: window.location.pathname,
    });
  }

  const label =
    status.kind === "working"
      ? `Downloading ${status.done} of ${files.length}`
      : status.kind === "done"
        ? status.missed
          ? `Saved · ${status.missed} couldn't download`
          : "Saved"
        : status.kind === "error"
          ? "Couldn't download · try again"
          : `Download all ${files.length}`;

  return (
    <button
      type="button"
      onClick={run}
      aria-busy={status.kind === "working"}
      className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-border/60 bg-card/70 px-3 py-1.5 text-[12px] font-medium text-foreground/90 transition-[background-color,transform] duration-150 [transition-timing-function:var(--ease-out)] hover:bg-muted/60 active:scale-[0.97] aria-busy:cursor-progress motion-reduce:active:scale-100"
    >
      {status.kind === "working" ? (
        <Loader2 aria-hidden="true" className="size-3.5 animate-spin" />
      ) : status.kind === "done" ? (
        <Check aria-hidden="true" className="size-3.5 text-emerald-400" />
      ) : (
        <Download aria-hidden="true" className="size-3.5" />
      )}
      <span aria-live="polite">{label}</span>
    </button>
  );
}
