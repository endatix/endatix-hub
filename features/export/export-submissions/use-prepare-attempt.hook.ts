import { useState } from "react";
import { Result } from "@/lib/result";
import { prepareReportingExportAction } from "../prepare-reporting-export";
import {
  finishPrepare,
  readPrepareFailure,
  startPrepare,
  unconfirmed,
  type PrepareFailure,
} from "./prepare-recovery";

export type { PrepareFailure } from "./prepare-recovery";

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
    const result = await prepareReportingExportAction(formId, {
      fullRecompile,
    }).catch(() => unconfirmed);
    const error = Result.isError(result) ? result : null;
    if (!finishPrepare(attempt, error)) return unconfirmed;
    setFailure(error?.step === "refused" ? error : readPrepareFailure(key));
    return result;
  }
  return { failure, restoreFailure, prepare };
}
