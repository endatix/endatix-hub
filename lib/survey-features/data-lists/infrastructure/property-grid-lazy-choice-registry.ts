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

const LAZY_CHOICE_EDITOR_TYPES = new Set(["dropdown", "tagbox"]);

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
    if (!editor || !LAZY_CHOICE_EDITOR_TYPES.has(editor.getType())) {
      continue;
    }

    const choiceEditor = editor as Question & {
      choicesLazyLoadEnabled?: boolean;
      choicesLazyLoadPageSize?: number;
      choices?: unknown[];
    };

    if (!provider.shouldEnable(ctx)) {
      choiceEditor.choicesLazyLoadEnabled = false;
      choiceEditor.choices = provider.getStaticChoices?.(ctx, "") ?? [];
      continue;
    }

    choiceEditor.choicesLazyLoadEnabled = true;
    choiceEditor.choicesLazyLoadPageSize = DEFAULT_CHOICES_LAZY_LOAD_PAGE_SIZE;
    choiceEditor.choices = provider.getStaticChoices?.(ctx, "") ?? [];
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
