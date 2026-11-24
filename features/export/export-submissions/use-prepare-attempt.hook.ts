import { useState } from "react";
import { Result } from "@/lib/result";
import {
  prepareReportingExportAction,
  type PrepareReportingExportResult,
} from "../prepare-reporting-export";
import {
  finishPrepare,
  readPrepareFailure,
  startPrepare,
  unconfirmed,
  type PrepareFailure,
} from "./prepare-recovery";

export type { PrepareFailure } from "./prepare-recovery";

/** What the dialog acts on once this attempt finished. A success is not readiness while an earlier attempt still runs. */
function settledOutcome(
  key: string,
  result: PrepareReportingExportResult,
  error: PrepareFailure | null,
) {
  if (error?.step === "refused") return { failure: error, returned: result };
  const recorded = readPrepareFailure(key);
  return { failure: recorded, returned: error ? result : (recorded ?? result) };
}

/** A thrown action leaves the outcome unknown, never Ready. */
function runPrepare(formId: string, fullRecompile: boolean) {
  return prepareReportingExportAction(formId, { fullRecompile }).catch(
    () => unconfirmed,
  );
}

export function usePrepareAttempt(formId: string) {
  const key = `export-prepare:${formId}`;
  const [failure, setFailure] = useState<PrepareFailure | null>(null);
  function restoreFailure() {
    const prior = readPrepareFailure(key);
    setFailure(prior);
    return prior;
  }
  async function prepare(fullRecompile: boolean) {
    const attempt = startPrepare(key);
    const result = await runPrepare(formId, fullRecompile);
    const error = Result.isError(result) ? result : null;
    if (!finishPrepare(attempt, error)) return unconfirmed;
    const outcome = settledOutcome(key, result, error);
    setFailure(outcome.failure);
    return outcome.returned;
  }
  return { failure, restoreFailure, prepare };
}
