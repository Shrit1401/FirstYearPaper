export const DISABLED_PAPER_YEARS = new Set<string>();

export function isPaperYearDisabled(year: string) {
  return DISABLED_PAPER_YEARS.has(year);
}

export function filterAvailablePapersByYear<T extends { subjectPath: string }>(papers: T[]) {
  return papers.filter((paper) => !isPaperYearDisabled(paper.subjectPath.split("/")[0] ?? ""));
}
