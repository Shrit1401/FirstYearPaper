import { MessageSquare } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";
import { buildRepeatChatAnalytics } from "@/lib/repeat-chat-analytics";
import { ChatAnalyticsDashboard } from "./chat-analytics-dashboard";

export const metadata: Metadata = {
  title: "Chat analytics",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function ChatAnalyticsPage() {
  const data = await buildRepeatChatAnalytics(200);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(93,209,178,0.08),_transparent_28%),linear-gradient(180deg,#101113_0%,#0d0e10_100%)] text-foreground">
      <header className="border-b border-white/8 bg-black/20 backdrop-blur-xl">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 sm:py-5">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-[#5dd1b2] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
              <MessageSquare className="size-4" strokeWidth={1.75} />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-lg font-semibold tracking-[-0.03em] text-foreground">
                Chat analytics
              </h1>
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                Repeat learning log
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href="/analytics"
                className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-muted-foreground transition-[transform,colors,border-color,background-color] duration-200 [transition-timing-function:var(--ease-out)] active:scale-[0.97] [@media(hover:hover)_and_(pointer:fine)]:hover:border-white/20 [@media(hover:hover)_and_(pointer:fine)]:hover:bg-white/8 [@media(hover:hover)_and_(pointer:fine)]:hover:text-foreground"
              >
                Traffic
              </Link>
              <Link
                href="/"
                className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-muted-foreground transition-[transform,colors,border-color,background-color] duration-200 [transition-timing-function:var(--ease-out)] active:scale-[0.97] [@media(hover:hover)_and_(pointer:fine)]:hover:border-white/20 [@media(hover:hover)_and_(pointer:fine)]:hover:bg-white/8 [@media(hover:hover)_and_(pointer:fine)]:hover:text-foreground"
              >
                Back home
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-10">
        <ChatAnalyticsDashboard data={data} />
      </main>
    </div>
  );
}
