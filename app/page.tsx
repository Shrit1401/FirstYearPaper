import Link from "next/link";
import { getStreams } from "@/lib/papers";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileStack, ChevronRight } from "lucide-react";

const DRIVE_URL =
  "https://drive.google.com/drive/folders/1dURixLKCVwU-1MsvzgRpjdmG6b9-5L0W?usp=sharing";

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
      <main className="relative mx-auto max-w-2xl px-6 py-12 sm:py-16">
        <section className="mb-10 text-center">
          <span className="inline-flex items-center rounded-full border border-border/60 bg-muted/40 px-3 py-1 text-xs font-medium text-muted-foreground">
            First year · MIT Bengaluru
          </span>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl sm:leading-tight">
            First year past papers in one place
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Pick your stream below to see subjects and papers.
          </p>
        </section>
        <section className="mb-8">
          <h3 className="mb-4 text-sm font-medium text-foreground">
            Pick your stream
          </h3>
          <div className="grid gap-3">
            {streams.map((name) => (
              <Card
                key={name}
                className="group border-border/60 transition-all duration-200 hover:border-primary/50 hover:bg-card hover:shadow-md"
              >
                <Link
                  href={`/browse/${encodeURIComponent(name)}`}
                  className="block"
                >
                  <CardHeader className="flex flex-row items-center justify-between py-5">
                    <CardTitle className="text-lg font-medium tracking-tight">
                      {name}
                    </CardTitle>
                    <ChevronRight className="size-5 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" />
                  </CardHeader>
                </Link>
              </Card>
            ))}
          </div>
        </section>
        <section className="mb-6">
          <h3 className="mb-3 text-sm font-medium text-foreground">Source</h3>
          <Card className="border-border/60 bg-muted/30">
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>All resources listed here are part of Manipal OSF.</p>
              <p>
                They are provided in relation to this drive link:{" "}
                <a
                  href={DRIVE_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline-offset-2 hover:text-foreground hover:underline"
                >
                  Open Google Drive folder
                </a>
                .
              </p>
            </CardContent>
          </Card>
        </section>
        <p className="text-center">
          <Link
            href="/browse"
            className="text-sm text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
          >
            Browse all with search →
          </Link>
        </p>
      </main>
    </div>
  );
}
