import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRight, BookOpen, ChevronRight, Clock3, FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PaperViewer } from "@/components/pdf-viewer";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

// ── Shared layout shell ────────────────────────────────────────────────────

export type BreadcrumbCrumb = { label: string; href?: string };

export function PageShell({
  backHref,
  backLabel,
  title,
  subtitle,
  crumbs,
  children,
}: {
  backHref: string;
  backLabel: string;
  title: string;
  subtitle?: string;
  crumbs?: BreadcrumbCrumb[];
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto max-w-3xl px-4 py-3 sm:px-6">
          {crumbs && crumbs.length > 0 && (
            <div className="breadcrumb-bar mb-3">
              <Breadcrumb className="overflow-hidden">
                <BreadcrumbList className="flex-nowrap overflow-x-auto whitespace-nowrap rounded-full border border-border/50 bg-card/55 px-2.5 py-1.5 text-[11px]">
                  <BreadcrumbItem>
                    <BreadcrumbLink asChild>
                      <Link prefetch={false}
                        href="/"
                        className="text-muted-foreground/55 transition-colors duration-100 hover:text-foreground"
                      >
                        Home
                      </Link>
                    </BreadcrumbLink>
                  </BreadcrumbItem>
                  {crumbs.map((c, i) => (
                    <span key={i} className="contents">
                      <BreadcrumbSeparator className="text-muted-foreground/25 [&>svg]:size-3" />
                      <BreadcrumbItem>
                        {i === crumbs.length - 1 ? (
                          <BreadcrumbPage className="font-medium text-foreground">
                            {c.label}
                          </BreadcrumbPage>
                        ) : (
                          <BreadcrumbLink asChild>
                            <Link prefetch={false}
                              href={c.href!}
                              className="text-muted-foreground/55 transition-colors duration-100 hover:text-foreground"
                            >
                              {c.label}
                            </Link>
                          </BreadcrumbLink>
                        )}
                      </BreadcrumbItem>
                    </span>
                  ))}
                </BreadcrumbList>
              </Breadcrumb>
            </div>
          )}

          <div className="flex items-center justify-between gap-3">
            <Button
              variant="ghost"
              size="sm"
              asChild
              className="h-9 rounded-full border border-border/60 bg-card/70 px-3"
            >
              <Link prefetch={false} href={backHref}>← {backLabel}</Link>
            </Button>
          </div>
          <h1 className="mt-3 text-[1.45rem] font-semibold tracking-tight">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-1 text-[13px] text-muted-foreground">{subtitle}</p>
          )}
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-6 sm:px-6">{children}</main>
    </div>
  );
}

export function RowList({
  items,
}: {
  items: {
    label: string;
    meta?: string;
    href?: string;
    description?: string;
    processing?: boolean;
  }[];
}) {
  return (
    <div className="stagger-list overflow-hidden rounded-[1.3rem] border border-border/60 bg-card/70 shadow-sm">
      {items.map(({ label, meta, href, description, processing }) => {
        const content = (
          <>
            <div className="flex min-w-0 items-center gap-3">
              {processing ? (
                <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-300">
                  <Clock3 className="size-4" />
                </span>
              ) : null}
              <div className="min-w-0">
                <span className="block truncate text-sm font-medium">
                  {label}
                </span>
                {description ? (
                  <span className="mt-1 block truncate text-[12px] text-muted-foreground">
                    {description}
                  </span>
                ) : null}
              </div>
            </div>
            <div className="ml-3 flex shrink-0 items-center gap-3">
              {meta && (
                <span
                  className={`rounded-full border px-2 py-1 text-[11px] ${processing ? "border-amber-500/25 bg-amber-500/10 text-amber-200" : "border-border/50 bg-background/70 text-muted-foreground"}`}
                >
                  {meta}
                </span>
              )}
              {!processing ? (
                <ChevronRight className="size-4 text-muted-foreground/40 transition-transform duration-150 group-hover:translate-x-0.5 group-hover:text-muted-foreground" />
              ) : null}
            </div>
          </>
        );

        if (processing || !href) {
          return (
            <div
              key={`${label}-${meta ?? "status"}`}
              aria-disabled="true"
              className="flex items-center justify-between bg-amber-500/[0.045] px-4 py-4"
            >
              {content}
            </div>
          );
        }

        return (
          <Link prefetch={false}
            key={href}
            href={href}
            className="group flex items-center justify-between px-4 py-4 transition-[background-color,transform] duration-150 hover:bg-muted/45 active:scale-[0.997]"
          >
            {content}
          </Link>
        );
      })}
    </div>
  );
}

export function PaperRow({
  paper,
}: {
  paper: {
    name: string;
    href: string;
    editableId?: string;
    verified?: boolean;
    community?: boolean;
  };
}) {
  return (
    <PaperViewer
      href={paper.href}
      name={paper.name}
      editableId={paper.editableId}
    >
      <div className="group flex cursor-pointer items-center gap-3 px-4 py-3.5 transition-[background-color,color,border-color,opacity,transform] duration-150 hover:bg-muted/45 active:scale-[0.997]">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-muted/70">
          <FileText className="size-4 text-muted-foreground" />
        </div>
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <span className="truncate text-sm font-medium leading-none">
            {paper.name}
          </span>
          {paper.verified ? (
            <Badge
              variant="outline"
              className="shrink-0 rounded-full border-emerald-500/30 bg-emerald-500/10 text-[10px] text-emerald-300"
            >
              Archive copy
            </Badge>
          ) : paper.community ? (
            <Badge
              variant="outline"
              className="shrink-0 rounded-full border-border/60 bg-muted/40 text-[10px] text-muted-foreground"
            >
              Student scan
            </Badge>
          ) : null}
        </div>
        <span className="shrink-0 text-[11px] text-muted-foreground/45 transition-colors duration-150 group-hover:text-muted-foreground">
          Open
        </span>
      </div>
    </PaperViewer>
  );
}

export function MidsemCollectionCard() {
  return (
    <Link prefetch={false}
      href="/midsem"
      className="group block rounded-[1.3rem] border border-amber-500/30 bg-amber-500/[0.075] p-5 transition-colors hover:bg-amber-500/10 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-amber-400 sm:p-6"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <span className="text-[11px] font-medium uppercase tracking-wider text-amber-200">
            CSE and ECE · Semester 3 · Free
          </span>
          <h2 className="mt-3 text-xl font-semibold tracking-tight">
            Midsem papers
          </h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            25 exam sets, with original question papers and available solutions.
          </p>
          <p className="mt-2 text-xs leading-5 text-muted-foreground">
            Papers, combined answers and solutions-only files clearly labelled.
          </p>
        </div>
        <BookOpen className="mt-1 size-5 shrink-0 text-amber-200" />
      </div>
      <div className="mt-5 flex items-center justify-between gap-3 border-t border-amber-500/15 pt-4">
        <span className="text-xs text-muted-foreground">No account needed</span>
        <span className="inline-flex items-center gap-2 rounded-full bg-amber-400 px-3.5 py-2 text-xs font-semibold text-amber-950">
          Open papers <ArrowRight className="size-3.5" />
        </span>
      </div>
    </Link>
  );
}
