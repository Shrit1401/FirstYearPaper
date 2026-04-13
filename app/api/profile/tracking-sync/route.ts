import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import { getSupabasePublishableKey, getSupabaseUrl } from "@/lib/supabase/config";

const trackedPaperSchema = z.object({
  href: z.string(),
  name: z.string(),
  count: z.number().int().nonnegative(),
  firstViewedAt: z.string(),
  lastViewedAt: z.string(),
  viewedAt: z.array(z.string()),
});

const requestSchema = z.object({
  userId: z.string().uuid(),
  snapshot: z.object({
    papers: z.array(trackedPaperSchema),
    sessionCount: z.number().int().nonnegative(),
    totalTimeSpent: z.number().int().nonnegative(),
    papersThisWeek: z.number().int().nonnegative(),
  }),
});

function getAccessToken(request: Request) {
  const header = request.headers.get("authorization");

  if (!header?.startsWith("Bearer ")) {
    throw new Error("Unauthorized.");
  }

  return header.slice("Bearer ".length).trim();
}

export async function POST(request: Request) {
  try {
    const accessToken = getAccessToken(request);
    const body = requestSchema.parse(await request.json());

    const supabase = createClient(getSupabaseUrl(), getSupabasePublishableKey(), {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
      global: {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    });

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(accessToken);

    if (userError || !user || user.id !== body.userId) {
      throw new Error("Unauthorized.");
    }

    const { error: statsError } = await supabase.from("user_stats").upsert(
      {
        user_id: user.id,
        session_count: body.snapshot.sessionCount,
        total_time_spent_seconds: body.snapshot.totalTimeSpent,
        papers_this_week: body.snapshot.papersThisWeek,
        total_unique_papers: body.snapshot.papers.length,
      },
      { onConflict: "user_id" }
    );

    if (statsError) {
      throw new Error(statsError.message);
    }

    if (body.snapshot.papers.length > 0) {
      const rows = body.snapshot.papers.map((paper) => ({
        user_id: user.id,
        href: paper.href,
        name: paper.name,
        count: paper.count,
        first_viewed_at: paper.firstViewedAt,
        last_viewed_at: paper.lastViewedAt,
        viewed_at: paper.viewedAt,
      }));

      const { error: papersError } = await supabase
        .from("user_paper_views")
        .upsert(rows, { onConflict: "user_id,href" });

      if (papersError) {
        throw new Error(papersError.message);
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    const status =
      error instanceof z.ZodError ? 400 : message === "Unauthorized." ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
