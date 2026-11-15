import type { Question, SurveyModel } from "survey-core";
import { isSelectBaseQuestion } from "@/lib/utils/survey";
import { getAllInstanceQuestions } from "@/lib/survey-features/question-loops/utils/panel-tree";
import type { AdvancedCarryForwardQuestion } from "../types";
import { isAdvancedCarryForwardEnabled } from "./is-carry-forward-target";

/**
 * Gets all the Carry forward targets in the survey, in survey order, including
 * the copies inside live dynamic panel instances (a question loop's panels).
 * Copies share their template's name, so callers must not key targets by name.
 * @param survey - The survey to get the Carry forward targets from.
 * @returns The Carry forward targets in the survey.
 */
export function getAllCarryForwardTargets(
  survey: SurveyModel,
): AdvancedCarryForwardQuestion[] {
  return getAllInstanceQuestions(survey).filter(isAdvancedCarryForwardEnabled);
}

export function getCarryForwardSourceQuestions(
  survey: { getQuestionByName: (name: string) => Question | null },
  target: Pick<AdvancedCarryForwardQuestion, "edxCarryForwardSources">,
) {
  const sources = target.edxCarryForwardSources ?? [];

  return sources
    .map((sourceName) => survey.getQuestionByName(sourceName))
    .filter((question): question is Question => question != null)
    .filter(isSelectBaseQuestion);
}
