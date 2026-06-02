import { TelemetryLogger } from "@/features/telemetry";
import {
  ApiErrorType,
  ApiResult,
  type ApiError,
  type ApiResult as ApiResultType,
} from "@/lib/endatix-api/shared/api-result";
import { Result, type ResultType } from "@/lib/result";
import { mapApiErrorToResult } from "@/lib/result/map-api-error-to-result";
import { mapApiErrorToTelemetryAttributes } from "@/lib/result/map-api-error-to-telemetry-attributes";

type IsSameType<TLeft, TRight> = [TLeft] extends [TRight]
  ? [TRight] extends [TLeft]
    ? true
    : false
  : false;

type MapDataOption<TApiResult, TResult> =
  IsSameType<TApiResult, TResult> extends true
    ? { mapData?: (data: TApiResult) => TResult }
    : { mapData: (data: TApiResult) => TResult };

type MapApiResultToResultBaseOptions = {
  /**
   * The fallback message to use if the API result is not successful.
   */
  fallbackMessage?: string;
  /**
   * The preferred fields to use if the API result is a validation error.
   */
  preferredFields?: string[];
  /**
   * The message to log if the API result is not successful.
   */
  logMessage?: string;
  /**
   * The logger name to use if the API result is not successful.
   */
  loggerName?: string;
};

/**
 * Options for mapping an API result to a result.
 * @param TApiResult The type of the API result.
 * @param TResult The type of the result.
 */
export type MapApiResultToResultOptions<TApiResult, TResult = TApiResult> =
  MapApiResultToResultBaseOptions & MapDataOption<TApiResult, TResult>;

type MapApiResultToResultImplementationOptions<TApiResult, TResult> =
  MapApiResultToResultBaseOptions & {
    /**
     * The function to map the API result data to a result (for success cases).
     * @param data The data to map.
     * @returns The mapped result.
     */
    mapData?: (data: TApiResult) => TResult;
  };

const ExpectedApiErrorTypes = new Set<ApiErrorType>([
  ApiErrorType.ValidationError,
  ApiErrorType.AuthError,
  ApiErrorType.ForbiddenError,
  ApiErrorType.NotFoundError,
  ApiErrorType.RateLimitError,
]);

/**
 * Maps an API result to a result.
 * @param apiResult The API result to map.
 * @param options The options for the mapping.
 * @returns The result.
 */
export function mapToResult<TApiResult>(
  apiResult: ApiResultType<TApiResult>,
  options?: MapApiResultToResultOptions<TApiResult>,
): ResultType<TApiResult>;

export function mapToResult<TApiResult, TResult>(
  apiResult: ApiResultType<TApiResult>,
  options: MapApiResultToResultOptions<TApiResult, TResult>,
): ResultType<TResult>;

export function mapToResult<TApiResult, TResult = TApiResult>(
  apiResult: ApiResultType<TApiResult>,
  options: MapApiResultToResultImplementationOptions<TApiResult, TResult> = {},
): ResultType<TApiResult> | ResultType<TResult> {
  if (ApiResult.isSuccess(apiResult)) {
    if (options.mapData) {
      return Result.success(options.mapData(apiResult.data));
    }

    return Result.success(apiResult.data);
  }

  logApiError(apiResult, options);

  return mapApiErrorToResult<TResult>(apiResult, {
    fallbackMessage: options.fallbackMessage,
    preferredFields: options.preferredFields,
  });
}

/**
 * Logs an API error.
 * @param apiError The API error to log.
 * @param options The options for the logging.
 */
function logApiError<TApiResult, TResult>(
  apiError: ApiError,
  options: MapApiResultToResultImplementationOptions<TApiResult, TResult>,
): void {
  if (!options.logMessage || !shouldLogApiError(apiError)) {
    return;
  }

  TelemetryLogger.error(
    options.logMessage,
    undefined,
    mapApiErrorToTelemetryAttributes(apiError),
    options.loggerName,
  );
}

function shouldLogApiError(apiError: ApiError): boolean {
  return !ExpectedApiErrorTypes.has(apiError.error.type);
}
