import { registerPropertyGridLazyChoiceProvider } from "@/lib/survey-features/data-lists/infrastructure/property-grid-lazy-choice-registry";
import { loadMultiSourceChoicesInCreator } from "@/lib/survey-features/data-lists/use-cases/load-multi-source-choices-in-creator";
import { resolveMultiSourceDisplayValues } from "@/lib/survey-features/data-lists/use-cases/resolve-multi-source-display-values";
import type {
  PropertyGridLazyChoiceContext,
  PropertyGridLazyChoiceProvider,
} from "@/lib/survey-features/data-lists/types";
import {
  getStaticChoicesFromSources,
  hasDataListSource,
} from "@/lib/survey-features/data-lists/utils/property-grid-source-choices";
import { CARRY_FORWARD_PRIORITY_ITEMS_PROPERTY } from "../constants";
import { getCarryForwardSourceQuestions } from "../utils/carry-forward-target-query";
import type { AdvancedCarryForwardQuestion } from "../types";

function getEditingTarget(
  ctx: PropertyGridLazyChoiceContext,
): Pick<AdvancedCarryForwardQuestion, "edxCarryForwardSources"> | null {
  const editingObj = ctx.editingObj as AdvancedCarryForwardQuestion | null;
  if (!editingObj?.edxCarryForwardSources?.length) {
    return null;
  }

  return editingObj;
}

function getSources(ctx: PropertyGridLazyChoiceContext) {
  const target = getEditingTarget(ctx);
  if (!target) {
    return [];
  }

  return getCarryForwardSourceQuestions(ctx.designerSurvey, target);
}

const carryForwardPriorityLazyProvider: PropertyGridLazyChoiceProvider = {
  propertyName: CARRY_FORWARD_PRIORITY_ITEMS_PROPERTY,

  shouldEnable(ctx) {
    const sources = getSources(ctx);
    return sources.length > 0 && hasDataListSource(sources);
  },

  getStaticChoices(ctx, filter) {
    return getStaticChoicesFromSources(getSources(ctx), filter);
  },

  loadPage(ctx, params, deps) {
    return loadMultiSourceChoicesInCreator(deps, getSources(ctx), params);
  },

  resolveDisplayValues(ctx, values, deps) {
    return resolveMultiSourceDisplayValues(deps, getSources(ctx), values);
  },
};

/**
 * Registers the carry forward priority lazy provider.
 */
export function registerCarryForwardPriorityLazyProvider(): void {
  registerPropertyGridLazyChoiceProvider(carryForwardPriorityLazyProvider);
}
