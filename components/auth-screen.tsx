"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Eye, EyeOff, LoaderCircle, LockKeyhole, Mail, UserRound } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type AuthMode = "signin" | "signup";

type AuthScreenProps = {
  backHref?: string;
  backLabel?: string;
};

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

        setStatusMessage("Account created. Sign in with your email and password.");
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
        <div className="grid w-full items-start gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center lg:gap-16">
          <section className="auth-copy max-w-lg">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border/50 bg-muted/60 px-3 py-1 text-[11px] font-medium text-muted-foreground backdrop-blur-sm">
              Papers account
            </div>
            <h1 className="text-[2.2rem] font-semibold leading-[1.02] tracking-[-0.04em] sm:text-[3.1rem]">
              {isSignup ? "Create account" : "Welcome back"}
            </h1>
            <p className="mt-4 max-w-md text-[15px] leading-7 text-muted-foreground">
              {isSignup
                ? "Use one login for profile, papers, and Repeat access."
                : "Sign in to continue with your saved profile and Repeat access."}
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              <span className="rounded-full border border-border/50 bg-card/35 px-3 py-1 text-[11px] text-muted-foreground">
                Fast sign in
              </span>
              <span className="rounded-full border border-border/50 bg-card/35 px-3 py-1 text-[11px] text-muted-foreground">
                Synced profile
              </span>
              <span className="rounded-full border border-border/50 bg-card/35 px-3 py-1 text-[11px] text-muted-foreground">
                One account
              </span>
            </div>
          </section>

          <section className="auth-card-wrap w-full max-w-xl lg:justify-self-end">
            <div className="auth-card-panel rounded-[1.9rem] border border-border/60 bg-card/62 p-5 shadow-sm backdrop-blur-sm">
              <div className="mb-5 inline-flex rounded-full border border-border/60 bg-background/60 p-1">
                <button
                  type="button"
                  onClick={() => setMode("signin")}
                  className={cn(
                    "rounded-full px-4 py-2 text-[12px] font-medium transition-[transform,background-color,color] duration-150 ease-out active:scale-[0.97]",
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
                    "rounded-full px-4 py-2 text-[12px] font-medium transition-[transform,background-color,color] duration-150 ease-out active:scale-[0.97]",
                    mode === "signup"
                      ? "bg-foreground text-background"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Create account
                </button>
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
                      autoFocus={!isSignup}
                      required
                    />
                  </div>
                </label>

                <label className="block">
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <span className="text-[12px] font-medium text-muted-foreground">
                      Password
                    </span>
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
                  disabled={isSubmitting}
                  className="auth-submit-button group inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-foreground px-4 text-[14px] font-semibold text-background transition-[transform,opacity] duration-150 ease-out hover:opacity-90 active:scale-[0.985]"
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
