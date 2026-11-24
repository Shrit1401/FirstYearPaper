"use client";

import { memo } from "react";

export type Run = { text: string; sz?: number; b?: 1; i?: 1; u?: 1; c?: string; sup?: 1; sub?: 1 };
export type Para = { runs: Run[]; lvl?: number; align?: "ctr" | "r" | "just"; bullet?: 1; title?: 1; gap?: 1 };
type Box = [number, number, number, number];
export type SlideItem =
  | { t: "text"; box: Box; paras: Para[]; anchor?: string }
  | { t: "img"; box: Box; src: string; crop?: [number, number, number, number] }
  | { t: "shape"; box: Box; geom: string; fill?: string | null; line?: string | null }
  | { t: "line"; box: Box; flipH?: boolean; flipV?: boolean; color: string; head?: boolean }
  | { t: "table"; box: Box; rows: ({ text: string; span: number; rows: number; fill?: string | null } | null)[][] };
export type SlideData = { bg?: string | null; items: SlideItem[] };
export type Deck = { id: string; title: string; aspect: number; wpt: number; slides: SlideData[] };

const pct = (v: number) => `${(v * 100).toFixed(3)}%`;

/** A PowerPoint slide re-laid out in HTML from the extracted deck JSON. */
export const SlideView = memo(function SlideView({ slide, deck }: { slide: SlideData; deck: Deck }) {
  const fs = (pt: number) => `${((pt / deck.wpt) * 100).toFixed(3)}cqw`;
  return (
    <div className="dsco-slide" style={{ aspectRatio: `1 / ${deck.aspect}`, background: slide.bg ?? "#fff" }}>
      {slide.items.map((it, i) => {
        const [x, y, w, h] = it.box;
        const pos = { left: pct(x), top: pct(y / 1), width: pct(w), height: pct(h) } as const;
        if (it.t === "img") {
          const [l, t, r, b] = it.crop ?? [0, 0, 0, 0];
          const sw = 1 - l - r, sh = 1 - t - b;
          return (
            <div key={i} className="absolute overflow-hidden" style={pos}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={it.src}
                alt=""
                loading="lazy"
                draggable={false}
                className="absolute max-w-none select-none"
                style={{ width: `${100 / sw}%`, height: `${100 / sh}%`, left: `${(-l / sw) * 100}%`, top: `${(-t / sh) * 100}%` }}
              />
            </div>
          );
        }
        if (it.t === "shape") {
          const round = it.geom === "ellipse" ? "50%" : it.geom.startsWith("round") ? "12%" : 0;
          return <div key={i} className="absolute" style={{ ...pos, background: it.fill ?? "transparent", border: it.line ? `1.5px solid ${it.line}` : undefined, borderRadius: round }} />;
        }
        if (it.t === "line") {
          const x1 = it.flipH ? 100 : 0, x2 = it.flipH ? 0 : 100, y1 = it.flipV ? 100 : 0, y2 = it.flipV ? 0 : 100;
          return (
            <svg key={i} className="absolute overflow-visible" style={pos} viewBox="0 0 100 100" preserveAspectRatio="none">
              <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={it.color} strokeWidth={2} vectorEffect="non-scaling-stroke" />
            </svg>
          );
        }
        if (it.t === "table") {
          return (
            <div key={i} className="absolute" style={pos}>
              <table className="h-full w-full border-collapse" style={{ fontSize: fs(14) }}>
                <tbody>
                  {it.rows.map((row, r) => (
                    <tr key={r}>
                      {row.map((c, k) =>
                        c ? (
                          <td key={k} colSpan={c.span} rowSpan={c.rows} className="border border-neutral-400 px-[0.4em] py-[0.1em] text-center" style={{ background: c.fill ?? undefined }}>
                            {c.text}
                          </td>
                        ) : null,
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        }
        return (
          <div key={i} className="dsco-slide-text" style={{ ...pos, justifyContent: it.anchor === "ctr" ? "center" : it.anchor === "b" ? "flex-end" : "flex-start", padding: "0.4% 0.8%" }}>
            {it.paras.map((p, k) =>
              p.gap ? (
                <div key={k} style={{ height: fs(8) }} />
              ) : (
                <p
                  key={k}
                  className={p.bullet ? "b relative" : "relative"}
                  style={{
                    textAlign: p.align === "ctr" ? "center" : p.align === "r" ? "right" : "left",
                    paddingLeft: p.bullet ? `${1.1 + (p.lvl ?? 0) * 1.4}em` : p.lvl ? `${p.lvl * 1.4}em` : undefined,
                    fontWeight: p.title ? 700 : undefined,
                    fontSize: fs(p.runs[0]?.sz ?? 18),
                    marginBottom: "0.18em",
                  }}
                >
                  {p.runs.map((r, j) =>
                    r.text === "\n" ? (
                      <br key={j} />
                    ) : (
                      <span
                        key={j}
                        style={{
                          fontSize: fs(r.sz ?? 18),
                          fontWeight: r.b ? 700 : undefined,
                          fontStyle: r.i ? "italic" : undefined,
                          textDecoration: r.u ? "underline" : undefined,
                          color: r.c ?? undefined,
                          verticalAlign: r.sup ? "super" : r.sub ? "sub" : undefined,
                        }}
                      >
                        {r.text}
                      </span>
                    ),
                  )}
                </p>
              ),
            )}
          </div>
        );
      })}
    </div>
  );
});
