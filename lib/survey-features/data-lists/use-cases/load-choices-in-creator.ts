import { normalizeChoiceKey } from "@/lib/utils/survey";
import type { ExtensionRuntimeDeps } from "@/lib/survey-extensions/types";
import type { DataListSourceRef, PropertyGridChoice } from "../types";
import { searchDataListChoices } from "./search-data-list-choices";

/**
 * Loads a paged choice list for Creator property-grid tagboxes that aggregate
 * static source choices with one or more data-list sources.
 */
export async function loadChoicesInCreator(
  deps: ExtensionRuntimeDeps,
  dataListSources: DataListSourceRef[],
  staticItems: PropertyGridChoice[],
  params: { filter?: string; skip: number; take: number },
  formatLabel: (sourceName: string, value: string, text: string) => string,
): Promise<{ items: PropertyGridChoice[]; total: number }> {
  const filter = params.filter ?? "";

  if (dataListSources.length === 0) {
    const page = staticItems.slice(params.skip, params.skip + params.take);
    return { items: page, total: staticItems.length };
  }

  if (params.skip < staticItems.length) {
    const staticPage = staticItems.slice(
      params.skip,
      params.skip + params.take,
    );
    const apiTake = params.take - staticPage.length;

    if (apiTake <= 0) {
      return { items: staticPage, total: staticItems.length };
    }

    const apiItems = await fetchMergedDataListChoices(
      deps,
      dataListSources,
      { filter, skip: 0, take: apiTake },
      formatLabel,
    );

    return {
      items: [...staticPage, ...apiItems.items],
      total: staticItems.length + apiItems.total,
    };
  }

  const apiSkip = params.skip - staticItems.length;
  const apiItems = await fetchMergedDataListChoices(
    deps,
    dataListSources,
    { filter, skip: apiSkip, take: params.take },
    formatLabel,
  );

  return {
    items: apiItems.items,
    total: staticItems.length + apiItems.total,
  };
}

async function fetchMergedDataListChoices(
  deps: ExtensionRuntimeDeps,
  dataListSources: DataListSourceRef[],
  params: { filter?: string; skip: number; take: number },
  formatLabel: (sourceName: string, value: string, text: string) => string,
): Promise<{ items: PropertyGridChoice[]; total: number }> {
  const seen = new Set<string>();
  const merged: PropertyGridChoice[] = [];
  let total = 0;

  const responses = await Promise.all(
    dataListSources.map(async ({ sourceName, dataListId }) => {
      const response = await searchDataListChoices(deps, dataListId, params);
      return { sourceName, response };
    }),
  );

  for (const { sourceName, response } of responses) {
    if (!response.success) {
      continue;
    }

    total += response.data.total;

    for (const item of response.data.items) {
      const value = normalizeChoiceKey(item.value);
      if (!value || seen.has(value)) {
        continue;
      }

      seen.add(value);
      merged.push({
        value,
        text: formatLabel(sourceName, value, item.text),
      });

      if (merged.length >= params.take) {
        break;
      }
    }
  }

  return { items: merged.slice(0, params.take), total };
}
