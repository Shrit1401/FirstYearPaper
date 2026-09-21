import type { RepeatV2ChatTurn } from "./repeat-v2-types";

/** Keep recent context within the API limits without truncating the visible conversation. */
export function boundedChatHistory(turns: RepeatV2ChatTurn[]): RepeatV2ChatTurn[] {
  const recent = turns.filter(turn => turn.content.trim()).slice(-12).map(turn => ({ ...turn, content: turn.content.slice(0, 16_000) }));
  const encoder = new TextEncoder();
  while (recent.length && encoder.encode(JSON.stringify(recent)).length > 48_000) recent.shift();
  // A context window should begin with the student's message when possible.
  if (recent[0]?.role === "assistant" && recent.length > 1) recent.shift();
  return recent;
}
