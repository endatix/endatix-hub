import type { Question, SurveyModel } from "survey-core";
import type { SurveyCreatorModel } from "survey-creator-core";
import { getDataListIdFromQuestion } from "../infrastructure/data-list-survey-integration";
import {
  buildItemValuesFromCatalog,
  TRANSLATION_GRID_HYDRATE_MAX_ITEMS,
} from "./catalog-to-item-values";
import type { DataListTranslationCatalog } from "./surveyjs-translation-csv";

const TRANSLATION_TAB_NAME = "translation";

type TranslationItemLike = {
  context?: unknown;
  readOnly?: boolean;
  values: (locale: string) => { isReadOnly?: boolean } | null;
};

type TranslationRootLike = {
  allLocItems: TranslationItemLike[];
};

type TranslationModelLike = {
  reset: () => void;
  locales?: string[];
  root?: TranslationRootLike;
};

type TranslationTabPluginLike = {
  model?: TranslationModelLike;
};

export interface TranslationGridHydrateResult {
  truncatedListIds: string[];
}

export function hydrateTranslationGridFromCatalogs(
  survey: SurveyModel,
  catalogs: ReadonlyMap<string, DataListTranslationCatalog>,
  maxItemsPerList: number = TRANSLATION_GRID_HYDRATE_MAX_ITEMS,
): TranslationGridHydrateResult {
  const truncatedListIds: string[] = [];
  const hydratedQuestions = collectBoundQuestions(survey);

  for (const question of hydratedQuestions) {
    const dataListId = getDataListIdFromQuestion(question);
    if (!dataListId) {
      continue;
    }

    const catalog = catalogs.get(dataListId);
    if (!catalog) {
      continue;
    }

    const { choices, truncated } = buildItemValuesFromCatalog(catalog, maxItemsPerList);
    if (truncated) {
      truncatedListIds.push(dataListId);
    }

    const questionRecord = question as Question & Record<string, unknown>;
    questionRecord.choices = choices;
    questionRecord.choicesLazyLoadEnabled = false;
    questionRecord.__endatixTranslationHydrated = true;
  }

  return { truncatedListIds };
}

export function stripTranslationGridHydrate(survey: SurveyModel | null | undefined): void {
  if (!survey) {
    return;
  }

  for (const question of collectBoundQuestions(survey)) {
    const questionRecord = question as Question & Record<string, unknown>;
    if (!questionRecord.__endatixTranslationHydrated) {
      continue;
    }

    questionRecord.choices = [];
    questionRecord.choicesLazyLoadEnabled = true;
    delete questionRecord.__endatixTranslationHydrated;
  }
}

export function resetTranslationTabModel(creator: SurveyCreatorModel): void {
  const plugin = creator.getPlugin(TRANSLATION_TAB_NAME) as
    | TranslationTabPluginLike
    | undefined;
  plugin?.model?.reset();
}

export function markHydratedTranslationChoicesReadOnly(
  creator: SurveyCreatorModel,
): void {
  const plugin = creator.getPlugin(TRANSLATION_TAB_NAME) as
    | TranslationTabPluginLike
    | undefined;
  const model = plugin?.model;
  const root = model?.root;
  if (!root) {
    return;
  }

  const locales = [...(model.locales ?? []), ""];

  root.allLocItems.forEach((item) => {
    const context = item.context as { locOwner?: Question } | undefined;
    const owner = context?.locOwner;
    if (!owner || !(owner as Record<string, unknown>).__endatixTranslationHydrated) {
      return;
    }

    item.readOnly = true;
    for (const locale of locales) {
      const value = item.values(locale);
      if (value) {
        value.isReadOnly = true;
      }
    }
  });
}

function collectBoundQuestions(survey: SurveyModel): Question[] {
  return survey
    .getAllQuestions(false, true, true)
    .filter((question) => getDataListIdFromQuestion(question) !== null);
}
