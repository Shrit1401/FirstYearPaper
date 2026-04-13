"use client";

import Link from "next/link";
import { ArrowRight, Cloud, LockKeyhole, UserRound } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { coerceIsPaid } from "@/lib/supabase/user-profile";

export function ProfileCard() {
  const { isLoading, profile, user } = useAuth();
  const isSignedIn = Boolean(user);
  const paid = coerceIsPaid(profile?.is_paid);
  const title = isSignedIn
    ? profile?.full_name?.trim() || user?.email || "Signed in"
    : isLoading
      ? "Checking your account"
      : "Sign in to sync your setup";
  const subtitle = isSignedIn
    ? paid
      ? "Repeat is unlocked and ready whenever you need it."
      : "Keep your setup saved and unlock Repeat when you want it."
    : isLoading
      ? "Finishing account check."
      : "Save your setup and keep Repeat one tap away.";

  return (
    <div className="profile-card-enter mb-8">
      <p className="mb-2 px-0.5 text-[11px] font-medium uppercase tracking-[0.1em] text-muted-foreground/60">
        Sync & account
      </p>
      <div className="rounded-[1.25rem] border border-border/60 bg-card/78 px-4 py-3.5 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-amber-500/10">
              <Cloud className="size-4 text-amber-300" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-[14px] font-medium leading-none tracking-tight">
                {title}
              </p>
              <p className="mt-1 truncate text-[12px] text-muted-foreground">
                {subtitle}
              </p>
            </div>
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <Link
              href={isSignedIn ? "/profile" : "/auth"}
              className="inline-flex min-h-9 items-center rounded-full border border-border/60 bg-background/70 px-3 text-[11px] font-medium text-muted-foreground transition-all duration-150 hover:bg-muted/70 hover:text-foreground active:scale-[0.97] sm:min-h-8"
            >
              {isSignedIn ? (
                <UserRound className="mr-1.5 size-3.5" />
              ) : (
                <LockKeyhole className="mr-1.5 size-3.5" />
              )}
              {isSignedIn ? "Profile" : "Auth"}
            </Link>
            <Link
              href={isSignedIn ? (paid ? "/repeat" : "/profile") : "/auth"}
              className="group inline-flex min-h-9 items-center gap-1.5 rounded-full bg-foreground px-3 text-[11px] font-medium text-background transition-all duration-150 hover:opacity-90 active:scale-[0.97] sm:min-h-8"
            >
              {isSignedIn ? (paid ? "Open Repeat" : "Unlock") : "Open"}
              <ArrowRight className="size-3.5 transition-transform duration-150 group-hover:translate-x-0.5" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
