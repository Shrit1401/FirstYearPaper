"use client";

import Link from "next/link";
import { LoaderCircle, LockKeyhole, UserRound } from "lucide-react";
import { useAuth } from "@/components/auth-provider";

export function ProfileNavButton() {
  const { isLoading, profile, user } = useAuth();
  const href = user ? "/profile" : "/auth";
  const title = user ? "Open profile" : isLoading ? "Checking account" : "Sign in";
  const label =
    profile?.full_name?.trim() ||
    user?.email?.split("@")[0] ||
    (isLoading ? "Account" : "Sign in");

  return (
    <Link
      href={href}
      className="inline-flex min-h-9 items-center gap-2 rounded-full border border-border/50 bg-card/65 px-3 text-[12px] font-medium text-muted-foreground backdrop-blur-sm transition-all duration-150 hover:bg-muted/70 hover:text-foreground active:scale-[0.97] sm:min-h-8 sm:px-2.5 sm:pr-3"
      title={title}
    >
      <span className="flex size-5 items-center justify-center rounded-full bg-amber-500/15 text-amber-300">
        {isLoading ? (
          <LoaderCircle className="size-3 animate-spin" />
        ) : user ? (
          <UserRound className="size-3" />
        ) : (
          <LockKeyhole className="size-3" />
        )}
      </span>
      <span>{user ? label : isLoading ? "Account" : "Sign in"}</span>
    </Link>
  );
}
