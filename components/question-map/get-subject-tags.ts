import type { SubjectTags } from "./types";
import css2101 from "./data/css-2101.json";
import css2103 from "./data/css-2103.json";

// Register each tagged subject here. Old course codes point at the same data.
const SUBJECTS: Record<string, SubjectTags> = {
  "CSS 2101": css2101 as SubjectTags,
  "CSE 2122": css2101 as SubjectTags,
  "CSS 2103": css2103 as SubjectTags,
};

const norm = (code: string) => decodeURIComponent(code).replace(/[_\s]+/g, " ").trim().toUpperCase();

/** Tag data for a subject code like "CSS 2101" (also accepts "CSS_2101" / URL-encoded). Null if untagged. */
export function getSubjectTags(code: string): SubjectTags | null {
  return SUBJECTS[norm(code)] ?? null;
}
