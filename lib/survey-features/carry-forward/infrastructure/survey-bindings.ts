import type {
  Model,
  Question,
  QuestionAddedEvent,
  QuestionCreatedEvent,
} from "survey-core";
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

type PropertyChangeHandler = (_: unknown, options: { name: string }) => void;

function createPropertyChangeHandler(
  model: Model,
  target: AdvancedCarryForwardQuestion,
): PropertyChangeHandler {
  return (_, options) => {
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
}

function syncWhenSourcesChange(
  model: Model,
  target: AdvancedCarryForwardQuestion,
): void {
  installCarryForwardTargetSyncWrapper(model, target, (syncTarget) => {
    syncCarryForwardTargets(model, [syncTarget]);
  });
  registerCarryForwardDependencies(model, target);
}

/**
 * Wires carry-forward config changes on targets (sources, mode, enabled, etc.).
 * Source *value* sync uses SurveyJS `addDependedQuestion` + `updateDependedQuestion`
 * (see carry-forward-dependencies.ts), not per-question value listeners.
 */
function attachCarryForwardPropertyChangeHandlers(model: Model): () => void {
  const questionHandlers = new Map<
    AdvancedCarryForwardQuestion,
    PropertyChangeHandler
  >();

  /** Attaches a target once; returns whether it was attached now. */
  const attachToTarget = (question: Question): boolean => {
    if (
      !isAdvancedCarryForwardEnabled(question) ||
      questionHandlers.has(question)
    ) {
      return false;
    }

    const handler = createPropertyChangeHandler(model, question);
    question.onPropertyChanged.add(handler);
    questionHandlers.set(question, handler);
    syncWhenSourcesChange(model, question);
    return true;
  };

  getAllCarryForwardTargets(model).forEach((target) => attachToTarget(target));

  const handleQuestionAdded = (_: unknown, options: QuestionAddedEvent) => {
    attachToTarget(options.question);
  };

  // A dynamic panel (a question loop's panels among them) builds its questions
  // from the template after load, and onQuestionAdded does not fire for them.
  const handleQuestionCreated = (_: unknown, options: QuestionCreatedEvent) => {
    if (attachToTarget(options.question)) {
      syncCarryForwardTargets(model, [
        options.question as AdvancedCarryForwardQuestion,
      ]);
    }
  };

  model.onQuestionAdded.add(handleQuestionAdded);
  model.onQuestionCreated.add(handleQuestionCreated);

  return () => {
    questionHandlers.forEach((handler, question) => {
      question.onPropertyChanged.remove(handler);
      unregisterCarryForwardDependencies(model, question);
    });
    questionHandlers.clear();
    model.onQuestionAdded.remove(handleQuestionAdded);
    model.onQuestionCreated.remove(handleQuestionCreated);
  };
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

  const detachPropertyHandlers =
    attachCarryForwardPropertyChangeHandlers(model);

  getCarryForwardTargetsInDependencyOrder(model).forEach((target) => {
    syncSingleCarryForwardTarget(model, target);
  });

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
