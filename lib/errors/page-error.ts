import { ApiErrorType, ApiResult } from "@/lib/endatix-api";

export type ApiPageError =
  | { kind: "auth" }
  | { kind: "forbidden" }
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
    return { kind: "forbidden" };
  }

  return { kind: "api", message: result.error.message };
}
