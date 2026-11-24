"use client";

// Downloads for the DSCO slides — the original PowerPoint decks:
//  • one lecture → its .pptx
//  • a module / everything → a .zip of the decks (built in the browser with fflate)

export type DeckRef = { id: string; module: number; lecture: number; title: string };

const clean = (s: string) => s.replace(/[\\/:*?"<>|]+/g, "-").replace(/\s+/g, " ").trim();
export const deckFileName = (d: DeckRef) => clean(`DSCO M${d.module} L${d.lecture} - ${d.title}`);

function save(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

/** The original PowerPoint for one lecture. */
export async function downloadDeck(d: DeckRef) {
  const r = await fetch(`/dsco/pptx/${d.id}.pptx`);
  if (!r.ok) throw new Error("Couldn't fetch the slides.");
  save(await r.blob(), `${deckFileName(d)}.pptx`);
}

/** Several decks in one .zip (pptx is already compressed, so they're stored as-is). */
export async function downloadDecksZip(decks: DeckRef[], zipName: string, onProgress?: (done: number, total: number) => void) {
  const { zipSync } = await import("fflate");
  const files: Record<string, [Uint8Array, { level: 0 }]> = {};
  let done = 0;
  onProgress?.(0, decks.length);
  await Promise.all(decks.map(async (d) => {
    const r = await fetch(`/dsco/pptx/${d.id}.pptx`);
    if (!r.ok) throw new Error(`Couldn't fetch ${d.title}.`);
    files[`Module ${d.module}/${deckFileName(d)}.pptx`] = [new Uint8Array(await r.arrayBuffer()), { level: 0 }];
    onProgress?.(++done, decks.length);
  }));
  const zip = zipSync(files);
  save(new Blob([zip.buffer as ArrayBuffer], { type: "application/zip" }), `${clean(zipName)}.zip`);
}
