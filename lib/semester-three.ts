/** Browse labels, not a claim that historical curricula are interchangeable. */
export const SEMESTER_THREE_BRANCHES = [
  "CSE",
  "EnC",
  "ECE",
  "Shared subjects",
] as const;
export function semesterThreeBranch(
  subjectCode: string,
): (typeof SEMESTER_THREE_BRANCHES)[number] {
  if (/^(CSE|CSS|IT|ICT)\b/i.test(subjectCode)) return "CSE";
  if (/^ECM\b/i.test(subjectCode)) return "EnC";
  if (/^ECE\b/i.test(subjectCode)) return "ECE";
  return "Shared subjects";
}
export function subjectDisplayName(code: string, paperName?: string): string {
  if (!paperName) return code;
  const title = paperName
    .replace(/^\d{4}-\d{2}\s+(Regular|Makeup|Midsem|Endsem)\s*-\s*/i, "")
    .replace(/\.pdf$/i, "")
    .replace(/_/g, " ")
    .replace(/^(?:(?:CSE|CSS|IT|ICT|ECM|ECE|MAT|ELE|PHY)[ -]*\d{4}[ -]*)+/i, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!title || title === code) return code;
  return `${code} · ${title}`;
}
