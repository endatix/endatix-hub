import type { ExtensionRuntimeDeps } from "@/lib/survey-extensions/types";
import { normalizeChoiceKey } from "@/lib/utils/survey";
import type { Question } from "survey-core";
import {
  formatSourceChoiceLabel,
  getDataListSourceRefs,
  getStaticChoicesFromSources,
} from "../utils/property-grid-source-choices";
import { resolveDataListDisplayValues } from "./resolve-data-list-display-values";
import { resolvePublicChoiceLabel } from "./search-data-lists/map-public-choice";

/**
 * Resolves display labels for values selected from aggregated survey sources
 * (static inline choices first, then data-list sources in source order).
 */
export async function resolveMultiSourceDisplayValues(
  deps: ExtensionRuntimeDeps,
  sources: Question[],
  values: string[],
): Promise<string[]> {
  if (values.length === 0) {
    return [];
  }

  const labels = new Map<string, string>();
  const staticChoices = getStaticChoicesFromSources(sources, "");

  for (const value of values) {
    const normalized = normalizeChoiceKey(value);
    const staticMatch = staticChoices.find((item) => item.value === normalized);
    if (staticMatch) {
      labels.set(normalized, staticMatch.text);
    }
  }

  const dataListSources = getDataListSourceRefs(sources);

  for (const { sourceName, dataListId } of dataListSources) {
    const unresolved = values
      .map((value) => normalizeChoiceKey(value))
      .filter((value) => value && !labels.has(value));

    if (unresolved.length === 0) {
      break;
    }

    const response = await resolveDataListDisplayValues(
      deps,
      dataListId,
      unresolved,
    );

    if (!response.success) {
      console.error(
        "Failed to resolve data list display values for merged source.",
        {
          sourceName,
          dataListId,
          type: response.error.type,
          message: response.error.message,
          errorCode: response.error.errorCode,
        },
      );
      continue;
    }

    for (const value of unresolved) {
      const labelsByLocale = response.data.get(value);
      if (!labelsByLocale) {
        continue;
      }

      const flatLabel = resolvePublicChoiceLabel({
        value,
        labels: labelsByLocale,
      });
      labels.set(value, formatSourceChoiceLabel(sourceName, value, flatLabel));
    }
  }

  return values.map((value) => {
    const normalized = normalizeChoiceKey(value);
    return labels.get(normalized) ?? String(value);
  });
}
