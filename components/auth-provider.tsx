"use client";

import { createContext, useContext, useEffect, useRef, type ReactNode } from "react";
import { useConvexAuth, useQuery } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import posthog from "posthog-js";
import { api } from "@/convex/_generated/api";

export type AppUserProfile = {
  id: string;
  email: string | null;
  name: string | null;
  year: string | null;
  semester: string | null;
  isPaid: boolean;
  midsemPaid: boolean;
  paidAt: number | null;
  createdAt: number;
};

type AuthContextValue = {
  /** True until Convex knows whether the visitor is signed in. */
  isLoading: boolean;
  isAuthenticated: boolean;
  /** Null while signed out or still loading. */
  profile: AppUserProfile | null;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { isLoading: authLoading, isAuthenticated } = useConvexAuth();
  const { signOut } = useAuthActions();
  const viewer = useQuery(api.users.viewer, isAuthenticated ? {} : "skip");
  const identified = useRef<string | null>(null);

  const profile = isAuthenticated && viewer ? viewer : null;
  const isLoading = authLoading || (isAuthenticated && viewer === undefined);

  useEffect(() => {
    if (!profile) {
      if (identified.current) {
        posthog.reset();
        identified.current = null;
      }
      return;
    }
    if (identified.current !== profile.id) {
      if (identified.current) posthog.reset();
      posthog.identify(profile.id, { email: profile.email ?? undefined, name: profile.name ?? undefined });
      identified.current = profile.id;
    }
    posthog.setPersonProperties({
      year: profile.year,
      semester: profile.semester,
      is_paid: profile.isPaid,
      profile_complete: Boolean(profile.name && profile.year),
    });
  }, [profile]);

  return (
    <AuthContext.Provider value={{ isLoading, isAuthenticated, profile, signOut: () => signOut() }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used within AuthProvider");
  return value;
}
