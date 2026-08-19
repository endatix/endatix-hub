import type { Question, SurveyModel } from "survey-core";
import { getDataListIdFromQuestion } from "../infrastructure/data-list-survey-integration";

export function collectBoundDataListIdsFromQuestions(
  questions: readonly Question[],
): string[] {
  const ids = new Set<string>();
  for (const question of questions) {
    const dataListId = getDataListIdFromQuestion(question);
    if (dataListId) {
      ids.add(dataListId);
    }
  }

  return [...ids];
}

export function collectBoundDataListIds(
  survey: Pick<SurveyModel, "getAllQuestions"> | null | undefined,
): string[] {
  if (!survey) {
    return [];
  }

  return collectBoundDataListIdsFromQuestions(
    survey.getAllQuestions(false, true, true),
  );
}
