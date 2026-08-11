import type { Question } from "survey-core";
import { DISPLAY_MODE_CAROUSEL, MATRIX_TYPE } from "../constants";
import type { MatrixCarouselQuestion } from "../types";

export function isMatrixQuestion(
  question: Question,
): question is MatrixCarouselQuestion {
  return question.getType() === MATRIX_TYPE;
}

export function isCarouselDisplayMode(
  question: Question,
): question is MatrixCarouselQuestion {
  if (!isMatrixQuestion(question)) {
    return false;
  }

  return question.edxDisplayMode === DISPLAY_MODE_CAROUSEL;
}

/**
 * True only for a carousel-mode matrix question with row-sourcing turned
 * on. Deliberately its own gate, not the shared isAdvancedCarryForwardEnabled
 * — matrix is never a valid carry-forward target (it isn't a
 * QuestionSelectBase), so registerCarryForwardForQuestionType is never
 * called for it (see registry.ts / sync-rows-from-source.ts).
 */
export function isMatrixCarouselRowSourceEnabled(
  question: Question,
): question is MatrixCarouselQuestion {
  if (!isCarouselDisplayMode(question)) {
    return false;
  }

  return question.edxRowsSourceEnabled === true;
}
