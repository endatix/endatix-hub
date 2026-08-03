import type { ListSubmissionsRequest } from "./types";

/**
 * Encodes {@link ListSubmissionsRequest} into repeated `filter` query segments for the Endatix list API.
 *
 * Kept submission-specific on purpose: a generic “list filter query builder” should wait until a second
 * resource proves the same rules (param name, segment grammar, UTC calendar bounds for date ranges).
 * Then extract a small shared helper driven by a field descriptor (wire name, multi-value join, operator
 * shape) instead of duplicating ad hoc encoders.
 */

/** Repeated query key for each list filter segment (`field:value` / `field>:` / …). */
export const SUBMISSION_LIST_FILTER_QUERY_PARAM = "filter" as const;

/** Wire field names for `ListSubmissionsRequest` → list API `filter` segments. */
export const SUBMISSION_LIST_FILTER_FIELD_NAMES = Object.freeze({
  isComplete: "isComplete",
  status: "status",
  isTestSubmission: "isTestSubmission",
  createdAt: "createdAt",
  modifiedAt: "modifiedAt",
  startedAt: "startedAt",
  completedAt: "completedAt",
  submitterDisplayId: "submitterDisplayId",
  submitterProfile: "submitterProfile",
} as const);

// Phase 1 only exposes submitter email in Hub. Phase 2 grid metadata will replace
// this static list with API-provided filterable submitter profile fields.
const ALLOWED_SUBMITTER_PROFILE_FIELDS = new Set(["email"]);

export type SubmissionFilterFieldName =
  keyof typeof SUBMISSION_LIST_FILTER_FIELD_NAMES;

/**
 * True when `value` is a real calendar day `YYYY-MM-DD` in UTC (rejects overflow dates and garbage).
 */
function isValidCalendarDateYmd(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const [year, month, day] = value.split("-").map(Number);
  const d = new Date(Date.UTC(year, month - 1, day));
  return (
    d.getUTCFullYear() === year &&
    d.getUTCMonth() === month - 1 &&
    d.getUTCDate() === day
  );
}

/**
 * Start of a calendar day `YYYY-MM-DD` in UTC as ISO 8601 (for `createdAt>` / `completedAt>` filters).
 */
export function utcCalendarDayStartIso(calendarDate: string): string {
  const [year, month, day] = calendarDate.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day)).toISOString();
}

/**
 * Start of the day after `YYYY-MM-DD` in UTC as ISO 8601 (exclusive upper bound for `createdAt<` / `completedAt<`).
 */
export function utcCalendarNextDayStartIso(calendarDate: string): string {
  const [year, month, day] = calendarDate.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day + 1)).toISOString();
}

/**
 * Appends Endatix list `filter` query segments for {@link ListSubmissionsRequest} onto existing params (page, pageSize).
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
  if (request.createdAtFrom && isValidCalendarDateYmd(request.createdAtFrom)) {
    params.append(
      SUBMISSION_LIST_FILTER_QUERY_PARAM,
      `${SUBMISSION_LIST_FILTER_FIELD_NAMES.createdAt}>:${utcCalendarDayStartIso(request.createdAtFrom)}`,
    );
  }
  if (request.createdAtTo && isValidCalendarDateYmd(request.createdAtTo)) {
    params.append(
      SUBMISSION_LIST_FILTER_QUERY_PARAM,
      `${SUBMISSION_LIST_FILTER_FIELD_NAMES.createdAt}<${utcCalendarNextDayStartIso(request.createdAtTo)}`,
    );
  }
  if (
    request.modifiedAtFrom &&
    isValidCalendarDateYmd(request.modifiedAtFrom)
  ) {
    params.append(
      SUBMISSION_LIST_FILTER_QUERY_PARAM,
      `${SUBMISSION_LIST_FILTER_FIELD_NAMES.modifiedAt}>:${utcCalendarDayStartIso(request.modifiedAtFrom)}`,
    );
  }
  if (request.modifiedAtTo && isValidCalendarDateYmd(request.modifiedAtTo)) {
    params.append(
      SUBMISSION_LIST_FILTER_QUERY_PARAM,
      `${SUBMISSION_LIST_FILTER_FIELD_NAMES.modifiedAt}<${utcCalendarNextDayStartIso(request.modifiedAtTo)}`,
    );
  }
  if (request.startedAtFrom && isValidCalendarDateYmd(request.startedAtFrom)) {
    params.append(
      SUBMISSION_LIST_FILTER_QUERY_PARAM,
      `${SUBMISSION_LIST_FILTER_FIELD_NAMES.startedAt}>:${utcCalendarDayStartIso(request.startedAtFrom)}`,
    );
  }
  if (request.startedAtTo && isValidCalendarDateYmd(request.startedAtTo)) {
    params.append(
      SUBMISSION_LIST_FILTER_QUERY_PARAM,
      `${SUBMISSION_LIST_FILTER_FIELD_NAMES.startedAt}<${utcCalendarNextDayStartIso(request.startedAtTo)}`,
    );
  }
  if (
    request.completedAtFrom &&
    isValidCalendarDateYmd(request.completedAtFrom)
  ) {
    params.append(
      SUBMISSION_LIST_FILTER_QUERY_PARAM,
      `${SUBMISSION_LIST_FILTER_FIELD_NAMES.completedAt}>:${utcCalendarDayStartIso(request.completedAtFrom)}`,
    );
  }
  if (request.completedAtTo && isValidCalendarDateYmd(request.completedAtTo)) {
    params.append(
      SUBMISSION_LIST_FILTER_QUERY_PARAM,
      `${SUBMISSION_LIST_FILTER_FIELD_NAMES.completedAt}<${utcCalendarNextDayStartIso(request.completedAtTo)}`,
    );
  }
}
