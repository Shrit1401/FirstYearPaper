/** Shared, public data contract for the Repeat 2.0 question library. */
export type RepeatV2AcademicYear = 1 | 2;
export type RepeatV2Status = "complete" | "partial" | "pending" | "failed";

export type RepeatV2Membership = {
  academicYear: RepeatV2AcademicYear;
  semester: string;
  branch: string;
  examType: string;
  subject: string;
};

export type RepeatV2SourceFile = Partial<RepeatV2Membership> & {
  href: string;
  name?: string;
};

/** Bounding box in source image pixels: [left, top, width, height]. */
export type RepeatV2BoundingBox = [number, number, number, number];

export type RepeatV2SourceImage = {
  src: string;
  pageNumber: number;
  bbox?: RepeatV2BoundingBox;
};

export type RepeatV2Diagram = RepeatV2SourceImage & {
  id: string;
  caption: string;
};

export type RepeatV2Question = {
  id: string;
  number: string;
  type?: "mcq" | "theory";
  markdown: string;
  marks: number | null;
  pageNumbers: number[];
  diagrams: RepeatV2Diagram[];
  sourceImages: RepeatV2SourceImage[];
  confidence: "high" | "medium" | "low";
  reviewNotes: string[];
  preparedSolution?:string;
};

export type RepeatV2Page = {
  number: number;
  image: string;
  width: number;
  height: number;
  method: string;
  status: RepeatV2Status;
};

export type RepeatV2PaperSummary = RepeatV2Membership & {
  id: string;
  name: string;
  subjectCode?: string | null;
  authorLabel?:string;
  provenance?:string;
  examYear: number | null;
  href: string;
  sourceFiles: RepeatV2SourceFile[];
  memberships: RepeatV2Membership[];
  pageCount: number;
  questionCount: number;
  status: RepeatV2Status;
};

export type RepeatV2Paper = RepeatV2PaperSummary & {
  pages: RepeatV2Page[];
  questions: RepeatV2Question[];
  warnings: string[];
};

export type RepeatV2Catalog = {
  version: 2;
  generatedAt: string;
  papers: RepeatV2PaperSummary[];
  stats: {
    sourceFiles: number;
    uniquePapers: number;
    completePapers: number;
    partialPapers: number;
    pendingPapers: number;
    failedPapers: number;
    pages: number;
    questions: number;
    diagrams: number;
  };
  warnings: string[];
};

export type RepeatV2ChatTurn = {
  role: "user" | "assistant";
  content: string;
};

export type RepeatV2SolveRequest = {
  paperId: string;
  questionId: string;
  /** Omit for the initial, full worked solution. */
  prompt?: string;
  history?: RepeatV2ChatTurn[];
};

/** POST /api/repeat/v2/solve returns these named server-sent events. */
export type RepeatV2SolveEvent =
  | { event: "start"; data: { questionId: string; model: string } }
  | { event: "delta"; data: { text: string } }
  | { event: "done"; data: { answerMarkdown: string; responseId: string | null } }
  | { event: "error"; data: { error: string; code: string } };
