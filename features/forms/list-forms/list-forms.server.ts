import { EndatixApi } from "@/lib/endatix-api";
import type { PagedResponse } from "@/lib/endatix-api/shared/types";
import type { FormsListRequest } from "@/lib/endatix-api/forms/types";
import { Form } from "@/types";
import { type ResultType } from "@/lib/result";
import { toResult } from "@/lib/result/map-api-result-to-result";
import type { Session } from "next-auth";

export type FormsListResult = ResultType<PagedResponse<Form>>;

/**
 * Loads a forms page as `Result` so ProblemDetails support fields
 * (`traceId`, `statusCode`) survive to the UI. Do not throw into `error.tsx`.
 */
export async function getFormsListPromise(
  request: FormsListRequest,
  session: Session | null,
): Promise<FormsListResult> {
  const api = new EndatixApi(session?.accessToken);
  const apiResult = await api.forms.list(request);
  return toResult(apiResult, {
    fallbackMessage: "Failed to load forms.",
    logMessage: "Failed to load forms list.",
    loggerName: "forms.list",
  });
}
