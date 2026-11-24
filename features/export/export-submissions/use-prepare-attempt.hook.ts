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
  attempt: ReturnType<typeof startPrepare>,
  result: PrepareReportingExportResult,
) {
  const failure = Result.isError(result) ? result : null;
  const authoritative = finishPrepare(attempt, failure);
  // A refusal explains this click; it did not mutate the schema or repair the durable failure.
  if (authoritative && failure?.step === "refused") return failure;
  return (
    readPrepareFailure(attempt.key) ?? (authoritative ? result : unconfirmed)
  );
}

/** A thrown action leaves the outcome unknown, never Ready. */
function runPrepare(formId: string, fullRecompile: boolean) {
  return prepareReportingExportAction(formId, { fullRecompile }).catch(
    () => unconfirmed,
  );
}

// A refusal changed nothing; once the reader leaves it, it must not describe a later error.
const withoutRefusal = (failure: PrepareFailure | null) =>
  failure?.step === "refused" ? null : failure;

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
    const outcome = settledOutcome(attempt, result);
    setFailure(Result.isError(outcome) ? outcome : null);
    return outcome;
  }
  const forgetRefusal = () => setFailure(withoutRefusal);
  const requiresRepair = () => readPrepareFailure(key) !== null;
  return { failure, restoreFailure, prepare, forgetRefusal, requiresRepair };
}
