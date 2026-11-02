import type { SubmissionGridRowsPage } from "@/lib/endatix-api/reporting/submission-grid";
import {
  REPORTING_NOT_PREPARED_ERROR_CODE,
  type SubmissionGridColumnsResponse,
  type SubmissionGridReadiness,
} from "@/lib/endatix-api/reporting/submission-grid-types";
import {
  Result,
  type Error as ResultError,
  type ResultType,
} from "@/lib/result";
import { toAnswerColumns, type AnswerColumn } from "./submission-grid-columns";
import { SUBMISSION_GRID_DEFAULT_PAGE } from "./submission-grid-url.constants";
import {
  buildSubmissionGridPath,
  type SubmissionGridUrlState,
} from "./submission-grid-url";

export type SubmissionGridColumnsLoad =
  /** 404: the Reporting module is off or the form is missing; another grid takes over. */
  | { kind: "unavailable" }
  | { kind: "error"; result: ResultError }
  | {
      kind: "ready";
      schemaReady: boolean;
      readiness: SubmissionGridReadiness;
      catalog: AnswerColumn[];
    };

export type SubmissionGridRowsLoad =
  | {
      kind: "ready";
      page: SubmissionGridRowsPage;
      answerFiltersNotPrepared?: true;
    }
  | { kind: "error"; result: ResultError }
  | { kind: "redirect"; href: string };

export function resolveSubmissionGridColumnsLoad(
  result: ResultType<SubmissionGridColumnsResponse>,
): SubmissionGridColumnsLoad {
  if (Result.isError(result)) {
    return result.statusCode === 404
      ? { kind: "unavailable" }
      : { kind: "error", result };
  }

  return {
    kind: "ready",
    schemaReady: result.value.schemaReady,
    readiness: result.value.readiness,
    catalog: toAnswerColumns(result.value.columns),
  };
}

/** A page past the end redirects to the last page, so the URL names what shows. */
export function resolveSubmissionGridRowsLoad(
  formId: string,
  urlState: SubmissionGridUrlState,
  result: ResultType<SubmissionGridRowsPage>,
): SubmissionGridRowsLoad {
  if (Result.isError(result)) {
    return { kind: "error", result };
  }

  const page = canonicalPage(urlState.page, result.value.totalPages);
  if (page !== urlState.page) {
    return {
      kind: "redirect",
      href: buildSubmissionGridPath(formId, { ...urlState, page }),
    };
  }

  return { kind: "ready", page: result.value };
}

/** 409: the form has no compiled schema, so its answers cannot be filtered. */
export function isReportingNotPrepared(result: ResultType<unknown>): boolean {
  return (
    Result.isError(result) &&
    result.errorCode === REPORTING_NOT_PREPARED_ERROR_CODE
  );
}

export function withAnswerFiltersNotPrepared(
  load: SubmissionGridRowsLoad,
): SubmissionGridRowsLoad {
  return load.kind === "ready"
    ? { ...load, answerFiltersNotPrepared: true }
    : load;
}

function canonicalPage(requested: number, totalPages: number): number {
  if (totalPages <= 0) {
    return SUBMISSION_GRID_DEFAULT_PAGE;
  }

  return Math.min(requested, totalPages);
}
