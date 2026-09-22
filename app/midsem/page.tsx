import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { MidsemLibrary } from "./midsem-library";

export const metadata = { title: "Second-year midsem papers | Papers" };

export default async function MidsemPage({ searchParams }: {
  searchParams: Promise<{ branch?: string }>;
}) {
  const { branch } = await searchParams;
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/50">
        <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6">
          <Link href="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground">
            <ArrowLeft className="size-4" /> Home
          </Link>
          <p className="mt-6 text-xs font-medium uppercase tracking-wider text-muted-foreground">Second year · Semester 3</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Midsem papers</h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            Original papers for CSE and ECE. Open or download for free, with solutions clearly labelled.
          </p>
        </div>
      </header>
      <MidsemLibrary key={branch} initialBranch={branch === "ECE" ? "ECE" : "CSE"} />
    </div>
  );
}
