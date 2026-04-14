"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import { MermaidBlock, type CitationJumpTarget } from "./repeat-diagram-block";

type Props = {
  markdown: string;
  citationJumpTargets?: CitationJumpTarget[];
};

export function RepeatMarkdown({ markdown, citationJumpTargets }: Props) {
  return (
    <div className="repeat-markdown">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={{
          a(props) {
            const href = typeof props.href === "string" ? props.href : "";
            const isInPageCitation = href.startsWith("#repeat-citation-");
            if (isInPageCitation) {
              return (
                <a
                  href={href}
                  className="inline-flex items-center rounded-full border border-border/50 bg-muted/40 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground no-underline transition-colors hover:bg-muted/70 hover:text-foreground"
                  onClick={(event) => {
                    event.preventDefault();
                    const targetId = href.slice(1);
                    const el = document.getElementById(targetId);
                    if (!el) return;
                    el.scrollIntoView({ behavior: "smooth", block: "start" });
                  }}
                >
                  {props.children}
                </a>
              );
            }
            return (
              <a
                {...props}
                target="_blank"
                rel="noreferrer"
                className="text-foreground underline decoration-border underline-offset-4 transition-colors hover:text-white"
              />
            );
          },
          code({ className, children, ...props }) {
            const match = /language-(\w+)/.exec(className ?? "");
            const content = String(children).replace(/\n$/, "");

            if (match?.[1] === "mermaid") {
              return (
                <MermaidBlock chart={content} citationJumpTargets={citationJumpTargets} />
              );
            }

            if (match) {
              return (
                <pre className="overflow-x-auto rounded-xl border border-border/60 bg-background/80 p-4 text-xs">
                  <code className={className} {...props}>
                    {content}
                  </code>
                </pre>
              );
            }

            return (
              <code
                className="rounded bg-muted px-1.5 py-0.5 text-[0.92em] text-foreground"
                {...props}
              >
                {children}
              </code>
            );
          },
        }}
      >
        {markdown}
      </ReactMarkdown>
    </div>
  );
}
