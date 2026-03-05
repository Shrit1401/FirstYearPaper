import { Suspense } from "react";
import { AnalyticsDashboard } from "./analytics-dashboard";
import { FileStack } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Analytics",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const SELINE_TOKEN =
  "sln_1733661757090fb6287b731b1644479a2f63d604af8728e9f5558e8c22e51dcd";

export type DataPoint = {
  date: string;
  visitors: number;
  views: number;
};

export type SelineResponse = {
  data: DataPoint[];
  totalVisitors: number;
  totalViews: number;
  trendVisitors: number;
  trendViews: number;
  previous?: {
    totalVisitors: number;
    totalViews: number;
  };
};

async function fetchSeline(period: string): Promise<SelineResponse> {
  const res = await fetch("https://api.seline.com/api/v1/data", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${SELINE_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ period }),
    next: { revalidate: 300 },
  });

  if (!res.ok) throw new Error(`Seline API error: ${res.status}`);
  return res.json();
}

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const { period = "30d" } = await searchParams;

  let data: SelineResponse | null = null;
  let error: string | null = null;

  try {
    data = await fetchSeline(period);
  } catch (e) {
    error = (e as Error).message;
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/40 bg-background/70 backdrop-blur-md">
        <div className="mx-auto max-w-5xl px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <FileStack className="size-4" strokeWidth={1.75} />
            </div>
            <div className="flex-1">
              <h1 className="text-lg font-semibold tracking-tight text-foreground">
                Analytics
              </h1>
              <p className="text-xs text-muted-foreground">
                Visits & pageviews · powered by Seline
              </p>
            </div>
            <Link
              href="/"
              className="text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
            >
              ← Back
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-10">
        {error ? (
          <p className="text-sm text-destructive">Failed to load data: {error}</p>
        ) : (
          <Suspense fallback={null}>
            <AnalyticsDashboard data={data!} currentPeriod={period} />
          </Suspense>
        )}
      </main>
    </div>
  );
}
