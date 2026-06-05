import type { ApiError } from "@/lib/endatix-api";
import type {
  ActionStateData,
  DeepFieldErrors,
  ServerActionState,
} from "@/lib/utils/zod-error-utils";
import { TelemetryLogger } from "@/features/telemetry";

const LOGGER_NAME = "organization.user-management";
const AUTH_FAILURE_STATUSES = new Set([401, 403]);

/**
 * Maps an API error to a server action state.
 * @param result - The API error to map.
 * @param data - The data to include in the state.
 * @returns The server action state.
 */
export function stateFromApiError<TState extends ActionStateData>(
  result: ApiError,
  data: TState,
): ServerActionState<TState> {
  return {
    isSuccess: false,
    formErrors: [result.error.message],
    errors: result.error.fields as DeepFieldErrors<TState> | undefined,
    data,
  };
}

/**
 * Maps an unexpected error to a server action state.
 * @param error - The unexpected error to map.
 * @param data - The data to include in the state.
 * @param actionName - The name of the action that caused the error.
 * @returns The server action state.
 */
export function stateFromUnexpectedError<TState extends ActionStateData>(
  error: unknown,
  data: TState,
  actionName: string,
): ServerActionState<TState> {
  const isAuthFailure = isKnownAuthFailure(error);
  if (!isAuthFailure) {
    TelemetryLogger.error(
      "Unexpected user-management server action error",
      undefined,
      {
        actionName,
        isAuthFailure,
      },
      LOGGER_NAME,
    );
  }

  return {
    isSuccess: false,
    formErrors: ["Something went wrong. Please try again."],
    data,
  };
}

function isKnownAuthFailure(error: unknown): boolean {
  const status = getErrorStatus(error);
  if (status !== null && AUTH_FAILURE_STATUSES.has(status)) {
    return true;
  }

  const errorName = error instanceof Error ? error.name : undefined;
  return (
    errorName?.includes("Auth") === true ||
    errorName?.includes("Authentication") === true ||
    errorName?.includes("Authorization") === true
  );
}

function getErrorStatus(error: unknown): number | null {
  if (!isErrorLikeRecord(error)) {
    return null;
  }

  return toStatusCode(error.status) ?? toStatusCode(error.statusCode);
}

function isErrorLikeRecord(error: unknown): error is {
  status?: unknown;
  statusCode?: unknown;
} {
  return typeof error === "object" && error !== null;
}

function toStatusCode(value: unknown): number | null {
  return typeof value === "number" ? value : null;
}
