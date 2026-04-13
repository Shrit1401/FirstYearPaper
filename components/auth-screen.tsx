"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, Eye, EyeOff, LoaderCircle, LockKeyhole, Mail, UserRound } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type AuthMode = "signin" | "signup";

type AuthScreenProps = {
  backHref?: string;
  backLabel?: string;
};

const UI_ONLY_DATE = "April 6, 2026";
const ACCOUNT_POINTS = [
  "Save your year and profile in one clean Papers login.",
  "Pick up your setup across devices without redoing anything.",
  "Keep Repeat and the paper finder in one simple flow.",
];

function GoogleIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="size-4"
      fill="none"
    >
      <path
        d="M21.805 12.23c0-.69-.062-1.353-.177-1.99H12v3.77h5.5a4.7 4.7 0 0 1-2.04 3.082v2.557h3.3c1.932-1.779 3.045-4.403 3.045-7.419Z"
        fill="#4285F4"
      />
      <path
        d="M12 22c2.76 0 5.074-.915 6.765-2.476l-3.3-2.557c-.916.614-2.087.978-3.465.978-2.657 0-4.908-1.793-5.713-4.205H2.875v2.638A9.998 9.998 0 0 0 12 22Z"
        fill="#34A853"
      />
      <path
        d="M6.287 13.74A5.998 5.998 0 0 1 5.967 12c0-.605.109-1.191.32-1.74V7.622H2.875A9.998 9.998 0 0 0 2 12c0 1.61.384 3.134 1.065 4.378l3.222-2.638Z"
        fill="#FBBC04"
      />
      <path
        d="M12 6.055c1.5 0 2.847.516 3.906 1.53l2.928-2.928C17.07 2.998 14.757 2 12 2A9.998 9.998 0 0 0 3.065 7.622L6.287 10.26C7.092 7.848 9.343 6.055 12 6.055Z"
        fill="#EA4335"
      />
    </svg>
  );
}

export function AuthScreen({
  backHref = "/",
  backLabel = "Back home",
}: AuthScreenProps) {
  const router = useRouter();
  const { isLoading, supabase, user } = useAuth();
  const [mode, setMode] = useState<AuthMode>("signin");
  const [showPassword, setShowPassword] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const isSignup = mode === "signup";

  useEffect(() => {
    if (!isLoading && user) {
      router.replace("/profile");
    }
  }, [isLoading, router, user]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);
    setStatusMessage(null);
    setIsSubmitting(true);

    try {
      const normalizedEmail = email.trim();

      if (isSignup) {
        const { data, error } = await supabase.auth.signUp({
          email: normalizedEmail,
          password,
          options: {
            data: {
              full_name: fullName.trim(),
            },
            emailRedirectTo: `${window.location.origin}/profile`,
          },
        });

        if (error) {
          throw error;
        }

        if (data.session) {
          router.push("/profile");
          router.refresh();
          return;
        }

        setStatusMessage(
          "Account created. Check your inbox if verification is enabled."
        );
        return;
      }

      const { error } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      });

      if (error) {
        throw error;
      }

      router.push("/profile");
      router.refresh();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Authentication failed.";
      setErrorMessage(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleGoogleAuth() {
    setErrorMessage(null);
    setStatusMessage(null);
    setIsGoogleLoading(true);

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/profile`,
        },
      });

      if (error) {
        throw error;
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Google sign-in failed.";
      setErrorMessage(message);
      setIsGoogleLoading(false);
    }
  }

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-background">
      <div
        className="pointer-events-none absolute left-1/2 top-0 h-[480px] w-[800px] -translate-x-1/2 opacity-[0.055]"
        style={{
          background:
            "radial-gradient(ellipse 60% 50% at 50% 0%, var(--color-foreground) 0%, transparent 100%)",
        }}
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.025]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)",
          backgroundSize: "28px 28px",
        }}
      />

      <header className="relative z-10 border-b border-border/40 bg-background/60 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3.5 sm:px-6">
          <Link
            href={backHref}
            className="inline-flex items-center gap-2 rounded-full border border-border/50 bg-muted/40 px-3 py-1.5 text-[12px] font-medium text-muted-foreground transition-all duration-150 hover:bg-muted hover:text-foreground active:scale-[0.97]"
          >
            <ArrowLeft className="size-3.5" />
            {backLabel}
          </Link>
          <div className="text-[11px] text-muted-foreground/50">One account for Papers</div>
        </div>
      </header>

      <main className="relative z-10 mx-auto flex w-full max-w-6xl flex-1 items-center px-4 py-10 sm:px-6 lg:py-0">
        <div className="grid w-full items-start gap-10 lg:grid-cols-[0.95fr_1.05fr] lg:items-center lg:gap-16">
          <section className="auth-copy max-w-lg">
            <div className="auth-badge mb-6 inline-flex items-center gap-2 rounded-full border border-border/50 bg-muted/60 px-3 py-1 text-[11px] font-medium text-muted-foreground backdrop-blur-sm">
              <span className="relative flex size-1.5">
                <span className="absolute inline-flex h-full w-full rounded-full bg-red-400/55" />
                <span className="relative inline-flex size-1.5 rounded-full bg-red-500" />
              </span>
              Papers account
            </div>

            <h1 className="auth-title text-[2.4rem] font-semibold leading-[1.02] tracking-[-0.04em] sm:text-[3.45rem]">
              {isSignup ? "Create your account." : "Sign in to Papers."}
            </h1>

            <p className="auth-subtitle mt-5 max-w-md text-[15px] leading-7 text-muted-foreground">
              {isSignup
                ? "Create an account once, keep your setup saved, and unlock paid features on the same login."
                : "Sign in to keep your setup saved, restore your account instantly, and continue where you left off."}
            </p>

            <div className="auth-meta mt-8 space-y-3">
              {ACCOUNT_POINTS.map((point) => (
                <div
                  key={point}
                  className="auth-meta-line flex items-start gap-3 rounded-2xl border border-border/50 bg-card/35 px-4 py-3 text-[13px] text-muted-foreground"
                >
                  <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/12 text-emerald-300">
                    <Check className="size-3.5" />
                  </span>
                  <span>{point}</span>
                </div>
              ))}
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <div className="rounded-[1.2rem] border border-border/50 bg-card/35 px-4 py-3">
                <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground/55">
                  Access
                </p>
                <p className="mt-2 text-[15px] font-medium">Email + Google</p>
              </div>
              <div className="rounded-[1.2rem] border border-border/50 bg-card/35 px-4 py-3">
                <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground/55">
                  Repeat
                </p>
                <p className="mt-2 text-[15px] font-medium">Unlocks on payment</p>
              </div>
              <div className="rounded-[1.2rem] border border-border/50 bg-card/35 px-4 py-3">
                <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground/55">
                  Setup
                </p>
                <p className="mt-2 text-[15px] font-medium">Synced profile</p>
              </div>
            </div>
          </section>

          <section className="auth-card-wrap w-full max-w-xl lg:justify-self-end">
            <div className="auth-card-panel rounded-[1.9rem] border border-border/60 bg-card/62 p-5 shadow-sm backdrop-blur-sm">
              <div className="auth-mode-switch mb-5 inline-flex rounded-full border border-border/60 bg-background/60 p-1">
                <button
                  type="button"
                  onClick={() => setMode("signin")}
                  className={cn(
                    "rounded-full px-4 py-2 text-[12px] font-medium transition-all duration-150 active:scale-[0.97]",
                    mode === "signin"
                      ? "bg-foreground text-background"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Sign in
                </button>
                <button
                  type="button"
                  onClick={() => setMode("signup")}
                  className={cn(
                    "rounded-full px-4 py-2 text-[12px] font-medium transition-all duration-150 active:scale-[0.97]",
                    mode === "signup"
                      ? "bg-foreground text-background"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Create account
                </button>
              </div>

              <button
                type="button"
                onClick={handleGoogleAuth}
                disabled={isSubmitting || isGoogleLoading}
                className="auth-google-button group mb-4 inline-flex h-12 w-full items-center justify-center gap-3 rounded-2xl border border-border/60 bg-background/50 px-4 text-[14px] font-medium transition-all duration-150 hover:bg-muted/50 active:scale-[0.985]"
              >
                {isGoogleLoading ? (
                  <LoaderCircle className="size-4 animate-spin" />
                ) : (
                  <GoogleIcon />
                )}
                {isGoogleLoading ? "Redirecting to Google" : "Continue with Google"}
                <ArrowRight className="size-4 text-muted-foreground transition-transform duration-150 group-hover:translate-x-0.5" />
              </button>

              <div className="auth-divider-row mb-4 flex items-center gap-3">
                <div className="h-px flex-1 bg-border/60" />
                <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground/60">
                  Or use email
                </span>
                <div className="h-px flex-1 bg-border/60" />
              </div>

              <form onSubmit={handleSubmit} className="auth-form space-y-3.5">
                {isSignup ? (
                  <label className="block">
                    <span className="mb-2 block text-[12px] font-medium text-muted-foreground">
                      Full name
                    </span>
                    <div className="auth-input-wrap">
                      <UserRound className="auth-input-icon" />
                      <Input
                        type="text"
                        placeholder="Aadya Sharma"
                        value={fullName}
                        onChange={(event) => setFullName(event.target.value)}
                        className="auth-input h-12 rounded-2xl border-border/60 bg-background/50 pl-11 text-[14px]"
                        required
                      />
                    </div>
                  </label>
                ) : null}

                <label className="block">
                  <span className="mb-2 block text-[12px] font-medium text-muted-foreground">
                    Email
                  </span>
                  <div className="auth-input-wrap">
                    <Mail className="auth-input-icon" />
                    <Input
                      type="email"
                      placeholder="you@college.edu"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      className="auth-input h-12 rounded-2xl border-border/60 bg-background/50 pl-11 text-[14px]"
                      required
                    />
                  </div>
                </label>

                <label className="block">
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <span className="text-[12px] font-medium text-muted-foreground">
                      Password
                    </span>
                    {!isSignup ? (
                      <button
                        type="button"
                        className="text-[12px] text-muted-foreground transition-colors duration-150 hover:text-foreground"
                      >
                        Forgot password?
                      </button>
                    ) : null}
                  </div>

                  <div className="auth-input-wrap">
                    <LockKeyhole className="auth-input-icon" />
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder={isSignup ? "Choose a strong password" : "Enter your password"}
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      className="auth-input h-12 rounded-2xl border-border/60 bg-background/50 pl-11 pr-11 text-[14px]"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((value) => !value)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted-foreground transition-[transform,color] duration-150 hover:text-foreground active:scale-[0.94]"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? (
                        <EyeOff className="size-4" />
                      ) : (
                        <Eye className="size-4" />
                      )}
                    </button>
                  </div>
                </label>

                <button
                  type="submit"
                  disabled={isSubmitting || isGoogleLoading}
                  className="auth-submit-button group inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-foreground px-4 text-[14px] font-semibold text-background transition-[transform,opacity] duration-150 hover:opacity-90 active:scale-[0.985]"
                >
                  {isSubmitting ? (
                    <>
                      <LoaderCircle className="size-4 animate-spin" />
                      Working
                    </>
                  ) : (
                    <>
                      {isSignup ? "Create account" : "Sign in"}
                      <ArrowRight className="size-4 transition-transform duration-150 group-hover:translate-x-0.5" />
                    </>
                  )}
                </button>
              </form>

              <div className="auth-footer mt-5 border-t border-border/60 pt-4">
                <p className="text-[12px] text-muted-foreground">
                  {isSignup
                    ? "Create your account with email or Google."
                    : `Account access updated on ${UI_ONLY_DATE}.`}
                </p>
              </div>

              {errorMessage ? (
                <div className="mt-4 rounded-2xl border border-border/60 bg-background/45 px-4 py-3 text-[12px] text-muted-foreground">
                  {errorMessage}
                </div>
              ) : null}

              {statusMessage ? (
                <div className="mt-4 rounded-2xl border border-border/60 bg-background/45 px-4 py-3 text-[12px] text-muted-foreground">
                  {statusMessage}
                </div>
              ) : null}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
