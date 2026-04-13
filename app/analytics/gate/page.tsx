"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import Link from "next/link";
import { KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

function AnalyticsGateForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next") ?? "/analytics";
  const [secret, setSecret] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/analytics/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ secret }),
      });
      const payload = (await res.json().catch(() => ({}))) as {
        error?: string;
      };
      if (!res.ok) {
        setError(payload.error ?? "Could not sign in.");
        return;
      }
      router.replace(nextPath.startsWith("/") ? nextPath : "/analytics");
      router.refresh();
    } catch {
      setError("Network error.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(93,209,178,0.08),_transparent_28%),linear-gradient(180deg,#101113_0%,#0d0e10_100%)] text-foreground">
      <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-12">
        <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] sm:p-8">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-[#5dd1b2]">
              <KeyRound className="size-5" strokeWidth={1.75} />
            </div>
            <div>
              <h1 className="text-lg font-semibold tracking-[-0.03em]">
                Analytics access
              </h1>
              <p className="text-xs text-muted-foreground">
                Enter the dashboard secret from your environment.
              </p>
            </div>
          </div>

          <form onSubmit={(e) => void onSubmit(e)} className="space-y-4">
            <Input
              type="password"
              name="secret"
              autoComplete="off"
              placeholder="REPEAT_ANALYTICS_SECRET"
              value={secret}
              onChange={(ev) => setSecret(ev.target.value)}
              className="h-11 rounded-xl border-white/10 bg-black/25 text-[15px]"
            />
            {error ? (
              <p className="text-sm text-rose-300" role="alert">
                {error}
              </p>
            ) : null}
            <Button
              type="submit"
              disabled={busy || !secret.trim()}
              className="h-11 w-full rounded-xl font-medium transition-[transform,opacity] duration-150 [transition-timing-function:var(--ease-out)] active:scale-[0.98] disabled:opacity-50"
            >
              {busy ? "Checking…" : "Continue"}
            </Button>
          </form>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            <Link
              href="/"
              className="text-[#5dd1b2] underline-offset-4 transition-[opacity,colors] duration-150 ease-out hover:underline hover:opacity-90"
            >
              Back home
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function AnalyticsGatePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[linear-gradient(180deg,#101113_0%,#0d0e10_100%)] text-foreground" />
      }
    >
      <AnalyticsGateForm />
    </Suspense>
  );
}
