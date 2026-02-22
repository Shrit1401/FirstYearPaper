import Link from "next/link";
import { getStreams } from "@/lib/papers";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { FileStack, ChevronRight } from "lucide-react";

export default function Home() {
  const streams = getStreams();
  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)`,
          backgroundSize: "32px 32px",
        }}
      />
      <header className="relative border-b border-border/40 bg-background/70 backdrop-blur-md">
        <div className="mx-auto max-w-2xl px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <FileStack className="size-4" strokeWidth={1.75} />
            </div>
            <div>
              <h1 className="text-lg font-semibold tracking-tight text-foreground">
                Question Papers
              </h1>
              <p className="text-xs text-muted-foreground">
                MIT Bengaluru · First year · Mid-sem & End-sem
              </p>
            </div>
          </div>
        </div>
      </header>
      <main className="relative mx-auto max-w-2xl px-6 py-20 sm:py-28">
        <section className="mb-20 text-center">
          <span className="inline-flex items-center rounded-full border border-border/60 bg-muted/40 px-3 py-1 text-xs font-medium text-muted-foreground">
            First year · MIT Bengaluru
          </span>
          <h2 className="mt-6 text-4xl font-semibold tracking-tight text-foreground sm:text-5xl sm:leading-[1.1]">
            First year past papers in one place
          </h2>
          <p className="mx-auto mt-4 max-w-sm text-base text-muted-foreground">
            Browse and open PDFs by stream. No sign-in, no fuss.
          </p>
          <Button
            asChild
            size="lg"
            className="mt-10 rounded-lg px-8 shadow-lg shadow-primary/20 transition-all hover:shadow-primary/30"
          >
            <Link href="/browse" className="gap-2">
              Browse papers
              <ChevronRight className="size-4" strokeWidth={2} />
            </Link>
          </Button>
        </section>
        <section>
          <p className="mb-4 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Streams
          </p>
          <div className="grid gap-2">
            {streams.map((name) => (
              <Card
                key={name}
                className="group border-border/60 transition-all duration-200 hover:border-primary/40 hover:bg-card/90 hover:shadow-sm"
              >
                <Link href={`/browse/${encodeURIComponent(name)}`}>
                  <CardHeader className="flex flex-row items-center justify-between py-4">
                    <CardTitle className="text-base font-medium tracking-tight">
                      {name}
                    </CardTitle>
                    <ChevronRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" />
                  </CardHeader>
                </Link>
              </Card>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
