import {
  ApiErrorType,
  type ApiResult,
} from "@/lib/endatix-api/shared/api-result";

/**
 * A heuristic for an API older than the route: the API answers its own 404s (form not found,
 * no link yet) as `application/problem+json`, while an API without the route answers a bare 404.
 */
export function isMissingRoute<T>(result: ApiResult<T>): boolean {
  return (
    !result.success &&
    result.error.type === ApiErrorType.NotFoundError &&
    result.error.details?.problemMediaType !== "application/problem+json"
  );
}
