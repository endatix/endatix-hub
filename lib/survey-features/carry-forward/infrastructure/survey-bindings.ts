import type { Model, Question, QuestionAddedEvent } from "survey-core";
import {
  CARRY_FORWARD_ENABLED_PROPERTY,
  CARRY_FORWARD_HANDLERS_ATTACHED_KEY,
  CARRY_FORWARD_SOURCES_PROPERTY,
} from "../constants";
import type { AdvancedCarryForwardQuestion } from "../types";
import {
  getAllCarryForwardTargets,
  getCarryForwardTargetsInDependencyOrder,
  isAdvancedCarryForwardEnabled,
} from "../utils";
import {
  clearCarryForwardDependencyStateForModel,
  installCarryForwardTargetSyncWrapper,
  registerCarryForwardDependencies,
  unregisterCarryForwardDependencies,
} from "./carry-forward-dependencies";
import {
  loadCarryForwardTargetsFromPropertyChange,
  syncCarryForwardTargets,
} from "./carry-forward-sync";
import { syncSingleCarryForwardTarget } from "../use-cases/sync-carry-forward-target";

const boundModelsForTests = new Map<Model, () => void>();

/**
 * Wires carry-forward config changes on targets (sources, mode, enabled, etc.).
 * Source *value* sync uses SurveyJS `addDependedQuestion` + `updateDependedQuestion`
 * (see carry-forward-dependencies.ts), not per-question value listeners.
 */
function attachCarryForwardPropertyChangeHandlers(model: Model): () => void {
  const questionHandlers = new Map<
    AdvancedCarryForwardQuestion,
    (_: unknown, options: { name: string }) => void
  >();

  const attachToTarget = (question: Question): void => {
    if (!isAdvancedCarryForwardEnabled(question)) {
      return;
    }

    const target = question as AdvancedCarryForwardQuestion;
    if (questionHandlers.has(target)) {
      return;
    }

    const handler = (_: unknown, options: { name: string }) => {
      if (
        options.name === CARRY_FORWARD_SOURCES_PROPERTY ||
        options.name === CARRY_FORWARD_ENABLED_PROPERTY
      ) {
        unregisterCarryForwardDependencies(model, target);
        if (isAdvancedCarryForwardEnabled(target)) {
          registerCarryForwardDependencies(model, target);
        }
      }

      loadCarryForwardTargetsFromPropertyChange(model, target, options.name);
    };

    target.onPropertyChanged.add(handler);
    questionHandlers.set(target, handler);
    registerCarryForwardDependencies(model, target);
  };

  getAllCarryForwardTargets(model).forEach(attachToTarget);

  const handleQuestionAdded = (_: unknown, options: QuestionAddedEvent) => {
    attachToTarget(options.question);
  };

  model.onQuestionAdded.add(handleQuestionAdded);

  return () => {
    questionHandlers.forEach((handler, question) => {
      question.onPropertyChanged.remove(handler);
      unregisterCarryForwardDependencies(model, question);
    });
    questionHandlers.clear();
    model.onQuestionAdded.remove(handleQuestionAdded);
  };
}

function installTargetSyncWrappers(model: Model): void {
  for (const target of getAllCarryForwardTargets(model)) {
    installCarryForwardTargetSyncWrapper(model, target, (syncTarget) => {
      syncCarryForwardTargets(model, [syncTarget]);
    });
  }
}

export function bindAdvancedCarryForwardToSurvey(model: Model): () => void {
  const modelWithFlags = model as Model & Record<string, unknown>;

  if (modelWithFlags[CARRY_FORWARD_HANDLERS_ATTACHED_KEY]) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(
        "[carry-forward] bindAdvancedCarryForwardToSurvey: handlers already attached to this model; skipping duplicate bind.",
      );
    }
    return () => {};
  }

  modelWithFlags[CARRY_FORWARD_HANDLERS_ATTACHED_KEY] = true;

  installTargetSyncWrappers(model);

  getCarryForwardTargetsInDependencyOrder(model).forEach((target) => {
    syncSingleCarryForwardTarget(model, target);
  });

  const detachPropertyHandlers =
    attachCarryForwardPropertyChangeHandlers(model);

  const dispose = () => {
    detachPropertyHandlers();
    clearCarryForwardDependencyStateForModel(model);
    boundModelsForTests.delete(model);
    modelWithFlags[CARRY_FORWARD_HANDLERS_ATTACHED_KEY] = false;
  };

  boundModelsForTests.set(model, dispose);

  return dispose;
}

export function clearAdvancedCarryForwardBindingsForTests(): void {
  for (const dispose of boundModelsForTests.values()) {
    dispose();
  }

  boundModelsForTests.clear();
}
