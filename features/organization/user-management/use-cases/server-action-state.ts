import type { ApiError } from "@/lib/endatix-api";
import type {
  ActionStateData,
  DeepFieldErrors,
  ServerActionState,
} from "@/lib/utils/zod-error-utils";

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
  console.error(`Unexpected error in ${actionName}:`, error);

  return {
    isSuccess: false,
    formErrors: ["Something went wrong. Please try again."],
    data,
  };
}
