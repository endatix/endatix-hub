import { Helpers, type ItemValue } from "survey-core";

/**
 * True when the choice has an explicit data-list catalog label, not SurveyJS
 * identity fallback.
 *
 * Uses SurveyJS domain APIs (see ItemValue / LocalizableString):
 * - {@link ItemValue.hasText} — `text` falls back to `value` when false
 * - {@link LocalizableString.hasNonDefaultText} — multilingual locale map
 * - same default-text≈value rule SurveyJS uses when omitting `text` from JSON
 */
export function hasCatalogLabelMap(item: ItemValue): boolean {
  if (!item.hasText) {
    return false;
  }

  const locText = item.locText;
  if (locText.hasNonDefaultText()) {
    return true;
  }

  return !Helpers.isTwoValueEquals(
    item.value,
    locText.getLocaleText(""),
    false,
    true,
    false,
  );
}

/**
 * Reads stored catalog labels via {@link LocalizableString.getLocales} /
 * {@link LocalizableString.getLocaleText} (avoids {@link LocalizableString.getJson}
 * collapsing monolingual maps to a plain string).
 */
export function readCatalogLabels(item: ItemValue): Record<string, string> {
  const locText = item.locText;
  const locales = locText.getLocales();
  if (locales.length === 0) {
    return { default: item.pureText || String(item.value ?? "") };
  }

  const labels: Record<string, string> = {};
  for (const locale of locales) {
    labels[locale] = locText.getLocaleText(locale);
  }
  return labels;
}
