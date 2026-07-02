import type { Model, Question, QuestionAddedEvent } from 'survey-core';
import { ADVANCED_CARRY_FORWARD_HANDLERS_ATTACHED_KEY } from '../constants';
import { getCarryForwardTargetsInDependencyOrder } from '../use-cases/carry-forward-question-utils';
import {
  loadCarryForwardTargets,
  loadCarryForwardTargetsFromPropertyChange,
} from '../use-cases/load-carry-forward-targets';
import { syncSingleCarryForwardTarget } from '../use-cases/sync-carry-forward-target';

const boundModelsForTests = new Map<Model, () => void>();

function attachCarryForwardPropertyChangeHandlers(model: Model): () => void {
  const questionHandlers = new Map<
    Question,
    (_: unknown, options: { name: string }) => void
  >();

  const attachToQuestion = (question: Question): void => {
    if (questionHandlers.has(question)) {
      return;
    }

    const handler = (_: unknown, options: { name: string }) => {
      loadCarryForwardTargetsFromPropertyChange(model, options.name);
    };

    question.onPropertyChanged.add(handler);
    questionHandlers.set(question, handler);
  };

  model.getAllQuestions().forEach(attachToQuestion);

  const handleQuestionAdded = (_: unknown, options: QuestionAddedEvent) => {
    attachToQuestion(options.question);
  };

  model.onQuestionAdded.add(handleQuestionAdded);

  return () => {
    questionHandlers.forEach((handler, question) => {
      question.onPropertyChanged.remove(handler);
    });
    questionHandlers.clear();
    model.onQuestionAdded.remove(handleQuestionAdded);
  };
}

export function bindAdvancedCarryForwardToSurvey(model: Model): () => void {
  const modelWithFlags = model as Model & Record<string, unknown>;

  if (modelWithFlags[ADVANCED_CARRY_FORWARD_HANDLERS_ATTACHED_KEY]) {
    return () => {};
  }

  modelWithFlags[ADVANCED_CARRY_FORWARD_HANDLERS_ATTACHED_KEY] = true;

  getCarryForwardTargetsInDependencyOrder(model).forEach((target) => {
    syncSingleCarryForwardTarget(model, target);
  });

  model.onValueChanged.add(loadCarryForwardTargets);
  const detachPropertyHandlers = attachCarryForwardPropertyChangeHandlers(model);

  const dispose = () => {
    model.onValueChanged.remove(loadCarryForwardTargets);
    detachPropertyHandlers();
    boundModelsForTests.delete(model);
    modelWithFlags[ADVANCED_CARRY_FORWARD_HANDLERS_ATTACHED_KEY] = false;
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
