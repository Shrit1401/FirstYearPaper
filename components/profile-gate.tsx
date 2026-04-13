"use client";

import { useEffect, useState } from "react";
import { AuthScreen } from "@/components/auth-screen";
import { useAuth } from "@/components/auth-provider";
import { ProfileClient } from "@/app/profile/profile-client";

export function ProfileGate() {
  const { isLoading, user } = useAuth();
  const [loadingTimedOut, setLoadingTimedOut] = useState(false);

  useEffect(() => {
    if (!isLoading || loadingTimedOut) {
      return;
    }

    const timer = window.setTimeout(() => {
      setLoadingTimedOut(true);
    }, 1500);

    return () => window.clearTimeout(timer);
  }, [isLoading, loadingTimedOut]);

  if (user) {
    return <ProfileClient />;
  }

  if (isLoading && !loadingTimedOut) {
    return (
      <div className="min-h-screen bg-background">
        <div className="mx-auto max-w-2xl px-6 py-20 text-center">
          <div className="text-sm text-muted-foreground">Loading profile…</div>
        </div>
      </div>
    );
  }

  if (!user) {
    return <AuthScreen backLabel="Back to papers" />;
  }

  return <ProfileClient />;
}
