import type { Question } from "survey-core";
import { isSelectBaseQuestion } from "@/lib/utils/survey";
import type { AdvancedCarryForwardQuestion } from "../types";
import { isAdvancedCarryForwardEnabled } from "./is-carry-forward-target";

/**
 * Gets all the advanced carry forward targets in the survey.
 * @param survey - The survey to get the advanced carry forward targets from.
 * @returns The advanced carry forward targets in the survey.
 */
export function getAllCarryForwardTargets(survey: {
  getAllQuestions: () => Question[];
}): AdvancedCarryForwardQuestion[] {
  if (!survey) {
    return [];
  }

  return survey.getAllQuestions().filter(isAdvancedCarryForwardEnabled);
}

export function getCarryForwardSourceQuestions(
  survey: { getQuestionByName: (name: string) => Question | null },
  target: Pick<AdvancedCarryForwardQuestion, "advancedCarryForwardSources">,
) {
  const sources = target.advancedCarryForwardSources ?? [];

  return sources
    .map((sourceName) => survey.getQuestionByName(sourceName))
    .filter((question): question is Question => question != null)
    .filter(isSelectBaseQuestion);
}
