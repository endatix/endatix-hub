import type { Question } from "survey-core";
import { isSelectBaseQuestion } from "@/lib/utils/survey";
import { isAdvancedCarryForwardRuntimeEnabled } from "@/lib/survey-features/infrastructure/choice-source-mutual-exclusion";
import { isSupportedCarryForwardQuestionType } from "../supported-question-types";
import type { AdvancedCarryForwardQuestion } from "../types";

function isSupportedQuestionType(question: Question): boolean {
  return isSupportedCarryForwardQuestionType(question.getType());
}

/**
 * Checks if a question is an active advanced carry-forward target at runtime.
 *
 * Requires a registered SelectBase question type, the feature flag via
 * Serializer, and no competing choice source (data list, URL, native carry-forward).
 */
export function isAdvancedCarryForwardEnabled(
  question: Question | null | undefined,
): question is AdvancedCarryForwardQuestion {
  if (!question) {
    return false;
  }

  if (
    !isSelectBaseQuestion(question) ||
    !isSupportedQuestionType(question)
  ) {
    return false;
  }

  return isAdvancedCarryForwardRuntimeEnabled(question);
}
