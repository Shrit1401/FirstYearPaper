"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { ArrowRight, BookOpen, TrendingUp, Lock, ChevronRight, GraduationCap } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useHydrated } from "@/lib/use-hydrated";

// ── Types & Storage ────────────────────────────────────────────────────────

export type UserProfile = {
  name: string;
  year: string;
  sem: string;
};

const STORAGE_KEY = "mit-paper-profile";

export function getStoredProfile(): UserProfile | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as UserProfile;
  } catch {
    return null;
  }
}

export function setStoredProfile(profile: UserProfile) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
}

// ── Year / Sem config ──────────────────────────────────────────────────────

type YearConfig = {
  label: string;
  color: string;       // Tailwind text color
  bg: string;          // Tailwind bg color (icon container)
  borderHover: string; // hover border accent
};

const YEAR_CONFIG: Record<string, YearConfig> = {
  "Year 1": {
    label: "Year 1",
    color: "text-red-400",
    bg: "bg-red-500/10",
    borderHover: "hover:border-red-500/40",
  },
  "Year 2": {
    label: "Year 2",
    color: "text-orange-400",
    bg: "bg-orange-500/10",
    borderHover: "hover:border-orange-500/40",
  },
  "Year 3": {
    label: "Year 3",
    color: "text-amber-400",
    bg: "bg-amber-500/10",
    borderHover: "hover:border-amber-500/40",
  },
  "Year 4": {
    label: "Year 4",
    color: "text-rose-400",
    bg: "bg-rose-500/10",
    borderHover: "hover:border-rose-500/40",
  },
};

const YEARS = Object.keys(YEAR_CONFIG);

type Step = "intro" | "name" | "year";

// ── Intro feature pills ────────────────────────────────────────────────────

const FEATURES = [
  {
    icon: BookOpen,
    color: "text-red-400",
    bg: "bg-red-500/10",
    title: "All 4 years of papers",
    sub: "1,200+ past papers across every branch",
  },
  {
    icon: TrendingUp,
    color: "text-rose-400",
    bg: "bg-rose-500/10",
    title: "Track your progress",
    sub: "See which papers you've opened and when",
  },
  {
    icon: Lock,
    color: "text-orange-400",
    bg: "bg-orange-500/10",
    title: "100% private",
    sub: "Everything stays on your device",
  },
];

// ── Modal ──────────────────────────────────────────────────────────────────

type Props = {
  onDone: (profile: UserProfile) => void;
};

function OnboardingModal({ onDone }: Props) {
  const [step, setStep] = useState<Step>("intro");
  const [dir, setDir] = useState<1 | -1>(1); // 1 = forward, -1 = back
  const [name, setName] = useState("");
  const [closing, setClosing] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);

  // Focus name input when step becomes "name"
  useEffect(() => {
    if (step === "name") {
      setTimeout(() => nameRef.current?.focus(), 80);
    }
  }, [step]);

  function goTo(next: Step, direction: 1 | -1 = 1) {
    setDir(direction);
    setStep(next);
  }

  function selectYear(y: string) {
    finish(y);
  }

  function finish(y: string) {
    const profile: UserProfile = { name: name.trim() || "Student", year: y, sem: "" };
    setStoredProfile(profile);
    setClosing(true);
    setTimeout(() => onDone(profile), 220);
  }

  function skip() {
    const profile: UserProfile = { name: "", year: "", sem: "" };
    setStoredProfile(profile);
    setClosing(true);
    setTimeout(() => onDone(profile), 220);
  }

  const slideClass = dir === 1 ? "animate-step-in" : "animate-step-in-back";

  return (
    <div
      className={cn(
        "fixed inset-0 z-[9999] flex items-end justify-center sm:items-center",
        closing ? "animate-onboard-out" : "animate-onboard-in"
      )}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      {/* Sheet */}
      <div className="relative z-10 w-full max-w-sm overflow-hidden rounded-t-2xl sm:rounded-2xl border border-border/60 bg-background shadow-2xl">
        {/* Handle (mobile only) */}
        <div className="mx-auto mt-3 h-1 w-10 rounded-full bg-border/60 sm:hidden" />

        {/* ── Step: Intro ── */}
        {step === "intro" && (
          <div key="intro" className={cn("px-5 pb-6 pt-4", slideClass)}>
            <div className="mb-5 flex flex-col gap-2.5">
              {FEATURES.map((f, i) => (
                <div
                  key={f.title}
                  className="onboard-intro-card flex items-center gap-3 rounded-xl border border-border/50 bg-card/60 px-3.5 py-3"
                  style={{ animationDelay: `${60 + i * 50}ms` }}
                >
                  <div className={cn("flex size-8 shrink-0 items-center justify-center rounded-lg", f.bg)}>
                    <f.icon className={cn("size-4", f.color)} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[13px] font-medium leading-none">{f.title}</p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">{f.sub}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mb-5 onboard-intro-card" style={{ animationDelay: "220ms" }}>
              <h2 className="text-[22px] font-semibold leading-tight tracking-tight">
                Your papers,<br />
                <span className="text-muted-foreground">personalised.</span>
              </h2>
            </div>

            <button
              onClick={() => goTo("name")}
              className="onboard-intro-card group flex w-full items-center justify-center gap-2 rounded-xl bg-foreground px-4 py-3 text-[14px] font-semibold text-background transition-all duration-150 hover:opacity-90 active:scale-[0.98]"
              style={{ animationDelay: "270ms" }}
            >
              Get started
              <ArrowRight className="size-4 transition-transform duration-150 group-hover:translate-x-0.5" />
            </button>

            <button
              onClick={skip}
              className="mt-3 w-full text-center text-[12px] text-muted-foreground/40 transition-colors hover:text-muted-foreground/70"
            >
              Skip
            </button>
          </div>
        )}

        {/* ── Step: Name ── */}
        {step === "name" && (
          <div key="name" className={cn("px-5 pb-6 pt-4", slideClass)}>
            <div className="mb-5 flex items-center gap-3">
              <div className="flex size-9 items-center justify-center rounded-xl bg-red-500/10">
                <GraduationCap className="size-4 text-red-400" />
              </div>
              <div>
                <p className="text-[15px] font-semibold leading-none">What should we call you?</p>
                <p className="mt-1 text-[12px] text-muted-foreground">Just your first name, stored locally</p>
              </div>
            </div>

            <Input
              ref={nameRef}
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && goTo("year")}
              placeholder="e.g. Aryan"
              className="mb-3 h-11 text-[14px]"
              maxLength={30}
            />

            <button
              onClick={() => goTo("year")}
              className="group flex w-full items-center justify-center gap-2 rounded-xl bg-foreground px-4 py-3 text-[14px] font-semibold text-background transition-all duration-150 hover:opacity-90 active:scale-[0.98]"
            >
              Continue
              <ArrowRight className="size-4 transition-transform duration-150 group-hover:translate-x-0.5" />
            </button>

            <button
              onClick={skip}
              className="mt-3 w-full text-center text-[12px] text-muted-foreground/40 transition-colors hover:text-muted-foreground/70"
            >
              Skip
            </button>
          </div>
        )}

        {/* ── Step: Year ── */}
        {step === "year" && (
          <div key="year" className={cn("px-5 pb-6 pt-4", slideClass)}>
            <div className="mb-4 flex items-center gap-3">
              <div className="flex size-9 items-center justify-center rounded-xl bg-rose-500/10">
                <GraduationCap className="size-4 text-rose-400" />
              </div>
              <div>
                <p className="text-[15px] font-semibold leading-none">
                  {name.trim() ? `Hey ${name.trim()}! Which year?` : "Which year are you in?"}
                </p>
                <p className="mt-1 text-[12px] text-muted-foreground">We&apos;ll show your papers up front</p>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              {YEARS.map((y, i) => {
                const cfg = YEAR_CONFIG[y]!;
                return (
                  <button
                    key={y}
                    onClick={() => selectYear(y)}
                    className={cn(
                      "onboard-option group flex items-center gap-3 rounded-xl border border-border/60 bg-card px-4 py-3",
                      "transition-all duration-150 hover:bg-muted/50 active:scale-[0.98]",
                      cfg.borderHover
                    )}
                    style={{ animationDelay: `${60 + i * 40}ms` }}
                  >
                    <div className={cn("flex size-7 shrink-0 items-center justify-center rounded-lg", cfg.bg)}>
                      <span className={cn("text-[11px] font-bold", cfg.color)}>{i + 1}</span>
                    </div>
                    <span className="flex-1 text-left text-[14px] font-medium">{y}</span>
                    <ChevronRight className="size-4 text-muted-foreground/30 transition-transform duration-150 group-hover:translate-x-0.5 group-hover:text-muted-foreground" />
                  </button>
                );
              })}
            </div>

            <button
              onClick={skip}
              className="mt-4 w-full text-center text-[12px] text-muted-foreground/40 transition-colors hover:text-muted-foreground/70"
            >
              Skip for now
            </button>
          </div>
        )}

      </div>
    </div>
  );
}

// ── Public gate ────────────────────────────────────────────────────────────

export function OnboardingGate({ children }: { children: React.ReactNode }) {
  const hydrated = useHydrated();
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    const stored = getStoredProfile();
    if (!stored) {
      const t = setTimeout(() => setShowModal(true), 500);
      return () => clearTimeout(t);
    }
  }, []);

  return (
    <>
      {children}
      {hydrated && showModal &&
        createPortal(<OnboardingModal onDone={() => setShowModal(false)} />, document.body)}
    </>
  );
}
