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
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(93,209,178,0.08),_transparent_28%),linear-gradient(180deg,#101113_0%,#0d0e10_100%)] text-foreground">
      <header className="border-b border-white/8 bg-black/20 backdrop-blur-xl">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 sm:py-5">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-[#5dd1b2] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
              <FileStack className="size-4" strokeWidth={1.75} />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-lg font-semibold tracking-[-0.03em] text-foreground">
                Analytics
              </h1>
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                Private dashboard
              </p>
            </div>
            <Link
              href="/"
              className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-muted-foreground transition-all duration-200 [transition-timing-function:var(--ease-out)] hover:border-white/20 hover:bg-white/8 hover:text-foreground active:scale-[0.97]"
            >
              Back home
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-10">
        {error ? (
          <div className="rounded-[1.75rem] border border-rose-500/20 bg-rose-500/10 px-5 py-4 text-sm text-rose-200">
            Failed to load data: {error}
          </div>
        ) : (
          <Suspense fallback={null}>
            <AnalyticsDashboard data={data!} currentPeriod={period} />
          </Suspense>
        )}
      </main>
    </div>
  );
}
