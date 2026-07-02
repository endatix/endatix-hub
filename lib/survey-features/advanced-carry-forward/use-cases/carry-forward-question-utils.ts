import type { Question } from 'survey-core';
import { isSelectBaseQuestion } from '@/lib/survey-features/question-loops/loop-utils';
import { DATA_LIST_PROPERTY_NAME } from '@/lib/survey-features/data-lists/constants';
import { ADVANCED_CARRY_FORWARD_ENABLED_PROPERTY } from '../constants';
import type { AdvancedCarryForwardQuestion } from '../types';
import {
  isChoicesByUrlConfigured,
  isChoicesFromQuestionConfigured,
} from '../types';

export function isAdvancedCarryForwardEnabled(
  question: Question | null | undefined,
): question is AdvancedCarryForwardQuestion {
  if (!question) {
    return false;
  }

  if (
    question.getPropertyValue(ADVANCED_CARRY_FORWARD_ENABLED_PROPERTY) !== true
  ) {
    return false;
  }

  const carryForwardQuestion = question as AdvancedCarryForwardQuestion;
  const dataListId = question.getPropertyValue(DATA_LIST_PROPERTY_NAME);

  return (
    !dataListId &&
    !isChoicesByUrlConfigured(carryForwardQuestion) &&
    !isChoicesFromQuestionConfigured(carryForwardQuestion)
  );
}

export function getAllCarryForwardTargets(
  survey: { getAllQuestions: () => Question[] },
): AdvancedCarryForwardQuestion[] {
  if (!survey) {
    return [];
  }

  return survey
    .getAllQuestions()
    .filter(isAdvancedCarryForwardEnabled) as AdvancedCarryForwardQuestion[];
}

export function getCarryForwardSourceQuestions(
  survey: { getQuestionByName: (name: string) => Question | null },
  target: AdvancedCarryForwardQuestion,
) {
  const sources = target.advancedCarryForwardSources ?? [];

  return sources
    .map((sourceName) => survey.getQuestionByName(sourceName))
    .filter(isSelectBaseQuestion);
}

export function getCarryForwardTargetsInDependencyOrder(
  survey: { getAllQuestions: () => Question[] },
): AdvancedCarryForwardQuestion[] {
  const targets = getAllCarryForwardTargets(survey);

  if (targets.length <= 1) {
    return targets;
  }

  const targetByName = new Map(targets.map((target) => [target.name, target]));
  const surveyOrder = survey.getAllQuestions().map((question) => question.name);
  const orderIndex = new Map(
    surveyOrder.map((name, index) => [name, index] as const),
  );
  const dependencies = new Map<string, Set<string>>();

  for (const target of targets) {
    const sourceDependencies = new Set<string>();

    for (const sourceName of target.advancedCarryForwardSources ?? []) {
      if (targetByName.has(sourceName)) {
        sourceDependencies.add(sourceName);
      }
    }

    dependencies.set(target.name, sourceDependencies);
  }

  const remaining = new Set(targets.map((target) => target.name));
  const ordered: AdvancedCarryForwardQuestion[] = [];

  while (remaining.size > 0) {
    const ready = [...remaining].filter((name) => {
      const deps = dependencies.get(name) ?? new Set<string>();
      return [...deps].every((dep) => !remaining.has(dep));
    });

    if (ready.length === 0) {
      const fallbackOrder = [...remaining].sort(
        (left, right) =>
          (orderIndex.get(left) ?? 0) - (orderIndex.get(right) ?? 0),
      );

      for (const name of fallbackOrder) {
        ordered.push(targetByName.get(name)!);
      }

      break;
    }

    ready.sort(
      (left, right) =>
        (orderIndex.get(left) ?? 0) - (orderIndex.get(right) ?? 0),
    );

    for (const name of ready) {
      remaining.delete(name);
      ordered.push(targetByName.get(name)!);
    }
  }

  return ordered;
}

export function orderCarryForwardTargetsByDependencies(
  survey: { getAllQuestions: () => Question[] },
  targets: AdvancedCarryForwardQuestion[],
): AdvancedCarryForwardQuestion[] {
  if (targets.length <= 1) {
    return targets;
  }

  const targetSet = new Set(targets);
  return getCarryForwardTargetsInDependencyOrder(survey).filter((target) =>
    targetSet.has(target),
  );
}
