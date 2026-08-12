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
 * True only for a carousel-mode matrix question with row-sourcing (carry
 * forward) turned on. Deliberately its own gate, not the shared
 * isAdvancedCarryForwardEnabled from carry-forward/utils — that one's type
 * predicate narrows to AdvancedCarryForwardQuestion, which requires
 * QuestionSelectBase, and a matrix question genuinely isn't one (it has
 * `rows`, not `choices`). The underlying sync pipeline is still the real
 * carry-forward logic (see sync-rows-from-source.ts); only the eligibility
 * check and the write-target differ per matrix's shape.
 */
export function isMatrixCarouselRowSourceEnabled(
  question: Question,
): question is MatrixCarouselQuestion {
  if (!isCarouselDisplayMode(question)) {
    return false;
  }

  return question.edxCarryForwardEnabled === true;
}
