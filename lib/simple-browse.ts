import index from "./simple-index.json";
import { SHOW_MIDSEM } from "./feature-visibility";

export type SimpleExam = "MIDSEM" | "ENDSEM" | "MAKEUP";
export type SimpleKind =
  | "Question paper"
  | "Answer scheme"
  | "Solutions"
  | "Paper + solutions";

export type SimplePaper = {
  name: string;
  href: string;
  editableId?: string;
  exam: SimpleExam;
  kind: SimpleKind;
  semester: number;
  date: string | null;
  cycle?: "Chemistry" | "Physics";
  scan?: boolean;
  code: string;
  note?: string;
  /** Answer scheme from the same sitting, when the archive has one. */
  answers?: string;
};

export type YearOneSubject = {
  slug: string;
  title: string;
  papers: SimplePaper[];
};

export type YearTwoBranch = "CSE" | "EnC" | "ECE" | "Maths" | "Other";

export type YearTwoSubject = {
  code: string;
  title: string;
  branch: YearTwoBranch;
  latest: string | null;
  papers: SimplePaper[];
  /** Older-syllabus courses with the same content, shown inside this subject. */
  olderSubjects?: YearTwoSubject[];
};

type BranchView = {
  current: { code: string; older: string[]; top: SimplePaper[] }[];
  older: string[];
  shared: string[];
};
type SemesterView = { note: string | null; branches: Record<string, BranchView> };

type RawIndex = {
  year1: { slug: string; title: string; papers: SimplePaper[]; top: SimplePaper[] }[];
  year2: Record<string, YearTwoSubject[]>;
  year2Views: Record<string, SemesterView>;
};

const raw = index as unknown as RawIndex;

/** Papers that are currently visible (mid-sems hidden while SHOW_MIDSEM is false). */
export function isVisiblePaper(p: SimplePaper): boolean {
  return SHOW_MIDSEM || p.exam !== "MIDSEM";
}

/** At most three papers per subject: the best recent ones, chosen in scripts/build-simple-index.py. */
export const MAX_PAPERS = 3;

function visible<T extends { papers: SimplePaper[]; top?: SimplePaper[] }>(subjects: T[]): T[] {
  return subjects
    .map((s) => ({ ...s, papers: (s.top ?? s.papers).filter(isVisiblePaper).slice(0, MAX_PAPERS) }))
    .filter((s) => s.papers.length > 0);
}

const data: Omit<RawIndex, "year2Views"> = {
  year1: visible(raw.year1),
  year2: Object.fromEntries(
    Object.entries(raw.year2).map(([sem, subjects]) => [
      sem,
      visible(subjects).map((s) => ({
        ...s,
        latest:
          s.papers
            .map((p) => p.date)
            .filter((d): d is string => !!d)
            .sort()
            .at(-1) ?? null,
      })),
    ]),
  ),
};

export const EXAM_ORDER: SimpleExam[] = (
  ["MIDSEM", "ENDSEM", "MAKEUP"] as SimpleExam[]
).filter((e) => SHOW_MIDSEM || e !== "MIDSEM");

export const EXAM_LABEL: Record<SimpleExam, string> = {
  MIDSEM: "Mid-sem",
  ENDSEM: "End-sem",
  MAKEUP: "Makeup",
};

export const YEAR_TWO_SEMESTERS = ["Semester 3", "Semester 4"] as const;

export const YEAR_TWO_BRANCHES: {
  id: "CSE" | "EnC" | "ECE";
  description: string;
}[] = [
  { id: "CSE", description: "CSE, IT, ICT, CSS, Data Science" },
  { id: "EnC", description: "Electronics and Computer · ECM" },
  { id: "ECE", description: "Electronics and Communication" },
];

export function getYearOneSubjects(): YearOneSubject[] {
  return data.year1.map(({ slug, title, papers }) => ({ slug, title, papers }));
}

export function getYearOneSubject(slug: string): YearOneSubject | undefined {
  return getYearOneSubjects().find((s) => s.slug === slug);
}

export function isYearTwoSemester(sem: string): boolean {
  return (YEAR_TWO_SEMESTERS as readonly string[]).includes(sem);
}

export function isYearTwoBranch(branch: string): boolean {
  return YEAR_TWO_BRANCHES.some((b) => b.id === branch);
}

export function getYearTwoSubjects(semester: string): YearTwoSubject[] {
  return data.year2[semester] ?? [];
}

export type YearTwoGroupId = "current" | "older" | "shared";

/**
 * A branch's subjects, from the course lists printed on the latest papers:
 * "current" is this year's syllabus (older papers of the same course are folded
 * in), "older" is earlier-syllabus courses of this branch (e.g. OOP for CSE),
 * "shared" is maths and other papers whose branch isn't printed.
 */
export function getYearTwoBranchGroups(semester: string, branch: string) {
  const view = raw.year2Views[semester]?.branches[branch];
  if (!view) return [];
  const byCode = new Map(getYearTwoSubjects(semester).map((s) => [s.code, s]));
  const rawByCode = new Map((raw.year2[semester] ?? []).map((s) => [s.code, s]));
  const pick = (codes: string[]) =>
    codes.map((c) => byCode.get(c)).filter((s): s is YearTwoSubject => !!s);

  const current = view.current
    .map(({ code, older, top }): YearTwoSubject | null => {
      const base = byCode.get(code) ?? rawByCode.get(code);
      const papers = (top ?? []).filter(isVisiblePaper).slice(0, MAX_PAPERS);
      if (!base || papers.length === 0) return null;
      // Older courses of the same subject are folded into these three papers.
      void older;
      return { ...base, papers, olderSubjects: [] };
    })
    .filter((s): s is YearTwoSubject => !!s);

  return [
    { id: "current" as YearTwoGroupId, label: "Your subjects", subjects: current },
    { id: "older" as YearTwoGroupId, label: "Older syllabus", subjects: pick(view.older) },
    { id: "shared" as YearTwoGroupId, label: "Other papers", subjects: pick(view.shared) },
  ].filter((g) => g.subjects.length > 0);
}

export function getYearTwoNote(semester: string): string | null {
  return raw.year2Views[semester]?.note ?? null;
}

export function getYearTwoSubject(
  semester: string,
  branch: string,
  code: string,
): YearTwoSubject | undefined {
  return getYearTwoBranchGroups(semester, branch)
    .flatMap((g) => g.subjects)
    .find((s) => s.code === code);
}

/** All papers of a subject, including folded-in older-syllabus papers. */
export function allPapers(subject: YearTwoSubject): SimplePaper[] {
  return [...subject.papers, ...(subject.olderSubjects ?? []).flatMap((o) => o.papers)];
}

export function countPapers(
  subjects: { papers: SimplePaper[]; olderSubjects?: { papers: SimplePaper[] }[] }[],
): number {
  return subjects.reduce(
    (n, s) =>
      n + s.papers.length + (s.olderSubjects ?? []).reduce((m, o) => m + o.papers.length, 0),
    0,
  );
}

export function groupByExam(papers: SimplePaper[]) {
  return EXAM_ORDER.map((exam) => ({
    exam,
    label: EXAM_LABEL[exam],
    papers: papers.filter((p) => p.exam === exam),
  })).filter((g) => g.papers.length > 0);
}

/** "3 recent papers · latest Jan 2026" */
export function recentSummary(papers: SimplePaper[]): string {
  const latest = papers.map((p) => p.date).filter((d): d is string => !!d).sort().at(-1) ?? null;
  const n = papers.length;
  return [`${n} ${n === 1 ? "paper" : "papers"}`, latest ? `latest ${prettyDate(latest.slice(0, 7))}` : null]
    .filter(Boolean)
    .join(" · ");
}

export function examSummary(papers: SimplePaper[]): string {
  return groupByExam(papers)
    .map((g) => g.label)
    .join(", ");
}

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

export function prettyDate(date: string | null): string | null {
  if (!date) return null;
  const [y, m, d] = date.split("-");
  const month = m ? MONTHS[Number(m) - 1] : undefined;
  if (!month) return y ?? null;
  return d ? `${Number(d)} ${month} ${y}` : `${month} ${y}`;
}

export function paperLabel(paper: SimplePaper, fallbackTitle: string): string {
  const date = prettyDate(paper.date);
  if (!date) return paper.name;
  return `${paper.code || fallbackTitle} · ${date}`;
}

export function hrefFor(segments: string[]): string {
  return `/browse/${segments.map(encodeURIComponent).join("/")}`;
}

/** Every route served by the simple views, for generateStaticParams. */
export function getSimpleBrowsePaths(): string[][] {
  const paths: string[][] = [["Year 1"], ["Year 2"]];
  for (const s of getYearOneSubjects()) paths.push(["Year 1", "subject", s.slug]);
  for (const sem of YEAR_TWO_SEMESTERS) {
    paths.push(["Year 2", sem]);
    for (const b of YEAR_TWO_BRANCHES) {
      paths.push(["Year 2", sem, b.id]);
      for (const g of getYearTwoBranchGroups(sem, b.id)) {
        for (const s of g.subjects) {
          paths.push(["Year 2", sem, b.id, "subject", s.code]);
        }
      }
    }
  }
  return paths;
}
