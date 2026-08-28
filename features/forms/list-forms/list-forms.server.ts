import { ApiResult, EndatixApi } from "@/lib/endatix-api";
import type { PagedResponse } from "@/lib/endatix-api/shared/types";
import type { FormsListRequest } from "@/lib/endatix-api/forms/types";
import { Form } from "@/types";
import { Result } from "@/lib/result";
import { toResult } from "@/lib/result/map-api-result-to-result";
import { DataLoadError } from "@/lib/errors/data-load-error";
import type { Session } from "next-auth";

export async function getFormsListPromise(
  request: FormsListRequest,
  session: Session | null,
): Promise<PagedResponse<Form>> {
  const api = new EndatixApi(session?.accessToken);
  const apiResult = await api.forms.list(request);
  const result = toResult(apiResult, {
    fallbackMessage: "Failed to load forms.",
    logMessage: "Failed to load forms list.",
    loggerName: "forms.list",
  });

  if (Result.isError(result)) {
    throw ApiResult.isError(apiResult)
      ? DataLoadError.fromApiError(apiResult)
      : new DataLoadError(result.message, { errorCode: result.errorCode });
  }

  return result.value;
}
