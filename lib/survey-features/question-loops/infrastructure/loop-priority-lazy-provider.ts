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
import { isSelectBaseQuestion } from "@/lib/utils/survey";

const LOOP_PRIORITY_ITEMS_PROPERTY = "priorityItems";

type LoopEditingObj = {
  loopSource?: string[];
};

function getLoopSources(ctx: PropertyGridLazyChoiceContext) {
  const editingObj = ctx.editingObj as LoopEditingObj | null;
  const loopSource = editingObj?.loopSource;
  if (!loopSource?.length) {
    return [];
  }

  return loopSource
    .map((name) => ctx.designerSurvey.getQuestionByName(name))
    .filter(
      (question): question is NonNullable<typeof question> => question != null,
    )
    .filter(isSelectBaseQuestion);
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
