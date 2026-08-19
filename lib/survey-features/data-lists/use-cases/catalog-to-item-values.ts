import { toSurveyModelLocale } from "@/lib/localization";
import { ItemValue } from "survey-core";
import type { DataListTranslationCatalog } from "./surveyjs-translation-csv";

export const TRANSLATION_GRID_HYDRATE_MAX_ITEMS = 500;

const DEFAULT_LABEL_KEY = "default";

export interface CatalogItemValueBuildResult {
  choices: ItemValue[];
  truncated: boolean;
}

export function buildItemValuesFromCatalog(
  catalog: DataListTranslationCatalog,
  maxItems: number = TRANSLATION_GRID_HYDRATE_MAX_ITEMS,
): CatalogItemValueBuildResult {
  const slice = catalog.items.slice(0, maxItems);
  const choices = slice.map((item) => catalogItemToItemValue(item.labels, item.value));

  return {
    choices,
    truncated: catalog.items.length > maxItems,
  };
}

function catalogItemToItemValue(
  labels: Record<string, string>,
  value: string,
): ItemValue {
  const defaultLabel = labels[DEFAULT_LABEL_KEY] ?? value;
  const choice = new ItemValue(value, defaultLabel);

  for (const [catalogLocale, text] of Object.entries(labels)) {
    if (catalogLocale === DEFAULT_LABEL_KEY || text.length === 0) {
      continue;
    }

    choice.locText.setLocaleText(toSurveyModelLocale(catalogLocale), text);
  }

  return choice;
}
