"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useAction } from "convex/react";
import { ArrowRight, BadgeCheck, Clock3, LoaderCircle, TriangleAlert } from "lucide-react";
import posthog from "posthog-js";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/components/auth-provider";
import { describeAuthError } from "@/lib/auth-errors";

type State =
  | { kind: "checking" }
  | { kind: "granted" }
  | { kind: "processing"; status: string }
  | { kind: "signed_out" }
  | { kind: "error"; message: string };

type ConfirmResult = { kind: "granted" } | { kind: "processing"; status: string } | { kind: "error"; message: string };

export function ThankYouClient() {
  const params = useSearchParams();
  const paymentId = params.get("payment_id");
  const paramStatus = params.get("status");
  const { isLoading, isAuthenticated, profile } = useAuth();
  const confirmPayment = useAction(api.dodo.confirmPayment);
  const [confirmation, setConfirmation] = useState<ConfirmResult | null>(null);
  const attempts = useRef(0);

  // Ask Dodo directly so access appears before the webhook lands.
  useEffect(() => {
    if (isLoading || !isAuthenticated || (profile?.isPaid || profile?.midsemPaid) || !paymentId) return;
    let cancelled = false;
    async function run() {
      try {
        const result = await confirmPayment({ paymentId: paymentId! });
        if (cancelled) return;
        if (result.granted) {
          posthog.capture("repeat_payment_confirmed", { payment_id: paymentId });
          setConfirmation({ kind: "granted" });
          return;
        }
        setConfirmation({ kind: "processing", status: result.status });
        // Dodo can take a few seconds to settle; retry briefly before handing over to the webhook.
        if (attempts.current < 5 && result.status !== "failed" && result.status !== "cancelled") {
          attempts.current += 1;
          window.setTimeout(() => { if (!cancelled) void run(); }, 2500);
        }
      } catch (error) {
        if (!cancelled) setConfirmation({ kind: "error", message: describeAuthError(error, "signIn") });
      }
    }
    void run();
    return () => { cancelled = true; };
  }, [confirmPayment, isAuthenticated, isLoading, paymentId, profile?.isPaid, profile?.midsemPaid]);

  const state: State = isLoading
    ? { kind: "checking" }
    : !isAuthenticated
      ? { kind: "signed_out" }
      : (profile?.isPaid || profile?.midsemPaid)
        ? { kind: "granted" }
        : !paymentId
          ? { kind: "processing", status: paramStatus ?? "pending" }
          : confirmation ?? { kind: "checking" };

  const failed = state.kind === "processing" && (state.status === "failed" || state.status === "cancelled");

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-16">
      <div className="hero-streams w-full max-w-md rounded-[1.6rem] border border-border/60 bg-card/70 p-6 text-center shadow-sm sm:p-8">
        <div className={`mx-auto flex size-12 items-center justify-center rounded-2xl ${state.kind === "granted" ? "bg-emerald-500/15 text-emerald-300" : failed || state.kind === "error" ? "bg-red-500/15 text-red-300" : "bg-orange-500/15 text-orange-200"}`}>
          {state.kind === "granted" ? <BadgeCheck className="size-5" /> : state.kind === "checking" ? <LoaderCircle className="size-5 animate-spin" /> : failed || state.kind === "error" ? <TriangleAlert className="size-5" /> : <Clock3 className="size-5" />}
        </div>
        <h1 className="mt-5 text-[1.5rem] font-semibold tracking-tight">
          {state.kind === "granted" ? "You're in." : state.kind === "checking" ? "Confirming your payment" : state.kind === "signed_out" ? "Sign in to finish" : failed ? "Payment did not go through" : state.kind === "error" ? "Something went wrong" : "Almost there"}
        </h1>
        <p className="mt-2 text-[14px] leading-6 text-muted-foreground">
          {state.kind === "granted"
            ? "Repeat 2.0 is unlocked on this account. Pick a subject and start."
            : state.kind === "checking"
              ? "Checking with Dodo Payments. This takes a moment."
              : state.kind === "signed_out"
                ? "Sign in with the account you paid from and your access will appear."
                : failed
                  ? "Payment was not confirmed. Check your payment status before trying again."
                  : state.kind === "error"
                    ? state.message
                    : "The payment is still settling. Access activates automatically within a minute; you can keep this tab open or come back later."}
        </p>
        <div className="mt-6 flex flex-col gap-2">
          {state.kind === "signed_out" ? (
            <Link prefetch={false} href={`/auth?next=${encodeURIComponent("/repeat/payment/thank-you?"+params.toString())}`} className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-foreground text-[14px] font-semibold text-background transition-[opacity,transform] duration-150 ease-out hover:opacity-90 active:scale-[0.98]">Sign in <ArrowRight className="size-4" /></Link>
          ) : (
            <Link prefetch={false} href="/repeat" className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-foreground text-[14px] font-semibold text-background transition-[opacity,transform] duration-150 ease-out hover:opacity-90 active:scale-[0.98]">
              {state.kind === "granted" ? "Open Repeat 2.0" : "Back to Repeat"} <ArrowRight className="size-4" />
            </Link>
          )}
          {paymentId ? <p className="mt-2 text-[11px] text-muted-foreground/50">Reference {paymentId}</p> : null}
        </div>
      </div>
    </div>
  );
}
