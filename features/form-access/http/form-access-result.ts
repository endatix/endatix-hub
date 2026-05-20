import { Result } from "@/lib/result";

export const FORM_ACCESS_FORBIDDEN_DETAIL = "form-access-forbidden";

/** Marks a gate/authorize failure that must map to HTTP 403. */
export function formAccessForbidden<T>(message: string): Result<T> {
  return Result.error(message, FORM_ACCESS_FORBIDDEN_DETAIL);
}

/** Checks if a result is a form access forbidden result. */
export function isFormAccessForbiddenResult<T>(result: Result<T>): boolean {
  if (Result.isSuccess(result)) {
    return false;
  }

  if (result.details === FORM_ACCESS_FORBIDDEN_DETAIL) {
    return true;
  }

  return result.message.includes("does not match");
}
