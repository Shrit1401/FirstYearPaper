import type { RepeatV2PaperSummary } from "./repeat-v2-types";

const examTypeLabels: Record<string, string> = {
  MIDSEM: "Mid semester",
  MIDSEMESTER: "Mid semester",
  ENDSEM: "End semester",
  ENDSEMESTER: "End semester",
  MAKEUP: "Makeup",
  REGULAR: "Regular",
};

const abbreviations = new Set([
  "BIO", "CHM", "CIE", "CIV", "CSE", "CSS", "DSE", "DTQ", "ECE", "ECM",
  "ELE", "HUM", "ICT", "IT", "MAT", "MIE", "MIT", "MME", "MS", "PHY", "QP", "RCS",
  "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X",
]);

/** Preserve source identifiers and Roman numerals while softening all-caps titles. */
function readableTitle(value: string) {
  return value.trim().replace(/\s+/g, " ").replace(
    /\b[A-Z][A-Z0-9]{1,5}[\s_-]*\d{3,5}[A-Z]?\b|\b[A-Z]{2,}\b/g,
    token => /\d/.test(token) || abbreviations.has(token)
      ? token
      : token[0] + token.slice(1).toLowerCase(),
  );
}

export function formatPaperChoice(paper: RepeatV2PaperSummary): { label: string; detail: string } {
  const sourceName = paper.name.trim().replace(/\.pdf$/i, "").replace(/^\(verified\)\s*/i, "");
  const detail = readableTitle(sourceName) || readableTitle(paper.subject) || "Question paper";
  const rawExamType = paper.examType.trim();
  const examTypeKey = rawExamType.replace(/[\s_-]+/g, "").toUpperCase();
  const examType = examTypeLabels[examTypeKey] || readableTitle(rawExamType.replace(/[_-]+/g, " "));
  const code = paper.subjectCode?.trim().replace(/\s+/g, " ");
  const parts = [
    paper.examYear !== null && Number.isInteger(paper.examYear) && paper.examYear > 0 ? String(paper.examYear) : "",
    examType,
    code,
  ].filter(Boolean);

  return { label: parts.length ? parts.join(" · ") : detail, detail };
}
