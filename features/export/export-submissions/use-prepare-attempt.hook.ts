import { useState } from "react";
import { Kind, ErrorType, Result } from "@/lib/result";
import {
  prepareReportingExportAction,
  type PrepareReportingExportResult,
} from "../prepare-reporting-export";

export type PrepareFailure = Exclude<
  PrepareReportingExportResult,
  { value: unknown }
>;

const UNCONFIRMED: PrepareFailure = {
  kind: Kind.Error,
  errorType: ErrorType.Error,
  message:
    "Preparation could not be confirmed. Prepare again before exporting.",
};

// A remount may forget diagnostics, but it must not promote an interrupted run to Ready.
function markIncomplete(key: string, incomplete: boolean) {
  try {
    if (incomplete) sessionStorage.setItem(key, "1");
    else sessionStorage.removeItem(key);
  } catch {
    /* The mounted window still has the latest attempt. */
  }
}

export function usePrepareAttempt(formId: string) {
  const key = `export-prepare:${formId}`;
  const [failure, setFailure] = useState<PrepareFailure | null>(null);
  const lastFailure = () => failure ?? interruptedAttempt(key);
  async function prepare(fullRecompile: boolean) {
    markIncomplete(key, true);
    const result = await prepareReportingExportAction(formId, {
      fullRecompile,
    }).catch(() => UNCONFIRMED);
    const next = Result.isError(result) ? result : null;
    setFailure(next);
    markIncomplete(key, next !== null);
    return result;
  }
  return { failure, lastFailure, prepare };
}

function interruptedAttempt(key: string) {
  try {
    return sessionStorage.getItem(key) === "1" ? UNCONFIRMED : null;
  } catch {
    return null;
  }
}
