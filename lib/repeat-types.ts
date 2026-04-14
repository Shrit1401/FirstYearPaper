export type RepeatPaperContext = {
  paperId: string;
  href: string;
  paperName: string;
  normalizedYear: number | null;
  sourceType: "hierarchy" | "legacy";
  subjectKey: string;
  subjectName: string;
  subjectLabel: string;
  collectionLabel: string;
  yearLabel?: string;
  semLabel?: string;
  branchName?: string;
  examType?: string;
  streamName?: string;
};

export type RepeatIndexedPaper = RepeatPaperContext & {
  pageCount: number;
  extractionMethod: "pdf-text" | "ocr" | "empty";
  fullText?: string;
};

export type RepeatChunk = {
  chunkId: string;
  paperId: string;
  href: string;
  pageStart: number;
  pageEnd: number;
  chunkIndex: number;
  text: string;
  chunkType?: "question" | "page" | "diagram";
  diagramSignals?: string[];
  visualContext?: string;
  questionType?: "define" | "explain" | "calculate" | "compare" | "draw" | "list" | "discuss" | "generic";
  answerMode?: "numerical" | "theory" | "mixed";
  topic?: string;
  subtopic?: string;
  marksBand?: "short" | "medium" | "long" | "unknown";
  clusterId?: string;
  occurrenceCount?: number;
  embedding: string | number[];
};

export type RepeatIndexFailure = {
  paperId: string;
  href: string;
  reason: string;
};

export type RepeatIndexFile = {
  version: 1 | 2 | 3;
  generatedAt: string;
  embeddingModel: string;
  papers: RepeatIndexedPaper[];
  chunks: RepeatChunk[];
  failures: RepeatIndexFailure[];
};

export type RepeatSubjectOption = {
  subjectKey: string;
  subjectName: string;
  subjectLabel: string;
  collectionLabel: string;
  yearLabel?: string;
  semLabel?: string;
  branchName?: string;
  examType?: string;
  streamName?: string;
  papers: RepeatPaperContext[];
};

export type RepeatCitation = {
  id: string;
  chunkId: string;
  paperId: string;
  paperName: string;
  href: string;
  pageHref?: string;
  pageStart: number;
  pageEnd: number;
  subjectLabel: string;
  similarity: number;
  supportScore?: number;
  quote: string;
  questionText?: string;
  diagramRequired?: boolean;
  visualContext?: string;
  clusterId?: string;
  questionType?: RepeatChunk["questionType"];
  answerMode?: RepeatChunk["answerMode"];
  topic?: string;
  occurrenceCount?: number;
};

export type RepeatInsight = {
  title: string;
  detail: string;
  citationIds: string[];
  unit?: string;
};

export type RepeatDiagramSupport = {
  diagramExpected: boolean;
  citedDiagramCount: number;
  visualContextCount: number;
  keyCitationIds: string[];
  summary: string;
  recommendedAction: string;
};

export type RepeatRetrievedPaper = {
  paperId: string;
  paperName: string;
  href: string;
  normalizedYear: number | null;
  subjectLabel: string;
  collectionLabel: string;
  chunkCount: number;
};

export type RepeatChatTurn = {
  role: "user" | "assistant";
  content: string;
};

export type RepeatLearningEventType =
  | "answer_feedback"
  | "citation_feedback"
  | "citation_open"
  | "paper_open"
  | "repeat_question_click"
  | "query_submitted"
  | "query_reformulated"
  | "follow_up_asked";

export type RepeatAnswerFeedbackValue =
  | "useful"
  | "not_useful"
  | "bad_diagram"
  | "incomplete"
  | "missed_repeat_question";

export type RepeatCitationFeedbackValue = "helpful" | "wrong_citation";

export type RepeatLearningEvent = {
  eventId: string;
  sessionId: string;
  subjectKey?: string;
  paperId?: string;
  queryText?: string;
  selectedCitationIds?: string[];
  selectedChunkIds?: string[];
  answerId?: string;
  responseHash?: string;
  eventType: RepeatLearningEventType;
  payload?: Record<string, unknown>;
  createdAt: string;
};

export type RepeatChunkLearningStats = {
  chunkId: string;
  citationOpenCount: number;
  wrongCitationCount: number;
  helpfulCitationCount: number;
  paperOpenCount: number;
  supportRate: number;
  answerUsefulCount: number;
  answerNegativeCount: number;
  answerBadDiagramCount: number;
};

export type RepeatClusterLearningStats = {
  clusterId: string;
  positiveAnswerCount: number;
  negativeAnswerCount: number;
  missedRepeatCount: number;
  repeatQuestionClickCount: number;
};

export type RepeatLearningSnapshot = {
  generatedAt: string;
  eventCount: number;
  chunkStats: Record<string, RepeatChunkLearningStats>;
  clusterStats: Record<string, RepeatClusterLearningStats>;
  queryStats: Record<
    string,
    {
      submittedCount: number;
      reformulationCount: number;
      followUpCount: number;
    }
  >;
};

export type RepeatLearningConfig = {
  learningEnabled: boolean;
  rerankerEnabled: boolean;
  fineTunedModelEnabled: boolean;
  confidenceFloor: number;
  lowConfidenceThreshold: number;
  eventSamplingRate: number;
  retentionDays: number;
};

export type RepeatQueryRequest = {
  mode: "compare" | "chat";
  prompt: string;
  subjectKey?: string;
  currentPaperId?: string;
  intent?: "repeat_questions" | "common_topics" | "revision_list" | "custom";
  history?: RepeatChatTurn[];
  sessionId?: string;
};

export type RepeatQueryResponse = {
  answerId: string;
  answerMarkdown: string;
  confidence: number;
  lowConfidenceReasons?: string[];
  citations: RepeatCitation[];
  retrievedPapers: RepeatRetrievedPaper[];
  diagramSupport?: RepeatDiagramSupport;
  repeatedQuestions?: RepeatInsight[];
  commonTopics?: RepeatInsight[];
  revisionList?: RepeatInsight[];
  notices?: string[];
  /** Mirrors the request intent so the client can choose survey vs Q&A chrome. */
  queryIntent?: RepeatQueryRequest["intent"];
};

/** Preset flows that use the “survey” layout (sidebar crib sheet, structured insights). */
export function isRepeatSurveyIntent(
  intent?: RepeatQueryRequest["intent"]
): boolean {
  return (
    intent === "repeat_questions" ||
    intent === "common_topics" ||
    intent === "revision_list"
  );
}

/** Insights to show in the workspace sidebar for the last survey-style reply. */
export function repeatSidebarInsights(
  response: Pick<
    RepeatQueryResponse,
    "queryIntent" | "repeatedQuestions" | "commonTopics" | "revisionList"
  >
): RepeatInsight[] {
  switch (response.queryIntent) {
    case "repeat_questions":
      return response.repeatedQuestions ?? [];
    case "common_topics":
      return response.commonTopics ?? [];
    case "revision_list":
      return response.revisionList ?? [];
    default:
      return [];
  }
}

export type RepeatIndexStatus = {
  ready: boolean;
  path: string;
  /** Where the UI should tell you to load data: local file vs Supabase tables. */
  source?: "local" | "supabase";
  generatedAt?: string;
  paperCount?: number;
  chunkCount?: number;
  embeddingModel?: string;
};
