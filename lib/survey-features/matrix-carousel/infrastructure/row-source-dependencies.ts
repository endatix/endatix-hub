import type { Question, QuestionMatrixModel } from "survey-core";

/**
 * Dependency wiring for row-source, mirroring the technique
 * carry-forward-dependencies.ts uses (SurveyJS's own addDependedQuestion/
 * updateDependedQuestion pair, the same mechanism native
 * choicesFromQuestion relies on) — kept as a separate, matrix-scoped copy
 * rather than an extracted shared utility for this pass, to avoid touching
 * carry-forward's existing, tested file. addDependedQuestion/
 * updateDependedQuestion are declared `protected` on Question
 * (question.d.ts:203-206) but are ordinary accessible properties at
 * runtime — TypeScript's protected is a compile-time-only construct, so a
 * locally-widened type is enough to call them, the same trick carry-forward
 * already uses.
 *
 * Deliberately simpler than carry-forward's version: a matrix-carousel
 * target has at most one source (no priority ordering/multi-source), so
 * this tracks a single source per target instead of a Set.
 */
type DependedQuestionHost = Question & {
  addDependedQuestion: (question: Question) => void;
  removeDependedQuestion: (question: Question) => void;
};

type SyncWrapperHost = QuestionMatrixModel & {
  updateDependedQuestion: () => void;
};

const sourceByTarget = new WeakMap<QuestionMatrixModel, Question>();
const originalUpdateByTarget = new WeakMap<QuestionMatrixModel, () => void>();

function asDependedQuestionHost(question: Question): DependedQuestionHost | null {
  const host = question as DependedQuestionHost;
  if (
    typeof host.addDependedQuestion !== "function" ||
    typeof host.removeDependedQuestion !== "function"
  ) {
    return null;
  }

  return host;
}

export function unregisterRowSourceDependency(target: QuestionMatrixModel): void {
  const source = sourceByTarget.get(target);
  if (!source) {
    return;
  }

  asDependedQuestionHost(source)?.removeDependedQuestion(target as unknown as Question);
  sourceByTarget.delete(target);
}

export function registerRowSourceDependency(
  target: QuestionMatrixModel,
  source: Question | undefined,
): void {
  unregisterRowSourceDependency(target);
  if (!source) {
    return;
  }

  const host = asDependedQuestionHost(source);
  if (!host) {
    return;
  }

  host.addDependedQuestion(target as unknown as Question);
  sourceByTarget.set(target, source);
}

export function installRowSourceSyncWrapper(
  target: QuestionMatrixModel,
  onSync: (target: QuestionMatrixModel) => void,
): void {
  if (originalUpdateByTarget.has(target)) {
    return;
  }

  const host = target as SyncWrapperHost;
  const original = host.updateDependedQuestion.bind(host);
  originalUpdateByTarget.set(target, original);

  host.updateDependedQuestion = () => {
    onSync(target);
    original();
  };
}

export function uninstallRowSourceSyncWrapper(target: QuestionMatrixModel): void {
  const original = originalUpdateByTarget.get(target);
  if (!original) {
    return;
  }

  (target as SyncWrapperHost).updateDependedQuestion = original;
  originalUpdateByTarget.delete(target);
}

export function clearRowSourceDependenciesForTests(): void {
  // WeakMaps aren't iterable — tests should re-create models per test
  // instead of relying on a global clear. Present for symmetry with the
  // other infrastructure modules' test-cleanup exports.
}
