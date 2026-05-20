import { Result } from "@/lib/result";
import { apiResponses } from "@/lib/utils/route-handlers";
import { isFormAccessForbiddenResult } from "./form-access-result";

/** Maps form-storage {@link Result} failures to HTTP responses (fail closed on auth errors). */
export function mapGateResultToResponse<T>(result: Result<T>): Response | null {
  if (Result.isSuccess(result)) {
    return null;
  }

  const { message } = result;

  if (isFormAccessForbiddenResult(result)) {
    return apiResponses.forbidden({ detail: message });
  }

  return apiResponses.badRequest({ detail: message });
}
