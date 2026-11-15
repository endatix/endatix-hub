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
  uninstallCarryForwardTargetSyncWrapper,
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
 * Runs `beforeDispose` ahead of the question's own dispose. A loop disposes the
 * questions of the panels it drops, and SurveyJS likewise unhooks a
 * `choicesFromQuestion` dependent in `dispose()`.
 */
function runBeforeDispose(
  question: Question,
  beforeDispose: () => void,
): () => void {
  const dispose = question.dispose;
  question.dispose = () => {
    beforeDispose();
    dispose.call(question);
  };

  return () => {
    question.dispose = dispose;
  };
}

/** The targets attached to one model, with their property-change handlers. */
class CarryForwardTargetRegistry {
  private readonly attachments = new Map<
    AdvancedCarryForwardQuestion,
    { handler: PropertyChangeHandler; restoreDispose: () => void }
  >();

  constructor(private readonly model: Model) {}

  /** Attaches a target once; returns whether it was attached now. */
  attach(question: Question): boolean {
    if (
      !isAdvancedCarryForwardEnabled(question) ||
      this.attachments.has(question)
    ) {
      return false;
    }

    const handler = createPropertyChangeHandler(this.model, question);
    question.onPropertyChanged.add(handler);
    syncWhenSourcesChange(this.model, question);
    const restoreDispose = runBeforeDispose(question, () =>
      this.detach(question),
    );
    this.attachments.set(question, { handler, restoreDispose });
    return true;
  }

  detachAll(): void {
    for (const target of [...this.attachments.keys()]) {
      this.detach(target);
    }
  }

  /** Undoes everything attach did, so the target carries no patches. */
  private detach(target: AdvancedCarryForwardQuestion): void {
    const attachment = this.attachments.get(target);
    if (!attachment) {
      return;
    }

    this.attachments.delete(target);
    target.onPropertyChanged.remove(attachment.handler);
    unregisterCarryForwardDependencies(this.model, target);
    uninstallCarryForwardTargetSyncWrapper(this.model, target);
    attachment.restoreDispose();
  }
}

/**
 * Wires carry-forward config changes on targets (sources, mode, enabled, etc.).
 * Source *value* sync uses SurveyJS `addDependedQuestion` + `updateDependedQuestion`
 * (see carry-forward-dependencies.ts), not per-question value listeners.
 */
function attachCarryForwardPropertyChangeHandlers(model: Model): () => void {
  const targets = new CarryForwardTargetRegistry(model);

  getAllCarryForwardTargets(model).forEach((target) => targets.attach(target));

  const handleQuestionAdded = (_: unknown, options: QuestionAddedEvent) => {
    targets.attach(options.question);
  };

  // A dynamic panel (a question loop's panels among them) builds its questions
  // from the template after load, and onQuestionAdded does not fire for them.
  // In design mode the created question is a template one: leave it as authored.
  const handleQuestionCreated = (_: unknown, options: QuestionCreatedEvent) => {
    if (!model.isDesignMode && targets.attach(options.question)) {
      syncSingleCarryForwardTarget(
        model,
        options.question as AdvancedCarryForwardQuestion,
      );
    }
  };

  model.onQuestionAdded.add(handleQuestionAdded);
  model.onQuestionCreated.add(handleQuestionCreated);

  return () => {
    targets.detachAll();
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
