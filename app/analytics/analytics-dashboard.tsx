"use client";

import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
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
import type { DataPoint, SelineResponse } from "./page";
import {
  ArrowUpRight,
  Download,
  Eye,
  Info,
  Minus,
  TrendingDown,
  TrendingUp,
  Users,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const PERIODS = [
  { label: "1h", value: "1h" },
  { label: "24h", value: "24h" },
  { label: "7d", value: "7d" },
  { label: "30d", value: "30d" },
  { label: "6m", value: "6m" },
  { label: "12m", value: "12m" },
  { label: "All time", value: "all_time" },
];

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: d.getFullYear() !== new Date().getFullYear() ? "numeric" : undefined,
  });
}

function formatCompactDate(dateStr: string) {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function formatNumber(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

function formatPeriodLabel(period: string) {
  return PERIODS.find((item) => item.value === period)?.label ?? period;
}

function TrendBadge({ value }: { value: number }) {
  if (value > 0) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-red-500/20 bg-red-500/10 px-2.5 py-1 text-[11px] font-medium text-red-300">
        <TrendingUp className="size-3" />
        +{value}%
      </span>
    );
  }

  if (value < 0) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-rose-500/20 bg-rose-500/10 px-2.5 py-1 text-[11px] font-medium text-rose-300">
        <TrendingDown className="size-3" />
        {value}%
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
      <Minus className="size-3" />
      Steady
    </span>
  );
}

function downloadCSV(data: DataPoint[], period: string) {
  const header = "date,visitors,views";
  const rows = data.map((d) => `${d.date},${d.visitors},${d.views}`);
  const csv = [header, ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `analytics-${period}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function buildSummary(data: SelineResponse) {
  const points = data.data;
  const totalPoints = points.length;
  const previousVisitors = data.previous?.totalVisitors ?? 0;
  const previousViews = data.previous?.totalViews ?? 0;
  const avgVisitors = totalPoints
    ? Math.round(data.totalVisitors / totalPoints)
    : 0;
  const avgViews = totalPoints ? Math.round(data.totalViews / totalPoints) : 0;
  const strongestPoint = [...points].sort((a, b) => b.views - a.views)[0] ?? null;
  const latestPoint = points.at(-1) ?? null;

  return {
    avgVisitors,
    avgViews,
    previousVisitors,
    previousViews,
    strongestPoint,
    latestPoint,
    engagementLift:
      data.totalVisitors > 0
        ? ((data.totalViews - data.totalVisitors) / data.totalVisitors) * 100
        : 0,
  };
}

export function AnalyticsDashboard({
  data,
  currentPeriod,
}: {
  data: SelineResponse;
  currentPeriod: string;
}) {
  const router = useRouter();
  const chartData = data.data.map((point) => ({
    ...point,
    label: formatDate(point.date),
  }));
  const summary = buildSummary(data);

  return (
    <TooltipProvider delayDuration={140}>
      <div className="space-y-6">
        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="text-sm font-medium tracking-[-0.02em] text-foreground">
                Overview
              </div>
              <div className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
                {formatPeriodLabel(currentPeriod)}
              </div>
            </div>
            <Button
              variant="outline"
              className="h-10 rounded-full border-white/10 bg-white/[0.04] px-4 text-sm text-foreground transition-transform duration-150 [transition-timing-function:var(--ease-out)] hover:border-white/20 hover:bg-white/[0.06] active:scale-[0.97]"
              onClick={() => downloadCSV(data.data, currentPeriod)}
            >
              <Download className="mr-2 size-4" />
              Export
            </Button>
          </div>

          <div className="-mx-1 overflow-x-auto pb-1">
            <div className="flex min-w-max gap-2 px-1">
              {PERIODS.map((period) => {
                const active = currentPeriod === period.value;

                return (
                  <button
                    key={period.value}
                    onClick={() => router.push(`/analytics?period=${period.value}`)}
                    className={`min-h-10 rounded-full border px-4 py-2 text-[11px] font-medium uppercase tracking-[0.18em] transition-all duration-200 [transition-timing-function:var(--ease-out)] active:scale-[0.97] ${
                      active
                        ? "border-[#5dd1b2]/35 bg-[#5dd1b2]/12 text-[#dffcf4] shadow-[0_10px_25px_rgba(93,209,178,0.12)]"
                        : "border-white/10 bg-white/[0.03] text-muted-foreground hover:border-white/20 hover:bg-white/[0.05] hover:text-foreground"
                    }`}
                  >
                    {period.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <MetricPanel
              label="Visitors"
              value={formatNumber(data.totalVisitors)}
              icon={<Users className="size-4" />}
              tone="mint"
              meta={<TrendBadge value={data.trendVisitors} />}
              tooltip="Unique visitors in the selected range."
            />
            <MetricPanel
              label="Pageviews"
              value={formatNumber(data.totalViews)}
              icon={<Eye className="size-4" />}
              tone="amber"
              meta={<TrendBadge value={data.trendViews} />}
              tooltip="All tracked page loads in the selected range."
            />
            <MetricPanel
              label="Views / Visitor"
              value={
                data.totalVisitors > 0
                  ? (data.totalViews / data.totalVisitors).toFixed(2)
                  : "0.00"
              }
              icon={<ArrowUpRight className="size-4" />}
              tone="slate"
              meta={
                <span className="text-[11px] font-medium text-muted-foreground">
                  {summary.engagementLift >= 0 ? "+" : ""}
                  {summary.engagementLift.toFixed(1)}%
                </span>
              }
              tooltip="Average pageviews generated by each visitor."
            />
            <MetricPanel
              label="Peak"
              value={
                summary.strongestPoint
                  ? formatCompactDate(summary.strongestPoint.date)
                  : "None"
              }
              icon={<TrendingUp className="size-4" />}
              tone="slate"
              meta={
                <span className="text-[11px] font-medium text-muted-foreground">
                  {summary.strongestPoint
                    ? `${formatNumber(summary.strongestPoint.views)} views`
                    : "No data"}
                </span>
              }
              tooltip="Highest pageview interval in the current range."
            />
            <MetricPanel
              label="Average"
              value={formatNumber(summary.avgVisitors)}
              icon={<Minus className="size-4" />}
              tone="slate"
              meta={
                <span className="text-[11px] font-medium text-muted-foreground">
                  {formatNumber(summary.avgViews)} views
                </span>
              }
              tooltip="Average visitors per interval. Tooltip shows averages instead of extra text in the card."
            />
          </div>
        </section>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_360px]">
        <Card className="overflow-hidden rounded-[1.5rem] border-white/10 bg-white/[0.03] shadow-[0_20px_80px_rgba(0,0,0,0.18)] sm:rounded-[1.75rem]">
          <CardContent className="space-y-5 p-0">
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-white/10 px-4 py-4 sm:px-6 sm:py-5">
              <div className="space-y-1">
                <div className="text-sm font-medium tracking-[-0.02em] text-foreground">
                  Traffic
                </div>
              </div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <LegendSwatch color="bg-[#5dd1b2]" label="Visitors" />
                <LegendSwatch color="bg-[#f8c15a]" label="Pageviews" />
              </div>
            </div>

            <div className="px-3 pb-3 sm:px-6 sm:pb-6">
              {chartData.length === 0 ? (
                <div className="flex h-[280px] items-center justify-center rounded-[1.25rem] border border-dashed border-white/10 bg-black/10 text-sm text-muted-foreground sm:h-[360px] sm:rounded-[1.5rem]">
                  No data for this period yet.
                </div>
              ) : (
                <div className="rounded-[1.25rem] border border-white/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.015))] p-3 sm:rounded-[1.5rem] sm:p-5">
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart
                      data={chartData}
                      margin={{ top: 8, right: 6, left: -18, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient id="analytics-visitors" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#5dd1b2" stopOpacity={0.45} />
                          <stop offset="100%" stopColor="#5dd1b2" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="analytics-views" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#f8c15a" stopOpacity={0.28} />
                          <stop offset="100%" stopColor="#f8c15a" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="rgba(255,255,255,0.08)"
                        vertical={false}
                      />
                      <XAxis
                        dataKey="label"
                        tick={{ fontSize: 11, fill: "rgba(255,255,255,0.42)" }}
                        tickLine={false}
                        axisLine={false}
                        interval="preserveStartEnd"
                      />
                      <YAxis
                        tick={{ fontSize: 11, fill: "rgba(255,255,255,0.42)" }}
                        tickLine={false}
                        axisLine={false}
                        width={44}
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
                        dataKey="visitors"
                        name="Visitors"
                        stroke="#5dd1b2"
                        strokeWidth={2.5}
                        fill="url(#analytics-visitors)"
                        dot={false}
                        activeDot={{ r: 4, fill: "#5dd1b2", strokeWidth: 0 }}
                      />
                      <Area
                        type="monotone"
                        dataKey="views"
                        name="Pageviews"
                        stroke="#f8c15a"
                        strokeWidth={2.5}
                        fill="url(#analytics-views)"
                        dot={false}
                        activeDot={{ r: 4, fill: "#f8c15a", strokeWidth: 0 }}
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
                Log
              </div>
            </div>

            <div className="hidden max-h-[452px] overflow-auto sm:block">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-[#111315]/95 backdrop-blur-xl">
                  <tr className="border-b border-white/10">
                    <th className="px-6 py-3 text-left text-[11px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
                      Date
                    </th>
                    <th className="px-6 py-3 text-right text-[11px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
                      Visitors
                    </th>
                    <th className="px-6 py-3 text-right text-[11px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
                      Pageviews
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.data.map((row, index) => (
                    <tr
                      key={`${row.date}-${index}`}
                      className="border-b border-white/[0.06] transition-colors duration-150 hover:bg-white/[0.03]"
                    >
                      <td className="px-6 py-3.5 text-foreground">
                        {formatDate(row.date)}
                      </td>
                      <td className="px-6 py-3.5 text-right font-medium tabular-nums text-foreground">
                        {row.visitors.toLocaleString()}
                      </td>
                      <td className="px-6 py-3.5 text-right font-medium tabular-nums text-foreground">
                        {row.views.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="space-y-2 p-3 sm:hidden">
              {data.data.map((row, index) => (
                <div
                  key={`${row.date}-${index}`}
                  className="rounded-[1.15rem] border border-white/[0.08] bg-white/[0.03] p-3"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-medium text-foreground">
                      {formatDate(row.date)}
                    </p>
                    <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                      interval
                    </span>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <div className="rounded-xl bg-black/14 px-3 py-2.5">
                      <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground/55">
                        Visitors
                      </p>
                      <p className="mt-1 text-sm font-semibold tabular-nums text-foreground">
                        {row.visitors.toLocaleString()}
                      </p>
                    </div>
                    <div className="rounded-xl bg-black/14 px-3 py-2.5">
                      <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground/55">
                        Views
                      </p>
                      <p className="mt-1 text-sm font-semibold tabular-nums text-foreground">
                        {row.views.toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
      </div>
    </TooltipProvider>
  );
}

function MetricPanel({
  label,
  value,
  meta,
  icon,
  tone,
  tooltip,
}: {
  label: string;
  value: string;
  meta: ReactNode;
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
    <div
      className={`rounded-[1.35rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.02))] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] transition-[transform,border-color,background-color] duration-200 [transition-timing-function:var(--ease-out)] hover:-translate-y-0.5 hover:border-white/14 sm:rounded-[1.5rem] sm:p-5`}
    >
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
        <div className="flex min-h-5 items-center justify-between gap-2">
          {meta}
        </div>
      </div>
    </div>
  );
}

function LegendSwatch({
  color,
  label,
}: {
  color: string;
  label: string;
}) {
  return (
    <div className="inline-flex items-center gap-2">
      <span className={`size-2.5 rounded-full ${color}`} />
      <span>{label}</span>
    </div>
  );
}
