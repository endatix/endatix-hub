import type { SubmissionGridSearchKeysResponse } from "@/lib/endatix-api/reporting/submission-grid-types";
import { Result } from "@/lib/result";
import type { SearchKeyChange } from "@/features/submissions/column-search";

export type SearchKeyOutcome = {
  variant: "success" | "error";
  message: string;
};

const SERVICE_UNAVAILABLE = 503;

/** endatix#1273: 503 when the form's schema lock is held too long. */
export const SEARCH_KEYS_BUSY_MESSAGE =
  "The form is being updated. Try again in a moment.";

/** A refusal keeps the API's words: its cap message names both limits. */
export function searchKeyOutcome(
  change: SearchKeyChange,
  title: string,
  result: Result<SubmissionGridSearchKeysResponse>,
): SearchKeyOutcome {
  if (Result.isError(result)) {
    const busy = result.statusCode === SERVICE_UNAVAILABLE;
    return {
      variant: "error",
      message: busy ? SEARCH_KEYS_BUSY_MESSAGE : result.message,
    };
  }

  const message =
    change === "add"
      ? `"${title}" is filterable once its answers are prepared.`
      : `"${title}" is no longer filterable.`;
  return { variant: "success", message };
}
