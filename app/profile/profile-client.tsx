"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, BookOpen, Clock, TrendingUp, Trash2, ChevronRight,
  FileText, Edit2, Check, X, LogOut,
} from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { coerceIsPaid } from "@/lib/supabase/user-profile";
import { Input } from "@/components/ui/input";
import { PaperViewer } from "@/components/pdf-viewer";
import {
  getTrackedPapers, getPapersThisWeek, getTotalTimeSpent,
  getSessionCount, formatDuration, timeAgo, clearAllTracking,
  type TrackedPaper,
} from "@/lib/tracking";
import {
  getStoredProfile, setStoredProfile, type UserProfile,
} from "@/components/onboarding";
import { useHydrated } from "@/lib/use-hydrated";
import { cn } from "@/lib/utils";

// ── Year config (mirrors onboarding) ──────────────────────────────────────

const YEAR_CONFIG: Record<string, { color: string; bg: string }> = {
  "Year 1": { color: "text-red-400",    bg: "bg-red-500/10" },
  "Year 2": { color: "text-orange-400", bg: "bg-orange-500/10" },
  "Year 3": { color: "text-amber-400",  bg: "bg-amber-500/10" },
  "Year 4": { color: "text-rose-400",   bg: "bg-rose-500/10" },
};

const YEAR_SEMS: Record<string, string[]> = {
  "Year 1": ["Semester 1", "Semester 2"],
  "Year 2": ["Semester 3", "Semester 4"],
  "Year 3": ["Semester 5", "Semester 6"],
  "Year 4": ["Semester 7"],
};

// ── Initials avatar ────────────────────────────────────────────────────────

function Avatar({ name, year }: { name: string; year: string }) {
  const initials = name
    ? name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2)
    : "?";
  const cfg = YEAR_CONFIG[year] ?? { color: "text-muted-foreground", bg: "bg-muted" };
  return (
    <div className={cn(
      "flex size-14 items-center justify-center rounded-2xl text-lg font-bold",
      cfg.bg, cfg.color
    )}>
      {initials}
    </div>
  );
}

// ── Stat card ─────────────────────────────────────────────────────────────

function StatCard({
  icon: Icon, label, value, sub, color, delay,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  sub?: string;
  color: "red" | "rose" | "amber";
  delay: number;
}) {
  return (
    <div
      className="profile-stat-card flex flex-col gap-1.5 rounded-xl border border-border/60 bg-card/60 p-4"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className={cn("flex size-7 items-center justify-center rounded-lg", color === "red" ? "bg-red-500/10" : color === "rose" ? "bg-rose-500/10" : "bg-amber-500/10")}>
        <Icon className={cn("size-3.5", color === "red" ? "text-red-400" : color === "rose" ? "text-rose-400" : "text-amber-400")} />
      </div>
      <p className="text-[22px] font-semibold leading-none tracking-tight">{value}</p>
      <p className="text-[12px] font-medium text-foreground/70">{label}</p>
      {sub && <p className="text-[11px] text-muted-foreground/60">{sub}</p>}
    </div>
  );
}

// ── Main ───────────────────────────────────────────────────────────────────

export function ProfileClient() {
  const router = useRouter();
  const { profile: userProfile, refreshProfile, supabase, user } = useAuth();
  const hydrated = useHydrated();
  const [snapshotOverride, setSnapshotOverride] = useState<{
    profile: UserProfile;
    papers: TrackedPaper[];
    timeSpent: number;
    sessionCount: number;
    weekCount: number;
  } | null>(null);

  // Edit name
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState("");

  // Edit year
  const [editingYear, setEditingYear] = useState(false);

  // Clear confirmation
  const [confirmClear, setConfirmClear] = useState(false);
  const [accountMessage, setAccountMessage] = useState<string | null>(null);
  const [accountError, setAccountError] = useState<string | null>(null);
  const [isSavingName, setIsSavingName] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  const snapshot =
    snapshotOverride ??
    (hydrated
      ? {
          profile: {
            name: userProfile?.full_name ?? getStoredProfile()?.name ?? "",
            year: userProfile?.year ?? getStoredProfile()?.year ?? "",
            sem: userProfile?.semester ?? getStoredProfile()?.sem ?? "",
          },
          papers: getTrackedPapers(),
          timeSpent: getTotalTimeSpent(),
          sessionCount: getSessionCount(),
          weekCount: getPapersThisWeek().length,
        }
      : null);

  async function saveName() {
    if (!snapshot) return;
    if (!user?.id) {
      setAccountError("Not signed in.");
      return;
    }

    const updated = { ...snapshot.profile, name: nameInput.trim() };
    setAccountError(null);
    setAccountMessage(null);
    setIsSavingName(true);

    setStoredProfile(updated);
    setSnapshotOverride({ ...snapshot, profile: updated });

    try {
      const { error } = await supabase
        .from("users")
        .update({ full_name: updated.name || null })
        .eq("id", user.id);

      if (error) {
        throw error;
      }

      setEditingName(false);
      setAccountMessage("Profile name updated.");
      await refreshProfile();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to update account.";
      setAccountError(message);
    } finally {
      setIsSavingName(false);
    }
  }

  async function selectYear(year: string) {
    if (!snapshot) return;
    if (!user?.id) {
      setAccountError("Not signed in.");
      return;
    }
    const updated = { ...snapshot.profile, year, sem: "" };
    setAccountError(null);
    setAccountMessage(null);
    setStoredProfile(updated);
    setSnapshotOverride({ ...snapshot, profile: updated });

    try {
      const { error } = await supabase
        .from("users")
        .update({ year, semester: null })
        .eq("id", user.id);

      if (error) {
        throw error;
      }

      setEditingYear(false);
      setAccountMessage("Year updated.");
      await refreshProfile();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to update year.";
      setAccountError(message);
    }
  }

  function handleClear() {
    clearAllTracking();
    localStorage.removeItem("mit-paper-profile");
    setSnapshotOverride({
      profile: { name: "", year: "", sem: "" },
      papers: [],
      timeSpent: 0,
      sessionCount: 0,
      weekCount: 0,
    });
    setConfirmClear(false);
  }

  async function handleSignOut() {
    setAccountError(null);
    setAccountMessage(null);
    setIsSigningOut(true);

    try {
      const { error } = await supabase.auth.signOut();

      if (error) {
        throw error;
      }

      router.push("/auth");
      router.refresh();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to sign out.";
      setAccountError(message);
    } finally {
      setIsSigningOut(false);
    }
  }

  if (!hydrated || !snapshot) {
    return (
      <div className="min-h-screen bg-background">
        <div className="mx-auto max-w-2xl px-6 py-20 text-center">
          <div className="text-sm text-muted-foreground">Loading…</div>
        </div>
      </div>
    );
  }

  const profile = snapshot.profile;
  const papers = snapshot.papers;
  const timeSpent = snapshot.timeSpent;
  const sessionCount = snapshot.sessionCount;
  const weekCount = snapshot.weekCount;
  const recent = papers.slice(0, 10);
  const hasProfile = profile?.year;
  const accountName =
    userProfile?.full_name?.trim() ||
    profile?.name ||
    user?.email?.split("@")[0] ||
    "Anonymous";
  const accountEmail = user?.email ?? "No email found";
  const isPaid = coerceIsPaid(userProfile?.is_paid);

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto max-w-3xl px-4 py-3 sm:px-6">
          <Link
            href="/"
            className="inline-flex size-9 items-center justify-center rounded-full border border-border/60 bg-card/70 text-muted-foreground transition-all duration-150 hover:bg-muted/70 hover:text-foreground active:scale-[0.96]"
            aria-label="Back home"
          >
            <ArrowLeft className="size-4" />
          </Link>
          <h1 className="mt-3 text-[1.45rem] font-semibold tracking-tight">Profile</h1>
          <p className="mt-1 text-[13px] text-muted-foreground">
            Your Papers profile, saved year, and reading progress.
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-6 px-4 py-6 sm:px-6">

        {/* ── Identity ── */}
        <section className="profile-stat-card rounded-[1.3rem] border border-border/60 bg-card/70 p-4 shadow-sm" style={{ animationDelay: "60ms" }}>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <Avatar name={accountName} year={profile?.year ?? ""} />
          <div className="min-w-0 flex-1">
            {editingName ? (
              <div className="flex items-center gap-2">
                <Input
                  autoFocus
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") saveName(); if (e.key === "Escape") setEditingName(false); }}
                  className="h-8 text-[14px]"
                  maxLength={30}
                  placeholder="Your name"
                />
                <button onClick={saveName} disabled={isSavingName} className="text-red-400 hover:text-red-300 transition-colors disabled:opacity-50"><Check className="size-4" /></button>
                <button onClick={() => setEditingName(false)} disabled={isSavingName} className="text-muted-foreground/50 hover:text-muted-foreground transition-colors disabled:opacity-50"><X className="size-4" /></button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <p className="text-[18px] font-semibold leading-none truncate">
                  {accountName}
                </p>
                <button
                  onClick={() => { setNameInput(accountName); setEditingName(true); }}
                  className="text-muted-foreground/30 hover:text-muted-foreground transition-colors"
                >
                  <Edit2 className="size-3.5" />
                </button>
              </div>
            )}
            <p className="mt-1.5 text-[13px] text-muted-foreground">
              {accountEmail}
            </p>
            <p className="mt-1 text-[12px] text-muted-foreground/70">
              {hasProfile ? profile!.year : "No year set"}
            </p>
            <p className="mt-1 text-[12px] text-muted-foreground/70">
              Repeat access: {isPaid ? "Active" : "Locked"}
            </p>
            <button
              onClick={() => setEditingYear(!editingYear)}
              className="mt-1 text-[11px] text-muted-foreground/40 hover:text-muted-foreground transition-colors"
            >
              {editingYear ? "Cancel" : "Change year →"}
            </button>
          </div>
          <button
            onClick={handleSignOut}
            disabled={isSigningOut}
            className="inline-flex items-center gap-2 self-start rounded-full border border-border/60 bg-background/70 px-3 py-2 text-[11px] font-medium text-muted-foreground transition-all duration-150 hover:bg-muted/70 hover:text-foreground active:scale-[0.97] disabled:opacity-60"
          >
            <LogOut className="size-3.5" />
            {isSigningOut ? "Signing out" : "Sign out"}
          </button>
          </div>
          {accountError ? (
            <p className="mt-3 text-[12px] text-red-300">{accountError}</p>
          ) : null}
          {accountMessage ? (
            <p className="mt-3 text-[12px] text-muted-foreground">{accountMessage}</p>
          ) : null}
        </section>

        {/* ── Change year inline ── */}
        {editingYear && (
          <section className="profile-stat-card rounded-[1.3rem] border border-border/60 bg-card/70 p-4 space-y-2 shadow-sm" style={{ animationDelay: "0ms" }}>
            <p className="mb-3 text-[11px] font-medium uppercase tracking-widest text-muted-foreground/60">Select year</p>
            {Object.entries(YEAR_SEMS).map(([year]) => {
              const cfg = YEAR_CONFIG[year]!;
              return (
                <button
                  key={year}
                  onClick={() => selectYear(year)}
                  className={cn(
                    "group flex w-full items-center gap-3 rounded-lg border border-border/50 bg-background px-3 py-2.5 text-left transition-all duration-150 hover:bg-muted/50 active:scale-[0.98]"
                  )}
                >
                  <div className={cn("flex size-6 items-center justify-center rounded-md text-[10px] font-bold", cfg.bg, cfg.color)}>
                    {year.replace("Year ", "")}
                  </div>
                  <span className="flex-1 text-[13px] font-medium">{year}</span>
                  {profile?.year === year && <span className="text-[11px] text-muted-foreground/50">current</span>}
                  <ChevronRight className="size-3.5 text-muted-foreground/30" />
                </button>
              );
            })}
          </section>
        )}

        {/* ── Stats ── */}
        <section>
          <p className="mb-3 px-0.5 text-[11px] font-medium uppercase tracking-widest text-muted-foreground/60">Stats</p>
          <div className="grid gap-3 sm:grid-cols-3">
            <StatCard icon={BookOpen} label="Papers viewed" value={String(papers.length)} sub="unique papers" color="red" delay={100} />
            <StatCard icon={Clock} label="Time on site" value={formatDuration(timeSpent)} sub={`${sessionCount} visit${sessionCount !== 1 ? "s" : ""}`} color="rose" delay={140} />
            <StatCard icon={TrendingUp} label="This week" value={String(weekCount)} sub="papers opened" color="amber" delay={180} />
          </div>
        </section>

        {/* ── Recent papers ── */}
        <section>
          <p className="mb-3 px-0.5 text-[11px] font-medium uppercase tracking-widest text-muted-foreground/60">
            Recent papers {papers.length > 0 && `· ${papers.length}`}
          </p>
          {recent.length === 0 ? (
            <div className="profile-stat-card rounded-xl border border-border/60 bg-card/40 py-10 text-center text-sm text-muted-foreground" style={{ animationDelay: "200ms" }}>
              No papers opened yet — start browsing to track your history
            </div>
          ) : (
            <div className="profile-stat-card stagger-list overflow-hidden rounded-[1.3rem] border border-border/60 bg-card/70 shadow-sm" style={{ animationDelay: "200ms" }}>
              {recent.map((p) => (
                <PaperViewer key={p.href} href={p.href} name={p.name}>
                  <div className="group flex cursor-pointer items-center gap-3 px-4 py-3.5 transition-all duration-150 hover:bg-muted/45 active:scale-[0.997]">
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-muted/70">
                      <FileText className="size-4 text-muted-foreground" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium leading-none">{p.name}</p>
                      <p className="mt-0.5 text-[11px] text-muted-foreground">
                        {p.count > 1 ? `opened ${p.count}×` : "opened once"} · {timeAgo(p.lastViewedAt)}
                      </p>
                    </div>
                    <span className="shrink-0 text-[11px] text-muted-foreground/45 transition-colors group-hover:text-muted-foreground">Open</span>
                  </div>
                </PaperViewer>
              ))}
            </div>
          )}
        </section>

        {/* ── Danger zone ── */}
        <section className="pb-8">
          <p className="mb-3 px-0.5 text-[11px] font-medium uppercase tracking-widest text-muted-foreground/60">Data</p>
          <div className="rounded-[1.3rem] border border-border/60 bg-card/60 p-4 shadow-sm">
            <p className="text-[13px] text-muted-foreground mb-3">
              Clear your saved progress here if you want to start fresh on this device.
            </p>
            {!confirmClear ? (
              <button
                onClick={() => setConfirmClear(true)}
                className="flex items-center gap-2 rounded-lg border border-border/60 px-3 py-2 text-[13px] text-muted-foreground/70 transition-all duration-150 hover:border-destructive/50 hover:text-destructive active:scale-[0.97]"
              >
                <Trash2 className="size-3.5" />
                Clear all data
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <p className="text-[13px] text-muted-foreground mr-1">Are you sure?</p>
                <button
                  onClick={handleClear}
                  className="rounded-lg bg-destructive/10 px-3 py-1.5 text-[13px] font-medium text-destructive transition-colors hover:bg-destructive/20 active:scale-[0.97]"
                >
                  Yes, clear
                </button>
                <button
                  onClick={() => setConfirmClear(false)}
                  className="rounded-lg px-3 py-1.5 text-[13px] text-muted-foreground transition-colors hover:bg-muted"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        </section>

      </main>
    </div>
  );
}
