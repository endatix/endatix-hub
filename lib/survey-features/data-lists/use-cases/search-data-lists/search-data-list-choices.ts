import { createEndatixPublicApi } from "@/lib/endatix-api/public";
import { ApiResult } from "@/lib/endatix-api/shared/api-result";
import { resolveFormRuntimeState } from "@/lib/form-runtime/resolve-form-runtime-state";
import type { ExtensionRuntimeDeps } from "@/lib/survey-extensions/types";
import type { DataListChoiceItem, DataListChoicePageParams } from "../../types";
import { withFormAccessJwtRetry } from "../../utils/with-form-access-jwt-retry";
import { mapPublicChoiceToSurveyItem } from "./map-public-choice";
import { mapSurveySearchModeToMatchMode } from "./map-survey-search-mode";

export async function searchDataListChoices(
  deps: ExtensionRuntimeDeps,
  dataListId: string,
  params: DataListChoicePageParams,
): Promise<ApiResult<{ items: DataListChoiceItem[]; total: number }>> {
  const runtime = resolveFormRuntimeState(deps.getRuntimeState());
  if (!runtime) {
    return ApiResult.authError("Form runtime is not available.");
  }

  const api = createEndatixPublicApi().dataLists;
  const response = await withFormAccessJwtRetry(runtime, (jwt) =>
    api.search({
      formId: runtime.formId,
      dataListId,
      formAccessJwt: jwt,
      query: params.filter,
      matchMode: mapSurveySearchModeToMatchMode(params.searchMode),
      locale: params.locale,
      includeLocales: params.includeLocales,
      skip: params.skip,
      take: params.take,
    }),
  );

  if (!response.success) {
    return response;
  }

  return ApiResult.success({
    items: response.data.items.map(mapPublicChoiceToSurveyItem),
    total: response.data.totalRecords,
  });
}
