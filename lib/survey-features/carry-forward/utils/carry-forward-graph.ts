import type { SurveyModel } from "survey-core";
import type { AdvancedCarryForwardQuestion } from "../types";
import { getAllCarryForwardTargets } from "./carry-forward-target-query";

type TargetsByName = Map<string, AdvancedCarryForwardQuestion[]>;

/**
 * Groups targets by name, in survey order. Sources are referenced by name, so
 * dependencies are resolved per name; each name may have several targets (one
 * per question loop panel).
 */
function groupTargetsByName(
  targets: AdvancedCarryForwardQuestion[],
): TargetsByName {
  const byName: TargetsByName = new Map();

  for (const target of targets) {
    const group = byName.get(target.name);
    if (group) {
      group.push(target);
    } else {
      byName.set(target.name, [target]);
    }
  }

  return byName;
}

/** Per target name, the other target names it reads from. */
function getTargetNameDependencies(
  targetsByName: TargetsByName,
): Map<string, Set<string>> {
  const dependencies = new Map<string, Set<string>>();

  for (const [name, targets] of targetsByName) {
    const sourceNames = targets.flatMap(
      (target) => target.edxCarryForwardSources ?? [],
    );
    dependencies.set(
      name,
      new Set(
        sourceNames.filter((sourceName) => targetsByName.has(sourceName)),
      ),
    );
  }

  return dependencies;
}

function warnCircularDependency(): void {
  if (process.env.NODE_ENV !== "production") {
    console.warn(
      "[carry-forward] Circular dependency detected; falling back to survey order.",
    );
  }
}

/** The remaining names whose dependencies are all ordered already. */
function getReadyNames(
  remaining: string[],
  dependencies: Map<string, Set<string>>,
): string[] {
  const pending = new Set(remaining);
  return remaining.filter((name) =>
    [...(dependencies.get(name) ?? [])].every((dep) => !pending.has(dep)),
  );
}

/** Target names with their dependencies first, ties broken by survey order. */
function orderTargetNames(targetsByName: TargetsByName): string[] {
  const dependencies = getTargetNameDependencies(targetsByName);
  const ordered: string[] = [];
  let remaining = [...targetsByName.keys()];

  while (remaining.length > 0) {
    const ready = getReadyNames(remaining, dependencies);
    if (ready.length === 0) {
      warnCircularDependency();
      return [...ordered, ...remaining];
    }

    ordered.push(...ready);
    remaining = remaining.filter((name) => !ready.includes(name));
  }

  return ordered;
}

export function getCarryForwardTargetsInDependencyOrder(
  survey: SurveyModel,
): AdvancedCarryForwardQuestion[] {
  const targets = getAllCarryForwardTargets(survey);

  if (targets.length <= 1) {
    return targets;
  }

  const targetsByName = groupTargetsByName(targets);
  return orderTargetNames(targetsByName).flatMap(
    (name) => targetsByName.get(name) ?? [],
  );
}

export function orderCarryForwardTargetsByDependencies(
  survey: SurveyModel,
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
  survey: SurveyModel,
  changedQuestionName: string,
): AdvancedCarryForwardQuestion[] {
  const orderedTargets = getCarryForwardTargetsInDependencyOrder(survey);
  const downstreamNames = new Set<string>();
  const queue = [changedQuestionName];

  while (queue.length > 0) {
    const currentName = queue.shift()!;

    for (const target of orderedTargets) {
      if (
        downstreamNames.has(target.name) ||
        !target.edxCarryForwardSources?.includes(currentName)
      ) {
        continue;
      }

      downstreamNames.add(target.name);
      queue.push(target.name);
    }
  }

  return orderedTargets.filter((target) => downstreamNames.has(target.name));
}
