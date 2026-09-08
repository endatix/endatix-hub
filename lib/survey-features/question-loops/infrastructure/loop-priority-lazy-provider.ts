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
import { DynamicLoopModel } from "../types";
import { resolveLoopSourcesInScope } from "../utils/loop-source-scope";

const LOOP_PRIORITY_ITEMS_PROPERTY = "priorityItems";

function getLoopSources(ctx: PropertyGridLazyChoiceContext) {
  const editingObj = ctx.editingObj as DynamicLoopModel | null;
  if (!editingObj?.loopSource?.length || !ctx.designerSurvey) {
    return [];
  }

  // Same scope rule as the loopSource picker: a name is resolved against the
  // loop's own panel and its ancestors, never by a flat survey-wide lookup,
  // which cannot see questions inside panel templates (h938).
  return resolveLoopSourcesInScope(editingObj, ctx.designerSurvey);
}

const loopPriorityLazyProvider: PropertyGridLazyChoiceProvider = {
  propertyName: LOOP_PRIORITY_ITEMS_PROPERTY,

  shouldEnable(ctx) {
    const sources = getLoopSources(ctx);
    return sources.length > 0 && hasDataListSource(sources);
  },

  getStaticChoices(ctx, filter) {
    return getStaticChoicesFromSources(getLoopSources(ctx), filter);
  },

  loadPage(ctx, params, deps) {
    return loadMultiSourceChoicesInCreator(deps, getLoopSources(ctx), params);
  },

  resolveDisplayValues(ctx, values, deps) {
    return resolveMultiSourceDisplayValues(deps, getLoopSources(ctx), values);
  },
};

export function registerLoopPriorityLazyProvider(): void {
  registerPropertyGridLazyChoiceProvider(loopPriorityLazyProvider);
}
