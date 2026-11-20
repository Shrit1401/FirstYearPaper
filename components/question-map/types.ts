// Data shape of data/<code>.json (schema 1).

export type Difficulty = "Easy" | "Medium" | "Hard";

export interface LeetCodeRef {
  id: number;
  title: string;
  slug: string; // https://leetcode.com/problems/<slug>/
}

export interface TaggedQuestion {
  qno: string; // "1A"
  text: string; // plain text (also used for the one-line preview)
  text_html?: string; // optional pre-rendered, sanitized HTML (tables, native MathML) shown when the card is open
  marks: number | null;
  co: string | null; // "CO4"
  cognitive_level: string | null; // "Analysis"
  topic: string; // "Trees", "Stack", "Doubly LL", ...
  subtopic: string; // "AVL insertion/deletion"
  // The next three are optional: subjects without difficulty tags (e.g. CSS 2103) leave them out.
  difficulty?: Difficulty; // exam-task estimate in LeetCode terms, not an official rating
  leetcode?: LeetCodeRef[];
  reason?: string;
  module?: number; // course module (1-based), when the subject is organised by modules (e.g. CSS 2103)
  method?: string; // solution type, e.g. "Paired t-test". Hidden until the student presses Reveal method.
  approach?: string; // 1-3 sentences of steps or formula, no final numbers
}

export interface TaggedPaper {
  pdf_path: string; // same path the site serves: "/authoritative/.../CSS-2101-Data Structures.pdf"
  code: string;
  date: string | null; // yyyy-mm-dd
  exam_type: string | null;
  questions: TaggedQuestion[];
}

export interface CourseModule {
  number: number;
  title: string;
}

export interface SubjectTags {
  schema: 1;
  subject: string; // "CSS 2101"
  papers: TaggedPaper[];
  modules?: CourseModule[]; // optional titles for question.module numbers
}
