"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Search, ChevronRight, FileText } from "lucide-react";
import type { FlattenedPaper } from "@/lib/papers";

type Props = {
  streams: string[];
  papers: FlattenedPaper[];
};

export function BrowseClient({ streams, papers }: Props) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return papers.filter(
      (p) =>
        p.paperName.toLowerCase().includes(q) ||
        p.subjectName.toLowerCase().includes(q) ||
        p.streamName.toLowerCase().includes(q)
    );
  }, [query, papers]);

  const showSearchResults = query.trim().length > 0;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/50 bg-background/80 backdrop-blur-sm">
        <div className="mx-auto max-w-2xl px-6 py-6">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/">← Home</Link>
          </Button>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
            Browse papers
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            First year question papers · search or pick a stream
          </p>
        </div>
      </header>
      <main className="mx-auto max-w-2xl px-6 py-8">
        <div className="relative mb-8">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search by paper name, subject, or stream..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="h-11 pl-10 pr-4"
            autoComplete="off"
          />
        </div>

        {showSearchResults ? (
          <section>
            <h2 className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Results {filtered.length > 0 && `(${filtered.length})`}
            </h2>
            {filtered.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No papers match &quot;{query}&quot;
              </p>
            ) : (
              <ul className="grid gap-2">
                {filtered.map((p) => (
                  <li key={p.href}>
                    <Card className="transition-colors hover:border-primary/30 hover:bg-card/80">
                      <a
                        href={p.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block"
                      >
                        <CardHeader className="flex flex-row items-center gap-3 py-3">
                          <FileText className="size-4 shrink-0 text-muted-foreground" />
                          <div className="min-w-0 flex-1">
                            <CardTitle className="truncate text-sm font-medium">
                              {p.paperName}
                            </CardTitle>
                            <p className="truncate text-xs text-muted-foreground">
                              {p.streamName} · {p.subjectName}
                            </p>
                          </div>
                          <span className="shrink-0 text-muted-foreground">↗</span>
                        </CardHeader>
                      </a>
                    </Card>
                  </li>
                ))}
              </ul>
            )}
          </section>
        ) : (
          <section>
            <h2 className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Streams
            </h2>
            <div className="grid gap-2">
              {streams.map((name) => (
                <Card
                  key={name}
                  className="transition-colors hover:border-primary/30 hover:bg-card/80"
                >
                  <Link href={`/browse/${encodeURIComponent(name)}`}>
                    <CardHeader className="flex flex-row items-center justify-between py-4">
                      <CardTitle className="text-base font-medium tracking-tight">
                        {name}
                      </CardTitle>
                      <ChevronRight className="size-4 text-muted-foreground" />
                    </CardHeader>
                  </Link>
                </Card>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
