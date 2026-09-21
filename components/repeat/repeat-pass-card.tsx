"use client";

import { useState } from "react";
import Link from "next/link";
import { useAction, useQuery } from "convex/react";
import { ArrowRight, BadgeCheck, LoaderCircle, LockKeyhole, ShieldCheck, Sparkles } from "lucide-react";
import posthog from "posthog-js";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/components/auth-provider";
import { describeAuthError } from "@/lib/auth-errors";
import { cn } from "@/lib/utils";

const FEATURES = [
  "Midsem practice with saved attempts and a personal retry list",
  "Midsem AI chat with step-by-step explanations and follow-ups (20 requests per day)",
  "Question and answer PDFs remain free",
  "One-time payment. No subscription, no renewals",
];

/**
 * Sign-in prompt, ₹29 checkout, or "you have access" state, depending on the account.
 * Rendered on the profile page and inside the Repeat tutor panel.
 */
export function RepeatPassCard({ compact = false, className, next = "/repeat" }: { compact?: boolean; className?: string; next?: string }) {
  const { isLoading, isAuthenticated, profile } = useAuth();
  const pricing = useQuery(api.payments.pricing);
  const createCheckout = useAction(api.dodo.createCheckout);
  const [redirecting, setRedirecting] = useState(false);
  const price = pricing?.display ?? "₹29";

  async function startCheckout() {
    if (redirecting) return;
    setRedirecting(true);
    posthog.capture("repeat_checkout_started", { price });
    try {
      const { checkoutUrl } = await createCheckout({});
      window.location.assign(checkoutUrl);
    } catch (error) {
      const message = describeAuthError(error, "signIn");
      posthog.capture("repeat_checkout_failed", { error_message: message.slice(0, 240) });
      toast.error(message);
      setRedirecting(false);
    }
  }

  const shell = cn(
    "repeat-pass-card overflow-hidden rounded-[1.4rem] border shadow-sm",
    (profile?.isPaid || profile?.midsemPaid) ? "border-emerald-500/25 bg-emerald-500/[0.06]" : "border-orange-500/25 bg-orange-500/[0.06]",
    className,
  );

  if (isLoading) {
    return <div className={cn(shell, "h-[132px] animate-pulse")} aria-busy="true" />;
  }

  if ((profile?.isPaid || profile?.midsemPaid)) {
    return (
      <div className={shell}>
        <div className={cn("flex items-start gap-3", compact ? "p-4" : "p-5")}>
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-300"><BadgeCheck className="size-4" /></span>
          <div className="min-w-0 flex-1">
            <p className="text-[14px] font-semibold tracking-tight">Repeat 2.0 midsem pass active</p>
            <p className="mt-1 text-[12px] leading-5 text-muted-foreground">
              Midsem practice is unlocked on this account{profile.paidAt ? ` since ${new Date(profile.paidAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}` : ""}.
            </p>
          </div>
          <Link href="/repeat/library" className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-[12px] font-medium text-emerald-100 transition-[background-color,transform] duration-150 ease-out hover:bg-emerald-500/20 active:scale-[0.97]">
            Open <ArrowRight className="size-3.5" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className={shell}>
      <div className={cn(compact ? "p-4" : "p-5")}>
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-orange-500/25 bg-orange-500/10 px-2.5 py-1 text-[11px] font-medium text-orange-200">
              <Sparkles className="size-3" /> Repeat 2.0 midsem pass
            </span>
            <p className="mt-3 text-[15px] font-semibold tracking-tight">
              Unlock midsem practice for <span className="text-orange-200">{price}</span>, once.
            </p>
          </div>
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-orange-500/15 text-orange-200"><LockKeyhole className="size-4" /></span>
        </div>
        {!compact ? (
          <ul className="mt-4 space-y-2 text-[13px] leading-5 text-muted-foreground">
            {FEATURES.map((feature) => (
              <li key={feature} className="flex gap-2"><span className="mt-[9px] size-1 shrink-0 rounded-full bg-orange-300" />{feature}</li>
            ))}
          </ul>
        ) : null}
        <div className="mt-4 flex flex-wrap items-center gap-3">
          {isAuthenticated ? (
            <button
              type="button"
              onClick={startCheckout}
              disabled={redirecting || pricing?.configured === false}
              className="inline-flex h-10 items-center gap-2 rounded-full bg-orange-400 px-4 text-[13px] font-semibold text-orange-950 transition-[background-color,transform,opacity] duration-150 ease-out hover:bg-orange-300 active:scale-[0.97] disabled:opacity-60"
            >
              {redirecting ? <LoaderCircle className="size-4 animate-spin" /> : null}
              {redirecting ? "Opening secure checkout" : `Pay ${price} with Dodo`}
              {!redirecting ? <ArrowRight className="size-3.5" /> : null}
            </button>
          ) : (
            <Link
              href={`/auth?next=${encodeURIComponent(next)}`}
              className="inline-flex h-10 items-center gap-2 rounded-full bg-foreground px-4 text-[13px] font-semibold text-background transition-[opacity,transform] duration-150 ease-out hover:opacity-90 active:scale-[0.97]"
            >
              Sign in to continue <ArrowRight className="size-3.5" />
            </Link>
          )}
          <span className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground/70">
            <ShieldCheck className="size-3.5" /> Secure checkout via Dodo Payments
          </span>
        </div>
        {pricing?.configured === false ? (
          <p className="mt-3 text-[11px] text-amber-200/80">Checkout is being set up. Please check back shortly.</p>
        ) : null}
      </div>
    </div>
  );
}
