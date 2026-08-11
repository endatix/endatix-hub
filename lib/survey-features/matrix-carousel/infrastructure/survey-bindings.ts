import type {
  ErrorCustomTextEvent,
  Model,
  Question,
  QuestionAddedEvent,
  QuestionMatrixModel,
} from "survey-core";
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
import {
  isCarouselDisplayMode,
  isMatrixCarouselRowSourceEnabled,
  isMatrixQuestion,
} from "../use-cases/matrix-carousel-state";
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
 * The error `name` SurveyJS's own RequiredInAllRowsError reports itself as
 * (question.ts's getErrorType(), confirmed in the installed bundle) —
 * fired for a matrix question whose eachRowRequired validation fails on
 * survey completion. Documented in onErrorCustomText's own options.name
 * union in survey-events-api.d.ts, so this is the real, stable identifier,
 * not something inferred from the message text.
 */
const REQUIRED_IN_ALL_ROWS_ERROR_TYPE = "requiredinallrowserror";

/**
 * SurveyJS's own default text ("Response required: answer questions in all
 * rows.") talks about "rows" — accurate for grid mode, where the respondent
 * sees the whole table at once, but confusing in carousel mode, where each
 * row renders as its own standalone <SurveyQuestion> one per screen (see
 * renderCarousel() in matrix-carousel-renderer.tsx) and they have no reason
 * to think of it as "rows." "question" is the accurate term for what they're
 * actually looking at, not an analogy — each row genuinely is decomposed
 * into a real Question instance (getMatrixSingleInputQuestions()).
 * onErrorCustomText is the public, documented mechanism for this (see
 * ErrorCustomTextEvent in survey-events-api.d.ts) — no subclassing or
 * touching the validation logic itself, just the displayed message for this
 * one error type, and only when the erroring question is a carousel-mode
 * matrix.
 *
 * English-only for now — SurveyJS ships this string translated across many
 * locales (see requiredInAllRowsError in each locale file); matching that
 * coverage for a carousel-specific variant would need a translation per
 * locale, which is out of scope here.
 */
const CAROUSEL_REQUIRED_ERROR_TEXT =
  "Response required: answer every question before continuing.";

function handleErrorCustomText(_sender: unknown, options: ErrorCustomTextEvent): void {
  const obj = options.obj as Question;
  if (
    options.name !== REQUIRED_IN_ALL_ROWS_ERROR_TYPE ||
    !isMatrixQuestion(obj) ||
    !isCarouselDisplayMode(obj)
  ) {
    return;
  }

  options.text = CAROUSEL_REQUIRED_ERROR_TEXT;
}

/**
 * Busts the decomposed-row cache and reclamps our own currentRowIndex.
 * Mirrors QuestionMatrixModel.onRowsChanged()'s own cache-busting, reachable
 * here only via the public resetSingleInput() (not the protected
 * onRowsChanged override a subclass would use) plus our own state's
 * reclamp. Exported so matrix-carousel-renderer.tsx can call the exact same
 * logic from its own visibleRowsChangedCallback wrapper — that catches a
 * case this module's onPropertyChanged("rows") listener (below) cannot:
 * a row's visibleIf flipping as part of the survey-wide condition cascade
 * calls QuestionMatrixModel.onRowsChanged() directly (confirmed in
 * survey.core.js's runItemsCondition), never propertyValueChanged("rows"),
 * so onPropertyChanged never fires for that trigger — only rows being
 * reassigned wholesale (e.g. row-sourcing) does. Both paths call
 * onRowsChanged() though, which is exactly what the component's
 * visibleRowsChangedCallback wrapper hooks into.
 */
export function resyncMatrixCarouselDecomposition(question: QuestionMatrixModel): void {
  question.resetSingleInput();
  const rows = getDecomposedRowQuestions(question);
  reclampCurrentRowIndex(question, rows.length);
}

/**
 * Deliberately not gated on carousel mode being active: attaching only to
 * already-carousel questions would miss the normal Creator flow of adding a
 * plain matrix question and enabling carousel mode afterward via the
 * property grid (edxDisplayMode changing doesn't re-run attachment).
 * resyncMatrixCarouselDecomposition() is a cheap no-op for a grid-mode
 * question — the cache it touches is only ever read by carousel code — so
 * it's simpler and safer to just always keep it current for every matrix
 * question.
 *
 * Only catches `rows` being reassigned wholesale (row-sourcing, JSON edits) —
 * see resyncMatrixCarouselDecomposition's own comment for the conditional-
 * visibleIf-cascade case this deliberately doesn't cover; the renderer picks
 * that up instead, while mounted.
 */
function handlePropertyChanged(question: Question, options: { name: string }): void {
  if (options.name !== ROWS_PROPERTY_NAME || !isMatrixQuestion(question)) {
    return;
  }

  resyncMatrixCarouselDecomposition(question as QuestionMatrixModel);
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

/**
 * General matrix-carousel plumbing for a survey model — not row-source-
 * specific (see bindMatrixCarouselRowSourceToSurvey for that): keeps the
 * decomposed-row cache/index current (handlePropertyChanged, above) and
 * swaps in carousel-appropriate wording for the eachRowRequired validation
 * error (handleErrorCustomText, above). Both react per-question at fire
 * time rather than being gated at bind time, for the same reason —
 * edxDisplayMode can change after this already ran.
 */
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
  model.onErrorCustomText.add(handleErrorCustomText);

  return () => {
    handlersByQuestion.forEach((handler, question) => {
      question.onPropertyChanged.remove(handler);
    });
    handlersByQuestion.clear();
    model.onQuestionAdded.remove(handleQuestionAdded);
    model.onErrorCustomText.remove(handleErrorCustomText);
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
