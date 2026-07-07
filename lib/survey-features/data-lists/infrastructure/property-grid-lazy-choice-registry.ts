import type { ExtensionRuntimeDeps } from "@/lib/survey-extensions/types";
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

export function setupPropertyGridLazyChoices(
  ctx: PropertyGridLazyChoiceContext,
): void {
  for (const provider of providers.values()) {
    if (!provider.shouldEnable(ctx)) {
      continue;
    }

    const editor = ctx.propertyGridSurvey.getQuestionByName(
      provider.propertyName,
    );
    if (!editor || editor.getType() !== "tagbox") {
      continue;
    }

    const tagbox = editor as Question & {
      choicesLazyLoadEnabled?: boolean;
      choicesLazyLoadPageSize?: number;
      choices?: unknown[];
    };

    tagbox.choicesLazyLoadEnabled = true;
    tagbox.choicesLazyLoadPageSize = DEFAULT_CHOICES_LAZY_LOAD_PAGE_SIZE;
    tagbox.choices = provider.getStaticChoices?.(ctx, "") ?? [];
  }
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
  if (!provider || !provider.shouldEnable(ctx)) {
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
  if (!provider || values.length === 0 || !provider.shouldEnable(ctx)) {
    return null;
  }

  return provider.resolveDisplayValues(ctx, values, deps);
}
