import type { Model, Question, QuestionAddedEvent, QuestionMatrixModel } from "survey-core";
import type { AdvancedCarryForwardQuestion } from "@/lib/survey-features/carry-forward/types";
import { CARRY_FORWARD_CONTROL_PROPS } from "@/lib/survey-features/carry-forward/infrastructure/carry-forward-sync";
import {
  installCarryForwardTargetSyncWrapper,
  registerCarryForwardDependencies,
  unregisterCarryForwardDependencies,
} from "@/lib/survey-features/carry-forward/infrastructure/carry-forward-dependencies";
import {
  MATRIX_CAROUSEL_HANDLERS_ATTACHED_KEY,
  MATRIX_CAROUSEL_ROW_SOURCE_ATTACHED_KEY,
  ROWS_PROPERTY_NAME,
} from "../constants";
import type { MatrixCarouselQuestion } from "../types";
import { isMatrixCarouselRowSourceEnabled, isMatrixQuestion } from "../use-cases/matrix-carousel-state";
import { reclampCurrentRowIndex } from "../utils/carousel-state";
import { getDecomposedRowQuestions } from "../use-cases/navigate-carousel";
import { syncMatrixCarouselRowsFromSource } from "../use-cases/sync-rows-from-source";

const boundModelsForTests = new Set<Model>();
const rowSourceBoundModelsForTests = new Set<Model>();

/**
 * carry-forward-dependencies.ts's functions are typed against
 * AdvancedCarryForwardQuestion (QuestionSelectBase-based) since that's
 * carry-forward's own target shape — but at runtime they only ever touch
 * addDependedQuestion/removeDependedQuestion/updateDependedQuestion, which
 * are declared generically on the base Question class with a working no-op
 * default (confirmed in survey.core.js: Question.prototype.addDependedQuestion
 * / .updateDependedQuestion exist for every question; QuestionSelectBase only
 * overrides updateDependedQuestion's *behavior*, not whether the hook
 * exists). A matrix question already has real, working versions of all three
 * via that same base-class default, so this cast is safe: nothing
 * carry-forward-dependencies.ts does here depends on a QuestionSelectBase-only
 * member like `.choices`.
 */
function asCarryForwardTarget(question: MatrixCarouselQuestion): AdvancedCarryForwardQuestion {
  return question as unknown as AdvancedCarryForwardQuestion;
}

/**
 * Keeps the decomposed-row cache and our own currentRowIndex aligned when
 * rows change at runtime (e.g. a visibleIf hides/shows a row). Mirrors
 * QuestionMatrixModel.onRowsChanged()'s own cache-busting, reachable here
 * only via the public resetSingleInput() (not the protected onRowsChanged
 * override a subclass would use) plus our own state's reclamp.
 *
 * Deliberately not gated on carousel mode being active: attaching only to
 * already-carousel questions would miss the normal Creator flow of adding a
 * plain matrix question and enabling carousel mode afterward via the
 * property grid (edxDisplayMode changing doesn't re-run attachment).
 * resetSingleInput()/reclamp are cheap no-ops for a grid-mode question — the
 * cache they touch is only ever read by carousel code — so it's simpler and
 * safer to just always keep it current for every matrix question.
 */
function handlePropertyChanged(question: Question, options: { name: string }): void {
  if (options.name !== ROWS_PROPERTY_NAME || !isMatrixQuestion(question)) {
    return;
  }

  const matrixQuestion = question as QuestionMatrixModel;
  matrixQuestion.resetSingleInput();
  const rows = getDecomposedRowQuestions(matrixQuestion);
  reclampCurrentRowIndex(matrixQuestion, rows.length);
}

function attachToQuestion(
  question: Question,
  handlersByQuestion: Map<Question, (s: unknown, o: { name: string }) => void>,
): void {
  if (!isMatrixQuestion(question) || handlersByQuestion.has(question)) {
    return;
  }

  const handler = (_: unknown, options: { name: string }) =>
    handlePropertyChanged(question, options);

  question.onPropertyChanged.add(handler);
  handlersByQuestion.set(question, handler);
}

export function bindMatrixCarouselToSurvey(model: Model): () => void {
  const modelWithFlags = model as Model & Record<string, unknown>;
  if (modelWithFlags[MATRIX_CAROUSEL_HANDLERS_ATTACHED_KEY]) {
    return () => {};
  }
  modelWithFlags[MATRIX_CAROUSEL_HANDLERS_ATTACHED_KEY] = true;
  boundModelsForTests.add(model);

  const handlersByQuestion = new Map<
    Question,
    (s: unknown, o: { name: string }) => void
  >();

  model.getAllQuestions().forEach((question) => attachToQuestion(question, handlersByQuestion));

  const handleQuestionAdded = (_: unknown, options: QuestionAddedEvent) => {
    attachToQuestion(options.question, handlersByQuestion);
  };
  model.onQuestionAdded.add(handleQuestionAdded);

  return () => {
    handlersByQuestion.forEach((handler, question) => {
      question.onPropertyChanged.remove(handler);
    });
    handlersByQuestion.clear();
    model.onQuestionAdded.remove(handleQuestionAdded);
    boundModelsForTests.delete(model);
    modelWithFlags[MATRIX_CAROUSEL_HANDLERS_ATTACHED_KEY] = false;
  };
}

export function clearMatrixCarouselBindingsForTests(): void {
  boundModelsForTests.clear();
}

/**
 * Row-source dependency wiring: re-syncs a matrix's rows when its carry-
 * forward source question's value/choices change (via carry-forward's own
 * addDependedQuestion/updateDependedQuestion wrapper), and re-registers the
 * dependency when the target's own edxCarryForward* config changes — e.g. a
 * scripter picking a different source question. Kept separate from
 * bindMatrixCarouselToSurvey so the two concerns (cache/index bookkeeping vs.
 * row-sourcing) stay independently testable, per a dedicated bound-flag.
 */
function reconcileRowSource(model: Model, question: MatrixCarouselQuestion): void {
  const target = asCarryForwardTarget(question);
  if (isMatrixCarouselRowSourceEnabled(question)) {
    registerCarryForwardDependencies(model, target);
    syncMatrixCarouselRowsFromSource(model, question);
  } else {
    unregisterCarryForwardDependencies(model, target);
  }
}

function attachRowSourceToQuestion(
  model: Model,
  question: Question,
  handlersByQuestion: Map<Question, (s: unknown, o: { name: string }) => void>,
): void {
  if (!isMatrixQuestion(question) || handlersByQuestion.has(question)) {
    return;
  }

  const matrixQuestion = question as MatrixCarouselQuestion;
  installCarryForwardTargetSyncWrapper(model, asCarryForwardTarget(matrixQuestion), (target) =>
    syncMatrixCarouselRowsFromSource(model, target as unknown as QuestionMatrixModel),
  );

  const handler = (_: unknown, options: { name: string }) => {
    if (CARRY_FORWARD_CONTROL_PROPS.has(options.name)) {
      reconcileRowSource(model, matrixQuestion);
    }
  };

  question.onPropertyChanged.add(handler);
  handlersByQuestion.set(question, handler);

  reconcileRowSource(model, matrixQuestion);
}

export function bindMatrixCarouselRowSourceToSurvey(model: Model): () => void {
  const modelWithFlags = model as Model & Record<string, unknown>;
  if (modelWithFlags[MATRIX_CAROUSEL_ROW_SOURCE_ATTACHED_KEY]) {
    return () => {};
  }
  modelWithFlags[MATRIX_CAROUSEL_ROW_SOURCE_ATTACHED_KEY] = true;
  rowSourceBoundModelsForTests.add(model);

  const handlersByQuestion = new Map<
    Question,
    (s: unknown, o: { name: string }) => void
  >();

  model
    .getAllQuestions()
    .forEach((question) => attachRowSourceToQuestion(model, question, handlersByQuestion));

  const handleQuestionAdded = (_: unknown, options: QuestionAddedEvent) => {
    attachRowSourceToQuestion(model, options.question, handlersByQuestion);
  };
  model.onQuestionAdded.add(handleQuestionAdded);

  return () => {
    handlersByQuestion.forEach((handler, question) => {
      question.onPropertyChanged.remove(handler);
      unregisterCarryForwardDependencies(model, asCarryForwardTarget(question as MatrixCarouselQuestion));
    });
    handlersByQuestion.clear();
    model.onQuestionAdded.remove(handleQuestionAdded);
    rowSourceBoundModelsForTests.delete(model);
    modelWithFlags[MATRIX_CAROUSEL_ROW_SOURCE_ATTACHED_KEY] = false;
  };
}

export function clearMatrixCarouselRowSourceBindingsForTests(): void {
  rowSourceBoundModelsForTests.clear();
}
