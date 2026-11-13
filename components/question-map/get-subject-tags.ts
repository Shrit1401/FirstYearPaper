import type { SubjectTags } from "./types";
import css2101 from "./data/css-2101.json";
import css1001 from "./data/css-1001.json";
import cse2124 from "./data/cse-2124.json";
import ecm2125 from "./data/ecm-2125.json";
import ecm2124 from "./data/ecm-2124.json";

const norm = (code: string) =>
  decodeURIComponent(code).replace(/[_\s]+/g, " ").trim().toUpperCase();

/**
 * Coding subjects that may show a question map:
 * Year 1 PSUC/PPS, Sem 3 DS + OOP (CSE / EnC).
 * ECE Sem 3 has no coding courses; ECE students get Year 1 programming.
 */
const CODING_CODES = new Set(
  [
    // Year 1 Programming (PSUC / PPS)
    "CSS 1001",
    "CSE 1071",
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

const YEAR1_SLUGS = new Set(["programming"]);

// Register each tagged subject. Related/old codes share the same data.
const SUBJECTS: Record<string, SubjectTags> = {
  "CSS 2101": css2101 as SubjectTags,
  "CSE 2122": css2101 as SubjectTags,
  "CSS 1001": css1001 as SubjectTags,
  "CSE 1071": css1001 as SubjectTags,
  "CSE 2124": cse2124 as SubjectTags,
  "CSE 2154": cse2124 as SubjectTags,
  "CSE 2104": cse2124 as SubjectTags,
  "IT 2122": cse2124 as SubjectTags,
  "ICT 2122": cse2124 as SubjectTags,
  "ICT 2155": cse2124 as SubjectTags,
  "ECM 2125": ecm2125 as SubjectTags,
  "ICT 2121": ecm2125 as SubjectTags,
  "ICT 2153": ecm2125 as SubjectTags,
  "CSE 2152": ecm2125 as SubjectTags,
  "ECM 2124": ecm2124 as SubjectTags,
};

function isCodingContext(semesterOrYear: string, codeOrSlug: string): boolean {
  const key = norm(codeOrSlug);
  if (YEAR1_SLUGS.has(codeOrSlug.toLowerCase()) || YEAR1_SLUGS.has(key.toLowerCase())) {
    return semesterOrYear === "Year 1" || semesterOrYear === "Semester 1";
  }
  if (!CODING_CODES.has(key)) return false;
  // Year 1 course codes
  if (key === "CSS 1001" || key === "CSE 1071") {
    return (
      semesterOrYear === "Year 1" ||
      semesterOrYear === "Semester 1" ||
      semesterOrYear === "Semester 2"
    );
  }
  return semesterOrYear === "Semester 3";
}

/** True for coding subjects that may show a question map. */
export function isSem3CodingSubject(semester: string, code: string): boolean {
  return isCodingContext(semester, code);
}

/** Tag data for a subject code like "CSS 2101". Null if untagged. */
export function getSubjectTags(code: string): SubjectTags | null {
  const key = norm(code);
  if (key === "PROGRAMMING") return SUBJECTS["CSS 1001"] ?? null;
  return SUBJECTS[key] ?? null;
}

/** Question-map data for Year 1 / Sem 3 coding subjects that have tags. */
export function getQuestionMapTags(
  semester: string,
  code: string,
): SubjectTags | null {
  if (!isCodingContext(semester, code)) return null;
  return getSubjectTags(code);
}
