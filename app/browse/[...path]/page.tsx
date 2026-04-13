import Link from "next/link";
import {
  getYears,
  getSemesters,
  getBranches,
  getExamTypes,
  getSubjectsList,
  getStreamTree,
  getStreams,
  groupPapersByYear,
} from "@/lib/papers";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Brain, ChevronRight, FileText } from "lucide-react";
import { PaperViewer } from "@/components/pdf-viewer";
import { Button } from "@/components/ui/button";
import { RepeatPromoCard } from "@/components/repeat-promo";
import { buildRepeatHref } from "@/lib/repeat-links";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import type { ReactNode } from "react";

type Props = { params: Promise<{ path?: string[] | string }> };

function normalizePath(raw: string[] | string | undefined): string[] {
  if (raw == null) return [];
  const arr = Array.isArray(raw) ? raw : [raw];
  return arr
    .flatMap((p) =>
      typeof p === "string" && p.includes("/") ? p.split("/") : [p],
    )
    .filter(Boolean)
    .map((s) => decodeURIComponent(s));
}

export const dynamic = "force-dynamic";

// ── Shared layout shell ────────────────────────────────────────────────────

type BreadcrumbCrumb = { label: string; href?: string };

function PageShell({
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
                      <Link
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
                            <Link
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
              <Link href={backHref}>← {backLabel}</Link>
            </Button>
            <Link
              href="/repeat"
              className="inline-flex h-9 items-center gap-1.5 rounded-full border border-border/60 bg-card/70 px-3 text-[12px] font-medium text-muted-foreground transition-all duration-150 hover:bg-muted/70 hover:text-foreground active:scale-[0.97]"
            >
              <Brain className="size-3.5" />
              Repeat
            </Link>
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

function RowList({
  items,
}: {
  items: { label: string; meta?: string; href: string }[];
}) {
  return (
    <div className="stagger-list overflow-hidden rounded-[1.3rem] border border-border/60 bg-card/70 shadow-sm">
      {items.map(({ label, meta, href }) => (
        <Link
          key={href}
          href={href}
          className="group flex items-center justify-between px-4 py-4 transition-all duration-150 hover:bg-muted/45 active:scale-[0.997]"
        >
          <span className="min-w-0 truncate text-sm font-medium">{label}</span>
          <div className="ml-3 flex items-center gap-3">
            {meta && (
              <span className="rounded-full border border-border/50 bg-background/70 px-2 py-1 text-[11px] text-muted-foreground">
                {meta}
              </span>
            )}
            <ChevronRight className="size-4 text-muted-foreground/40 transition-transform duration-150 group-hover:translate-x-0.5 group-hover:text-muted-foreground" />
          </div>
        </Link>
      ))}
    </div>
  );
}

function PaperRow({
  paper,
}: {
  paper: { name: string; href: string; verified?: boolean };
}) {
  return (
    <PaperViewer href={paper.href} name={paper.name}>
      <div className="group flex cursor-pointer items-center gap-3 px-4 py-3.5 transition-all duration-150 hover:bg-muted/45 active:scale-[0.997]">
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
              Verified
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

function RepeatInlinePromo({
  title,
  body,
  href,
}: {
  title: string;
  body: string;
  href: string;
}) {
  return (
    <RepeatPromoCard
      title={title}
      body={body}
      href={href}
      cta="Open Repeat"
      meta="Questions, topics, and revision help"
      compact
    />
  );
}

// ── Route handler ──────────────────────────────────────────────────────────

export default async function BrowsePage({ params }: Props) {
  const segs = normalizePath((await params).path);
  const years = getYears();
  const streams = getStreams();

  // ── 0 segments: Year list ──────────────────────────────────────────────
  if (segs.length === 0) {
    return (
      <PageShell
        backHref="/"
        backLabel="Home"
        title="Browse"
        crumbs={[{ label: "Browse" }]}
      >
        <div className="flex flex-col gap-6">
          <RepeatInlinePromo
            title="Need a faster way to revise?"
            body="Use Repeat to find common questions, important topics, and what is worth revising first."
            href={buildRepeatHref({
              prompt: "What are the most repeated exam questions overall?",
            })}
          />
          <RowList
            items={years.map((y) => ({
              label: y,
              href: `/browse/${encodeURIComponent(y)}`,
            }))}
          />
        </div>
      </PageShell>
    );
  }

  const seg0 = segs[0];

  // ── Legacy stream detection ────────────────────────────────────────────
  // If first segment is a known legacy stream name, use old logic
  if (streams.includes(seg0)) {
    const stream = getStreamTree(seg0)!;

    // Legacy level 1: subject list
    if (segs.length === 1) {
      const midsem = stream.subjects.filter((s) =>
        s.name.toLowerCase().includes("midsem"),
      );
      const endsem = stream.subjects.filter((s) =>
        s.name.toLowerCase().includes("endsem"),
      );
      const other = stream.subjects.filter(
        (s) =>
          !s.name.toLowerCase().includes("midsem") &&
          !s.name.toLowerCase().includes("endsem"),
      );

      const renderGroup = (label: string, subjects: typeof stream.subjects) =>
        subjects.length > 0 ? (
          <section key={label}>
            <p className="section-label mb-2 px-0.5 text-[11px] font-medium uppercase tracking-widest text-muted-foreground/60">
              {label}
            </p>
            <div className="stagger-list flex flex-col divide-y divide-border/50 overflow-hidden rounded-xl border border-border/60">
              {subjects.map((s) => (
                <Link
                  key={s.path}
                  href={`/browse/${[seg0, ...s.path.split("/")].map(encodeURIComponent).join("/")}`}
                  className="group flex items-center justify-between rounded-[1.3rem] px-4 py-4 transition-all duration-150 hover:bg-muted/45 active:scale-[0.997]"
                >
                  <span className="min-w-0 flex-1 truncate text-sm font-medium">
                    {s.name}
                  </span>
                  <span className="ml-3 shrink-0 rounded-full border border-border/50 bg-background/70 px-2 py-1 text-[11px] text-muted-foreground">
                    {s.papers.length}
                  </span>
                </Link>
              ))}
            </div>
          </section>
        ) : null;

      return (
        <PageShell
          backHref="/browse"
          backLabel="Browse"
          title={stream.name}
          crumbs={[
            { label: "Browse", href: "/browse" },
            { label: stream.name },
          ]}
        >
          <div className="flex flex-col gap-7">
            {renderGroup("Midsem", midsem)}
            {renderGroup("Endsem", endsem)}
            {renderGroup("Other", other)}
          </div>
        </PageShell>
      );
    }

    // Legacy level 2: papers
    const subjectPath = segs.slice(1).join("/");
    const subject = stream.subjects.find((s) => s.path === subjectPath);
    if (!subject) notFound();
    const byYear = groupPapersByYear(subject.papers);
    const sortedYears = Array.from(byYear.keys())
      .filter((y) => y > 0)
      .sort((a, b) => b - a);
    const uncategorized = byYear.get(0) ?? [];

    return (
      <PageShell
        backHref={`/browse/${encodeURIComponent(seg0)}`}
        backLabel={stream.name}
        title={subject.name}
        subtitle={`${subject.papers.length} paper${subject.papers.length !== 1 ? "s" : ""} · by year`}
        crumbs={[
          { label: "Browse", href: "/browse" },
          { label: stream.name, href: `/browse/${encodeURIComponent(seg0)}` },
          { label: subject.name },
        ]}
      >
        <div className="flex flex-col gap-7">
          {sortedYears.map((year) => (
            <section key={year}>
              <div className="mb-2 flex items-center gap-2 px-0.5">
                <span className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground/60">
                  {year}
                </span>
                <Badge
                  variant="secondary"
                  className="h-4 px-1.5 text-[10px] font-normal"
                >
                  {byYear.get(year)!.length}
                </Badge>
              </div>
              <div className="stagger-list flex flex-col divide-y divide-border/50 overflow-hidden rounded-xl border border-border/60">
                {byYear.get(year)!.map((p) => (
                  <PaperRow key={p.href} paper={p} />
                ))}
              </div>
            </section>
          ))}
          {uncategorized.length > 0 && (
            <section>
              <p className="mb-2 px-0.5 text-[11px] font-medium uppercase tracking-widest text-muted-foreground/60">
                Other
              </p>
              <div className="stagger-list flex flex-col divide-y divide-border/50 overflow-hidden rounded-xl border border-border/60">
                {uncategorized.map((p) => (
                  <PaperRow key={p.href} paper={p} />
                ))}
              </div>
            </section>
          )}
        </div>
      </PageShell>
    );
  }

  // ── New hierarchy ──────────────────────────────────────────────────────

  if (!years.includes(seg0)) notFound();
  const yearLabel = seg0;
  const sems = getSemesters(yearLabel);
  const hasCollapsedSemester = sems.length === 1;
  const collapsedSemLabel = hasCollapsedSemester ? sems[0]! : null;

  // ── 1 segment: Semester list or direct branch list ────────────────────
  if (segs.length === 1) {
    return (
      <PageShell
        backHref="/browse"
        backLabel="Browse"
        title={yearLabel}
        crumbs={[{ label: "Browse", href: "/browse" }, { label: yearLabel }]}
      >
        <RowList
          items={
            hasCollapsedSemester
              ? getBranches(yearLabel, collapsedSemLabel!).map((branch) => ({
                  label: branch,
                  href: `/browse/${encodeURIComponent(yearLabel)}/${encodeURIComponent(branch)}`,
                }))
              : sems.map((s) => ({
                  label: s,
                  href: `/browse/${encodeURIComponent(yearLabel)}/${encodeURIComponent(s)}`,
                }))
          }
        />
      </PageShell>
    );
  }

  const semLabel = hasCollapsedSemester ? collapsedSemLabel! : segs[1];
  if (!sems.includes(semLabel)) notFound();
  const branchSegIndex = hasCollapsedSemester ? 1 : 2;
  const examTypeSegIndex = hasCollapsedSemester ? 2 : 3;
  const subjectSegIndex = hasCollapsedSemester ? 3 : 4;

  // ── 2 segments: Branch list ────────────────────────────────────────────
  if (!hasCollapsedSemester && segs.length === 2) {
    const branches = getBranches(yearLabel, semLabel);
    return (
      <PageShell
        backHref={`/browse/${encodeURIComponent(yearLabel)}`}
        backLabel={yearLabel}
        title={semLabel}
        crumbs={[
          { label: "Browse", href: "/browse" },
          {
            label: yearLabel,
            href: `/browse/${encodeURIComponent(yearLabel)}`,
          },
          { label: semLabel },
        ]}
      >
        <RowList
          items={branches.map((b) => ({
            label: b,
            href: `/browse/${encodeURIComponent(yearLabel)}/${encodeURIComponent(semLabel)}/${encodeURIComponent(b)}`,
          }))}
        />
      </PageShell>
    );
  }

  const branchName = segs[branchSegIndex];
  const branches = getBranches(yearLabel, semLabel);
  if (!branches.includes(branchName)) notFound();

  // ── Branch page: exam-type list → subject overview ────────────────────
  if (segs.length === branchSegIndex + 1) {
    const examTypes = getExamTypes(yearLabel, semLabel, branchName);
    return (
      <PageShell
        backHref={
          hasCollapsedSemester
            ? `/browse/${encodeURIComponent(yearLabel)}`
            : `/browse/${encodeURIComponent(yearLabel)}/${encodeURIComponent(semLabel)}`
        }
        backLabel={hasCollapsedSemester ? yearLabel : semLabel}
        title={branchName}
        subtitle={
          hasCollapsedSemester ? yearLabel : `${yearLabel} · ${semLabel}`
        }
        crumbs={[
          { label: "Browse", href: "/browse" },
          {
            label: yearLabel,
            href: `/browse/${encodeURIComponent(yearLabel)}`,
          },
          ...(hasCollapsedSemester
            ? []
            : [
                {
                  label: semLabel,
                  href: `/browse/${encodeURIComponent(yearLabel)}/${encodeURIComponent(semLabel)}`,
                },
              ]),
          { label: branchName },
        ]}
      >
        <div className="flex flex-col gap-7">
          <RepeatInlinePromo
            title="Use Repeat before diving in."
            body="Get a quick view of the questions and topics that show up most often for this branch."
            href={buildRepeatHref({
              year: yearLabel,
              prompt: `What questions repeat the most for ${branchName}?`,
            })}
          />
          {examTypes.map((et) => {
            const subjects = getSubjectsList(
              yearLabel,
              semLabel,
              branchName,
              et,
            );
            const totalPapers = subjects.reduce(
              (n, s) => n + s.papers.length,
              0,
            );
            return (
              <section key={et}>
                <p className="section-label mb-2 px-0.5 text-[11px] font-medium uppercase tracking-widest text-muted-foreground/60">
                  {et === "MIDSEM" ? "Mid-sem" : "End-sem"} · {totalPapers}{" "}
                  papers
                </p>
                <div className="stagger-list flex flex-col divide-y divide-border/50 overflow-hidden rounded-xl border border-border/60">
                  {subjects.map((s) => (
                    <Link
                      key={s.name}
                      href={
                        hasCollapsedSemester
                          ? `/browse/${encodeURIComponent(yearLabel)}/${encodeURIComponent(branchName)}/${encodeURIComponent(et)}/${encodeURIComponent(s.name)}`
                          : `/browse/${encodeURIComponent(yearLabel)}/${encodeURIComponent(semLabel)}/${encodeURIComponent(branchName)}/${encodeURIComponent(et)}/${encodeURIComponent(s.name)}`
                      }
                      className="group flex items-center justify-between bg-card px-4 py-3.5 transition-colors duration-100 hover:bg-muted/40 active:bg-muted/60"
                    >
                      <span className="min-w-0 flex-1 truncate text-sm font-medium">
                        {s.name}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">
                          {s.papers.length}
                        </span>
                        <ChevronRight className="size-4 text-muted-foreground/40 transition-transform duration-150 group-hover:translate-x-0.5 group-hover:text-muted-foreground" />
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      </PageShell>
    );
  }

  // ── Exam type page: paper list for all subjects ───────────────────────
  if (segs.length === examTypeSegIndex + 1) {
    const examType = segs[examTypeSegIndex];
    const examTypes = getExamTypes(yearLabel, semLabel, branchName);
    if (!examTypes.includes(examType)) notFound();
    const subjects = getSubjectsList(yearLabel, semLabel, branchName, examType);
    const totalPapers = subjects.reduce((n, s) => n + s.papers.length, 0);

    return (
      <PageShell
        backHref={
          hasCollapsedSemester
            ? `/browse/${encodeURIComponent(yearLabel)}/${encodeURIComponent(branchName)}`
            : `/browse/${encodeURIComponent(yearLabel)}/${encodeURIComponent(semLabel)}/${encodeURIComponent(branchName)}`
        }
        backLabel={branchName}
        title={examType === "MIDSEM" ? "Mid-sem" : "End-sem"}
        subtitle={
          hasCollapsedSemester
            ? `${branchName} · ${totalPapers} papers`
            : `${branchName} · ${semLabel} · ${totalPapers} papers`
        }
        crumbs={[
          { label: "Browse", href: "/browse" },
          {
            label: yearLabel,
            href: `/browse/${encodeURIComponent(yearLabel)}`,
          },
          ...(hasCollapsedSemester
            ? []
            : [
                {
                  label: semLabel,
                  href: `/browse/${encodeURIComponent(yearLabel)}/${encodeURIComponent(semLabel)}`,
                },
              ]),
          {
            label: branchName,
            href: hasCollapsedSemester
              ? `/browse/${encodeURIComponent(yearLabel)}/${encodeURIComponent(branchName)}`
              : `/browse/${encodeURIComponent(yearLabel)}/${encodeURIComponent(semLabel)}/${encodeURIComponent(branchName)}`,
          },
          { label: examType === "MIDSEM" ? "Mid-sem" : "End-sem" },
        ]}
      >
        <div className="flex flex-col gap-7">
          <RepeatInlinePromo
            title="Study the full set more quickly."
            body="Ask Repeat for common questions, frequent topics, or a simple revision list across this exam type."
            href={buildRepeatHref({
              year: yearLabel,
              prompt: `What are the common questions for ${branchName} ${examType === "MIDSEM" ? "mid-sem" : "end-sem"}?`,
            })}
          />
          {subjects.map((s) => (
            <section key={s.name}>
              <div className="mb-2 flex items-center gap-2 px-0.5">
                <span className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground/60">
                  {s.name}
                </span>
                <Badge
                  variant="secondary"
                  className="h-4 px-1.5 text-[10px] font-normal"
                >
                  {s.papers.length}
                </Badge>
              </div>
              <div className="stagger-list flex flex-col divide-y divide-border/50 overflow-hidden rounded-xl border border-border/60">
                {s.papers.map((p) => (
                  <PaperRow key={p.href} paper={p} />
                ))}
              </div>
            </section>
          ))}
        </div>
      </PageShell>
    );
  }

  // ── Subject page: single subject paper list ───────────────────────────
  if (segs.length === subjectSegIndex + 1) {
    const examType = segs[examTypeSegIndex];
    const subjectName = segs[subjectSegIndex];
    const subjects = getSubjectsList(yearLabel, semLabel, branchName, examType);
    const subject = subjects.find((s) => s.name === subjectName);
    if (!subject) notFound();

    return (
      <PageShell
        backHref={
          hasCollapsedSemester
            ? `/browse/${encodeURIComponent(yearLabel)}/${encodeURIComponent(branchName)}`
            : `/browse/${encodeURIComponent(yearLabel)}/${encodeURIComponent(semLabel)}/${encodeURIComponent(branchName)}`
        }
        backLabel={branchName}
        title={subjectName}
        subtitle={
          hasCollapsedSemester
            ? `${examType === "MIDSEM" ? "Mid-sem" : "End-sem"} · ${branchName} · ${subject.papers.length} paper${subject.papers.length !== 1 ? "s" : ""}`
            : `${examType === "MIDSEM" ? "Mid-sem" : "End-sem"} · ${branchName} · ${semLabel} · ${subject.papers.length} paper${subject.papers.length !== 1 ? "s" : ""}`
        }
        crumbs={[
          { label: "Browse", href: "/browse" },
          {
            label: yearLabel,
            href: `/browse/${encodeURIComponent(yearLabel)}`,
          },
          ...(hasCollapsedSemester
            ? []
            : [
                {
                  label: semLabel,
                  href: `/browse/${encodeURIComponent(yearLabel)}/${encodeURIComponent(semLabel)}`,
                },
              ]),
          {
            label: branchName,
            href: hasCollapsedSemester
              ? `/browse/${encodeURIComponent(yearLabel)}/${encodeURIComponent(branchName)}`
              : `/browse/${encodeURIComponent(yearLabel)}/${encodeURIComponent(semLabel)}/${encodeURIComponent(branchName)}`,
          },
          { label: subjectName },
        ]}
      >
        <div className="flex flex-col gap-6">
          <RepeatInlinePromo
            title={`Try Repeat on ${subjectName}.`}
            body="See repeated questions, common topics, and likely revision areas for this subject before opening every PDF one by one."
            href={buildRepeatHref({
              year: yearLabel,
              subject: subjectName,
              prompt: `What are the repeated questions for ${subjectName}?`,
            })}
          />
          <div className="flex flex-col divide-y divide-border/50 overflow-hidden rounded-xl border border-border/60">
            {subject.papers.map((p) => (
              <PaperRow key={p.href} paper={p} />
            ))}
          </div>
        </div>
      </PageShell>
    );
  }

  notFound();
}
