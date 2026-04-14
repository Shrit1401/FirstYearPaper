"use client";

import { useEffect, useRef } from "react";
import { Loader2, SendHorizontal, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type QuickAction = {
  intent: "repeat_questions" | "common_topics" | "revision_list";
  label: string;
  description?: string;
  prompt: string;
};

type Props = {
  prompt: string;
  setPrompt: (value: string) => void;
  busy: boolean;
  canRunChat: boolean;
  canRunCompare: boolean;
  quickActions: QuickAction[];
  subjectLine: string;
  onSubmitChat: () => void;
  onQuickAction: (action: QuickAction) => void;
  onCancel: () => void;
};

export function ChatComposer({
  prompt,
  setPrompt,
  busy,
  canRunChat,
  canRunCompare,
  quickActions,
  subjectLine,
  onSubmitChat,
  onQuickAction,
  onCancel,
}: Props) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    if (!prompt) {
      el.style.height = "auto";
    }
  }, [prompt]);

  return (
    <div className="w-full max-w-3xl mx-auto">
      <div className="mb-2 flex gap-2 overflow-x-auto px-1 pb-0.5 scrollbar-none [-ms-overflow-style:none] [scrollbar-width:none]">
        {quickActions.map((action) => (
          <button
            key={`quick-inline-${action.intent}-${action.label}`}
            type="button"
            disabled={!canRunCompare || busy}
            onClick={() => onQuickAction(action)}
            className={`shrink-0 rounded-xl border border-border/50 bg-background px-3 py-2 text-left transition-[transform,background-color,border-color] duration-150 ease-out active:scale-[0.97] disabled:pointer-events-none disabled:opacity-40 [@media(hover:hover)_and_(pointer:fine)]:hover:bg-muted/40 ${action.description ? "min-w-[10rem] max-w-[13rem]" : ""}`}
          >
            <p className="text-[12px] font-medium text-foreground">{action.label}</p>
            {action.description ? (
              <p className="mt-0.5 text-[11px] leading-[1.4] text-muted-foreground">{action.description}</p>
            ) : null}
          </button>
        ))}
      </div>

      <div className="repeat-chatgpt-composer-pill rounded-3xl px-3 py-2 sm:px-4 sm:py-2.5">
        <div className="flex items-end gap-2">
          <Textarea
            ref={textareaRef}
            value={prompt}
            onChange={(event) => {
              setPrompt(event.target.value);
              const el = event.target;
              el.style.height = "auto";
              el.style.height = `${Math.min(el.scrollHeight, 208)}px`;
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                if (canRunChat && !busy) onSubmitChat();
              }
            }}
            placeholder="Message Repeat…"
            rows={1}
            className="repeat-composer-textarea min-h-[44px] max-h-52 flex-1 resize-none overflow-hidden border-0 bg-transparent px-0 py-2.5 text-[15px] leading-relaxed shadow-none placeholder:text-muted-foreground/60 focus-visible:ring-0 focus-visible:ring-offset-0 dark:bg-transparent"
          />
          <div className="mb-0.5 flex shrink-0 items-center gap-1">
            {busy ? (
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={onCancel}
                className="size-9 rounded-full border-border/60"
                aria-label="Stop generating"
              >
                <Square className="size-4" />
              </Button>
            ) : null}
            <Button
              type="button"
              size="icon"
              onClick={onSubmitChat}
              disabled={!canRunChat || busy}
              className={cn(
                "size-9 rounded-full transition-[transform,opacity] duration-150 [transition-timing-function:var(--ease-out)] active:scale-[0.97]",
                canRunChat && !busy
                  ? "bg-foreground text-background hover:bg-foreground/90"
                  : "opacity-40",
              )}
              aria-label="Send message"
            >
              {busy ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <SendHorizontal className="size-4" />
              )}
            </Button>
          </div>
        </div>
      </div>

      <p className="mt-2 px-1 text-center text-[11px] leading-relaxed text-muted-foreground/80">
        {subjectLine}
      </p>
      <p className="mt-1 text-center text-[10px] text-muted-foreground/50">
        Repeat cites your papers. Verify important answers against the PDFs.
      </p>
    </div>
  );
}
