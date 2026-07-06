import type { Question } from "survey-core";
import { isSelectBaseQuestion } from "@/lib/utils/survey";
import { isAdvancedCarryForwardRuntimeEnabled } from "@/lib/survey-features/infrastructure/choice-source-mutual-exclusion";
import { ADVANCED_CARRY_FORWARD_QUESTION_TYPES } from "../constants";
import type { AdvancedCarryForwardQuestion } from "../types";

const SUPPORTED_CARRY_FORWARD_QUESTION_TYPES = new Set<string>(
  ADVANCED_CARRY_FORWARD_QUESTION_TYPES,
);

function isSupportedCarryForwardQuestionType(question: Question): boolean {
  return SUPPORTED_CARRY_FORWARD_QUESTION_TYPES.has(question.getType());
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
    !isSupportedCarryForwardQuestionType(question)
  ) {
    return false;
  }

  return isAdvancedCarryForwardRuntimeEnabled(question);
}
