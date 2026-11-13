import commonIndex from "./common-questions-index.json";

export type CommonQuestionsSummary = {
  questions: number;
  papers: number;
  topTopics: string[];
  years: string[];
};

export const commonQuestionSummaries = commonIndex as Record<string, CommonQuestionsSummary>;

/** The key of a subject's Common questions data, if it has been built. */
export function commonQuestionsKey(semester: string | undefined, codeOrSlug: string | undefined) {
  if (!semester || !codeOrSlug) return null;
  const key =
    semester === "Year 1"
      ? `y1-${codeOrSlug}`
      : codeOrSlug.toLowerCase().replace(/[\s_]+/g, "-");
  return commonQuestionSummaries[key] ? key : null;
}
