import { Suspense } from "react";
import { AnalyticsDashboard } from "./analytics-dashboard";
import { FileStack } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";
import { getSupabaseServiceRoleClient } from "@/lib/supabase/admin";

export const metadata: Metadata = {
  title: "Analytics",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

function getSelineToken(): string | undefined {
  const t = process.env.SELINE_API_KEY?.trim();
  return t || undefined;
}

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

export type PendingPaymentRecord = {
  id: number;
  userId: string;
  email: string | null;
  fullName: string | null;
  transactionId: string | null;
  createdAt: string;
  status: string;
  verificationSource: string | null;
  verificationConfidence: number | null;
  verificationScore: number | null;
  verificationNotes: string | null;
  proofUrl: string | null;
  payerName: string | null;
  phoneNumber: string | null;
  amount: number | null;
  aiPayload: Record<string, unknown> | null;
};

async function fetchSeline(period: string): Promise<SelineResponse> {
  const token = getSelineToken();
  if (!token) {
    throw new Error("Missing SELINE_API_KEY.");
  }
  const res = await fetch("https://api.seline.com/api/v1/data", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ period }),
    next: { revalidate: 300 },
  });

  if (!res.ok) throw new Error(`Seline API error: ${res.status}`);
  return res.json();
}

async function fetchPendingPayments(): Promise<PendingPaymentRecord[]> {
  const admin = getSupabaseServiceRoleClient();
  const { data: rows, error } = await admin
    .from("payment_transactions")
    .select(
      "id,user_id,transaction_id,status,created_at,verification_source,verification_confidence,verification_notes,proof_path,ai_payload",
    )
    .in("status", ["approved", "needs_manual_review", "pending_review", "submitted"])
    .order("created_at", { ascending: false })
    .limit(40);

  if (error || !rows?.length) {
    return [];
  }

  const userIds = Array.from(
    new Set(
      rows
        .map((row) =>
          typeof row.user_id === "string" && row.user_id ? row.user_id : null,
        )
        .filter((value): value is string => Boolean(value)),
    ),
  );
  const userInfoByUserId = new Map<string, { email: string | null; fullName: string | null }>();

  if (userIds.length > 0) {
    const { data: users } = await admin
      .from("users")
      .select("id,email,full_name")
      .in("id", userIds);
    for (const userRow of users ?? []) {
      if (typeof userRow.id === "string") {
        userInfoByUserId.set(
          userRow.id,
          {
            email: typeof userRow.email === "string" ? userRow.email : null,
            fullName:
              typeof userRow.full_name === "string" ? userRow.full_name : null,
          },
        );
      }
    }
  }

  const proofByPaymentId = new Map<number, string | null>();
  await Promise.all(
    rows.map(async (row) => {
      const rowId = Number(row.id);
      const proofPath = typeof row.proof_path === "string" ? row.proof_path : null;
      if (!proofPath) {
        proofByPaymentId.set(rowId, null);
        return;
      }
      const { data } = await admin.storage
        .from("payment-proofs")
        .createSignedUrl(proofPath, 60 * 30);
      proofByPaymentId.set(rowId, data?.signedUrl ?? null);
    }),
  );

  return rows.map((row) => {
    const userInfo = userInfoByUserId.get(String(row.user_id)) ?? {
      email: null,
      fullName: null,
    };
    const payload =
      row.ai_payload && typeof row.ai_payload === "object"
        ? (row.ai_payload as Record<string, unknown>)
        : null;
    const amount =
      payload && typeof payload.amount === "number" ? payload.amount : null;
    const payerName =
      payload && typeof payload.payerName === "string" ? payload.payerName : null;
    const payloadScore =
      payload && typeof payload.score === "number" ? payload.score : null;
    const phoneNumber =
      payload && typeof payload.submittedPhoneNumber === "string"
        ? payload.submittedPhoneNumber
        : null;
    return {
      id: Number(row.id),
      userId: String(row.user_id),
      email: userInfo.email,
      fullName: userInfo.fullName,
      transactionId:
        typeof row.transaction_id === "string" ? row.transaction_id : null,
      createdAt:
        typeof row.created_at === "string" ? row.created_at : new Date().toISOString(),
      status: typeof row.status === "string" ? row.status : "needs_manual_review",
      verificationSource:
        typeof row.verification_source === "string"
          ? row.verification_source
          : null,
      verificationConfidence:
        typeof row.verification_confidence === "number"
          ? row.verification_confidence
          : null,
      verificationScore: payloadScore,
      verificationNotes:
        typeof row.verification_notes === "string" ? row.verification_notes : null,
      proofUrl: proofByPaymentId.get(Number(row.id)) ?? null,
      payerName,
      phoneNumber,
      amount,
      aiPayload: payload,
    };
  });
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
  const pendingPayments = await fetchPendingPayments().catch(() => []);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(93,209,178,0.08),transparent_28%),linear-gradient(180deg,#101113_0%,#0d0e10_100%)] text-foreground">
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
              href="/analytics/chat"
              className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-muted-foreground transition-[transform,colors,border-color,background-color] duration-200 ease-out active:scale-[0.97] [@media(hover:hover)_and_(pointer:fine)]:hover:border-white/20 [@media(hover:hover)_and_(pointer:fine)]:hover:bg-white/8 [@media(hover:hover)_and_(pointer:fine)]:hover:text-foreground"
            >
              Chat logs
            </Link>
            <Link
              href="/"
              className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-muted-foreground transition-[transform,colors,border-color,background-color] duration-200 ease-out active:scale-[0.97] [@media(hover:hover)_and_(pointer:fine)]:hover:border-white/20 [@media(hover:hover)_and_(pointer:fine)]:hover:bg-white/8 [@media(hover:hover)_and_(pointer:fine)]:hover:text-foreground"
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
            <AnalyticsDashboard
              data={data!}
              currentPeriod={period}
              pendingPayments={pendingPayments}
            />
          </Suspense>
        )}
      </main>
    </div>
  );
}
