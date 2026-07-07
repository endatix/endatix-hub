import type { Question } from "survey-core";
import { normalizeChoiceKey } from "@/lib/utils/survey";
import { getDataListIdFromQuestion } from "../infrastructure/data-list-survey-integration";
import type { PropertyGridChoice } from "../types";

export function formatSourceChoiceLabel(
  sourceName: string,
  value: string,
  text: string,
): string {
  return `${sourceName}: (${text || value})`;
}

export function hasDataListSource(sources: Question[]): boolean {
  return sources.some((source) => getDataListIdFromQuestion(source) !== null);
}

export function getStaticChoicesFromSources(
  sources: Question[],
  filter: string,
  formatLabel: (
    sourceName: string,
    value: string,
    text: string,
  ) => string = formatSourceChoiceLabel,
): PropertyGridChoice[] {
  const normalizedFilter = filter.trim().toLowerCase();
  const seen = new Set<string>();
  const items: PropertyGridChoice[] = [];

  for (const source of sources) {
    if (getDataListIdFromQuestion(source)) {
      continue;
    }

    for (const choice of source.choices ?? []) {
      const value = normalizeChoiceKey(choice.value);
      if (!value || seen.has(value)) {
        continue;
      }

      const text = formatLabel(
        source.name,
        value,
        String(choice.text ?? choice.value),
      );

      if (
        normalizedFilter &&
        !text.toLowerCase().includes(normalizedFilter) &&
        !value.toLowerCase().includes(normalizedFilter)
      ) {
        continue;
      }

      seen.add(value);
      items.push({ value, text });
    }
  }

  return items;
}

export function getDataListSourceRefs(
  sources: Question[],
): Array<{ sourceName: string; dataListId: string }> {
  return sources.flatMap((source) => {
    const dataListId = getDataListIdFromQuestion(source);
    if (!dataListId) {
      return [];
    }

    return [{ sourceName: source.name, dataListId }];
  });
}
