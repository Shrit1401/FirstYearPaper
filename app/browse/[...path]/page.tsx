import Link from "next/link";
import { getStreamTree, getStreams, groupPapersByYear } from "@/lib/papers";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type Props = { params: Promise<{ path?: string[] | string }> };

function normalizePath(pathParam: string[] | string | undefined): string[] {
  if (pathParam == null) return [];
  const raw = Array.isArray(pathParam) ? pathParam : [pathParam];
  const segments = raw.flatMap((p) => {
    const s = typeof p === "string" ? p : String(p);
    return s.includes("/") ? s.split("/").filter(Boolean) : [s];
  });
  return segments.filter(Boolean).map((seg) => decodeURIComponent(seg));
}

export const dynamic = "force-dynamic";

export default async function BrowsePage({ params }: Props) {
  const raw = await params;
  const pathSegments = normalizePath(raw.path);
  if (pathSegments.length === 0) {
    const streams = getStreams();
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b border-border/50 bg-background/80 backdrop-blur-sm">
          <div className="mx-auto max-w-2xl px-6 py-8">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/">← Home</Link>
            </Button>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
              Browse
            </h1>
            <p className="mt-0.5 text-sm text-muted-foreground">
              First year question papers
            </p>
          </div>
        </header>
        <main className="mx-auto max-w-2xl px-6 py-12">
          <div className="grid gap-3">
            {streams.map((name) => (
              <Card
                key={name}
                className="transition-colors hover:border-primary/30 hover:bg-card/80"
              >
                <Link href={`/browse/${encodeURIComponent(name)}`}>
                  <CardHeader className="flex flex-row items-center justify-between py-4">
                    <CardTitle className="text-base font-medium">
                      {name}
                    </CardTitle>
                    <span className="text-muted-foreground">→</span>
                  </CardHeader>
                </Link>
              </Card>
            ))}
          </div>
        </main>
      </div>
    );
  }

  const streamName = pathSegments[0];
  const stream = getStreamTree(streamName);
  if (!stream) notFound();

  if (pathSegments.length === 1) {
    const midsem = stream.subjects.filter((s) =>
      s.name.toLowerCase().includes("midsem")
    );
    const endsem = stream.subjects.filter((s) =>
      s.name.toLowerCase().includes("endsem")
    );
    const other = stream.subjects.filter(
      (s) =>
        !s.name.toLowerCase().includes("midsem") &&
        !s.name.toLowerCase().includes("endsem")
    );

    const renderSubject = (s: (typeof stream.subjects)[0]) => (
      <Card
        key={s.path}
        className="transition-colors hover:border-primary/30 hover:bg-card/80"
      >
        <Link
          href={`/browse/${[streamName, ...s.path.split("/")].map(encodeURIComponent).join("/")}`}
        >
          <CardHeader className="flex flex-row items-center justify-between py-4">
            <CardTitle className="text-base font-medium">{s.name}</CardTitle>
            <CardDescription>
              {s.papers.length} paper{s.papers.length !== 1 ? "s" : ""}
            </CardDescription>
          </CardHeader>
        </Link>
      </Card>
    );

    return (
      <div className="min-h-screen bg-background">
        <header className="border-b border-border/50 bg-background/80 backdrop-blur-sm">
          <div className="mx-auto max-w-2xl px-6 py-8">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/">← Home</Link>
            </Button>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
              {stream.name}
            </h1>
          </div>
        </header>
        <main className="mx-auto max-w-2xl px-6 py-12">
          <div className="flex flex-col gap-10">
            {midsem.length > 0 && (
              <section>
                <h2 className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Midsem
                </h2>
                <div className="grid gap-3">{midsem.map(renderSubject)}</div>
              </section>
            )}
            {endsem.length > 0 && (
              <section>
                <h2 className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Endsem
                </h2>
                <div className="grid gap-3">{endsem.map(renderSubject)}</div>
              </section>
            )}
            {other.length > 0 && (
              <section>
                <h2 className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Other
                </h2>
                <div className="grid gap-3">{other.map(renderSubject)}</div>
              </section>
            )}
          </div>
        </main>
      </div>
    );
  }

  const subjectPath = pathSegments.slice(1).join("/");
  const subject = stream.subjects.find((s) => s.path === subjectPath);
  if (!subject) notFound();

  const byYear = groupPapersByYear(subject.papers);
  const years = Array.from(byYear.keys()).filter((y) => y > 0).sort((a, b) => b - a);
  const uncategorized = byYear.get(0) ?? [];

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/50 bg-background/80 backdrop-blur-sm">
        <div className="mx-auto max-w-2xl px-6 py-8">
          <Button variant="ghost" size="sm" asChild>
            <Link href={`/browse/${encodeURIComponent(streamName)}`}>
              ← {stream.name}
            </Link>
          </Button>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
            {subject.name}
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {subject.papers.length} paper{subject.papers.length !== 1 ? "s" : ""} · by year
          </p>
        </div>
      </header>
      <main className="mx-auto max-w-2xl px-6 py-12">
        <div className="flex flex-col gap-10">
          {years.map((year) => (
            <section key={year}>
              <h2 className="mb-3 flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                <span>{year}</span>
                <Badge variant="secondary" className="text-[10px] font-normal">
                  {byYear.get(year)!.length}
                </Badge>
              </h2>
              <ul className="grid gap-2">
                {(byYear.get(year) ?? []).map((paper) => (
                  <li key={paper.href}>
                    <Card className="transition-colors hover:border-primary/30 hover:bg-card/80">
                      <a
                        href={paper.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block"
                      >
                        <CardHeader className="flex flex-row items-center gap-3 py-3">
                          <span className="text-[10px] font-medium uppercase text-muted-foreground">
                            PDF
                          </span>
                          <CardTitle className="min-w-0 flex-1 truncate text-sm font-medium">
                            {paper.name.replace(/\.pdf$/i, "")}
                          </CardTitle>
                          <span className="shrink-0 text-muted-foreground">↗</span>
                        </CardHeader>
                      </a>
                    </Card>
                  </li>
                ))}
              </ul>
            </section>
          ))}
          {uncategorized.length > 0 && (
            <section>
              <h2 className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Other
              </h2>
              <ul className="grid gap-2">
                {uncategorized.map((paper) => (
                  <li key={paper.href}>
                    <Card className="transition-colors hover:border-primary/30 hover:bg-card/80">
                      <a
                        href={paper.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block"
                      >
                        <CardHeader className="flex flex-row items-center gap-3 py-3">
                          <span className="text-[10px] font-medium uppercase text-muted-foreground">
                            PDF
                          </span>
                          <CardTitle className="min-w-0 flex-1 truncate text-sm font-medium">
                            {paper.name.replace(/\.pdf$/i, "")}
                          </CardTitle>
                          <span className="shrink-0 text-muted-foreground">↗</span>
                        </CardHeader>
                      </a>
                    </Card>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </main>
    </div>
  );
}
