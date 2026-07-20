import {
  utcCalendarDayStartIso,
  utcCalendarNextDayStartIso,
} from "@/lib/endatix-api/submissions/submission-list-query-params";

/** Query param / capability filter name for including test submissions. */
export const INCLUDE_TEST_SUBMISSIONS_FILTER =
  "includeTestSubmissions" as const;

/** Wire names from ExportCapabilityDto.allowedFilters (Reporting API). */
export type ExportRequestFilter =
  | typeof INCLUDE_TEST_SUBMISSIONS_FILTER
  | "createdAtRange"
  | "completedAtRange"
  | "submissionIdRange"
  | "locale"
  | "columnScope";

export const CODEBOOK_WIRE_KEYS: ReadonlySet<string> = new Set([
  "codebook",
  "codebook-shoji",
]);

export function isCodebookWireKey(wireKey: string): boolean {
  return CODEBOOK_WIRE_KEYS.has(wireKey);
}

/** Filters inherited from the submissions list URL or custom export dialog. */
export interface SubmissionExportListFilters {
  isTestSubmission?: string[];
  /** Explicit override (custom export dialog). Wins over `isTestSubmission` mapping. */
  includeTestSubmissions?: boolean;
  createdAtFrom?: string;
  createdAtTo?: string;
  completedAtFrom?: string;
  completedAtTo?: string;
  minSubmissionId?: string;
  maxSubmissionId?: string;
  locale?: string;
}

export interface ReportingExportUrlOptions {
  formId: string;
  wireKey: string;
  exportFormatId: string;
  allowedFilters?: ReadonlyArray<string>;
  listFilters?: SubmissionExportListFilters;
}

function allowsFilter(
  allowedFilters: ReadonlyArray<string> | undefined,
  filter: ExportRequestFilter,
  wireKey: string,
): boolean {
  if (allowedFilters !== undefined) {
    return allowedFilters.includes(filter);
  }

  // Fallback when capabilities are not loaded.
  if (wireKey === "codebook") {
    return false;
  }

  if (wireKey === "codebook-shoji") {
    return filter === "locale";
  }

  return true;
}

/**
 * Maps grid isTestSubmission multi-select to export override.
 * Production-only → false. Empty / test-only / both → undefined (no test-only API mode).
 */
export function mapIncludeTestSubmissions(
  isTestSubmission: string[] | undefined,
): boolean | undefined {
  if (!isTestSubmission || isTestSubmission.length === 0) {
    return undefined;
  }

  const hasTrue = isTestSubmission.includes("true");
  const hasFalse = isTestSubmission.includes("false");
  if (hasFalse && !hasTrue) {
    return false;
  }

  return undefined;
}

function isValidCalendarDateYmd(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

function appendCalendarRange(
  params: URLSearchParams,
  fromKey: string,
  toKey: string,
  from: string | undefined,
  to: string | undefined,
): void {
  if (from && isValidCalendarDateYmd(from)) {
    params.set(fromKey, utcCalendarDayStartIso(from));
  }
  if (to && isValidCalendarDateYmd(to)) {
    params.set(toKey, utcCalendarNextDayStartIso(to));
  }
}

function appendIncludeTestSubmissionsFilter(
  params: URLSearchParams,
  filters: SubmissionExportListFilters,
): void {
  if (filters.includeTestSubmissions !== undefined) {
    params.set(
      INCLUDE_TEST_SUBMISSIONS_FILTER,
      String(filters.includeTestSubmissions),
    );
    return;
  }

  if (filters.isTestSubmission === undefined) {
    return;
  }

  const includeTest = mapIncludeTestSubmissions(filters.isTestSubmission);
  if (includeTest !== undefined) {
    params.set(INCLUDE_TEST_SUBMISSIONS_FILTER, String(includeTest));
  }
}

function appendSubmissionIdRangeFilter(
  params: URLSearchParams,
  filters: SubmissionExportListFilters,
): void {
  if (filters.minSubmissionId) {
    params.set("minSubmissionId", filters.minSubmissionId);
  }
  if (filters.maxSubmissionId) {
    params.set("maxSubmissionId", filters.maxSubmissionId);
  }
}

function appendAllowedListFilters(
  params: URLSearchParams,
  filters: SubmissionExportListFilters,
  allowedFilters: ReadonlyArray<string> | undefined,
  wireKey: string,
): void {
  if (allowsFilter(allowedFilters, INCLUDE_TEST_SUBMISSIONS_FILTER, wireKey)) {
    appendIncludeTestSubmissionsFilter(params, filters);
  }

  if (allowsFilter(allowedFilters, "createdAtRange", wireKey)) {
    appendCalendarRange(
      params,
      "createdAfter",
      "createdBefore",
      filters.createdAtFrom,
      filters.createdAtTo,
    );
  }

  if (allowsFilter(allowedFilters, "completedAtRange", wireKey)) {
    appendCalendarRange(
      params,
      "completedAfter",
      "completedBefore",
      filters.completedAtFrom,
      filters.completedAtTo,
    );
  }

  if (allowsFilter(allowedFilters, "submissionIdRange", wireKey)) {
    appendSubmissionIdRangeFilter(params, filters);
  }

  if (
    allowsFilter(allowedFilters, "locale", wireKey) &&
    filters.locale?.trim()
  ) {
    params.set("locale", filters.locale.trim());
  }
}

function toReportingExportUrlOptions(
  formIdOrOptions: string | ReportingExportUrlOptions,
  wireKey?: string,
  exportFormatId?: string,
  listFilters?: SubmissionExportListFilters,
  allowedFilters?: ReadonlyArray<string>,
): ReportingExportUrlOptions {
  if (typeof formIdOrOptions !== "string") {
    return formIdOrOptions;
  }

  return {
    formId: formIdOrOptions,
    wireKey: wireKey!,
    exportFormatId: exportFormatId!,
    listFilters,
    allowedFilters,
  };
}

export function buildReportingExportUrl(
  formId: string,
  wireKey: string,
  exportFormatId: string,
  listFilters?: SubmissionExportListFilters,
  allowedFilters?: ReadonlyArray<string>,
): string;
export function buildReportingExportUrl(
  options: ReportingExportUrlOptions,
): string;
export function buildReportingExportUrl(
  formIdOrOptions: string | ReportingExportUrlOptions,
  wireKey?: string,
  exportFormatId?: string,
  listFilters?: SubmissionExportListFilters,
  allowedFilters?: ReadonlyArray<string>,
): string {
  const options = toReportingExportUrlOptions(
    formIdOrOptions,
    wireKey,
    exportFormatId,
    listFilters,
    allowedFilters,
  );

  const params = new URLSearchParams({
    format: options.wireKey,
    exportFormatId: options.exportFormatId,
  });

  if (options.listFilters) {
    appendAllowedListFilters(
      params,
      options.listFilters,
      options.allowedFilters,
      options.wireKey,
    );
  }

  return `/api/forms/${options.formId}/export?${params.toString()}`;
}

export function buildLegacyExportUrl(
  formId: string,
  exportId?: string,
): string {
  if (exportId) {
    return `/api/forms/${formId}/export?exportId=${encodeURIComponent(exportId)}`;
  }

  return `/api/forms/${formId}/export`;
}
