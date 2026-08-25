import type { DataList } from "@/lib/endatix-api/data-lists/types";

/**
 * Tenant cultures from list aggregates: DefaultLocale ∪ AvailableLocales.
 * Same source as OSS `DataList` / `ListDistinctLocalesAsync` — not item `labels` keys.
 */
export function collectCatalogLocales(lists: readonly DataList[]): string[] {
  const seen = new Set<string>();
  for (const list of lists) {
    if (list.defaultLocale) {
      seen.add(list.defaultLocale);
    }
    for (const locale of list.availableLocales ?? []) {
      seen.add(locale);
    }
  }

  return [...seen].sort((left, right) => left.localeCompare(right));
}
