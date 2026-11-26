import {
  isNotFoundError,
  isValidationError,
  type ApiResult,
} from "../shared/api-result";

/** The ordinary share page treats an absent or invalid resume cookie as no partial submission. */
export function isMissingOptionalSubmission(
  result: ApiResult<unknown>,
): boolean {
  return isNotFoundError(result) || isValidationError(result);
}
