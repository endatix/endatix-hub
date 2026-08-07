import type { Question } from "survey-core";
import type { DataListSearchMatchMode } from "@/lib/endatix-api/public/data-lists/types";

/** SurveyJS dropdown/tagbox searchMode values. */
export type SurveySearchMode = "contains" | "startsWith";

/**
 * Maps SurveyJS {@link SurveySearchMode} to the public DataList search API matchMode.
 * SurveyJS has no Exact mode — only contains / startsWith.
 */
export function mapSurveySearchModeToMatchMode(
  searchMode: SurveySearchMode | string | undefined | null,
): DataListSearchMatchMode {
  return searchMode === "startsWith" ? "StartsWith" : "Contains";
}

/**
 * Reads SurveyJS searchMode from a dropdown/tagbox question (defaults to contains).
 */
export function getQuestionSearchMode(question: Question): SurveySearchMode {
  const mode = (question as Question & { searchMode?: string }).searchMode;
  return mode === "startsWith" ? "startsWith" : "contains";
}
