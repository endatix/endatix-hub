import { ApiResult } from "@/lib/endatix-api/shared/api-result";
import type { DataListChoiceItem as ApiChoiceItem } from "@/lib/endatix-api/data-lists/types";
import { Result } from "@/lib/result";
import type {
  DataListChoicePageParams,
  DataListChoiceSource,
} from "@/lib/survey-features/data-lists";
import {
  mapPublicChoiceToSurveyItem,
  mapSurveySearchModeToMatchMode,
} from "@/lib/survey-features/data-lists/use-cases/search-data-lists";
import { resolveDataListItemLabelsAction } from "./resolve-data-list-item-labels.action";
import { searchDataListItemsAction } from "./search-data-list-items.action";
import type { DataListItemsRangeRequest } from "./types";

type ResultError = Extract<Result<unknown>, { message: string }>;

function toApiError<T>(error: ResultError): ApiResult<T> {
  return ApiResult.unknownError(error.message, undefined, error.errorCode);
}

function toRangeRequest(
  params: DataListChoicePageParams,
): DataListItemsRangeRequest {
  const filter = params.filter?.trim();
  return {
    query: filter ? filter : undefined,
    matchMode: mapSurveySearchModeToMatchMode(params.searchMode),
    locale: params.locale,
    includeLocales: params.includeLocales,
    skip: params.skip,
    take: params.take,
  };
}

function labelsPerValue(values: string[], items: ApiChoiceItem[]) {
  const labelsByValue = new Map(items.map((item) => [item.value, item.labels]));
  return new Map(
    values.map((value) => {
      const labels = labelsByValue.get(value) ?? { default: value };
      return [value, { ...labels }] as const;
    }),
  );
}

/**
 * Data-list choices for the form designer, read through the staff API
 * (Forms View). A list bound in the designer previews before the form is
 * saved, since the staff routes do not depend on the saved definition.
 */
export const designerDataListChoiceSource: DataListChoiceSource = {
  searchChoices: async (dataListId, params) => {
    const result = await searchDataListItemsAction(
      dataListId,
      toRangeRequest(params),
    );
    if (Result.isError(result)) {
      return toApiError(result);
    }

    return ApiResult.success({
      items: result.value.items.map((item) =>
        mapPublicChoiceToSurveyItem(item),
      ),
      total: result.value.totalRecords,
    });
  },

  resolveDisplayValues: async (dataListId, values, options) => {
    const distinctValues = [...new Set(values.map(String))].filter(Boolean);
    const result = await resolveDataListItemLabelsAction(
      dataListId,
      distinctValues,
      options,
    );
    if (Result.isError(result)) {
      return toApiError(result);
    }

    return ApiResult.success(labelsPerValue(distinctValues, result.value));
  },
};
