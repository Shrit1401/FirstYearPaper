"use client";

import {
  useRef,
  useCallback,
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { Session, SupabaseClient, User } from "@supabase/supabase-js";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { formatSupabaseError, isMissingUsersTableError } from "@/lib/supabase/error";
import {
  buildUserProfileSeed,
  mapAppUserProfileRow,
  type AppUserProfile,
} from "@/lib/supabase/user-profile";

type AuthContextValue = {
  isLoading: boolean;
  profile: AppUserProfile | null;
  refreshProfile: () => Promise<void>;
  session: Session | null;
  supabase: SupabaseClient;
  user: User | null;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isLoading, setIsLoading] = useState(true);
  const [profile, setProfile] = useState<AppUserProfile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const supabase = getSupabaseBrowserClient();
  const profileSyncDisabled = useRef(false);
  const transientErrorLoggedAt = useRef(0);

  function setFallbackProfile(user: User) {
    setProfile((prev) => {
      const base: AppUserProfile = {
        id: user.id,
        email: user.email ?? null,
        full_name: seedString(user.user_metadata?.full_name),
        year: null,
        semester: null,
        is_paid: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      if (prev?.id === user.id && prev.is_paid) {
        return { ...base, is_paid: true, created_at: prev.created_at, updated_at: prev.updated_at };
      }
      return base;
    });
  }

  const loadProfile = useCallback(async (user: User) => {
    if (profileSyncDisabled.current) {
      setFallbackProfile(user);
      return;
    }

    const seed = buildUserProfileSeed(user);

    const { data: existing, error: readError } = await supabase
      .from("users")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();

    if (readError) {
      throw readError;
    }

    if (!existing) {
      const { error: upsertError } = await supabase.from("users").upsert(seed, { onConflict: "id" });
      if (upsertError) {
        throw upsertError;
      }
    } else {
      const { error: updateError } = await supabase
        .from("users")
        .update({ email: seed.email, full_name: seed.full_name })
        .eq("id", user.id);
      if (updateError) {
        throw updateError;
      }
    }

    const { data: row, error: fetchError } = await supabase
      .from("users")
      .select("*")
      .eq("id", user.id)
      .single();

    if (fetchError || !row) {
      throw fetchError ?? new Error("Profile row missing after sync.");
    }

    setProfile(mapAppUserProfileRow(row as Record<string, unknown>));
  }, [supabase]);

  async function refreshProfile() {
    if (!session?.user) {
      setProfile(null);
      return;
    }

    await loadProfile(session.user);
  }

  useEffect(() => {
    let isMounted = true;

    const SESSION_INIT_MS = 12_000;

    function syncProfileFromSession(user: User) {
      void (async () => {
        try {
          await loadProfile(user);
        } catch (profileError) {
          if (!isMounted) return;
          if (isMissingUsersTableError(profileError)) {
            profileSyncDisabled.current = true;
            console.error(
              "Supabase users table is missing. Run the SQL migrations in Supabase SQL Editor.",
              formatSupabaseError(profileError)
            );
            setFallbackProfile(user);
          } else if (isTransientSupabaseFetchError(profileError)) {
            const now = Date.now();
            if (now - transientErrorLoggedAt.current > 10_000) {
              transientErrorLoggedAt.current = now;
              console.warn(
                "Supabase profile request failed temporarily. Using fallback profile.",
                formatSupabaseError(profileError)
              );
            }
            setFallbackProfile(user);
          } else {
            profileSyncDisabled.current = true;
            console.error(
              "Failed to load Supabase profile",
              formatSupabaseError(profileError)
            );
            setFallbackProfile(user);
          }
        }
      })();
    }

    const sessionPromise = supabase.auth.getSession();
    const timeoutPromise = new Promise<never>((_, reject) => {
      window.setTimeout(() => reject(new Error("auth_session_timeout")), SESSION_INIT_MS);
    });

    Promise.race([sessionPromise, timeoutPromise])
      .then((result) => {
        if (!isMounted) return;

        const { data, error } = result;

        if (error) {
          console.error("Failed to load Supabase session", error);
          setSession(null);
          setProfile(null);
          setIsLoading(false);
          return;
        }

        setSession(data.session ?? null);

        if (!data.session?.user) {
          setProfile(null);
          setIsLoading(false);
          return;
        }

        // Session is known — unblock the app immediately. Profile sync can lag or fail
        // without leaving Repeat stuck on "Loading access" if `users` is slow or hanging.
        setIsLoading(false);
        syncProfileFromSession(data.session.user);
      })
      .catch((e) => {
        if (!isMounted) return;
        console.error(
          e instanceof Error && e.message === "auth_session_timeout"
            ? "Supabase getSession timed out — check URL, key, and network."
            : "Supabase session init failed",
          e
        );
        setSession(null);
        setProfile(null);
        setIsLoading(false);
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);

      if (nextSession?.user) {
        setIsLoading(false);
        syncProfileFromSession(nextSession.user);
      } else {
        profileSyncDisabled.current = false;
        setProfile(null);
        setIsLoading(false);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [loadProfile, supabase]);

  return (
    <AuthContext.Provider
      value={{
        isLoading,
        profile,
        refreshProfile,
        session,
        supabase,
        user: session?.user ?? null,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

function seedString(value: unknown) {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : null;
}

function isTransientSupabaseFetchError(error: unknown) {
  const message = formatSupabaseError(error).toLowerCase();
  return (
    message.includes("failed to fetch") ||
    message.includes("networkerror") ||
    message.includes("network request failed") ||
    message.includes("fetch failed")
  );
}

export function useAuth() {
  const value = useContext(AuthContext);

  if (!value) {
    throw new Error("useAuth must be used within AuthProvider");
  }

  return value;
}
