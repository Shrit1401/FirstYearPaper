"use client";

import { Loader2, Plus, SendHorizontal, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type QuickAction = {
  intent: "repeat_questions" | "common_topics" | "revision_list";
  label: string;
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
  return (
    <div className="w-full max-w-3xl mx-auto">
      <div className="mb-2 flex flex-wrap justify-center gap-2 px-1">
        {quickActions.map((action) => (
          <button
            key={`quick-inline-${action.intent}`}
            type="button"
            disabled={!canRunCompare || busy}
            onClick={() => onQuickAction(action)}
            className="rounded-full border border-border/50 bg-background px-3 py-1.5 text-xs text-muted-foreground transition-[transform,colors,background-color,border-color] duration-150 [transition-timing-function:var(--ease-out)] active:scale-[0.97] disabled:pointer-events-none disabled:opacity-40 [@media(hover:hover)_and_(pointer:fine)]:hover:bg-muted/40 [@media(hover:hover)_and_(pointer:fine)]:hover:text-foreground"
          >
            {action.label}
          </button>
        ))}
      </div>

      <div className="repeat-chatgpt-composer-pill rounded-3xl px-2 py-2 sm:px-3 sm:py-2.5">
        <div className="flex items-end gap-2">
          <button
            type="button"
            disabled
            className="mb-0.5 flex size-9 shrink-0 items-center justify-center rounded-full text-muted-foreground/40"
            aria-hidden
            title="Attachments coming later"
          >
            <Plus className="size-5" />
          </button>
          <Textarea
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                if (canRunChat && !busy) onSubmitChat();
              }
            }}
            placeholder="Message Repeat…"
            rows={1}
            className="min-h-[44px] max-h-52 flex-1 resize-none border-0 bg-transparent px-0 py-2.5 text-[15px] leading-relaxed shadow-none placeholder:text-muted-foreground/60 focus-visible:ring-0 focus-visible:ring-offset-0"
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
                canRunChat && !busy ? "bg-foreground text-background hover:bg-foreground/90" : "opacity-40",
              )}
              aria-label="Send message"
            >
              {busy ? <Loader2 className="size-4 animate-spin" /> : <SendHorizontal className="size-4" />}
            </Button>
          </div>
        </div>
      </div>

      <p className="mt-2 px-1 text-center text-[11px] leading-relaxed text-muted-foreground/80">{subjectLine}</p>
      <p className="mt-1 text-center text-[10px] text-muted-foreground/50">
        Repeat cites your papers. Verify important answers against the PDFs.
      </p>
    </div>
  );
}
