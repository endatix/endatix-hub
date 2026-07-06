import type { Question } from "survey-core";
import type { AdvancedCarryForwardQuestion } from "../types";
import { getAllCarryForwardTargets } from "./carry-forward-target-query";

export function getCarryForwardTargetsInDependencyOrder(survey: {
  getAllQuestions: () => Question[];
}): AdvancedCarryForwardQuestion[] {
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
      if (process.env.NODE_ENV !== "production") {
        console.warn(
          "[carry-forward] Circular dependency detected; falling back to survey order.",
        );
      }

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

/**
 * Returns carry-forward targets that transitively depend on the named question
 * (as a direct or indirect source).
 */
export function getDownstreamCarryForwardTargets(
  survey: { getAllQuestions: () => Question[] },
  changedQuestionName: string,
): AdvancedCarryForwardQuestion[] {
  const targets = getAllCarryForwardTargets(survey);
  if (targets.length === 0) {
    return [];
  }

  const targetByName = new Map(targets.map((target) => [target.name, target]));
  const downstreamNames = new Set<string>();
  const queue = [changedQuestionName];

  while (queue.length > 0) {
    const currentName = queue.shift()!;

    for (const target of targets) {
      if (!target.advancedCarryForwardSources?.includes(currentName)) {
        continue;
      }

      if (downstreamNames.has(target.name)) {
        continue;
      }

      downstreamNames.add(target.name);
      if (targetByName.has(target.name)) {
        queue.push(target.name);
      }
    }
  }

  return orderCarryForwardTargetsByDependencies(
    survey,
    [...downstreamNames].map((name) => targetByName.get(name)!),
  );
}
