import type {
  PrepareReportingExportResult,
  RefreshIncompleteSubmissionsResult,
} from "@/features/export/server";
import { Result } from "@/lib/result";
import { formatInteger } from "@/lib/utils/formatters";

export type ReadinessActionOutcome = {
  variant: "success" | "warning" | "error";
  message: string;
  refresh: boolean;
};

export function prepareOutcome(
  result: PrepareReportingExportResult,
): ReadinessActionOutcome {
  if (Result.isError(result)) {
    return failed(result.message);
  }

  const { processed, failed: notPrepared } = result.value;
  return notPrepared > 0
    ? refreshed(
        "warning",
        `Prepared ${formatInteger(processed)}; ${formatInteger(notPrepared)} could not be prepared.`,
      )
    : refreshed("success", `Prepared ${formatInteger(processed)} submissions.`);
}

export function includeInProgressOutcome(
  result: RefreshIncompleteSubmissionsResult,
): ReadinessActionOutcome {
  if (Result.isError(result)) {
    return failed(result.message);
  }

  const outcome = result.value;
  if (outcome.kind === "skipped") {
    return {
      variant: "warning",
      message:
        "Including in-progress submissions needs permission to edit the form.",
      refresh: false,
    };
  }

  return inProgressRefreshed(outcome.failed, outcome.finished);
}

function inProgressRefreshed(
  notIncluded: number,
  finished: boolean,
): ReadinessActionOutcome {
  if (!finished) {
    return refreshed(
      "warning",
      "Stopped after the batch limit. Include in-progress submissions again to continue.",
    );
  }

  return notIncluded > 0
    ? refreshed(
        "warning",
        `${formatInteger(notIncluded)} in-progress submissions could not be included.`,
      )
    : refreshed("success", "In-progress submissions included.");
}

function refreshed(
  variant: ReadinessActionOutcome["variant"],
  message: string,
): ReadinessActionOutcome {
  return { variant, message, refresh: true };
}

function failed(message: string): ReadinessActionOutcome {
  return { variant: "error", message, refresh: false };
}
