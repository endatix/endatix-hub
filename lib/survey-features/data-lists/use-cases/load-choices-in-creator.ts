import { normalizeChoiceKey } from "@/lib/utils/survey";
import type { ExtensionRuntimeDeps } from "@/lib/survey-extensions/types";
import type { DataListSourceRef, PropertyGridChoice } from "../types";
import { searchDataListChoices } from "./search-data-list-choices";

type DataListSearchResult = Awaited<ReturnType<typeof searchDataListChoices>>;

/**
 * Loads a paged choice list for Creator property-grid tagboxes that aggregate
 * static source choices with one or more data-list sources.
 *
 * **Total count:** `total` is `staticItems.length` plus the sum of each data-list
 * source's API `total`. Cross-source duplicate values are removed from `items`, but
 * not subtracted from `total`, so `total` may exceed the number of distinct choices
 * when sources overlap. SurveyJS may allow scrolling slightly past the last distinct
 * item before pages return empty.
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

    if (apiTake === 0) {
      const dataListTotal = await getMergedDataListChoicesTotal(
        deps,
        dataListSources,
        filter,
      );

      return {
        items: staticPage,
        total: staticItems.length + dataListTotal,
      };
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
  let remainingSkip = params.skip;
  let remainingTake = params.take;

  for (const { sourceName, dataListId } of dataListSources) {
    if (remainingTake <= 0) {
      break;
    }

    const response = await searchDataListChoices(deps, dataListId, {
      filter: params.filter,
      skip: remainingSkip,
      take: remainingTake,
    });

    const sourceTotal = resolveSourceTotal(response);
    if (sourceTotal !== null) {
      total += sourceTotal;
    }

    if (!response.success) {
      logDataListSourceError(sourceName, dataListId, response);
      if (sourceTotal !== null && remainingSkip >= sourceTotal) {
        remainingSkip -= sourceTotal;
      }
      continue;
    }

    if (remainingSkip >= response.data.total) {
      remainingSkip -= response.data.total;
      continue;
    }

    appendUniqueChoices(
      merged,
      seen,
      response.data.items,
      sourceName,
      formatLabel,
      params.take,
    );

    remainingSkip = 0;
    remainingTake = params.take - merged.length;
  }

  return { items: merged.slice(0, params.take), total };
}

async function getMergedDataListChoicesTotal(
  deps: ExtensionRuntimeDeps,
  dataListSources: DataListSourceRef[],
  filter: string,
): Promise<number> {
  const totals = await Promise.all(
    dataListSources.map(async ({ sourceName, dataListId }) => {
      const response = await searchDataListChoices(deps, dataListId, {
        filter,
        skip: 0,
        take: 1,
      });

      if (!response.success) {
        logDataListSourceError(sourceName, dataListId, response);
        return 0;
      }

      return response.data.total;
    }),
  );

  return totals.reduce((sum, total) => sum + total, 0);
}

function resolveSourceTotal(response: DataListSearchResult): number | null {
  if (response.success) {
    return response.data.total;
  }

  return null;
}

function logDataListSourceError(
  sourceName: string,
  dataListId: string,
  response: DataListSearchResult,
): void {
  if (response.success) {
    return;
  }

  console.error("Failed to lazy-load data list choices for merged source.", {
    sourceName,
    dataListId,
    type: response.error.type,
    message: response.error.message,
    errorCode: response.error.errorCode,
  });
}

function appendUniqueChoices(
  merged: PropertyGridChoice[],
  seen: Set<string>,
  items: Array<{ value: string; text: string }>,
  sourceName: string,
  formatLabel: (sourceName: string, value: string, text: string) => string,
  takeTarget: number,
): void {
  for (const item of items) {
    if (merged.length >= takeTarget) {
      break;
    }

    const value = normalizeChoiceKey(item.value);
    if (!value || seen.has(value)) {
      continue;
    }

    seen.add(value);
    merged.push({
      value,
      text: formatLabel(sourceName, value, item.text),
    });
  }
}
