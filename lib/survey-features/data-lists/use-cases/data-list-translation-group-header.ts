import {
  fromSurveyModelLocale,
  isDefaultCatalogLocale,
} from "@/lib/localization";
import { toLocaleNumber } from "@/lib/utils/number-utils";
import type { DataListTranslationCatalog } from "./surveyjs-translation-csv";

const DATA_LISTS_BASE_PATH = "/data-lists";

export const DATA_LIST_TRANSLATION_HELP =
  "Choice labels are not shown here. They come from this data list and are included when you export translations. You can update them by importing the file.";

export const DATA_LIST_LOCALE_TRANSLATED = "Translated";
export const DATA_LIST_LOCALE_NOT_TRANSLATED = "Not translated";

export function buildDataListDetailsPath(dataListId: string): string {
  return `${DATA_LISTS_BASE_PATH}/${encodeURIComponent(dataListId)}`;
}

export function formatDataListTranslationGroupTitle(
  catalog: DataListTranslationCatalog,
): string {
  const name = catalog.name?.trim() || `Data list ${catalog.dataListId}`;
  return `${name} (${formatItemCount(resolveCatalogItemCount(catalog))})`;
}

export function resolveCatalogItemCount(
  catalog: Pick<DataListTranslationCatalog, "itemsCount" | "items">,
): number {
  if (
    typeof catalog.itemsCount === "number" &&
    Number.isFinite(catalog.itemsCount)
  ) {
    return catalog.itemsCount;
  }

  return catalog.items.length;
}

export function isDataListLocaleAvailable(
  catalog: Pick<
    DataListTranslationCatalog,
    "availableLocales" | "defaultLocale"
  >,
  surveyLocale: string,
): boolean {
  const catalogLocale = fromSurveyModelLocale(surveyLocale);
  if (isDefaultCatalogLocale(catalogLocale)) {
    return true;
  }

  if (
    catalog.defaultLocale &&
    fromSurveyModelLocale(catalog.defaultLocale) === catalogLocale
  ) {
    return true;
  }

  return catalog.availableLocales.some(
    (locale) => locale.toLowerCase() === catalogLocale,
  );
}

export function dataListLocaleStatus(
  catalog: Pick<
    DataListTranslationCatalog,
    "availableLocales" | "defaultLocale"
  >,
  surveyLocale: string,
): string {
  return isDataListLocaleAvailable(catalog, surveyLocale)
    ? DATA_LIST_LOCALE_TRANSLATED
    : DATA_LIST_LOCALE_NOT_TRANSLATED;
}

function formatItemCount(count: number): string {
  return count === 1 ? "1 item" : `${toLocaleNumber(count)} items`;
}
