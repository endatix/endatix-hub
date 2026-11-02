import { isRedirectError } from "next/dist/client/components/redirect-error";
import { Result } from "./result";

/**
 * `.catch` handler for a server action called from the client: a thrown
 * failure (network, server crash) becomes `Result.error(message)` so the
 * caller's existing error branch shows it. A Next redirect keeps propagating.
 */
export function toActionFailure<T>(message: string) {
  return (error: unknown): Result<T> => {
    if (isRedirectError(error)) {
      throw error;
    }
    return Result.error(message);
  };
}
