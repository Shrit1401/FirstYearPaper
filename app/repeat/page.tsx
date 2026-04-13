import type { Metadata } from "next";
import { Suspense } from "react";
import { RepeatClient } from "./repeat-client";

export const metadata: Metadata = {
  title: "Repeat Finder",
  description:
    "Citation-grounded RAG tutor over the MIT Bengaluru paper corpus with repeat-question analysis and follow-up chat.",
};

export default function RepeatPage() {
  return (
    <Suspense
      fallback={
        <div className="repeat-shell flex min-h-screen items-center justify-center bg-background px-6">
          <p className="text-sm text-muted-foreground">Loading Repeat…</p>
        </div>
      }
    >
      <RepeatClient />
    </Suspense>
  );
}
