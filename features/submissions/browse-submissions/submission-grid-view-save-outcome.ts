import type { SubmissionView } from "@/lib/endatix-api/reporting/submission-view-types";
import { Result } from "@/lib/result";
import type { SaveSubmissionGridViewResult } from "./save-submission-grid-view.action";

const CONFLICT_STATUS = 409;

export const VIEW_CONFLICT_MESSAGE =
  "Someone saved this view after you opened it. Their view is loaded now; make your changes again to save.";

/** What the grid does after Save view. A conflict reloads the latest view. */
export type SaveViewOutcome =
  | { kind: "saved"; view: SubmissionView }
  | { kind: "conflict"; message: string }
  | { kind: "error"; message: string };

export function saveViewOutcome(
  result: SaveSubmissionGridViewResult,
): SaveViewOutcome {
  if (Result.isSuccess(result)) {
    return { kind: "saved", view: result.value };
  }

  return result.statusCode === CONFLICT_STATUS
    ? { kind: "conflict", message: VIEW_CONFLICT_MESSAGE }
    : { kind: "error", message: result.message };
}
