// Data shape of data/<code>.json (schema 1).

export type Difficulty = "Easy" | "Medium" | "Hard";

export interface LeetCodeRef {
  id: number;
  title: string;
  slug: string; // https://leetcode.com/problems/<slug>/
}

export interface TaggedQuestion {
  qno: string; // "1A"
  text: string;
  marks: number | null;
  co: string | null; // "CO4"
  cognitive_level: string | null; // "Analysis"
  topic: string; // "Trees", "Stack", "Doubly LL", ...
  subtopic: string; // "AVL insertion/deletion"
  difficulty: Difficulty; // exam-task estimate in LeetCode terms, not an official rating
  leetcode: LeetCodeRef[];
  reason: string;
}

export interface TaggedPaper {
  pdf_path: string; // same path the site serves: "/authoritative/.../CSS-2101-Data Structures.pdf"
  code: string;
  date: string | null; // yyyy-mm-dd
  exam_type: string | null;
  questions: TaggedQuestion[];
}

export interface SubjectTags {
  schema: 1;
  subject: string; // "CSS 2101"
  papers: TaggedPaper[];
}
