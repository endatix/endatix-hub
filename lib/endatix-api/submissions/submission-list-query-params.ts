import { appendQueryParam } from "../shared/query-params";
import { isValidCalendarDateYmd } from "@/lib/date-utils";
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

function appendCalendarBound(
  params: URLSearchParams,
  key: string,
  value: string | undefined,
): void {
  if (value && isValidCalendarDateYmd(value)) {
    appendQueryParam(params, key, value);
  }
}

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

  appendQueryParam(params, "sortBy", request.sortBy);
  appendQueryParam(params, "sortDir", request.sortDir);

  appendCalendarBound(params, "createdFrom", request.createdFrom);
  appendCalendarBound(params, "createdTo", request.createdTo);
  appendCalendarBound(params, "modifiedFrom", request.modifiedFrom);
  appendCalendarBound(params, "modifiedTo", request.modifiedTo);
  appendCalendarBound(params, "startedFrom", request.startedFrom);
  appendCalendarBound(params, "startedTo", request.startedTo);
  appendCalendarBound(params, "completedFrom", request.completedFrom);
  appendCalendarBound(params, "completedTo", request.completedTo);
}
