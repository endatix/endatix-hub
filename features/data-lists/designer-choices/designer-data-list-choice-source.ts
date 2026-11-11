import { ApiResult } from "@/lib/endatix-api/shared/api-result";
import { Result } from "@/lib/result";
import type { DataListChoiceSource } from "@/lib/survey-features/data-lists";
import {
  mapPublicChoiceToSurveyItem,
  mapSurveySearchModeToMatchMode,
} from "@/lib/survey-features/data-lists/use-cases/search-data-lists";
import { resolveDataListItemLabelsAction } from "./resolve-data-list-item-labels.action";
import { searchDataListItemsAction } from "./search-data-list-items.action";

type ResultError = Extract<Result<unknown>, { message: string }>;

function toApiError<T>(error: ResultError): ApiResult<T> {
  return ApiResult.unknownError(error.message, undefined, error.errorCode);
}

/**
 * Data-list choices for the form designer, read through the staff API
 * (Forms View). A list bound in the designer previews before the form is
 * saved, since the staff routes do not depend on the saved definition.
 */
export const designerDataListChoiceSource: DataListChoiceSource = {
  searchChoices: async (dataListId, params) => {
    const filter = params.filter?.trim();
    const result = await searchDataListItemsAction(dataListId, {
      query: filter ? filter : undefined,
      matchMode: mapSurveySearchModeToMatchMode(params.searchMode),
      locale: params.locale,
      includeLocales: params.includeLocales,
      skip: params.skip,
      take: params.take,
    });
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
    const distinctValues = [
      ...new Set(values.map(String).filter((value) => value.length > 0)),
    ];
    const result = await resolveDataListItemLabelsAction(
      dataListId,
      distinctValues,
      options,
    );
    if (Result.isError(result)) {
      return toApiError(result);
    }

    const labelsByValue = new Map(
      result.value.map((item) => [item.value, item.labels] as const),
    );
    return ApiResult.success(
      new Map(
        distinctValues.map(
          (value) =>
            [
              value,
              { ...(labelsByValue.get(value) ?? { default: value }) },
            ] as const,
        ),
      ),
    );
  },
};
