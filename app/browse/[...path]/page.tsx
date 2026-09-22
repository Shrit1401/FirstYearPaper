import Link from "next/link";
import { subjectDisplayName } from "@/lib/semester-three";
import {
  getYears,
  getSemesters,
  getBranches,
  getExamTypes,
  getSubjectsList,
  getStreamTree,
  getStreams,
  groupPapersByYear,
  getYearSummary,
} from "@/lib/papers";
import { isPaperYearDisabled } from "@/lib/paper-availability";
import { notFound, redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import {
  ArrowRight,
  BookOpen,
  ChevronRight,
  Clock3,
  FileText,
} from "lucide-react";
import { PaperViewer } from "@/components/pdf-viewer";
import { Button } from "@/components/ui/button";
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

function formatExamType(examType: string): string {
  if (examType === "MIDSEM") return "Mid-sem";
  if (examType === "ENDSEM") return "End-sem";
  if (examType === "MAKEUP") return "Makeup exam";
  if (examType === "REGULAR") return "Regular exam";
  return examType;
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
          <Link
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

function PaperRow({
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

function MidsemCollectionCard() {
  return (
    <Link
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

function SemesterThreeBranches() {
  const base = "/browse/Year%202/Semester%203";
  const branches = [
    {
      name: "CSE",
      description: "Computer Science and Engineering",
      detail: "CSE, CSS, IT and ICT archive papers",
    },
    {
      name: "EnC",
      description: "Electronics and Computer Engineering",
      detail: "ECM archive papers",
    },
    {
      name: "ECE",
      description: "Electronics and Communication Engineering",
      detail: "ECE archive papers",
    },
  ];
  return (
    <div className="flex flex-col gap-5">
      <div>
        <p className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Midsem collection · CSE and ECE
        </p>
        <MidsemCollectionCard />
      </div>
      <section>
        <h2 className="mb-3 text-sm font-medium">
          Semester 3 papers by branch
        </h2>
        <div className="grid gap-3 sm:grid-cols-3">
          {branches.map((branch) => {
            const exams = getExamTypes("Year 2", "Semester 3", branch.name);
            const count = exams
              .flatMap((exam) =>
                getSubjectsList("Year 2", "Semester 3", branch.name, exam),
              )
              .reduce((n, subject) => n + subject.papers.length, 0);
            return (
              <Link
                key={branch.name}
                href={`${base}/${branch.name}`}
                className="group rounded-2xl border border-border/60 bg-card p-5 transition-colors hover:bg-muted/40 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">{branch.name}</h3>
                  <ChevronRight className="size-4 text-muted-foreground" />
                </div>
                <p className="mt-2 text-sm leading-5">{branch.description}</p>
                <p className="mt-3 text-xs leading-5 text-muted-foreground">
                  {branch.detail}
                </p>
                <p className="mt-4 text-xs text-muted-foreground">
                  {count} original papers
                </p>
              </Link>
            );
          })}
        </div>
      </section>
      <p className="text-xs leading-5 text-muted-foreground">
        Original papers keep their course codes and exam types. Check the topics
        against your current syllabus.
      </p>
      <RowList
        items={[
          {
            label: "Mathematics and shared subjects",
            description: "Mathematics and papers without a confirmed branch",
            href: `${base}/Shared%20subjects`,
          },
        ]}
      />
    </div>
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
                  className="group flex items-center justify-between rounded-[1.3rem] px-4 py-4 transition-[background-color,color,border-color,opacity,transform] duration-150 hover:bg-muted/45 active:scale-[0.997]"
                >
                  <span className="min-w-0 flex-1 text-sm font-medium">
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
  if (isPaperYearDisabled(yearLabel)) {
    return (
      <PageShell
        backHref="/browse"
        backLabel="Browse"
        title={`${yearLabel} papers`}
        subtitle="Coming soon"
        crumbs={[{ label: "Browse", href: "/browse" }, { label: yearLabel }]}
      >
        <div className="rounded-[1.3rem] border border-border/60 bg-card/70 px-5 py-8 text-center shadow-sm">
          <div className="mx-auto flex size-10 items-center justify-center rounded-xl bg-muted/70 text-muted-foreground">
            <Clock3 className="size-4" />
          </div>
          <h2 className="mt-4 text-[1.05rem] font-semibold tracking-tight">
            Coming soon
          </h2>
          <p className="mx-auto mt-2 max-w-md text-[14px] leading-6 text-muted-foreground">
            {yearLabel} papers are being organized and checked before they go
            live. Year 1 papers are available right now.
          </p>
          <Button
            variant="outline"
            size="sm"
            asChild
            className="mt-5 h-9 rounded-full px-4 transition-transform duration-150 active:scale-[0.97]"
          >
            <Link href="/browse/Year%201">Open Year 1</Link>
          </Button>
        </div>
      </PageShell>
    );
  }
  if (
    yearLabel === "Year 2" &&
    (segs.length === 1 || (segs.length === 2 && segs[1] === "Semester 3"))
  ) {
    return (
      <PageShell
        backHref="/browse"
        backLabel="Browse"
        title="Year 2 · Semester 3"
        subtitle="Choose your branch. All original papers are free to open."
        crumbs={[
          { label: "Browse", href: "/browse" },
          { label: "Year 2 · Semester 3" },
        ]}
      >
        <SemesterThreeBranches />
        <details className="mt-8">
          <summary className="cursor-pointer text-sm text-muted-foreground">
            Other second-year archives
          </summary>
          <div className="mt-3">
            <RowList
              items={getSemesters(yearLabel)
                .filter((sem) => sem !== "Semester 3")
                .map((sem) => ({
                  label: sem,
                  href: `/browse/Year%202/${encodeURIComponent(sem)}`,
                }))}
            />
          </div>
        </details>
      </PageShell>
    );
  }
  const sems = getSemesters(yearLabel);
  const midsemOne = getSubjectsList(
    yearLabel,
    "Semester 1",
    "All Programs",
    "MIDSEM",
  );
  const midsemOneCount = midsemOne.reduce((n, s) => n + s.papers.length, 0);
  const hasCollapsedSemester = sems.length === 1;
  const collapsedSemLabel = hasCollapsedSemester ? sems[0]! : null;

  if (segs.length === 1 && hasCollapsedSemester) {
    const branches = getBranches(yearLabel, collapsedSemLabel!);
    if (branches.length === 1) {
      const branch = branches[0]!;
      const examTypes = getExamTypes(yearLabel, collapsedSemLabel!, branch);
      if (examTypes.length === 1) {
        redirect(
          `/browse/${encodeURIComponent(yearLabel)}/${encodeURIComponent(branch)}/${encodeURIComponent(examTypes[0]!)}`,
        );
      }
      redirect(
        `/browse/${encodeURIComponent(yearLabel)}/${encodeURIComponent(branch)}`,
      );
    }
  }

  // ── 1 segment: Semester list or direct branch list ────────────────────
  if (segs.length === 1) {
    return (
      <PageShell
        backHref="/browse"
        backLabel="Browse"
        title={yearLabel}
        subtitle={`${getYearSummary(yearLabel).papers} papers across ${sems.length} semester${sems.length === 1 ? "" : "s"}`}
        crumbs={[{ label: "Browse", href: "/browse" }, { label: yearLabel }]}
      >
        <div className="flex flex-col gap-5">
          {yearLabel === "Year 1" && midsemOneCount > 0 ? (
            <Link
              href="/browse/Year%201/Semester%201/All%20Programs/MIDSEM"
              className="group block overflow-hidden rounded-[1.45rem] border border-amber-500/30 bg-amber-500/[0.075] p-5 shadow-sm transition-[background-color,border-color,transform] duration-150 hover:border-amber-500/45 hover:bg-amber-500/10 active:scale-[0.99] sm:p-6"
            >
              <div className="flex items-start justify-between gap-5">
                <div className="min-w-0">
                  <span className="inline-flex items-center rounded-full border border-amber-500/25 bg-amber-500/10 px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.1em] text-amber-200">
                    Most important right now
                  </span>
                  <h2 className="mt-3 text-[1.2rem] font-semibold tracking-tight">
                    Semester 1 mid-sem papers
                  </h2>
                  <p className="mt-1.5 text-[13px] leading-6 text-muted-foreground">
                    {midsemOneCount} papers · {midsemOne.length} subjects · open
                    and view instantly
                  </p>
                </div>
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-amber-500/25 bg-amber-500/10 text-amber-100">
                  <BookOpen className="size-4" />
                </span>
              </div>
              <div className="mt-5 flex items-center justify-between border-t border-amber-500/15 pt-4">
                <span className="text-[12px] text-muted-foreground">
                  Ready to view
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-400 px-3.5 py-2 text-[12px] font-semibold text-amber-950 transition-transform duration-150 group-hover:translate-x-0.5">
                  View {midsemOneCount} papers
                  <ArrowRight className="size-3.5" />
                </span>
              </div>
            </Link>
          ) : null}

          <RowList
            items={
              hasCollapsedSemester
                ? getBranches(yearLabel, collapsedSemLabel!).map((branch) => ({
                    label: branch,
                    href: `/browse/${encodeURIComponent(yearLabel)}/${encodeURIComponent(branch)}`,
                  }))
                : [
                    ...sems.map((s) => ({
                      label: s,
                      href: `/browse/${encodeURIComponent(yearLabel)}/${encodeURIComponent(s)}`,
                    })),
                  ]
            }
          />
        </div>
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
    if (branches.length === 1) {
      const branch = branches[0]!;
      const examTypes = getExamTypes(yearLabel, semLabel, branch);
      if (examTypes.length === 1) {
        redirect(
          `/browse/${encodeURIComponent(yearLabel)}/${encodeURIComponent(semLabel)}/${encodeURIComponent(branch)}/${encodeURIComponent(examTypes[0]!)}`,
        );
      }
      redirect(
        `/browse/${encodeURIComponent(yearLabel)}/${encodeURIComponent(semLabel)}/${encodeURIComponent(branch)}`,
      );
    }
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
  if (
    !branches.includes(branchName) &&
    !(
      yearLabel === "Year 2" &&
      semLabel === "Semester 3" &&
      branchName === "All Programs"
    )
  )
    notFound();

  // ── Branch page: exam-type list → subject overview ────────────────────
  if (segs.length === branchSegIndex + 1) {
    const examTypes = getExamTypes(yearLabel, semLabel, branchName);
    if (examTypes.length === 1) {
      redirect(
        `/browse/${segs.map(encodeURIComponent).join("/")}/${encodeURIComponent(examTypes[0]!)}`,
      );
    }
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
          {yearLabel === "Year 2" &&
            semLabel === "Semester 3" &&
            (branchName === "CSE" || branchName === "ECE") && <MidsemCollectionCard />}
          {yearLabel === "Year 2" && semLabel === "Semester 3" && (
            <p className="text-sm leading-6 text-muted-foreground">
              {branchName === "CSE"
                ? "Original CSE, CSS, IT and ICT papers are grouped below by their recorded course codes."
                : "Original archive papers are grouped below by their recorded course codes."}{" "}
              Exam types and original course codes are shown separately.
            </p>
          )}
          {yearLabel === "Year 2" && semLabel === "Semester 3" && branchName !== "Shared subjects" && (
            <section>
              <h2 className="mb-3 text-sm font-medium">Mathematics</h2>
              <RowList items={[{
                label: "Engineering Mathematics III and shared subjects",
                description: "Browse the original maths papers by course code and exam type.",
                href: "/browse/Year%202/Semester%203/Shared%20subjects",
              }]} />
            </section>
          )}
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
                  {formatExamType(et)} · {totalPapers} papers
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
                      <span className="min-w-0 flex-1 text-sm font-medium">
                        {yearLabel === "Year 2" && semLabel === "Semester 3"
                          ? subjectDisplayName(s.name, s.papers[0]?.name)
                          : s.name}
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
        title={formatExamType(examType)}
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
          { label: formatExamType(examType) },
        ]}
      >
        <div className="flex flex-col gap-7">
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
            ? `${formatExamType(examType)} · ${branchName} · ${subject.papers.length} paper${subject.papers.length !== 1 ? "s" : ""}`
            : `${formatExamType(examType)} · ${branchName} · ${semLabel} · ${subject.papers.length} paper${subject.papers.length !== 1 ? "s" : ""}`
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
