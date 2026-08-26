import { appendDateRangeFilters, appendSortParams } from "../shared/list-query";
import type { ListSubmissionsRequest } from "./types";

/**
 * Encodes facet filters as repeated `filter` query segments, and typed sort/date
 * bounds as first-class query params (`sortBy`, `sortDir`, `createdFrom`, …).
 */

/** Repeated query key for each list filter segment (`field:value` / …). */
export const SUBMISSION_LIST_FILTER_QUERY_PARAM = "filter" as const;

/** Wire field names for facet `filter` segments only (not dates). */
export const SUBMISSION_LIST_FILTER_FIELD_NAMES = Object.freeze({
  isComplete: "isComplete",
  status: "status",
  isTestSubmission: "isTestSubmission",
  submitterDisplayId: "submitterDisplayId",
  submitterProfile: "submitterProfile",
} as const);

// Phase 1 only exposes submitter email in Hub. Phase 2 grid metadata will replace
// this static list with API-provided filterable submitter profile fields.
const ALLOWED_SUBMITTER_PROFILE_FIELDS = new Set(["email"]);

export type SubmissionFilterFieldName =
  keyof typeof SUBMISSION_LIST_FILTER_FIELD_NAMES;

const SUBMISSION_DATE_RANGE_FIELDS = [
  "created",
  "modified",
  "started",
  "completed",
] as const;

/**
 * Appends Endatix list facet `filter` segments and typed sort/date query params.
 */
export function appendSubmissionListFilters(
  params: URLSearchParams,
  request: ListSubmissionsRequest,
): void {
  if (request.isComplete && request.isComplete.length > 0) {
    params.append(
      SUBMISSION_LIST_FILTER_QUERY_PARAM,
      `${SUBMISSION_LIST_FILTER_FIELD_NAMES.isComplete}:${request.isComplete.join("|")}`,
    );
  }
  if (request.status && request.status.length > 0) {
    params.append(
      SUBMISSION_LIST_FILTER_QUERY_PARAM,
      `${SUBMISSION_LIST_FILTER_FIELD_NAMES.status}:${request.status.join("|")}`,
    );
  }
  if (request.isTestSubmission && request.isTestSubmission.length > 0) {
    params.append(
      SUBMISSION_LIST_FILTER_QUERY_PARAM,
      `${SUBMISSION_LIST_FILTER_FIELD_NAMES.isTestSubmission}:${request.isTestSubmission.join("|")}`,
    );
  }
  if (request.submitterDisplayId?.trim()) {
    params.append(
      SUBMISSION_LIST_FILTER_QUERY_PARAM,
      `${SUBMISSION_LIST_FILTER_FIELD_NAMES.submitterDisplayId}:${request.submitterDisplayId.trim()}`,
    );
  }
  const submitterProfileField = request.submitterProfileFilter?.field
    .trim()
    .toLowerCase();
  const submitterProfileValue = request.submitterProfileFilter?.value.trim();
  if (
    submitterProfileField &&
    submitterProfileValue &&
    ALLOWED_SUBMITTER_PROFILE_FIELDS.has(submitterProfileField)
  ) {
    params.append(
      SUBMISSION_LIST_FILTER_QUERY_PARAM,
      `${SUBMISSION_LIST_FILTER_FIELD_NAMES.submitterProfile}.${submitterProfileField}:${submitterProfileValue}`,
    );
  }

  appendSortParams(params, request);
  appendDateRangeFilters(params, request, SUBMISSION_DATE_RANGE_FIELDS);
}
