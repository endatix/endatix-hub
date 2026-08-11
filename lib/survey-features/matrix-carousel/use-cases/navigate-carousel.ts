import type { Question, QuestionMatrixModel } from "survey-core";
import { getCurrentRowIndex, setCurrentRowIndex } from "../utils/carousel-state";

/**
 * The decomposition SurveyJS's own inputPerPage engine uses, called directly
 * as a plain public method — no isSingleInputMode/singleInputQuestion
 * involved. Internally cached by the question itself (nestedQuestionsValue),
 * so repeated calls are cheap; the cache is busted by resetSingleInput()
 * (see survey-bindings.ts) when rows change.
 */
export function getDecomposedRowQuestions(question: QuestionMatrixModel): Question[] {
  return question.getMatrixSingleInputQuestions(question, false);
}

export function getActiveRowQuestion(
  question: QuestionMatrixModel,
): Question | undefined {
  const rows = getDecomposedRowQuestions(question);
  return rows[getCurrentRowIndex(question)];
}

/** Unconditional — clamps to the current row count and updates state. Used by prevRow and by swipe-driven scroll reconciliation, neither of which should ever be blocked. */
export function goToRow(question: QuestionMatrixModel, index: number): number {
  const rows = getDecomposedRowQuestions(question);
  return setCurrentRowIndex(question, index, rows.length);
}

export function prevRow(question: QuestionMatrixModel): number {
  return goToRow(question, getCurrentRowIndex(question) - 1);
}

/**
 * Advances to the next row, but validates the current row first — mirroring
 * SurveyModel.performNext()'s `if (!q.validateSingleInput()) return false;`
 * gate, which driving navigation directly (instead of through performNext())
 * would otherwise silently drop. Returns false without advancing when
 * validation fails, leaving the row's own error state visible in its normal
 * rendered chrome. Deliberately not used by prevRow/goToRow — going back, and
 * swipe-driven transitions, should never be blocked (swipe can't cleanly
 * block anyway: by the time a swipe is detected the physical scroll has
 * already landed).
 */
export function nextRow(question: QuestionMatrixModel): boolean {
  const rows = getDecomposedRowQuestions(question);
  const currentIndex = getCurrentRowIndex(question);
  const currentQuestion = rows[currentIndex];

  if (currentQuestion && !currentQuestion.validate(true, true)) {
    return false;
  }

  goToRow(question, currentIndex + 1);
  return true;
}

export function isFirstRow(question: QuestionMatrixModel): boolean {
  return getCurrentRowIndex(question) === 0;
}

export function isLastRow(question: QuestionMatrixModel): boolean {
  const rows = getDecomposedRowQuestions(question);
  return getCurrentRowIndex(question) >= rows.length - 1;
}
