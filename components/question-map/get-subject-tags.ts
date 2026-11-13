import type { SubjectTags } from "./types";
import css2101 from "./data/css-2101.json";

const norm = (code: string) =>
  decodeURIComponent(code).replace(/[_\s]+/g, " ").trim().toUpperCase();

/**
 * Sem 3 Data Structures + coding (OOP) course codes only.
 * Tag data is registered below; codes without data still return null.
 */
const SEM3_CODING_CODES = new Set(
  [
    // Data Structures
    "CSS 2101",
    "CSE 2122",
    "CSE 2152",
    "ECM 2125",
    "ICT 2121",
    "ICT 2153",
    // Object Oriented Programming
    "CSE 2124",
    "CSE 2154",
    "CSE 2104",
    "IT 2122",
    "ICT 2122",
    "ICT 2155",
    "ECM 2124",
  ].map(norm),
);

// Register each tagged subject here. Old course codes point at the same data.
const SUBJECTS: Record<string, SubjectTags> = {
  "CSS 2101": css2101 as SubjectTags,
  "CSE 2122": css2101 as SubjectTags,
};

/** True for Semester 3 DS / coding subjects that may show a question map. */
export function isSem3CodingSubject(semester: string, code: string): boolean {
  return semester === "Semester 3" && SEM3_CODING_CODES.has(norm(code));
}

/** Tag data for a subject code like "CSS 2101". Null if untagged. */
export function getSubjectTags(code: string): SubjectTags | null {
  return SUBJECTS[norm(code)] ?? null;
}

/** Question-map data only for Sem 3 DS / coding subjects that have tags. */
export function getQuestionMapTags(
  semester: string,
  code: string,
): SubjectTags | null {
  if (!isSem3CodingSubject(semester, code)) return null;
  return getSubjectTags(code);
}
