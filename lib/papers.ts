import manifest from "./papers-manifest.json";
import { SEMESTER_THREE_BRANCHES, semesterThreeBranch } from "./semester-three";

// ── Types ──────────────────────────────────────────────────────────────────

export type Paper = {
  name: string;
  href: string;
  editableId?: string;
  verified?: boolean;
  /** Student-contributed scan from the community folders rather than the MAHE archive. */
  community?: boolean;
};
export type Subject = { name: string; path: string; papers: Paper[] };
export type Stream = { name: string; subjects: Subject[] };

export type SubjectPapers = { papers: Paper[] };
export type ExamTypeData = { subjects: Record<string, SubjectPapers> };
export type BranchData = Record<string, ExamTypeData>; // "MIDSEM" | "ENDSEM"
export type SemData = { branches: Record<string, BranchData> };
export type YearData = { sems: Record<string, SemData> };

const m = manifest as unknown as {
  years: Record<string, YearData>;
  streams: Record<string, Stream>;
};

const yearsData: Record<string, YearData> = m.years ?? {};
const streamsData: Record<string, Stream> = m.streams ?? {};

// ── New hierarchy accessors ────────────────────────────────────────────────

export function getYears(): string[] {
  return Object.keys(yearsData);
}

export function getSemesters(year: string): string[] {
  return Object.keys(yearsData[year]?.sems ?? {});
}

export function getBranches(year: string, sem: string): string[] {
  if (year === "Year 2" && sem === "Semester 3")
    return [...SEMESTER_THREE_BRANCHES];
  return Object.keys(yearsData[year]?.sems[sem]?.branches ?? {});
}

function branchData(year: string, sem: string, branch: string): BranchData {
  const branches = yearsData[year]?.sems[sem]?.branches ?? {};
  if (year !== "Year 2" || sem !== "Semester 3" || branch === "All Programs")
    return branches[branch] ?? {};
  const grouped: BranchData = { ...branches[branch] };
  for (const [exam, data] of Object.entries(branches["All Programs"] ?? {})) {
    const subjects = Object.fromEntries(
      Object.entries(data.subjects).filter(
        ([code]) => semesterThreeBranch(code) === branch,
      ),
    );
    if (Object.keys(subjects).length) grouped[exam] = { subjects };
  }
  return grouped;
}

export function getExamTypes(
  year: string,
  sem: string,
  branch: string,
): string[] {
  const priority: Record<string, number> = {
    MIDSEM: 0,
    REGULAR: 1,
    ENDSEM: 1,
    MAKEUP: 2,
  };
  return Object.keys(branchData(year, sem, branch)).sort(
    (a, b) => (priority[a] ?? 99) - (priority[b] ?? 99) || a.localeCompare(b),
  );
}

export function getSubjectsList(
  year: string,
  sem: string,
  branch: string,
  examType: string,
): { name: string; papers: Paper[] }[] {
  const subjects = branchData(year, sem, branch)[examType]?.subjects ?? {};
  const entries = Object.entries(subjects);
  if (year === "Year 2" && sem === "Semester 3" && branch === "CSE") {
    entries.sort(([a], [b]) => Number(!a.startsWith("CSS ")) - Number(!b.startsWith("CSS ")) || a.localeCompare(b));
  }
  return entries.map(([name, data]) => ({ name, papers: (data as SubjectPapers).papers ?? [] }));
}

// ── Legacy stream accessors ────────────────────────────────────────────────

export function getStreams(): string[] {
  return Object.keys(streamsData);
}

export function getStreamTree(streamName: string): Stream | null {
  return streamsData[streamName] ?? null;
}

export function getSubjectPapers(
  streamName: string,
  subjectPath: string,
): Paper[] {
  const stream = getStreamTree(streamName);
  if (!stream) return [];
  return stream.subjects.find((s) => s.path === subjectPath)?.papers ?? [];
}

// ── Year extraction ────────────────────────────────────────────────────────

export function extractYearFromPaperName(name: string): number | null {
  const fourDigit = /(?:19|20)\d{2}/g;
  const matches = name.match(fourDigit);
  if (matches?.length) return parseInt(matches[matches.length - 1]!, 10);
  const twoDigit = /\b(?:0[0-9]|1[0-9]|2[0-9]|9[0-9])\b/g;
  const two = name.match(twoDigit);
  if (two?.length) {
    const n = parseInt(two[two.length - 1]!, 10);
    return n >= 90 ? 1900 + n : 2000 + n;
  }
  return null;
}

export function groupPapersByYear(papers: Paper[]): Map<number, Paper[]> {
  const byYear = new Map<number, Paper[]>();
  const noYear: Paper[] = [];
  for (const paper of papers) {
    const y = extractYearFromPaperName(paper.name);
    if (y != null) {
      if (!byYear.has(y)) byYear.set(y, []);
      byYear.get(y)!.push(paper);
    } else noYear.push(paper);
  }
  if (noYear.length) byYear.set(0, noYear);
  return byYear;
}

// ── Flattened search ───────────────────────────────────────────────────────

export type FlattenedPaper = {
  streamName: string;
  subjectName: string;
  subjectPath: string;
  paperName: string;
  href: string;
  editableId?: string;
  verified?: boolean;
  community?: boolean;
};

/** Paper counts per year label, for subtitles and badges. */
export function getYearSummary(year: string): {
  papers: number;
  semesters: string[];
  examTypes: string[];
} {
  const yearData = yearsData[year];
  let papers = 0;
  const examTypes = new Set<string>();
  for (const semData of Object.values(yearData?.sems ?? {})) {
    for (const branchData of Object.values(semData.branches)) {
      for (const [examType, examData] of Object.entries(branchData)) {
        examTypes.add(examType);
        for (const subjectData of Object.values(
          (examData as ExamTypeData).subjects ?? {},
        )) {
          papers += (subjectData as SubjectPapers).papers?.length ?? 0;
        }
      }
    }
  }
  return {
    papers,
    semesters: Object.keys(yearData?.sems ?? {}),
    examTypes: [...examTypes],
  };
}

export function getFlattenedPapers(): FlattenedPaper[] {
  const out: FlattenedPaper[] = [];

  // New hierarchy
  for (const [yearLabel, yearData] of Object.entries(yearsData)) {
    for (const semLabel of Object.keys(yearData.sems)) {
      for (const branchName of getBranches(yearLabel, semLabel)) {
        for (const [examType, examData] of Object.entries(
          branchData(yearLabel, semLabel, branchName),
        )) {
          const subjects = (examData as ExamTypeData).subjects ?? {};
          for (const [subjectName, subjectData] of Object.entries(subjects)) {
            for (const paper of (subjectData as SubjectPapers).papers ?? []) {
              out.push({
                streamName: `${yearLabel} · ${semLabel} · ${branchName}`,
                subjectName: `${examType} · ${subjectName}`,
                subjectPath: `${yearLabel}/${semLabel}/${branchName}/${examType}`,
                paperName: paper.name,
                href: paper.href,
                editableId: paper.editableId,
                verified: paper.verified,
                community: paper.community,
              });
            }
          }
        }
      }
    }
  }

  // Legacy streams
  for (const streamName of Object.keys(streamsData)) {
    const stream = getStreamTree(streamName);
    if (!stream) continue;
    for (const subject of stream.subjects) {
      for (const paper of subject.papers) {
        out.push({
          streamName,
          subjectName: subject.name,
          subjectPath: subject.path,
          paperName: paper.name.replace(/\.pdf$/i, ""),
          href: paper.href,
          editableId: paper.editableId,
          verified: paper.verified,
        });
      }
    }
  }

  return out;
}
