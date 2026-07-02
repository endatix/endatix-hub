import type { Model } from 'survey-core';
import { ADVANCED_CARRY_FORWARD_HANDLERS_ATTACHED_KEY } from '../constants';
import { getAllCarryForwardTargets } from '../use-cases/carry-forward-question-utils';
import { loadCarryForwardTargets } from '../use-cases/load-carry-forward-targets';
import { syncSingleCarryForwardTarget } from '../use-cases/sync-carry-forward-target';

const boundModelsForTests = new Set<Model>();

export function bindAdvancedCarryForwardToSurvey(model: Model): () => void {
  const modelWithFlags = model as Model & Record<string, unknown>;

  if (modelWithFlags[ADVANCED_CARRY_FORWARD_HANDLERS_ATTACHED_KEY]) {
    return () => {};
  }

  modelWithFlags[ADVANCED_CARRY_FORWARD_HANDLERS_ATTACHED_KEY] = true;
  boundModelsForTests.add(model);

  getAllCarryForwardTargets(model).forEach((target) => {
    syncSingleCarryForwardTarget(model, target);
  });

  model.onValueChanged.add(loadCarryForwardTargets);

  return () => {
    model.onValueChanged.remove(loadCarryForwardTargets);
    boundModelsForTests.delete(model);
    modelWithFlags[ADVANCED_CARRY_FORWARD_HANDLERS_ATTACHED_KEY] = false;
  };
}

export function clearAdvancedCarryForwardBindingsForTests(): void {
  for (const model of boundModelsForTests) {
    const modelWithFlags = model as Model & Record<string, unknown>;
    model.onValueChanged.remove(loadCarryForwardTargets);
    modelWithFlags[ADVANCED_CARRY_FORWARD_HANDLERS_ATTACHED_KEY] = false;
  }

  boundModelsForTests.clear();
}
