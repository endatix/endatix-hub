import type { Model, Question } from "survey-core";
import type { AdvancedCarryForwardQuestion } from "../types";
import { getCarryForwardSourceQuestions } from "../utils/carry-forward-target-query";

/**
 * SurveyJS dependency wiring for Carry forward (mirrors native
 * `choicesFromQuestion` in QuestionSelectBase):
 *
 * - Sources call `addDependedQuestion(target)` so when a source value or
 *   visible choices change, SurveyJS invokes `target.updateDependedQuestion()`.
 * - We wrap `updateDependedQuestion` on targets to rebuild choices before the
 *   default SelectBase handler runs (`onVisibleChoicesChanged`, etc.).
 *
 * @see question.ts — `addDependedQuestion`, `updateDependedQuestions`
 * @see question_baseselect.ts — `activeChoices`, `updateDependedQuestion`
 */

type DependedQuestionHost = Question & {
  addDependedQuestion: (question: Question) => void;
  removeDependedQuestion: (question: Question) => void;
};

type TargetSyncWrapper = {
  target: AdvancedCarryForwardQuestion;
  originalUpdateDependedQuestion: () => void;
};

const edgesByModel = new WeakMap<
  Model,
  Map<AdvancedCarryForwardQuestion, Set<Question>>
>();
const syncWrappersByModel = new WeakMap<Model, TargetSyncWrapper[]>();

function asDependedQuestionHost(
  question: Question,
): DependedQuestionHost | null {
  const host = question as DependedQuestionHost;
  if (
    typeof host.addDependedQuestion !== "function" ||
    typeof host.removeDependedQuestion !== "function"
  ) {
    return null;
  }

  return host;
}

function getOrCreateEdges(
  model: Model,
): Map<AdvancedCarryForwardQuestion, Set<Question>> {
  let edges = edgesByModel.get(model);
  if (!edges) {
    edges = new Map();
    edgesByModel.set(model, edges);
  }

  return edges;
}

/**
 * Registers the carry forward dependencies for a target.
 * @param model - The model to register the dependencies on.
 * @param target - The target to register the dependencies on.
 */
export function registerCarryForwardDependencies(
  model: Model,
  target: AdvancedCarryForwardQuestion,
): void {
  unregisterCarryForwardDependencies(model, target);

  const sources = getCarryForwardSourceQuestions(model, target);
  const registeredSources = new Set<Question>();

  for (const source of sources) {
    const host = asDependedQuestionHost(source);
    if (!host) {
      continue;
    }

    host.addDependedQuestion(target);
    registeredSources.add(source);
  }

  getOrCreateEdges(model).set(target, registeredSources);
}

/**
 * Unregisters the carry forward dependencies for a target.
 * @param model - The model to unregister the dependencies from.
 * @param target - The target to unregister the dependencies from.
 */
export function unregisterCarryForwardDependencies(
  model: Model,
  target: AdvancedCarryForwardQuestion,
): void {
  const edges = edgesByModel.get(model);
  const registeredSources = edges?.get(target);
  if (!registeredSources) {
    return;
  }

  for (const source of registeredSources) {
    const host = asDependedQuestionHost(source);
    host?.removeDependedQuestion(target);
  }

  edges?.delete(target);
}

/**
 * Installs a wrapper around the updateDependedQuestion method of an Carry forward target.
 * This wrapper is used to sync the target when the depended question changes.
 * @param model - The model to install the wrapper on.
 * @param target - The target to install the wrapper on.
 * @param onSync - The function to call when the target is synced.
 */
export function installCarryForwardTargetSyncWrapper(
  model: Model,
  target: AdvancedCarryForwardQuestion,
  onSync: (target: AdvancedCarryForwardQuestion) => void,
): void {
  const existingWrappers = syncWrappersByModel.get(model);
  if (existingWrappers?.some((wrapper) => wrapper.target === target)) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(
        "[carry-forward] installCarryForwardTargetSyncWrapper: sync wrapper already installed for target; skipping duplicate wrap.",
      );
    }
    return;
  }

  const targetWithSync = target as AdvancedCarryForwardQuestion & {
    updateDependedQuestion: () => void;
  };
  const originalUpdateDependedQuestion =
    targetWithSync.updateDependedQuestion.bind(targetWithSync);

  targetWithSync.updateDependedQuestion = () => {
    onSync(target);
    originalUpdateDependedQuestion();
  };

  let wrappers = syncWrappersByModel.get(model);
  if (!wrappers) {
    wrappers = [];
    syncWrappersByModel.set(model, wrappers);
  }

  wrappers.push({
    target,
    originalUpdateDependedQuestion,
  });
}

/**
 * Clears the carry forward dependency state for a model.
 * @param model - The model to clear the dependency state from.
 */
export function clearCarryForwardDependencyStateForModel(model: Model): void {
  const edges = edgesByModel.get(model);
  if (edges) {
    for (const [target, sources] of edges) {
      for (const source of sources) {
        const host = asDependedQuestionHost(source);
        host?.removeDependedQuestion(target);
      }
    }

    edges.clear();
  }

  const wrappers = syncWrappersByModel.get(model);
  if (wrappers) {
    for (const wrapper of wrappers) {
      const targetWithSync = wrapper.target as AdvancedCarryForwardQuestion & {
        updateDependedQuestion: () => void;
      };
      targetWithSync.updateDependedQuestion =
        wrapper.originalUpdateDependedQuestion;
    }

    wrappers.length = 0;
  }
}
