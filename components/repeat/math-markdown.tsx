"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import { memo } from "react";
import "katex/contrib/mhchem";

/** Accept the standard delimiters used by both OCR and the teacher. */
export function normalizeMathDelimiters(source: string) {
  return source.split(/(```[\s\S]*?```|`[^`\n]*`)/g).map((part, index) => {
    if (index % 2) return part;
    return part.replace(/\\\[([\s\S]*?)\\\]/g, (_, math) => `\n$$\n${math}\n$$\n`)
      .replace(/\\\(([\s\S]*?)\\\)/g, (_, math) => `$${math}$`);
  }).join("");
}

/** Hold an unfinished equation while tokens arrive so raw TeX does not flash. */
export function completeStreamingMath(source: string) {
  let open: { at: number; close: string } | null = null;
  let codeDelimiter: string | null = null;
  const tokens = /```|`|\\\[|\\\]|\\\(|\\\)|\$\$|(?<!\\)\$/g;
  for (const token of source.matchAll(tokens)) {
    const value = token[0];
    if (value.startsWith("`")) { if (codeDelimiter === value) codeDelimiter = null; else if (!codeDelimiter) codeDelimiter = value; continue; }
    if (codeDelimiter) continue;
    if (open) { if (value === open.close) open = null; }
    else if (value === "\\[" || value === "\\(" || value === "$$" || value === "$") {
      open = { at: token.index!, close: value === "\\[" ? "\\]" : value === "\\(" ? "\\)" : value };
    }
  }
  return { text: open ? source.slice(0, open.at) : source, pending: !!open };
}

export const MathMarkdown = memo(function MathMarkdown({ children, className = "", streaming = false }: { children: string; className?: string; streaming?: boolean }) {
  const content = streaming ? completeStreamingMath(children) : { text: children, pending: false };
  return <div className={`repeat-prose ${className}`}>
    <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[[rehypeKatex, { throwOnError: false, strict: false, trust: false }]]}
      components={{ a: ({ children, ...props }) => <a {...props} target="_blank" rel="noopener noreferrer">{children}</a> }}>
      {normalizeMathDelimiters(content.text)}
    </ReactMarkdown>
    {content.pending && <span className="text-[11px] text-muted-foreground">Writing equation...</span>}
  </div>;
});
