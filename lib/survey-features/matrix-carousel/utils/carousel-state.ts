import type { QuestionMatrixModel } from "survey-core";

const stateByQuestion = new WeakMap<QuestionMatrixModel, { currentRowIndex: number }>();

function getOrCreateState(question: QuestionMatrixModel): { currentRowIndex: number } {
  let state = stateByQuestion.get(question);
  if (!state) {
    state = { currentRowIndex: 0 };
    stateByQuestion.set(question, state);
  }

  return state;
}

function clampIndex(index: number, rowCount: number): number {
  if (rowCount <= 0) {
    return 0;
  }

  return Math.min(Math.max(index, 0), rowCount - 1);
}

export function getCurrentRowIndex(question: QuestionMatrixModel): number {
  return getOrCreateState(question).currentRowIndex;
}

/** Sets the index directly, clamped to the current row count. Returns the clamped value actually stored. */
export function setCurrentRowIndex(
  question: QuestionMatrixModel,
  index: number,
  rowCount: number,
): number {
  const state = getOrCreateState(question);
  state.currentRowIndex = clampIndex(index, rowCount);
  return state.currentRowIndex;
}

/** Re-clamps the stored index after the row count changes (e.g. a visibleIf hid/showed a row), without moving it if it's still in range. */
export function reclampCurrentRowIndex(
  question: QuestionMatrixModel,
  rowCount: number,
): number {
  const state = getOrCreateState(question);
  state.currentRowIndex = clampIndex(state.currentRowIndex, rowCount);
  return state.currentRowIndex;
}

export function clearCarouselStateForTests(question: QuestionMatrixModel): void {
  stateByQuestion.delete(question);
}
