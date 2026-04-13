"use client";

import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { RepeatChatAnalyticsPayload } from "@/lib/repeat-chat-analytics";
import type { RepeatLearningEventType } from "@/lib/repeat-types";
import {
  Download,
  Info,
  MessageSquare,
  Search,
  ChevronDown,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const EVENT_LABELS: Record<RepeatLearningEventType, string> = {
  query_submitted: "Query submitted",
  follow_up_asked: "Follow-up",
  query_reformulated: "Reformulated",
  citation_open: "Citation opened",
  paper_open: "Paper opened",
  repeat_question_click: "Repeat question",
  answer_feedback: "Answer feedback",
  citation_feedback: "Citation feedback",
};

function formatNumber(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

function formatDateTime(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function truncate(s: string, max: number) {
  const t = s.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max)}…`;
}

async function downloadFromApi(href: string, filename: string) {
  try {
    const res = await fetch(href, { credentials: "include" });
    if (!res.ok) return;
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  } catch {
    // ignore
  }
}

export function ChatAnalyticsDashboard({ data }: { data: RepeatChatAnalyticsPayload }) {
  const typeBreakdown = (
    Object.entries(data.byType) as [RepeatLearningEventType, number][]
  )
    .filter(([, n]) => n > 0)
    .sort((a, b) => b[1] - a[1]);

  const chartData = data.timeline.map((row) => ({
    ...row,
    label: row.date,
  }));

  return (
    <TooltipProvider delayDuration={140}>
      <div className="space-y-6">
        {!data.learningEnabled && (
          <div className="rounded-[1.25rem] border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
            Repeat learning is disabled (
            <code className="rounded bg-black/30 px-1.5 py-0.5 text-xs">
              REPEAT_LEARNING_ENABLED=false
            </code>
            ). New events are not being written to disk.
          </div>
        )}

        {data.learningEnabled && data.eventSamplingRate < 1 && (
          <div className="rounded-[1.25rem] border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-muted-foreground">
            Event sampling is active: roughly{" "}
            <span className="font-medium text-foreground">
              {(data.eventSamplingRate * 100).toFixed(0)}%
            </span>{" "}
            of client-eligible events are persisted (
            <code className="rounded bg-black/30 px-1.5 py-0.5 text-xs">
              REPEAT_EVENT_SAMPLING_RATE
            </code>
            ).
          </div>
        )}

        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-sm font-medium tracking-[-0.02em] text-foreground">
              Overview
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                className="h-10 rounded-full border-white/10 bg-white/[0.04] px-4 text-sm text-foreground transition-transform duration-150 [transition-timing-function:var(--ease-out)] hover:border-white/20 hover:bg-white/[0.06] active:scale-[0.97]"
                onClick={() => void downloadFromApi(
                    "/api/analytics/repeat-learning-logs",
                    "repeat-chat-events.ndjson"
                  )}
              >
                <Download className="mr-2 size-4" />
                NDJSON
              </Button>
              <Button
                variant="outline"
                className="h-10 rounded-full border-white/10 bg-white/[0.04] px-4 text-sm text-foreground transition-transform duration-150 [transition-timing-function:var(--ease-out)] hover:border-white/20 hover:bg-white/[0.06] active:scale-[0.97]"
                onClick={() => void downloadFromApi(
                    "/api/analytics/repeat-learning-logs?format=csv",
                    "repeat-chat-events.csv"
                  )}
              >
                <Download className="mr-2 size-4" />
                CSV
              </Button>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <MetricPanel
              label="Total events"
              value={formatNumber(data.totalEvents)}
              icon={<MessageSquare className="size-4" />}
              tone="mint"
              tooltip="All rows in the on-disk learning log (after sampling)."
            />
            <MetricPanel
              label="Queries"
              value={formatNumber(data.queryEventCount)}
              icon={<Search className="size-4" />}
              tone="amber"
              tooltip="Submitted questions, reformulations, and follow-ups."
            />
            <MetricPanel
              label="Sessions"
              value={formatNumber(data.uniqueSessions)}
              icon={<MessageSquare className="size-4" />}
              tone="slate"
              tooltip="Distinct session identifiers seen in the log."
            />
            <MetricPanel
              label="Feedback"
              value={formatNumber(data.feedbackEventCount)}
              icon={<MessageSquare className="size-4" />}
              tone="slate"
              tooltip="Answer and citation feedback events."
            />
            <MetricPanel
              label="Log updated"
              value={
                data.recentEvents[0]
                  ? formatDateTime(data.recentEvents[0].createdAt)
                  : "—"
              }
              icon={<MessageSquare className="size-4" />}
              tone="slate"
              tooltip="Most recent event in the log (newest of sampled events)."
            />
          </div>
        </section>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
          <Card className="overflow-hidden rounded-[1.5rem] border-white/10 bg-white/[0.03] shadow-[0_20px_80px_rgba(0,0,0,0.18)] sm:rounded-[1.75rem]">
            <CardContent className="space-y-5 p-0">
              <div className="flex flex-wrap items-start justify-between gap-4 border-b border-white/10 px-4 py-4 sm:px-6 sm:py-5">
                <div className="space-y-1">
                  <div className="text-sm font-medium tracking-[-0.02em] text-foreground">
                    Activity by day
                  </div>
                  <p className="text-xs text-muted-foreground">
                    All events vs. query-related events
                  </p>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <LegendSwatch color="bg-[#5dd1b2]" label="All events" />
                  <LegendSwatch color="bg-[#a78bfa]" label="Queries" />
                </div>
              </div>
              <div className="px-3 pb-3 sm:px-6 sm:pb-6">
                {chartData.length === 0 ? (
                  <div className="flex h-[280px] items-center justify-center rounded-[1.25rem] border border-dashed border-white/10 bg-black/10 text-sm text-muted-foreground sm:h-[320px] sm:rounded-[1.5rem]">
                    No chat events recorded yet. Queries and feedback will appear here once
                    users interact with Repeat.
                  </div>
                ) : (
                  <div className="rounded-[1.25rem] border border-white/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.015))] p-3 sm:rounded-[1.5rem] sm:p-5">
                    <ResponsiveContainer width="100%" height={300}>
                      <AreaChart
                        data={chartData}
                        margin={{ top: 8, right: 6, left: -18, bottom: 0 }}
                      >
                        <defs>
                          <linearGradient id="chat-events" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#5dd1b2" stopOpacity={0.45} />
                            <stop offset="100%" stopColor="#5dd1b2" stopOpacity={0} />
                          </linearGradient>
                          <linearGradient id="chat-queries" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#a78bfa" stopOpacity={0.35} />
                            <stop offset="100%" stopColor="#a78bfa" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke="rgba(255,255,255,0.08)"
                          vertical={false}
                        />
                        <XAxis
                          dataKey="label"
                          tick={{ fontSize: 10, fill: "rgba(255,255,255,0.42)" }}
                          tickLine={false}
                          axisLine={false}
                          interval="preserveStartEnd"
                        />
                        <YAxis
                          tick={{ fontSize: 11, fill: "rgba(255,255,255,0.42)" }}
                          tickLine={false}
                          axisLine={false}
                          width={40}
                          tickFormatter={formatNumber}
                        />
                        <RechartsTooltip
                          cursor={{ stroke: "rgba(255,255,255,0.16)", strokeWidth: 1 }}
                          contentStyle={{
                            background: "rgba(12, 14, 16, 0.94)",
                            border: "1px solid rgba(255,255,255,0.10)",
                            borderRadius: "18px",
                            fontSize: 12,
                            boxShadow: "0 18px 40px rgba(0,0,0,0.35)",
                          }}
                          labelStyle={{ color: "rgba(255,255,255,0.94)", marginBottom: 6 }}
                          itemStyle={{ color: "rgba(255,255,255,0.72)" }}
                        />
                        <Area
                          type="monotone"
                          dataKey="events"
                          name="Events"
                          stroke="#5dd1b2"
                          strokeWidth={2.5}
                          fill="url(#chat-events)"
                          dot={false}
                          activeDot={{ r: 4, fill: "#5dd1b2", strokeWidth: 0 }}
                        />
                        <Area
                          type="monotone"
                          dataKey="queries"
                          name="Queries"
                          stroke="#a78bfa"
                          strokeWidth={2.5}
                          fill="url(#chat-queries)"
                          dot={false}
                          activeDot={{ r: 4, fill: "#a78bfa", strokeWidth: 0 }}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="overflow-hidden rounded-[1.5rem] border-white/10 bg-white/[0.03] shadow-[0_20px_80px_rgba(0,0,0,0.18)] sm:rounded-[1.75rem]">
            <CardContent className="p-0">
              <div className="border-b border-white/10 px-4 py-4 sm:px-6 sm:py-5">
                <div className="text-sm font-medium tracking-[-0.02em] text-foreground">
                  By event type
                </div>
              </div>
              <div className="max-h-[380px] space-y-2 overflow-auto p-4 sm:p-6">
                {typeBreakdown.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No events yet.</p>
                ) : (
                  typeBreakdown.map(([type, count]) => {
                    const max = typeBreakdown[0]?.[1] ?? 1;
                    const pct = Math.max(8, Math.round((count / max) * 100));
                    return (
                      <div key={type} className="space-y-1.5">
                        <div className="flex items-center justify-between gap-2 text-xs">
                          <span className="font-medium text-foreground">
                            {EVENT_LABELS[type] ?? type}
                          </span>
                          <span className="tabular-nums text-muted-foreground">
                            {count.toLocaleString()}
                          </span>
                        </div>
                        <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-[#5dd1b2]/80 to-[#5dd1b2]/30"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <EventLogTable rows={data.recentEvents} />
      </div>
    </TooltipProvider>
  );
}

function EventLogTable({
  rows,
}: {
  rows: RepeatChatAnalyticsPayload["recentEvents"];
}) {
  const [q, setQ] = useState("");
  const [typeFilter, setTypeFilter] = useState<RepeatLearningEventType | "all">("all");

  const types = useMemo(() => {
    const set = new Set<RepeatLearningEventType>();
    for (const r of rows) set.add(r.eventType);
    return [...set].sort();
  }, [rows]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (typeFilter !== "all" && r.eventType !== typeFilter) return false;
      if (!needle) return true;
      const hay = [
        r.eventType,
        r.sessionId,
        r.subjectKey,
        r.paperId,
        r.queryText,
        r.answerId,
        JSON.stringify(r.payload ?? {}),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(needle);
    });
  }, [rows, q, typeFilter]);

  return (
    <Card className="overflow-hidden rounded-[1.5rem] border-white/10 bg-white/[0.03] shadow-[0_20px_80px_rgba(0,0,0,0.18)] sm:rounded-[1.75rem]">
      <CardContent className="p-0">
        <div className="flex flex-col gap-4 border-b border-white/10 px-4 py-4 sm:flex-row sm:items-end sm:justify-between sm:px-6 sm:py-5">
          <div className="space-y-1">
            <div className="text-sm font-medium tracking-[-0.02em] text-foreground">
              Event log
            </div>
            <p className="text-xs text-muted-foreground">
              Newest {rows.length} events (search filters this list; use export for the full
              file).
            </p>
          </div>
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
            <select
              value={typeFilter}
              onChange={(e) =>
                setTypeFilter(e.target.value as RepeatLearningEventType | "all")
              }
              className="h-10 w-full rounded-full border border-white/10 bg-black/20 px-3 text-sm text-foreground outline-none sm:w-[200px]"
            >
              <option value="all">All types</option>
              {types.map((t) => (
                <option key={t} value={t}>
                  {EVENT_LABELS[t] ?? t}
                </option>
              ))}
            </select>
            <div className="relative w-full sm:w-56">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search text…"
                className="h-10 rounded-full border-white/10 bg-black/20 pl-9 text-sm"
              />
            </div>
          </div>
        </div>

        <div className="hidden overflow-auto lg:block">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-[#111315]/95 backdrop-blur-xl">
              <tr className="border-b border-white/10">
                <th className="w-10 px-3 py-3" />
                <th className="px-3 py-3 text-left text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                  Time
                </th>
                <th className="px-3 py-3 text-left text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                  Type
                </th>
                <th className="px-3 py-3 text-left text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                  Session
                </th>
                <th className="px-3 py-3 text-left text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                  Paper
                </th>
                <th className="min-w-[200px] px-3 py-3 text-left text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                  Query / text
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <LogRowDesktop key={r.eventId} row={r} />
              ))}
            </tbody>
          </table>
        </div>

        <div className="space-y-2 p-3 lg:hidden">
          {filtered.map((r) => (
            <LogRowMobile key={r.eventId} row={r} />
          ))}
        </div>

        {filtered.length === 0 && (
          <p className="px-6 pb-6 text-center text-sm text-muted-foreground">
            No rows match your filters.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function LogRowDesktop({
  row,
}: {
  row: RepeatChatAnalyticsPayload["recentEvents"][number];
}) {
  const [open, setOpen] = useState(false);
  const hasExtra =
    (row.payload && Object.keys(row.payload).length > 0) ||
    (row.selectedCitationIds?.length ?? 0) > 0 ||
    (row.selectedChunkIds?.length ?? 0) > 0;

  return (
    <>
      <tr className="border-b border-white/[0.06] align-top transition-colors duration-150 hover:bg-white/[0.03]">
        <td className="px-3 py-3">
          {hasExtra ? (
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              className="inline-flex size-8 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-muted-foreground transition-colors hover:text-foreground"
              aria-expanded={open}
              aria-label={open ? "Collapse details" : "Expand details"}
            >
              <ChevronDown
                className={`size-4 transition-transform ${open ? "rotate-180" : ""}`}
              />
            </button>
          ) : (
            <span className="inline-block size-8" />
          )}
        </td>
        <td className="whitespace-nowrap px-3 py-3 text-xs text-muted-foreground">
          {formatDateTime(row.createdAt)}
        </td>
        <td className="px-3 py-3">
          <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] font-medium text-foreground">
            {EVENT_LABELS[row.eventType] ?? row.eventType}
          </span>
        </td>
        <td className="max-w-[120px] truncate px-3 py-3 font-mono text-[11px] text-muted-foreground">
          {truncate(row.sessionId, 14)}
        </td>
        <td className="max-w-[140px] truncate px-3 py-3 text-xs text-muted-foreground">
          {row.paperId ? truncate(row.paperId, 22) : "—"}
        </td>
        <td className="px-3 py-3 text-xs leading-relaxed text-foreground">
          {row.queryText ? truncate(row.queryText, 160) : "—"}
        </td>
      </tr>
      {open && hasExtra && (
        <tr className="border-b border-white/[0.06] bg-black/20">
          <td colSpan={6} className="px-6 py-4">
            <pre className="max-h-48 overflow-auto rounded-xl border border-white/10 bg-black/30 p-3 text-[11px] leading-relaxed text-muted-foreground">
              {JSON.stringify(
                {
                  citations: row.selectedCitationIds,
                  chunks: row.selectedChunkIds,
                  payload: row.payload,
                },
                null,
                2
              )}
            </pre>
          </td>
        </tr>
      )}
    </>
  );
}

function LogRowMobile({
  row,
}: {
  row: RepeatChatAnalyticsPayload["recentEvents"][number];
}) {
  return (
    <div className="rounded-[1.15rem] border border-white/[0.08] bg-white/[0.03] p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[10px] font-medium text-foreground">
          {EVENT_LABELS[row.eventType] ?? row.eventType}
        </span>
        <span className="text-[11px] text-muted-foreground">
          {formatDateTime(row.createdAt)}
        </span>
      </div>
      {row.queryText && (
        <p className="mt-2 text-sm leading-relaxed text-foreground">{row.queryText}</p>
      )}
      <div className="mt-2 space-y-1 text-[11px] text-muted-foreground">
        <p>
          <span className="text-muted-foreground/70">Session:</span>{" "}
          <span className="font-mono">{truncate(row.sessionId, 28)}</span>
        </p>
        {row.paperId && (
          <p>
            <span className="text-muted-foreground/70">Paper:</span> {row.paperId}
          </p>
        )}
      </div>
      {(row.payload && Object.keys(row.payload).length > 0) ||
      (row.selectedCitationIds?.length ?? 0) > 0 ? (
        <pre className="mt-3 max-h-36 overflow-auto rounded-lg border border-white/10 bg-black/30 p-2 text-[10px] text-muted-foreground">
          {JSON.stringify(
            {
              citations: row.selectedCitationIds,
              chunks: row.selectedChunkIds,
              payload: row.payload,
            },
            null,
            2
          )}
        </pre>
      ) : null}
    </div>
  );
}

function MetricPanel({
  label,
  value,
  icon,
  tone,
  tooltip,
}: {
  label: string;
  value: string;
  icon: ReactNode;
  tone: "mint" | "amber" | "slate";
  tooltip: string;
}) {
  const toneClasses = {
    mint: "from-[#5dd1b2]/18 via-[#5dd1b2]/8 to-transparent text-[#dffcf4]",
    amber: "from-[#f8c15a]/18 via-[#f8c15a]/8 to-transparent text-[#fff1cd]",
    slate: "from-white/12 via-white/6 to-transparent text-foreground",
  } as const;

  return (
    <div className="rounded-[1.35rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.02))] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] transition-[transform,border-color,background-color] duration-200 [transition-timing-function:var(--ease-out)] hover:-translate-y-0.5 hover:border-white/14 sm:rounded-[1.5rem] sm:p-5">
      <div
        className={`mb-5 inline-flex size-10 items-center justify-center rounded-2xl bg-gradient-to-br ${toneClasses[tone]}`}
      >
        {icon}
      </div>
      <div className="space-y-2.5">
        <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
          <span>{label}</span>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                className="inline-flex size-4 items-center justify-center rounded-full text-muted-foreground/80 transition-colors duration-150 [transition-timing-function:var(--ease-out)] hover:text-foreground active:scale-[0.97]"
                aria-label={`More information about ${label}`}
              >
                <Info className="size-3" />
              </button>
            </TooltipTrigger>
            <TooltipContent
              sideOffset={8}
              className="rounded-xl border border-white/10 bg-[#111315] px-3 py-2 text-[11px] leading-5 text-white shadow-[0_18px_50px_rgba(0,0,0,0.35)]"
            >
              {tooltip}
            </TooltipContent>
          </Tooltip>
        </div>
        <div className="text-[1.85rem] font-semibold tracking-[-0.05em] text-foreground">
          {value}
        </div>
      </div>
    </div>
  );
}

function LegendSwatch({ color, label }: { color: string; label: string }) {
  return (
    <div className="inline-flex items-center gap-2">
      <span className={`size-2.5 rounded-full ${color}`} />
      <span>{label}</span>
    </div>
  );
}
