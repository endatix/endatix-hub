import {
  buildSubmissionListPath,
  SUBMISSION_LIST_DEFAULT_PAGE,
  type SubmissionListUrlState,
} from "@/features/submissions/list-submission-query";
import type { ApiResult } from "@/lib/endatix-api";
import type { DefinitionField } from "@/lib/endatix-api";
import type { ListSubmissionsResponse } from "@/lib/endatix-api/submissions/types";
import { Result, type ResultType } from "@/lib/result";
import type { SubmissionListPageLoad } from "./types";

export type ResolveSubmissionListPageLoadInput = {
  formId: string;
  listState: SubmissionListUrlState;
  useReportingExport: boolean;
  hasActiveFilters: boolean;
  submissionsResult: ResultType<ListSubmissionsResponse>;
  fieldsResult: ResultType<DefinitionField[]>;
  /** Unfiltered probe when filters are active; otherwise null. */
  probeResult: ApiResult<ListSubmissionsResponse> | null;
};

/**
 * Pure page-load outcome from already-mapped Results.
 * No React / Next redirects — the section matches on `kind`.
 */
export function resolveSubmissionListPageLoad(
  input: ResolveSubmissionListPageLoadInput,
): SubmissionListPageLoad {
  const {
    formId,
    listState,
    useReportingExport,
    hasActiveFilters,
    submissionsResult,
    fieldsResult,
    probeResult,
  } = input;

  if (Result.isError(submissionsResult)) {
    if (submissionsResult.statusCode === 404) {
      return { kind: "notFound" };
    }
    return { kind: "error", result: submissionsResult };
  }

  if (Result.isError(fieldsResult)) {
    if (fieldsResult.statusCode === 404) {
      return { kind: "notFound" };
    }
    return { kind: "error", result: fieldsResult };
  }

  const paged = submissionsResult.value;
  const canonicalPage = getCanonicalPage(
    listState.page,
    paged.page,
    paged.totalPages,
  );

  if (canonicalPage !== listState.page) {
    return {
      kind: "redirect",
      href: buildSubmissionListPath(formId, {
        ...listState,
        page: canonicalPage,
      }),
    };
  }

  const hasAnySubmissions = hasActiveFilters
    ? probeResult?.success === true && probeResult.data.totalRecords > 0
    : paged.totalRecords > 0;

  return {
    kind: "ready",
    model: {
      formId,
      hasAnySubmissions,
      useReportingExport,
      definitionFields: fieldsResult.value,
      page: {
        items: paged.items,
        page: paged.page,
        pageSize: paged.pageSize,
        totalRecords: paged.totalRecords,
        totalPages: paged.totalPages,
      },
      listState,
    },
  };
}

/**
 * Clamps the requested page to a valid page given the API response envelope.
 */
export function getCanonicalPage(
  requestedPage: number,
  responsePage: number,
  totalPages: number,
): number {
  if (totalPages <= 0) {
    return SUBMISSION_LIST_DEFAULT_PAGE;
  }

  if (requestedPage > totalPages) {
    return totalPages;
  }

  if (responsePage > 0 && responsePage !== requestedPage) {
    return Math.min(responsePage, totalPages);
  }

  return requestedPage;
}
