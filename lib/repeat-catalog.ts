import manifest from "./papers-manifest.json";
import type { RepeatPaperContext, RepeatSubjectOption } from "./repeat-types";

type SubjectPapers = { papers?: { name: string; href: string }[] };
type ExamTypeData = { subjects?: Record<string, SubjectPapers> };
type BranchData = Record<string, ExamTypeData>;
type SemData = { branches?: Record<string, BranchData> };
type YearData = { sems?: Record<string, SemData> };
type Stream = {
  name: string;
  subjects: { name: string; path: string; papers: { name: string; href: string }[] }[];
};

const data = manifest as {
  years?: Record<string, YearData>;
  streams?: Record<string, Stream>;
};

function inferYearFromText(text: string): number | null {
  const fourDigit = text.match(/(?:19|20)\d{2}/g);
  if (fourDigit?.length) return Number.parseInt(fourDigit[fourDigit.length - 1]!, 10);

  const twoDigit = text.match(/\b(?:0[0-9]|1[0-9]|2[0-9]|9[0-9])\b/g);
  if (!twoDigit?.length) return null;
  const year = Number.parseInt(twoDigit[twoDigit.length - 1]!, 10);
  return year >= 90 ? 1900 + year : 2000 + year;
}

function inferNormalizedYear(paperName: string, href: string) {
  return inferYearFromText(`${paperName} ${decodeURIComponent(href)}`);
}

function isGenericSubjectName(subjectName: string) {
  return /^(all subjects?|sem(?:ester)?\s*\d+)\b/i.test(subjectName.trim());
}

function extractCourseCode(text: string) {
  const match = text.match(/\b([A-Z]{2,5})[-_ ]?(\d{3,5}[A-Z]?)\b/i);
  if (!match) return null;
  return `${match[1]!.toUpperCase()} ${match[2]!.toUpperCase()}`;
}

function normalizePaperSubjectName(text: string) {
  return text
    .replace(/\.pdf$/i, "")
    .replace(/\b\d{1,2}\s+[A-Za-z]{3,9}\s+\d{4}\b/g, "")
    .replace(/\b(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\b/gi, "")
    .replace(/\b(?:make[\s-]?up|qp|ak|answers?|paper|midsem|endsem|rcs)\b/gi, "")
    .replace(/\(\s*\d+\s*\)/g, "")
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function resolveSubjectName(subjectName: string, paperName: string, href: string) {
  if (!isGenericSubjectName(subjectName)) return subjectName;

  const decodedHref = decodeURIComponent(href);
  const courseCode = extractCourseCode(`${paperName} ${decodedHref}`);
  if (courseCode) return courseCode;

  const normalizedPaper = normalizePaperSubjectName(paperName);
  if (normalizedPaper && !/^\d/.test(normalizedPaper)) {
    return normalizedPaper;
  }

  return subjectName;
}

function createHierarchySubjectKey(
  yearLabel: string,
  semLabel: string,
  branchName: string,
  examType: string,
  subjectName: string
) {
  return ["hierarchy", yearLabel, semLabel, branchName, examType, subjectName].join("::");
}

function createLegacySubjectKey(streamName: string, subjectName: string) {
  return ["legacy", streamName, subjectName].join("::");
}

export function getRepeatCatalog(): RepeatPaperContext[] {
  const papers: RepeatPaperContext[] = [];

  for (const [yearLabel, yearData] of Object.entries(data.years ?? {})) {
    for (const [semLabel, semData] of Object.entries(yearData.sems ?? {})) {
      for (const [branchName, branchData] of Object.entries(semData.branches ?? {})) {
        for (const [examType, examData] of Object.entries(branchData)) {
          for (const [subjectName, subjectData] of Object.entries(examData.subjects ?? {})) {
            const collectionLabel = `${semLabel} · ${branchName} · ${examType}`;

            for (const paper of subjectData.papers ?? []) {
              const paperSubjectName = resolveSubjectName(subjectName, paper.name, paper.href);
              const paperSubjectKey = createHierarchySubjectKey(
                yearLabel,
                semLabel,
                branchName,
                examType,
                paperSubjectName
              );
              papers.push({
                paperId: paper.href,
                href: paper.href,
                paperName: paper.name,
                normalizedYear: inferNormalizedYear(paper.name, paper.href),
                sourceType: "hierarchy",
                subjectKey: paperSubjectKey,
                subjectName: paperSubjectName,
                subjectLabel: `${paperSubjectName} · ${collectionLabel}`,
                collectionLabel,
                yearLabel,
                semLabel,
                branchName,
                examType,
              });
            }
          }
        }
      }
    }
  }

  for (const [streamName, stream] of Object.entries(data.streams ?? {})) {
    for (const subject of stream.subjects ?? []) {
      const subjectKey = createLegacySubjectKey(streamName, subject.name);
      const subjectLabel = `${subject.name} · ${streamName}`;

      for (const paper of subject.papers ?? []) {
        papers.push({
          paperId: paper.href,
          href: paper.href,
          paperName: paper.name.replace(/\.pdf$/i, ""),
          normalizedYear: inferNormalizedYear(paper.name, paper.href),
          sourceType: "legacy",
          subjectKey,
          subjectName: subject.name,
          subjectLabel,
          collectionLabel: streamName,
          streamName,
        });
      }
    }
  }

  return papers.sort((a, b) => {
    const yearA = a.normalizedYear ?? 0;
    const yearB = b.normalizedYear ?? 0;
    if (yearA !== yearB) return yearB - yearA;
    return a.paperName.localeCompare(b.paperName);
  });
}

export function getRepeatSubjectOptions(): RepeatSubjectOption[] {
  const grouped = new Map<string, RepeatSubjectOption>();

  for (const paper of getRepeatCatalog()) {
    const existing = grouped.get(paper.subjectKey);
    if (existing) {
      existing.papers.push(paper);
      continue;
    }

    grouped.set(paper.subjectKey, {
      subjectKey: paper.subjectKey,
      subjectName: paper.subjectName,
      subjectLabel: paper.subjectLabel,
      collectionLabel: paper.collectionLabel,
      yearLabel: paper.yearLabel,
      semLabel: paper.semLabel,
      branchName: paper.branchName,
      examType: paper.examType,
      streamName: paper.streamName,
      papers: [paper],
    });
  }

  return Array.from(grouped.values())
    .map((subject) => ({
      ...subject,
      papers: subject.papers.sort((a, b) => {
        const yearA = a.normalizedYear ?? 0;
        const yearB = b.normalizedYear ?? 0;
        if (yearA !== yearB) return yearB - yearA;
        return a.paperName.localeCompare(b.paperName);
      }),
    }))
    .sort((a, b) => a.subjectLabel.localeCompare(b.subjectLabel));
}

export function getRepeatSubjectMap() {
  return new Map(getRepeatSubjectOptions().map((subject) => [subject.subjectKey, subject]));
}
