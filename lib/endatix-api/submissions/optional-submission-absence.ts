import {
  isNotFoundError,
  isValidationError,
  type ApiResult,
} from "../shared/api-result";

/** The page can open after either outcome; a private image read requires definitive absence. */
export function optionalSubmissionAbsence(
  result: ApiResult<unknown>,
): "missing" | "invalid" | undefined {
  if (isNotFoundError(result)) return "missing";
  if (isValidationError(result)) return "invalid";
  return undefined;
}
