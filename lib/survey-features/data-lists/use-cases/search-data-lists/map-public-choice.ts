import type { DataListChoiceItem as ApiChoiceItem } from "@/lib/endatix-api/public/data-lists/types";
import {
  DEFAULT_CATALOG_LOCALE,
  isDefaultCatalogLocale,
} from "@/lib/localization";
import type { DataListChoiceItem } from "../../types";

/**
 * Maps Endatix public choice (`value` + `labels`) to a SurveyJS lazy-load item.
 * Passes API label maps through unchanged (`default` + cultures).
 */
export function mapPublicChoiceToSurveyItem(
  item: ApiChoiceItem,
): DataListChoiceItem {
  return {
    value: item.value,
    text: item.labels,
  };
}

/**
 * Resolves a display string from an API choice for a catalog locale.
 * Default / empty / SurveyJS defaultLocale code all use `labels.default`.
 */
export function resolvePublicChoiceLabel(
  item: ApiChoiceItem,
  preferredLocale?: string,
): string {
  const labels = item.labels;
  if (preferredLocale && !isDefaultCatalogLocale(preferredLocale)) {
    const localized = labels[preferredLocale];
    if (localized) {
      return localized;
    }
  }

  return labels[DEFAULT_CATALOG_LOCALE] ?? labels.default ?? item.value;
}
