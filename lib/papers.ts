import manifest from "./papers-manifest.json";

export type Paper = { name: string; href: string };
export type Subject = { name: string; path: string; papers: Paper[] };
export type Stream = { name: string; subjects: Subject[] };

const streamsData = (manifest as { streams: Record<string, Stream> }).streams;

export function getStreams(): string[] {
  return Object.keys(streamsData);
}

export function getStreamTree(streamName: string): Stream | null {
  return streamsData[streamName] ?? null;
}

export function getSubjectPapers(streamName: string, subjectPath: string): Paper[] {
  const stream = getStreamTree(streamName);
  if (!stream) return [];
  const subject = stream.subjects.find((s) => s.path === subjectPath);
  return subject?.papers ?? [];
}

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
