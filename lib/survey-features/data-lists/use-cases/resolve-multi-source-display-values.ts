import type { ExtensionRuntimeDeps } from "@/lib/survey-extensions/types";
import { normalizeChoiceKey } from "@/lib/utils/survey";
import type { Question } from "survey-core";
import {
  formatSourceChoiceLabel,
  getDataListSourceRefs,
  getStaticChoicesFromSources,
} from "../utils/property-grid-source-choices";
import type { DataListSourceRef } from "../types";
import { dataListChoiceSource } from "./data-list-choice-source";
import { resolvePublicChoiceLabel } from "./search-data-lists/map-public-choice";

type DataListLabels = Map<string, Record<string, string>>;

/**
 * Resolves display labels for values selected from aggregated survey sources.
 * Static inline choices win; the values they leave go to every data-list
 * source in parallel, and the first source in source order that holds a value
 * labels it. A value no source holds shows its raw value.
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

  const unresolved = [
    ...new Set(values.map((value) => normalizeChoiceKey(value))),
  ].filter((value) => value && !labels.has(value));

  if (unresolved.length > 0) {
    const dataListSources = getDataListSourceRefs(sources);
    const responses = await Promise.all(
      dataListSources.map((source) =>
        fetchSourceLabels(deps, source, unresolved),
      ),
    );
    dataListSources.forEach(({ sourceName }, index) => {
      mergeSourceLabels(labels, sourceName, unresolved, responses[index]);
    });
  }

  return values.map((value) => {
    const normalized = normalizeChoiceKey(value);
    return labels.get(normalized) ?? String(value);
  });
}

async function fetchSourceLabels(
  deps: ExtensionRuntimeDeps,
  { sourceName, dataListId }: DataListSourceRef,
  values: string[],
): Promise<DataListLabels | null> {
  const response = await dataListChoiceSource(deps).resolveDisplayValues(
    dataListId,
    values,
  );
  if (response.success) {
    return response.data;
  }

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
  return null;
}

/** Adds the values this source holds that no earlier source labelled. */
function mergeSourceLabels(
  labels: Map<string, string>,
  sourceName: string,
  values: string[],
  sourceLabels: DataListLabels | null,
): void {
  for (const value of values) {
    const labelsByLocale = sourceLabels?.get(value);
    if (labels.has(value) || !labelsByLocale || isMiss(value, labelsByLocale)) {
      continue;
    }

    const flatLabel = resolvePublicChoiceLabel({
      value,
      labels: labelsByLocale,
    });
    labels.set(value, formatSourceChoiceLabel(sourceName, value, flatLabel));
  }
}

/**
 * A source maps a value it does not hold to `{ default: value }`
 * (the `DataListChoiceSource` contract), so that map leaves the value to later sources.
 */
function isMiss(
  value: string,
  labelsByLocale: Record<string, string>,
): boolean {
  const locales = Object.keys(labelsByLocale);
  return (
    locales.length === 1 &&
    locales[0] === "default" &&
    labelsByLocale.default === value
  );
}
