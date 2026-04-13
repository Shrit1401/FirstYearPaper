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
            return (
              <a
                {...props}
                target={isInPageCitation ? undefined : "_blank"}
                rel={isInPageCitation ? undefined : "noreferrer"}
                className="text-foreground underline decoration-border underline-offset-4 transition-colors hover:text-white"
                onClick={(event) => {
                  if (!isInPageCitation) return;
                  event.preventDefault();
                  const targetId = href.slice(1);
                  const el = document.getElementById(targetId);
                  if (!el) return;
                  el.scrollIntoView({ behavior: "smooth", block: "start" });
                }}
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
