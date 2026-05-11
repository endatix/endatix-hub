import { ApiError, ApiErrorType } from "@/lib/endatix-api/shared/api-result";
import { Result, type ResultType } from "@/lib/result";

type MapApiErrorToResultOptions = {
  fallbackMessage?: string;
  preferredFields?: string[];
};

function pickFieldMessage(
  fields: Record<string, string[]> | undefined,
  preferredFields: string[],
): string | undefined {
  if (!fields) {
    return undefined;
  }

  for (const field of preferredFields) {
    const first = fields[field]?.[0];
    if (first) {
      return first;
    }
  }

  for (const fieldErrors of Object.values(fields)) {
    const first = fieldErrors?.[0];
    if (first) {
      return first;
    }
  }

  return undefined;
}

export function mapApiErrorToResult<T>(
  apiError: ApiError,
  options: MapApiErrorToResultOptions = {},
): ResultType<T> {
  const fallbackMessage = options.fallbackMessage ?? "Request failed";
  const preferredFields = options.preferredFields ?? [];
  const fieldMessage = pickFieldMessage(apiError.error.fields, preferredFields);
  const message = fieldMessage || apiError.error.message || fallbackMessage;
  const details = apiError.error.details?.details;

  if (apiError.error.type === ApiErrorType.ValidationError) {
    return Result.validationError(message, details);
  }

  return Result.error(message, details);
}
