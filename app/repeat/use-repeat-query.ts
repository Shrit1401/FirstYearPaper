"use client";

import { useCallback, useRef, useState } from "react";
import type { RepeatChatTurn, RepeatQueryResponse } from "@/lib/repeat-types";

type SubmitArgs = {
  mode: "compare" | "chat";
  prompt: string;
  intent?: "repeat_questions" | "common_topics" | "revision_list" | "custom";
  subjectKey?: string;
  currentPaperId?: string;
  sessionId: string;
  history: RepeatChatTurn[];
  token: string;
};

type StreamEvent =
  | { type: "stage"; stage: string }
  | { type: "result"; payload: RepeatQueryResponse }
  | { type: "error"; error: string };

function decodeSseChunk(raw: string): StreamEvent[] {
  const events: StreamEvent[] = [];
  const blocks = raw.split("\n\n");
  for (const block of blocks) {
    const lines = block
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
    if (!lines.length) continue;
    const eventLine = lines.find((line) => line.startsWith("event:"));
    const dataLine = lines.find((line) => line.startsWith("data:"));
    if (!eventLine || !dataLine) continue;
    const eventName = eventLine.replace("event:", "").trim();
    const payloadRaw = dataLine.replace("data:", "").trim();
    try {
      const payload = JSON.parse(payloadRaw) as Record<string, unknown>;
      if (eventName === "stage" && typeof payload.stage === "string") {
        events.push({ type: "stage", stage: payload.stage });
      } else if (eventName === "result" && payload) {
        events.push({ type: "result", payload: payload as RepeatQueryResponse });
      } else if (eventName === "error" && typeof payload.error === "string") {
        events.push({ type: "error", error: payload.error });
      }
    } catch {
      // Ignore malformed stream frames.
    }
  }
  return events;
}

export function useRepeatQuery() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stage, setStage] = useState<string>("idle");
  const abortRef = useRef<AbortController | null>(null);

  const cancel = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setBusy(false);
    setStage("cancelled");
  }, []);

  const submit = useCallback(async (args: SubmitArgs) => {
    setBusy(true);
    setError(null);
    setStage("retrieving_sources");

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const response = await fetch("/api/repeat/query", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${args.token}`,
        },
        signal: controller.signal,
        body: JSON.stringify({
          mode: args.mode,
          prompt: args.prompt,
          intent: args.intent ?? "custom",
          subjectKey: args.subjectKey,
          currentPaperId: args.currentPaperId,
          sessionId: args.sessionId,
          history: args.history,
          stream: true,
        }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(payload.error ?? "Repeat query failed.");
      }

      const contentType = response.headers.get("content-type") ?? "";
      if (!contentType.includes("text/event-stream") || !response.body) {
        const payload = (await response.json()) as RepeatQueryResponse & { error?: string };
        if (payload.error) throw new Error(payload.error);
        setStage("done");
        return payload;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let finalPayload: RepeatQueryResponse | null = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const complete = buffer.lastIndexOf("\n\n");
        if (complete === -1) continue;
        const chunk = buffer.slice(0, complete);
        buffer = buffer.slice(complete + 2);
        const events = decodeSseChunk(chunk);
        for (const event of events) {
          if (event.type === "stage") setStage(event.stage);
          if (event.type === "error") throw new Error(event.error);
          if (event.type === "result") finalPayload = event.payload;
        }
      }

      if (!finalPayload) {
        throw new Error("No final answer returned from stream.");
      }
      setStage("done");
      return finalPayload;
    } catch (queryError) {
      const message =
        queryError instanceof Error
          ? queryError.name === "AbortError"
            ? "Request cancelled."
            : queryError.message
          : "Something went wrong while querying Repeat.";
      setError(message);
      throw new Error(message);
    } finally {
      abortRef.current = null;
      setBusy(false);
    }
  }, []);

  return {
    busy,
    error,
    stage,
    setError,
    submit,
    cancel,
  };
}
