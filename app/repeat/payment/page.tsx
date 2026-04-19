"use client";

import { useState, useRef, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, LoaderCircle, Play, ShieldCheck, Sparkles, X } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const TRANSACTION_ID_REGEX = /^[A-Za-z0-9]{12}$/;

export default function RepeatPaymentPage() {
  const router = useRouter();
  const { refreshProfile, session, user } = useAuth();
  const [transactionId, setTransactionId] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submitPayment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);

    if (!session?.access_token) {
      setError("Sign in first to submit payment.");
      return;
    }

    if (!proofFile) {
      setError("Upload payment proof screenshot.");
      return;
    }
    const normalized = transactionId.trim();
    const normalizedPhone = phoneNumber.trim();
    if (normalized && !TRANSACTION_ID_REGEX.test(normalized)) {
      setError("Transaction ID must be exactly 12 letters and numbers.");
      return;
    }
    if (!/^\+?[0-9]{10,15}$/.test(normalizedPhone)) {
      setError("Enter a valid phone number with 10 to 15 digits.");
      return;
    }

    setSubmitting(true);

    try {
      const formData = new FormData();
      formData.set("proof", proofFile);
      if (normalized) {
        formData.set("transactionId", normalized);
      }
      formData.set("phoneNumber", normalizedPhone);
      const response = await fetch("/api/payment/transactions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        body: formData,
      });

      const payload = (await response.json().catch(() => ({}))) as {
        error?: string;
        message?: string;
      };

      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to submit payment.");
      }

      setTransactionId("");
      setPhoneNumber("");
      setProofFile(null);
      setMessage(payload.message ?? "Payment submitted.");
      await refreshProfile();
      const params = new URLSearchParams();
      if (normalized) params.set("transactionId", normalized);
      params.set("phone", normalizedPhone);
      if (!user) {
        setError("Sign in first to submit payment.");
        return;
      }
      if (user.email) params.set("email", user.email);
      const fullName =
        typeof user.user_metadata?.full_name === "string"
          ? user.user_metadata.full_name.trim()
          : "";
      if (fullName) params.set("name", fullName);
      router.push(`/repeat/payment/thank-you?${params.toString()}`);
      router.refresh();
    } catch (paymentError) {
      setError(
        paymentError instanceof Error
          ? paymentError.message
          : "Failed to submit payment.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (!user) {
    return (
      <div className="min-h-dvh bg-background px-4 py-6 sm:px-6 sm:py-8">
        <div className="mx-auto w-full max-w-lg rounded-[1.75rem] border border-border/60 bg-card/70 p-6 shadow-sm backdrop-blur">
          <Link
            href="/repeat"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="size-4" />
            Back to Repeat
          </Link>
          <h1 className="mt-5 text-2xl font-semibold tracking-tight">
            Sign in to continue payment
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            You need to sign in before submitting your transaction ID.
          </p>
          <Button asChild className="mt-5 rounded-full px-5 active:scale-[0.98]">
            <Link href="/auth">Go to sign in</Link>
          </Button>
        </div>
      </div>
    );
  }

  const previewRef = useRef<HTMLVideoElement>(null);
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <div className="min-h-dvh bg-[radial-gradient(ellipse_at_top,rgba(255,255,255,0.08),transparent_45%),#020202] px-4 py-6 sm:px-6 sm:py-8">
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
          onClick={() => setModalOpen(false)}
        >
          <div
            className="relative w-full max-w-2xl px-4"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setModalOpen(false)}
              className="absolute -top-10 right-4 flex size-8 items-center justify-center rounded-full bg-white/10 text-zinc-300 transition hover:bg-white/20"
            >
              <X className="size-4" />
            </button>
            <video
              src="/vid.mp4"
              controls
              autoPlay
              className="w-full rounded-2xl border border-white/10 shadow-2xl"
            />
          </div>
        </div>
      )}

      <div className="mx-auto w-full max-w-6xl">
        <Link
          href="/repeat"
          className="mb-4 inline-flex items-center gap-2 text-sm text-zinc-400 transition-colors hover:text-zinc-100"
        >
          <ArrowLeft className="size-4" />
          Back to Repeat
        </Link>

        <div className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr] lg:gap-6">
          <section className="rounded-[1.85rem] border border-white/10 bg-[#0b0b0c]/90 p-4 shadow-[0_24px_70px_rgba(0,0,0,0.45)] backdrop-blur-xl sm:p-5">
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-100">
              Pay Rs. 39 for Repeat
            </h1>
            <p className="mt-1.5 text-sm text-zinc-400">
              Access is valid until end-sem exams end.
            </p>
            <div
              className="group relative mt-4 cursor-pointer overflow-hidden rounded-2xl border border-white/10 bg-black"
              onClick={() => setModalOpen(true)}
            >
              <video
                ref={previewRef}
                src="/vid.mp4"
                autoPlay
                muted
                loop
                playsInline
                className="h-auto w-full object-contain lg:max-h-[560px]"
              />
              <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                <div className="flex size-14 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm ring-1 ring-white/30">
                  <Play className="size-6 fill-white text-white" />
                </div>
              </div>
              <div className="absolute bottom-3 right-3 rounded-full bg-black/60 px-2.5 py-1 text-[11px] font-medium text-zinc-300 backdrop-blur-sm">
                Click to watch
              </div>
            </div>
          </section>

          <section className="rounded-[1.85rem] border border-white/10 bg-[#0b0b0c]/90 p-4 shadow-[0_24px_70px_rgba(0,0,0,0.45)] backdrop-blur-xl sm:p-5">
            <h2 className="text-xl font-semibold tracking-tight text-zinc-100">
              Upload payment proof
            </h2>
            <p className="mt-1.5 text-sm text-zinc-400">
              Add screenshot from your UPI app. AI verifies it and access unlocks instantly.
            </p>

            {submitting ? (
              <div className="mt-4 rounded-2xl border border-emerald-300/30 bg-emerald-400/10 p-3.5">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 inline-flex size-8 items-center justify-center rounded-full bg-emerald-300/20 text-emerald-200">
                    <LoaderCircle className="size-4 animate-spin" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-emerald-100">
                      Payment received. Verifying now
                    </p>
                    <p className="mt-1 text-xs text-emerald-200/90">
                      Running AI checks for amount, payee, and screenshot authenticity.
                    </p>
                    <div className="mt-2 flex items-center gap-3 text-[11px] text-emerald-100/90">
                      <span className="inline-flex items-center gap-1">
                        <ShieldCheck className="size-3.5" />
                        Secure review
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Sparkles className="size-3.5" />
                        Instant unlock
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}

            <form onSubmit={submitPayment} className="mt-5 space-y-3">
              <Input
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/webp"
                onChange={(event) => setProofFile(event.target.files?.[0] ?? null)}
                className="h-11 rounded-xl border-white/15 bg-white/5 text-sm text-zinc-100 file:mr-4 file:rounded-md file:border-0 file:bg-zinc-100 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-zinc-900"
                disabled={submitting}
                required
              />
              <div className="rounded-xl border border-white/10 bg-white/4 px-3 py-2.5 text-xs text-zinc-400">
                {proofFile ? proofFile.name : "No payment proof selected yet."}
              </div>
              <Input
                type="text"
                value={transactionId}
                onChange={(event) =>
                  setTransactionId(event.target.value.replace(/[^a-zA-Z0-9]/g, ""))
                }
                placeholder="Transaction ID (optional)"
                className="h-11 rounded-xl border-white/15 bg-white/5 text-sm text-zinc-100 placeholder:text-zinc-500"
                maxLength={12}
                pattern="[A-Za-z0-9]{12}"
                disabled={submitting}
              />
              <Input
                type="tel"
                value={phoneNumber}
                onChange={(event) =>
                  setPhoneNumber(event.target.value.replace(/[^0-9+]/g, ""))
                }
                placeholder="Phone number (required)"
                className="h-11 rounded-xl border-white/15 bg-white/5 text-sm text-zinc-100 placeholder:text-zinc-500"
                maxLength={16}
                disabled={submitting}
                required
              />
              <Button
                type="submit"
                className="h-11 w-full rounded-full bg-zinc-100 px-5 text-zinc-900 transition-opacity hover:opacity-90 active:scale-[0.98]"
                disabled={submitting}
              >
                {submitting ? "Processing payment..." : "Submit proof"}
              </Button>
            </form>
            <p className="mt-2 text-xs text-zinc-500">
              Fake or edited proofs will be rejected and access will be removed.
            </p>

            {error ? <p className="mt-3 text-xs text-red-300">{error}</p> : null}
            {message ? <p className="mt-3 text-xs text-emerald-300">{message}</p> : null}
          </section>
        </div>
      </div>
    </div>
  );
}
