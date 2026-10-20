import type { SubmissionGridSearchKeysResponse } from "@/lib/endatix-api/reporting/submission-grid-types";
import { Result } from "@/lib/result";
import type { SearchKeyChange } from "@/features/submissions/column-search";

/** What to tell the editor, and whether to read the columns again. */
export type SearchKeyOutcome = {
  variant: "success" | "error";
  message: string;
  refresh: boolean;
};

const SERVICE_UNAVAILABLE = 503;

/** The form's schema was locked by a compile or another change for too long. */
export const SEARCH_KEYS_BUSY_MESSAGE =
  "The form is being updated. Try again in a moment.";

/**
 * A refusal keeps the API's words: the cap message names both limits.
 * A key comes back pending, so its filter says it is preparing.
 */
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
      refresh: false,
    };
  }

  const message =
    change === "add"
      ? `"${title}" is filterable once its answers are prepared.`
      : `"${title}" is no longer filterable.`;
  return { variant: "success", message, refresh: true };
}
