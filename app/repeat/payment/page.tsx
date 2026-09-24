import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { RepeatPassCard } from "@/components/repeat/repeat-pass-card";

export const metadata: Metadata = {
  title: "Repeat 2.0 pass",
  description: "One-time ₹29 pass for step-by-step teacher solutions in Repeat 2.0.",
};

export default function RepeatPaymentPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto max-w-2xl px-4 py-3 sm:px-6">
          <Link prefetch={false} href="/repeat" className="inline-flex items-center gap-2 rounded-full border border-border/50 bg-muted/40 px-3 py-1.5 text-[12px] font-medium text-muted-foreground transition-[background-color,color,transform] duration-150 ease-out hover:bg-muted hover:text-foreground active:scale-[0.97]">
            <ArrowLeft className="size-3.5" /> Back to Repeat
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
        <h1 className="hero-title text-[2rem] font-semibold leading-tight tracking-[-0.03em]">Repeat 2.0 pass</h1>
        <p className="hero-subtitle mt-3 max-w-lg text-[15px] leading-7 text-muted-foreground">
          One payment unlocks all of Repeat 2.0: the transcribed question library with original figures, worked solutions checked against the scan, and follow-ups on any step.
        </p>
        <div className="hero-streams mt-8">
          <RepeatPassCard />
        </div>
        <p className="hero-footer mt-6 text-[12px] leading-5 text-muted-foreground/60">
          Payments are processed by Dodo Payments. Access is tied to the signed-in account and activates as soon as the payment succeeds. Questions about a payment? Email the address on the <Link prefetch={false} href="/legal" className="underline underline-offset-2">legal page</Link>.
        </p>
      </main>
    </div>
  );
}
