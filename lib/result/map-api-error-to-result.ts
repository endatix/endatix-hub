import { ApiError, ApiErrorType } from '@/lib/endatix-api/shared/api-result';
import { Result, type ErrorSupport, type ResultType } from './result';

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

function supportFromApiError(apiError: ApiError): ErrorSupport {
  return {
    traceId: apiError.error.details?.traceId,
    statusCode: apiError.error.details?.statusCode,
  };
}

export function mapApiErrorToResult<T>(
  apiError: ApiError,
  options: MapApiErrorToResultOptions = {},
): ResultType<T> {
  const fallbackMessage = options.fallbackMessage ?? 'Request failed';
  const preferredFields = options.preferredFields ?? [];
  const fieldMessage = pickFieldMessage(apiError.error.fields, preferredFields);
  const message = fieldMessage || apiError.error.message || fallbackMessage;
  const details = apiError.error.details?.details;
  const errorCode = apiError.error.errorCode;
  const support = supportFromApiError(apiError);

  if (apiError.error.type === ApiErrorType.ValidationError) {
    return Result.validationError(message, details, errorCode, support);
  }

  return Result.error(message, details, errorCode, support);
}
