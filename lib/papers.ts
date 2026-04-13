import manifest from "./papers-manifest.json";

// ── Types ──────────────────────────────────────────────────────────────────

export type Paper = { name: string; href: string; verified?: boolean };
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
  return Object.keys(yearsData[year]?.sems[sem]?.branches ?? {});
}

export function getExamTypes(year: string, sem: string, branch: string): string[] {
  return Object.keys(yearsData[year]?.sems[sem]?.branches[branch] ?? {});
}

export function getSubjectsList(
  year: string,
  sem: string,
  branch: string,
  examType: string
): { name: string; papers: Paper[] }[] {
  const subjects =
    yearsData[year]?.sems[sem]?.branches[branch]?.[examType]?.subjects ?? {};
  return Object.entries(subjects).map(([name, data]) => ({
    name,
    papers: (data as SubjectPapers).papers ?? [],
  }));
}

// ── Legacy stream accessors ────────────────────────────────────────────────

export function getStreams(): string[] {
  return Object.keys(streamsData);
}

export function getStreamTree(streamName: string): Stream | null {
  return streamsData[streamName] ?? null;
}

export function getSubjectPapers(streamName: string, subjectPath: string): Paper[] {
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
  verified?: boolean;
};

export function getFlattenedPapers(): FlattenedPaper[] {
  const out: FlattenedPaper[] = [];

  // New hierarchy
  for (const [yearLabel, yearData] of Object.entries(yearsData)) {
    for (const [semLabel, semData] of Object.entries(yearData.sems)) {
      for (const [branchName, branchData] of Object.entries(semData.branches)) {
        for (const [examType, examData] of Object.entries(branchData)) {
          const subjects = (examData as ExamTypeData).subjects ?? {};
          for (const [subjectName, subjectData] of Object.entries(subjects)) {
            for (const paper of (subjectData as SubjectPapers).papers ?? []) {
              out.push({
                streamName: `${yearLabel} · ${semLabel} · ${branchName}`,
                subjectName: `${examType} · ${subjectName}`,
                subjectPath: `${yearLabel}/${semLabel}/${branchName}/${examType}`,
                paperName: paper.name,
                href: paper.href,
                verified: paper.verified,
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
          verified: paper.verified,
        });
      }
    }
  }

  return out;
}
