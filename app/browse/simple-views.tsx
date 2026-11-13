import Link from "next/link";
import { QuestionBank } from "@/components/question-bank";
import { getQuestionBank, getOriginalTests } from "@/lib/question-banks";
import { notFound } from "next/navigation";
import { FileText } from "lucide-react";
import type { ReactNode } from "react";
import { PaperViewer } from "@/components/pdf-viewer";
import { QuestionMap, getQuestionMapTags } from "@/components/question-map";
import { SHOW_MIDSEM } from "@/lib/feature-visibility";
import {
  MidsemCollectionCard,
  PageShell,
  RowList,
  type BreadcrumbCrumb,
} from "./browse-shell";
import {
  YEAR_TWO_BRANCHES,
  countPapers,
  getYearOneSubject,
  getYearOneSubjects,
  allPapers,
  FULL_ARCHIVE_BRANCHES,
  getYearTwoBranchGroups,
  getYearTwoNote,
  getYearTwoSubject,
  getYearTwoSubjects,
  hrefFor,
  isYearTwoBranch,
  isYearTwoSemester,
  paperLabel,
  recentSummary,
  EXAM_LABEL,
  type SimplePaper,
} from "@/lib/simple-browse";

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

/**
 * Simple Year 1 / Year 2 navigation. Returns null for paths it doesn't own so
 * the original archive routes keep working unchanged.
 */
export function renderSimpleBrowse(segs: string[]): ReactNode | null {
  const [year, a, b, c, d] = segs;

  if (year === "Year 1") {
    if (segs.length === 1) return <YearOnePage />;
    if (segs.length === 3 && a === "subject") {
      const subject = getYearOneSubject(b!);
      if (!subject) notFound();
      return (
        <SubjectPapersPage
          title={subject.title}
          subtitle={`Year 1 · ${plural(subject.papers.length, "paper")} · all branches`}
          papers={subject.papers}
          subjectCode={subject.slug === "programming" ? "CSS 1001" : subject.slug}
          semester="Year 1"
          backHref={hrefFor(["Year 1"])}
          backLabel="Year 1"
          crumbs={[
            { label: "Year 1", href: hrefFor(["Year 1"]) },
            { label: subject.title },
          ]}
        />
      );
    }
    return null;
  }

  if (year === "Year 2") {
    if (segs.length === 1) return <YearTwoPage />;
    if (!a || !isYearTwoSemester(a)) return null;
    if (segs.length === 2) return <YearTwoSemesterPage semester={a} />;
    if (!b || !isYearTwoBranch(b)) return null;
    if (segs.length === 3) return <YearTwoBranchPage semester={a} branch={b} />;
    if (segs.length === 5 && c === "subject") {
      const subject = getYearTwoSubject(a, b, d!);
      if (!subject) notFound();
      const branchHref = hrefFor(["Year 2", a, b]);
      const olderPapers = (subject.olderSubjects ?? []).flatMap((o) => o.papers);
      return (
        <SubjectPapersPage
          title={subject.title}
          subtitle={`${subject.code} · ${a} · ${b} · ${plural(allPapers(subject).length, "paper")}`}
          papers={subject.papers}
          olderPapers={olderPapers}
          olderCodes={(subject.olderSubjects ?? []).map((o) => `${o.code} ${o.title}`)}
          fullArchive={FULL_ARCHIVE_BRANCHES.has(b)}
          fallbackTitle={subject.code || subject.title}
          subjectCode={subject.code}
          semester={a}
          backHref={branchHref}
          backLabel={b}
          crumbs={[
            { label: "Year 2", href: hrefFor(["Year 2"]) },
            { label: a, href: hrefFor(["Year 2", a]) },
            { label: b, href: branchHref },
            { label: subject.code || subject.title },
          ]}
        />
      );
    }
    return null;
  }

  return null;
}

// ── Pages ──────────────────────────────────────────────────────────────────

function YearOnePage() {
  const subjects = getYearOneSubjects();
  return (
    <PageShell
      backHref="/"
      backLabel="Home"
      title="Year 1"
      subtitle="Same papers for every branch — CSE, ECE, EnC, Robotics, Mechanical, Civil and more."
      crumbs={[{ label: "Year 1" }]}
    >
      <div className="flex flex-col gap-4">
        <p className="text-[13px] leading-5 text-muted-foreground">
          Up to 3 of the most recent papers per subject, from Sem 1 and Sem 2
          (Physics and Chemistry cycles take the same subjects in different semesters).
        </p>
        <RowList
          items={subjects.map((s) => ({
            label: s.title,
            description: recentSummary(s.papers),
            href: hrefFor(["Year 1", "subject", s.slug]),
          }))}
        />
        <OriginalFolders
          links={[
            { label: "Semester 1", href: hrefFor(["Year 1", "Semester 1"]) },
            { label: "Semester 2", href: hrefFor(["Year 1", "Semester 2"]) },
            {
              label: "Student scans",
              href: hrefFor(["Year 1", "Student scans · Sem 1 & 2"]),
            },
          ]}
        />
      </div>
    </PageShell>
  );
}

function YearTwoPage() {
  return (
    <PageShell
      backHref="/"
      backLabel="Home"
      title="Year 2"
      subtitle="Pick your semester, then your branch."
      crumbs={[{ label: "Year 2" }]}
    >
      <div className="flex flex-col gap-4">
        <RowList items={[{label:"Question Banks",description:"All 9 subjects · questions and practice tests",href:"/question-banks"}]} />
        <RowList
          items={(["Semester 3", "Semester 4"] as const).map((sem) => ({
            label: sem,
            description: "CSE · EnC · ECE",
            meta: plural(countPapers(getYearTwoSubjects(sem)), "paper"),
            href: hrefFor(["Year 2", sem]),
          }))}
        />
        <OriginalFolders
          links={[
            {
              label: "Student scans",
              href: hrefFor(["Year 2", "Student scans · Sem 3 & 4"]),
            },
          ]}
        />
      </div>
    </PageShell>
  );
}

function YearTwoSemesterPage({ semester }: { semester: string }) {
  return (
    <PageShell
      backHref={hrefFor(["Year 2"])}
      backLabel="Year 2"
      title={`Year 2 · ${semester}`}
      subtitle="Choose your branch."
      crumbs={[
        { label: "Year 2", href: hrefFor(["Year 2"]) },
        { label: semester },
      ]}
    >
      <div className="flex flex-col gap-5">
        <RowList
          items={YEAR_TWO_BRANCHES.map((branch) => ({
            label: branch.id,
            description: branch.description,
            meta: plural(
              countPapers(
                getYearTwoBranchGroups(semester, branch.id).flatMap(
                  (g) => g.subjects,
                ),
              ),
              "paper",
            ),
            href: hrefFor(["Year 2", semester, branch.id]),
          }))}
        />
        {SHOW_MIDSEM && semester === "Semester 3" ? <MidsemCollectionCard /> : null}
        <OriginalFolders
          links={[
            {
              label: `${semester} folders`,
              href: hrefFor(["Year 2", semester, "All Programs"]),
            },
            {
              label: "Student scans",
              href: hrefFor(["Year 2", "Student scans · Sem 3 & 4"]),
            },
          ]}
        />
      </div>
    </PageShell>
  );
}

function YearTwoBranchPage({
  semester,
  branch,
}: {
  semester: string;
  branch: string;
}) {
  const groups = getYearTwoBranchGroups(semester, branch);
  const total = countPapers(groups.flatMap((g) => g.subjects));
  const note = getYearTwoNote(semester);
  const subjectRows = (subjects: (typeof groups)[number]["subjects"]) =>
    subjects.map((s) => ({
      label: s.title,
      description: `${s.code} · ${recentSummary(allPapers(s))}`,
      href: hrefFor(["Year 2", semester, branch, "subject", s.code]),
    }));
  return (
    <PageShell
      backHref={hrefFor(["Year 2", semester])}
      backLabel={semester}
      title={branch}
      subtitle={`Year 2 · ${semester} · ${plural(total, "paper")}`}
      crumbs={[
        { label: "Year 2", href: hrefFor(["Year 2"]) },
        { label: semester, href: hrefFor(["Year 2", semester]) },
        { label: branch },
      ]}
    >
      <div className="flex flex-col gap-7">
        {note ? (
          <p className="rounded-2xl border border-border/60 bg-card/60 px-4 py-3 text-[13px] leading-5 text-muted-foreground">
            {note}
          </p>
        ) : null}
        {groups.map((g) =>
          g.id === "current" ? (
            <section key={g.id}>
              <SectionLabel>{g.label}</SectionLabel>
              <RowList items={subjectRows(g.subjects)} />
            </section>
          ) : (
            <details key={g.id} className="group/older">
              <summary className="flex cursor-pointer list-none items-center justify-between rounded-2xl border border-border/50 bg-card/40 px-4 py-3.5 text-[13px] text-muted-foreground transition-colors hover:bg-muted/40">
                <span>
                  {g.id === "older"
                    ? "Older syllabus subjects (not in your current list)"
                    : "Other papers (maths and electives for other programmes)"}
                </span>
                <span className="text-[12px]">{plural(g.subjects.length, "subject")}</span>
              </summary>
              <div className="mt-3">
                <RowList items={subjectRows(g.subjects)} />
              </div>
            </details>
          ),
        )}
      </div>
    </PageShell>
  );
}

function SubjectPapersPage({
  title,
  subtitle,
  papers,
  olderPapers = [],
  olderCodes = [],
  fullArchive = false,
  fallbackTitle,
  subjectCode,
  semester,
  backHref,
  backLabel,
  crumbs,
}: {
  title: string;
  subtitle: string;
  papers: SimplePaper[];
  olderPapers?: SimplePaper[];
  olderCodes?: string[];
  fullArchive?: boolean;
  fallbackTitle?: string;
  subjectCode?: string;
  semester?: string;
  backHref: string;
  backLabel: string;
  crumbs: BreadcrumbCrumb[];
}) {
  const shown = fullArchive
    ? [...papers, ...olderPapers].sort((x, y) => (y.date ?? "").localeCompare(x.date ?? ""))
    : [...papers, ...olderPapers];
  void olderCodes;
  const tags =
    semester && subjectCode ? getQuestionMapTags(semester, subjectCode) : null;
  return (
    <PageShell
      backHref={backHref}
      backLabel={backLabel}
      title={title}
      subtitle={subtitle}
      crumbs={crumbs}
    >
      <div className="flex flex-col gap-3">
        <p className="px-0.5 text-[12px] text-muted-foreground">
          {fullArchive
            ? `All ${shown.length === 1 ? "1 paper" : `${shown.length} papers`} in the archive, newest first${olderPapers.length ? ", including other course codes for this subject" : ""}.`
            : `The ${shown.length === 1 ? "most recent paper" : `${shown.length} most recent papers`}, newest first.`}
        </p>
        <div className="flex flex-col divide-y divide-border/50 overflow-hidden rounded-[1.3rem] border border-border/60 bg-card/70">
          {shown.map((p) => (
            <div key={p.href}>
              <SimplePaperRow paper={p} fallbackTitle={fallbackTitle ?? title} />
              {p.answers ? (
                <PaperViewer href={p.answers} name={`Answers · ${p.name}`}>
                  <div className="flex cursor-pointer items-center gap-2 border-t border-border/40 bg-emerald-500/[0.04] py-2.5 pl-16 pr-4 text-[12.5px] font-medium text-emerald-300 transition-colors hover:bg-emerald-500/10">
                    Answers for this paper
                    <span className="ml-auto text-[11px] font-normal text-emerald-300/60">Open</span>
                  </div>
                </PaperViewer>
              ) : null}
            </div>
          ))}
        </div>
        {semester ? <QuestionBank bank={getQuestionBank(title)} tests={getOriginalTests(title)} /> : null}
        {tags ? <QuestionMap data={tags} className="mt-3" /> : null}
      </div>
    </PageShell>
  );
}

// ── Pieces ─────────────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <p className="mb-2 px-0.5 text-[11px] font-medium uppercase tracking-widest text-muted-foreground/60">
      {children}
    </p>
  );
}

function Tag({
  children,
  tone = "muted",
}: {
  children: ReactNode;
  tone?: "muted" | "answer";
}) {
  return (
    <span
      className={`rounded-full border px-2 py-0.5 text-[10.5px] leading-4 ${
        tone === "answer"
          ? "border-emerald-500/30 bg-emerald-500/10 font-medium text-emerald-300"
          : "border-border/50 bg-background/60 text-muted-foreground"
      }`}
    >
      {children}
    </span>
  );
}

function SimplePaperRow({
  paper,
  fallbackTitle,
}: {
  paper: SimplePaper;
  fallbackTitle: string;
}) {
  const label = paperLabel(paper, fallbackTitle);
  const hasAnswers = paper.kind !== "Question paper";
  return (
    <PaperViewer href={paper.href} name={paper.name} editableId={paper.editableId}>
      <div className="group flex cursor-pointer items-start gap-3 px-4 py-3.5 transition-[background-color,transform] duration-150 hover:bg-muted/45 active:scale-[0.997]">
        <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl bg-muted/70">
          <FileText className="size-4 text-muted-foreground" />
        </div>
        <div className="min-w-0 flex-1">
          <span className="block text-sm font-medium leading-5 [overflow-wrap:anywhere]">
            {label}
          </span>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            <Tag>{EXAM_LABEL[paper.exam]}</Tag>
            <Tag>{`Sem ${paper.semester}`}</Tag>
            {paper.cycle ? <Tag>{`${paper.cycle} cycle`}</Tag> : null}
            <Tag tone={hasAnswers ? "answer" : "muted"}>{paper.kind}</Tag>
            {paper.scan ? <Tag>Student scan</Tag> : null}
          </div>
          {paper.note ? (
            <span className="mt-1 block text-[11px] text-muted-foreground">
              {paper.note}
            </span>
          ) : null}
          {label !== paper.name ? (
            <span className="mt-1 block truncate text-[10.5px] text-muted-foreground/50">
              {paper.name}
            </span>
          ) : null}
        </div>
        <span className="mt-0.5 shrink-0 text-[11px] text-muted-foreground/45 transition-colors duration-150 group-hover:text-muted-foreground">
          Open
        </span>
      </div>
    </PaperViewer>
  );
}

function OriginalFolders({ links }: { links: { label: string; href: string }[] }) {
  return (
    <p className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 text-[12px] text-muted-foreground/60">
      <span>Original folders:</span>
      {links.map((l) => (
        <Link
          key={l.href}
          prefetch={false}
          href={l.href}
          className="underline decoration-border underline-offset-4 transition-colors hover:text-foreground"
        >
          {l.label}
        </Link>
      ))}
    </p>
  );
}
