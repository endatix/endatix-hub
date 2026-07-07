import { createEndatixPublicApi } from "@/lib/endatix-api/public";
import { ApiResult } from "@/lib/endatix-api/shared/api-result";
import { resolveFormRuntimeState } from "@/lib/form-runtime/resolve-form-runtime-state";
import type { ExtensionRuntimeDeps } from "@/lib/survey-extensions/types";
import { withFormAccessJwtRetry } from "../utils/with-form-access-jwt-retry";

export async function resolveDataListDisplayValues(
  deps: ExtensionRuntimeDeps,
  dataListId: string,
  values: string[],
): Promise<ApiResult<Map<string, string>>> {
  const runtime = resolveFormRuntimeState(deps.getRuntimeState());
  if (!runtime || values.length === 0) {
    return ApiResult.authError("Form runtime is not available.");
  }

  const api = createEndatixPublicApi().dataLists;
  const response = await withFormAccessJwtRetry(runtime, (jwt) =>
    api.getDisplayValues({
      formId: runtime.formId,
      dataListId,
      formAccessJwt: jwt,
      values,
    }),
  );

  if (!response.success) {
    return response;
  }

  return ApiResult.success(
    new Map(response.data.map((item) => [item.value, item.label] as const)),
  );
}
