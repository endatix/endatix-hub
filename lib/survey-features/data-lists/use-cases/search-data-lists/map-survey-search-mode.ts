import type { Question } from "survey-core";
import type { DataListSearchMatchMode } from "@/lib/endatix-api/public/data-lists/types";
import type { SurveySearchMode } from "../../types";

export type { SurveySearchMode };

/**
 * Maps SurveyJS {@link SurveySearchMode} to the public DataList API matchMode.
 * Returns undefined for contains / omitted so the client omits matchMode
 * (API default is Contains — quieter URLs / logs).
 * SurveyJS has no Exact mode — only contains / startsWith.
 */
export function mapSurveySearchModeToMatchMode(
  searchMode: SurveySearchMode | null | undefined,
): DataListSearchMatchMode | undefined {
  return searchMode === "startsWith" ? "StartsWith" : undefined;
}

/**
 * Reads SurveyJS searchMode from a dropdown/tagbox question (defaults to contains).
 */
export function getQuestionSearchMode(question: Question): SurveySearchMode {
  const mode = (question as Question & { searchMode?: string }).searchMode;
  return mode === "startsWith" ? "startsWith" : "contains";
}
