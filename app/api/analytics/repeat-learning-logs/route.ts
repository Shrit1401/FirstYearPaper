import { NextResponse } from "next/server";
import { assertRepeatAnalyticsApiAccess } from "@/lib/analytics-access";
import {
  readRepeatLearningEvents,
  readRepeatLearningEventsNdjson,
} from "@/lib/repeat-learning";
import type { RepeatLearningEvent } from "@/lib/repeat-types";

export const dynamic = "force-dynamic";

function escapeCsvCell(value: string) {
  if (/[",\n\r]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

function eventToCsvLine(e: RepeatLearningEvent) {
  const cells = [
    e.createdAt,
    e.eventType,
    e.sessionId,
    e.subjectKey ?? "",
    e.paperId ?? "",
    e.queryText ?? "",
    e.answerId ?? "",
    e.responseHash ?? "",
    JSON.stringify(e.selectedCitationIds ?? []),
    JSON.stringify(e.selectedChunkIds ?? []),
    JSON.stringify(e.payload ?? {}),
  ];
  return cells.map((c) => escapeCsvCell(String(c))).join(",");
}

export async function GET(request: Request) {
  try {
    await assertRepeatAnalyticsApiAccess(request);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unauthorized.";
    if (message === "Analytics API disabled.") {
      return NextResponse.json({ error: message }, { status: 503 });
    }
    if (message === "Unauthorized.") {
      return NextResponse.json({ error: message }, { status: 401 });
    }
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const format = searchParams.get("format") ?? "ndjson";

  if (format === "csv") {
    const events = await readRepeatLearningEvents();
    const header =
      "createdAt,eventType,sessionId,subjectKey,paperId,queryText,answerId,responseHash,selectedCitationIds,selectedChunkIds,payload";
    const lines = events.map(eventToCsvLine);
    const body = [header, ...lines].join("\n");
    return new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="repeat-chat-events.csv"',
      },
    });
  }

  const raw = await readRepeatLearningEventsNdjson();
  return new NextResponse(raw || "", {
    status: 200,
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Content-Disposition": 'attachment; filename="repeat-chat-events.ndjson"',
    },
  });
}
