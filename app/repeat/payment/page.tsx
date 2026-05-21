import Link from "next/link";
import { ArrowLeft, Sparkles } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Repeat · Closed",
  robots: { index: false, follow: false },
};

export default function RepeatPaymentPage() {
  return (
    <div className="min-h-dvh bg-[radial-gradient(ellipse_at_top,rgba(255,255,255,0.06),transparent_45%),#020202] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-medium text-white/60">
          <Sparkles className="size-3.5 text-amber-300" />
          Repeat
        </div>

        <div className="text-3xl">🎉</div>

        <h1 className="mt-4 text-[1.8rem] font-semibold leading-tight tracking-[-0.03em] text-white">
          That's a wrap — thank you!
        </h1>

        <p className="mt-4 text-[14px] leading-7 text-zinc-400">
          Repeat is done for the semester. Genuinely, thank you so much for the support — it meant a lot. If you bought Repeat, I'll personally reach out soon for feedback. See you next sem with something even better. ✌️
        </p>

        <Link
          href="/"
          className="mt-8 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-5 py-2.5 text-[13px] font-medium text-white/70 transition-colors hover:bg-white/10 hover:text-white active:scale-[0.97]"
        >
          <ArrowLeft className="size-3.5" />
          Back to papers
        </Link>
      </div>
    </div>
  );
}
