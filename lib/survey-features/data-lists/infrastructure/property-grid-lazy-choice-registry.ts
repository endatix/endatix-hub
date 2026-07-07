import type { ExtensionRuntimeDeps } from "@/lib/survey-extensions/types";
import type { SurveyCreatorModel } from "survey-creator-core";
import type { Question } from "survey-core";
import { DEFAULT_CHOICES_LAZY_LOAD_PAGE_SIZE } from "../constants";
import type {
  PropertyGridLazyChoiceContext,
  PropertyGridLazyChoicePageParams,
  PropertyGridLazyChoiceProvider,
} from "../types";

export type {
  PropertyGridLazyChoiceContext,
  PropertyGridLazyChoicePageParams,
  PropertyGridLazyChoiceProvider,
} from "../types";

const providers = new Map<string, PropertyGridLazyChoiceProvider>();

export function registerPropertyGridLazyChoiceProvider(
  provider: PropertyGridLazyChoiceProvider,
): void {
  providers.set(provider.propertyName, provider);
}

export function unregisterPropertyGridLazyChoiceProvider(
  propertyName: string,
): void {
  providers.delete(propertyName);
}

export function getPropertyGridLazyChoiceProvider(
  propertyName: string,
): PropertyGridLazyChoiceProvider | undefined {
  return providers.get(propertyName);
}

export function clearPropertyGridLazyChoiceProvidersForTests(): void {
  providers.clear();
}

export function refreshPropertyGridLazyChoices(
  ctx: PropertyGridLazyChoiceContext,
): void {
  for (const provider of providers.values()) {
    const editor = ctx.propertyGridSurvey.getQuestionByName(
      provider.propertyName,
    );
    if (editor?.getType() !== "tagbox") {
      continue;
    }

    const tagbox = editor as Question & {
      choicesLazyLoadEnabled?: boolean;
      choicesLazyLoadPageSize?: number;
      choices?: unknown[];
    };

    if (!provider.shouldEnable(ctx)) {
      tagbox.choicesLazyLoadEnabled = false;
      tagbox.choices = provider.getStaticChoices?.(ctx, "") ?? [];
      continue;
    }

    tagbox.choicesLazyLoadEnabled = true;
    tagbox.choicesLazyLoadPageSize = DEFAULT_CHOICES_LAZY_LOAD_PAGE_SIZE;
    tagbox.choices = provider.getStaticChoices?.(ctx, "") ?? [];
  }
}

export function refreshPropertyGridLazyChoicesForCreator(
  creator: SurveyCreatorModel,
): void {
  const designerSurvey = creator.survey;
  const propertyGridSurvey = creator.propertyGrid;
  const editingObj =
    creator.selectedElement ?? propertyGridSurvey?.editingObj ?? null;

  if (!designerSurvey || !propertyGridSurvey || editingObj == null) {
    return;
  }

  refreshPropertyGridLazyChoices({
    designerSurvey,
    propertyGridSurvey,
    editingObj,
  });
}

export async function dispatchPropertyGridChoicesLazyLoad(
  ctx: PropertyGridLazyChoiceContext,
  propertyName: string,
  params: PropertyGridLazyChoicePageParams,
  deps: ExtensionRuntimeDeps,
): Promise<{
  items: Array<{ value: string; text: string }>;
  total: number;
} | null> {
  const provider = providers.get(propertyName);
  if (!provider?.shouldEnable(ctx)) {
    return null;
  }

  return provider.loadPage(ctx, params, deps);
}

export async function dispatchPropertyGridChoiceDisplayValues(
  ctx: PropertyGridLazyChoiceContext,
  propertyName: string,
  values: string[],
  deps: ExtensionRuntimeDeps,
): Promise<string[] | null> {
  const provider = providers.get(propertyName);
  if (!provider?.shouldEnable(ctx) || values.length === 0) {
    return null;
  }

  return provider.resolveDisplayValues(ctx, values, deps);
}
