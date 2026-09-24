"use client";

import { REPEAT_VISIBLE } from "@/lib/feature-visibility";
import { Suspense, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuthActions } from "@convex-dev/auth/react";
import { ArrowLeft, ArrowRight, Eye, EyeOff, LoaderCircle, LockKeyhole, Mail, UserRound } from "lucide-react";
import posthog from "posthog-js";
import { Input } from "@/components/ui/input";
import { describeAuthError } from "@/lib/auth-errors";
import { cn } from "@/lib/utils";

type AuthMode = "signIn" | "signUp";

type AuthScreenProps = {
  backHref?: string;
  backLabel?: string;
  /** Where to go after signing in when the URL has no `next` parameter. */
  defaultNext?: string;
  title?: string;
  description?: string;
};

function safeNext(value: string | null, fallback: string) {
  return value && value.startsWith("/") && !value.startsWith("//") ? value : fallback;
}

export function AuthScreen(props: AuthScreenProps) {
  return (
    <Suspense fallback={<AuthScreenInner {...props} nextPath={props.defaultNext ?? "/profile"} />}>
      <AuthScreenWithParams {...props} />
    </Suspense>
  );
}

function AuthScreenWithParams(props: AuthScreenProps) {
  const params = useSearchParams();
  return <AuthScreenInner {...props} nextPath={safeNext(params.get("next"), props.defaultNext ?? "/profile")} />;
}

function AuthScreenInner({
  backHref = "/",
  backLabel = "Back home",
  nextPath,
  title,
  description,
}: AuthScreenProps & { nextPath: string }) {
  const router = useRouter();
  const { signIn } = useAuthActions();
  const [mode, setMode] = useState<AuthMode>("signIn");
  const [showPassword, setShowPassword] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isSignup = mode === "signUp";

  function switchMode(next: AuthMode) {
    setMode(next);
    setErrorMessage(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;
    setErrorMessage(null);
    setIsSubmitting(true);
    try {
      await signIn("password", {
        email: email.trim().toLowerCase(),
        password,
        flow: mode,
        ...(isSignup ? { name: fullName.trim() } : {}),
      });
      posthog.capture(isSignup ? "account_created" : "user_signed_in");
      router.replace(nextPath);
      router.refresh();
    } catch (error) {
      const message = describeAuthError(error, mode);
      posthog.capture("authentication_failed", { auth_mode: mode, error_message: message.slice(0, 240) });
      setErrorMessage(message);
      setIsSubmitting(false);
    }
  }

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-background">
      <div
        className="pointer-events-none absolute left-1/2 top-0 h-[480px] w-[800px] -translate-x-1/2 opacity-[0.055]"
        style={{ background: "radial-gradient(ellipse 60% 50% at 50% 0%, var(--color-foreground) 0%, transparent 100%)" }}
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.025]"
        style={{ backgroundImage: "radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)", backgroundSize: "28px 28px" }}
      />

      <header className="relative z-10 border-b border-border/40 bg-background/60 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3.5 sm:px-6">
          <Link prefetch={false}
            href={backHref}
            className="inline-flex items-center gap-2 rounded-full border border-border/50 bg-muted/40 px-3 py-1.5 text-[12px] font-medium text-muted-foreground transition-[background-color,color,transform] duration-150 ease-out hover:bg-muted hover:text-foreground active:scale-[0.97]"
          >
            <ArrowLeft className="size-3.5" />
            {backLabel}
          </Link>
          <div className="text-[11px] text-muted-foreground/50">{REPEAT_VISIBLE ? "One account for Papers and Repeat" : "Your Papers account"}</div>
        </div>
      </header>

      <main className="relative z-10 mx-auto flex w-full max-w-6xl flex-1 items-center px-4 py-10 sm:px-6 lg:py-0">
        <div className="grid w-full items-start gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center lg:gap-16">
          <section className="auth-copy max-w-lg">
            <div className="auth-badge mb-6 inline-flex items-center gap-2 rounded-full border border-border/50 bg-muted/60 px-3 py-1 text-[11px] font-medium text-muted-foreground backdrop-blur-sm">
              Papers account
            </div>
            <h1 className="auth-title text-[2.2rem] font-semibold leading-[1.02] tracking-[-0.04em] sm:text-[3.1rem]">
              {title ?? (isSignup ? "Create your account" : "Welcome back")}
            </h1>
            <p className="auth-subtitle mt-4 max-w-md text-[15px] leading-7 text-muted-foreground">
              {description ?? (isSignup
                ? (REPEAT_VISIBLE ? "Save your year, keep your reading history, and unlock Repeat 2.0 solutions." : "Save your year and keep your reading history across devices.")
                : "Sign in to pick up where you left off.")}
            </p>
            <ul className="auth-meta mt-6 space-y-2 text-[13px] text-muted-foreground">
              <li className="flex items-center gap-2"><span className="size-1.5 rounded-full bg-orange-400" />Reading history synced across devices</li>
              {REPEAT_VISIBLE && <li className="flex items-center gap-2"><span className="size-1.5 rounded-full bg-orange-400" />One-time ₹29 pass for Repeat 2.0 tutor</li>}
              <li className="flex items-center gap-2"><span className="size-1.5 rounded-full bg-orange-400" />No spam, no newsletters</li>
            </ul>
          </section>

          <section className="auth-card-wrap w-full max-w-xl lg:justify-self-end">
            <div className="auth-card-panel rounded-[1.9rem] border border-border/60 bg-card/62 p-5 shadow-sm backdrop-blur-sm sm:p-6">
              <div className="auth-mode-switch mb-5 inline-flex rounded-full border border-border/60 bg-background/60 p-1" role="tablist" aria-label="Sign in or create account">
                {(["signIn", "signUp"] as const).map((value) => (
                  <button
                    key={value}
                    type="button"
                    role="tab"
                    aria-selected={mode === value}
                    onClick={() => switchMode(value)}
                    className={cn(
                      "rounded-full px-4 py-2 text-[12px] font-medium transition-[transform,background-color,color] duration-150 ease-out active:scale-[0.97]",
                      mode === value ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {value === "signIn" ? "Sign in" : "Create account"}
                  </button>
                ))}
              </div>

              <form onSubmit={handleSubmit} className="auth-form space-y-3.5" aria-busy={isSubmitting}>
                {isSignup ? (
                  <label className="block">
                    <span className="mb-2 block text-[12px] font-medium text-muted-foreground">Full name</span>
                    <div className="auth-input-wrap">
                      <UserRound className="auth-input-icon" />
                      <Input
                        type="text"
                        name="name"
                        autoComplete="name"
                        placeholder="Aadya Sharma"
                        value={fullName}
                        onChange={(event) => setFullName(event.target.value)}
                        className="auth-input h-12 rounded-2xl border-border/60 bg-background/50 pl-11 text-[14px]"
                        maxLength={80}
                        required
                      />
                    </div>
                  </label>
                ) : null}

                <label className="block">
                  <span className="mb-2 block text-[12px] font-medium text-muted-foreground">Email</span>
                  <div className="auth-input-wrap">
                    <Mail className="auth-input-icon" />
                    <Input
                      type="email"
                      name="email"
                      autoComplete="email"
                      inputMode="email"
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
                    <span className="text-[12px] font-medium text-muted-foreground">Password</span>
                    {isSignup ? <span className="text-[11px] text-muted-foreground/60">At least 8 characters</span> : null}
                  </div>
                  <div className="auth-input-wrap">
                    <LockKeyhole className="auth-input-icon" />
                    <Input
                      type={showPassword ? "text" : "password"}
                      name="password"
                      autoComplete={isSignup ? "new-password" : "current-password"}
                      placeholder={isSignup ? "Choose a strong password" : "Enter your password"}
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      className="auth-input h-12 rounded-2xl border-border/60 bg-background/50 pl-11 pr-11 text-[14px]"
                      minLength={isSignup ? 8 : undefined}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((value) => !value)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted-foreground transition-[transform,color] duration-150 hover:text-foreground active:scale-[0.94]"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      aria-pressed={showPassword}
                    >
                      {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                </label>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="auth-submit-button group inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-foreground px-4 text-[14px] font-semibold text-background disabled:opacity-70"
                >
                  {isSubmitting ? (
                    <>
                      <LoaderCircle className="size-4 animate-spin" />
                      {isSignup ? "Creating account" : "Signing in"}
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
                <div role="alert" className="mt-4 rounded-2xl border border-red-500/25 bg-red-500/[0.07] px-4 py-3 text-[12px] leading-5 text-red-200">
                  {errorMessage}
                </div>
              ) : null}

              <p className="auth-footer mt-5 text-center text-[11px] leading-5 text-muted-foreground/60">
                {isSignup ? "Already have an account? " : "New here? "}
                <button type="button" onClick={() => switchMode(isSignup ? "signIn" : "signUp")} className="font-medium text-muted-foreground underline-offset-4 transition-colors duration-150 hover:text-foreground hover:underline">
                  {isSignup ? "Sign in" : "Create an account"}
                </button>
              </p>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
