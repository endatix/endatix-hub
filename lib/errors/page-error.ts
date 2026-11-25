import { ApiErrorType, ApiResult } from "@/lib/endatix-api";
import type { RequiredActionError } from "@/lib/endatix-api/auth/required-action";

export type ApiPageError =
  | RequiredActionError
  | { kind: "auth" }
  | { kind: "forbidden" }
  | { kind: "unavailable"; message: string }
  | { kind: "api"; message: string };

export type PageError = { kind: "not_found" } | ApiPageError;

export function toApiPageError<T>(result: ApiResult<T>): ApiPageError | null {
  if (ApiResult.isSuccess(result)) {
    return null;
  }

  if (result.error.type === ApiErrorType.AuthError) {
    return { kind: "auth" };
  }

  if (result.error.type === ApiErrorType.ForbiddenError) {
    return result.error.details?.requiredAction ?? { kind: "forbidden" };
  }
  if (result.error.details?.statusCode === 503) {
    return { kind: "unavailable", message: result.error.message };
  }
  return { kind: "api", message: result.error.message };
}
