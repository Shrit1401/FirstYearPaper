"use client";

import { useRouter, useSearchParams } from "next/navigation";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { SelineResponse, DataPoint } from "./page";
import { Download, TrendingUp, TrendingDown, Minus } from "lucide-react";

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
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: d.getFullYear() !== new Date().getFullYear() ? "numeric" : undefined,
  });
}

function formatNumber(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

function TrendBadge({ value }: { value: number }) {
  if (value > 0)
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-500">
        <TrendingUp className="size-3" />+{value}%
      </span>
    );
  if (value < 0)
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-red-500">
        <TrendingDown className="size-3" />
        {value}%
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground">
      <Minus className="size-3" />0%
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

export function AnalyticsDashboard({
  data,
  currentPeriod,
}: {
  data: SelineResponse;
  currentPeriod: string;
}) {
  const router = useRouter();

  const chartData = data.data.map((d) => ({
    ...d,
    label: formatDate(d.date),
  }));

  return (
    <div className="space-y-6">
      {/* Period selector + download */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1.5">
          {PERIODS.map((p) => (
            <button
              key={p.value}
              onClick={() => router.push(`/analytics?period=${p.value}`)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                currentPeriod === p.value
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
        <Button
          variant="outline"
          size="sm"
          className="gap-2 text-xs"
          onClick={() => downloadCSV(data.data, currentPeriod)}
        >
          <Download className="size-3.5" />
          Download CSV
        </Button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-2">
        <Card className="border-border/60">
          <CardHeader className="pb-1 pt-4">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Total Visitors
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-4">
            <p className="text-3xl font-semibold tabular-nums">
              {formatNumber(data.totalVisitors)}
            </p>
            <div className="mt-1">
              <TrendBadge value={data.trendVisitors} />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardHeader className="pb-1 pt-4">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Total Pageviews
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-4">
            <p className="text-3xl font-semibold tabular-nums">
              {formatNumber(data.totalViews)}
            </p>
            <div className="mt-1">
              <TrendBadge value={data.trendViews} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Chart */}
      <Card className="border-border/60">
        <CardHeader>
          <CardTitle className="text-sm font-medium">
            Visitors &amp; Pageviews over time
          </CardTitle>
        </CardHeader>
        <CardContent>
          {chartData.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              No data for this period.
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart
                data={chartData}
                margin={{ top: 4, right: 4, left: -20, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="gradVisitors" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradViews" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#22d3ee" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#ffffff18"
                  vertical={false}
                />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11, fill: "#888" }}
                  tickLine={false}
                  axisLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "#888" }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={formatNumber}
                />
                <Tooltip
                  contentStyle={{
                    background: "#1a1a1a",
                    border: "1px solid #333",
                    borderRadius: "8px",
                    fontSize: 12,
                  }}
                  labelStyle={{ color: "#fff", marginBottom: 4 }}
                  itemStyle={{ color: "#aaa" }}
                />
                <Area
                  type="monotone"
                  dataKey="visitors"
                  name="Visitors"
                  stroke="#6366f1"
                  strokeWidth={2}
                  fill="url(#gradVisitors)"
                  dot={false}
                />
                <Area
                  type="monotone"
                  dataKey="views"
                  name="Pageviews"
                  stroke="#22d3ee"
                  strokeWidth={2}
                  fill="url(#gradViews)"
                  dot={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Raw data table */}
      <Card className="border-border/60">
        <CardHeader>
          <CardTitle className="text-sm font-medium">Raw data</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="max-h-72 overflow-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-card">
                <tr className="border-b border-border/60">
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">
                    Date
                  </th>
                  <th className="px-4 py-2.5 text-right text-xs font-medium text-muted-foreground">
                    Visitors
                  </th>
                  <th className="px-4 py-2.5 text-right text-xs font-medium text-muted-foreground">
                    Pageviews
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.data.map((row, i) => (
                  <tr
                    key={i}
                    className="border-b border-border/30 last:border-0 hover:bg-muted/30"
                  >
                    <td className="px-4 py-2 text-muted-foreground">
                      {formatDate(row.date)}
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums">
                      {row.visitors.toLocaleString()}
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums">
                      {row.views.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
