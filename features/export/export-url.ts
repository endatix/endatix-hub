import {
  utcCalendarDayStartIso,
  utcCalendarNextDayStartIso,
} from "@/lib/endatix-api/submissions/submission-list-query-params";
import { withBasePath } from "@/lib/hosting";

/**
 * SurveyJS / FormSchema default locale key (SurveyJS uses "default" when no
 * language pack is selected). Shared with reporting export locale catalog.
 */
export const DEFAULT_REPORTING_LOCALE = "default" as const;

/** Filter names from ExportCapabilityDto.allowedFilters (Reporting API). */
export const EXPORT_REQUEST_FILTER = {
  includeTestSubmissions: "includeTestSubmissions",
  createdAtRange: "createdAtRange",
  startedAtRange: "startedAtRange",
  completedAtRange: "completedAtRange",
  submissionIdRange: "submissionIdRange",
  locale: "locale",
  columnScope: "columnScope",
  completionStatus: "completionStatus",
} as const;

export type ExportRequestFilter =
  (typeof EXPORT_REQUEST_FILTER)[keyof typeof EXPORT_REQUEST_FILTER];

export const EXPORT_COMPLETION_STATUS = {
  all: "all",
  completed: "completed",
  incomplete: "incomplete",
} as const;

export type ExportCompletionStatusFilter =
  (typeof EXPORT_COMPLETION_STATUS)[keyof typeof EXPORT_COMPLETION_STATUS];

/** Hub dialog default — BI-friendly completed-only export. */
export const DEFAULT_EXPORT_COMPLETION_STATUS =
  EXPORT_COMPLETION_STATUS.completed;

export const CODEBOOK_FORMAT_KEYS: ReadonlySet<string> = new Set([
  "codebook",
  "codebook-shoji",
]);

export function isCodebookFormatKey(formatKey: string): boolean {
  return CODEBOOK_FORMAT_KEYS.has(formatKey);
}

/** Filters inherited from the submissions list URL or custom export dialog. */
export interface SubmissionExportListFilters {
  isTestSubmission?: string[];
  /** Explicit override (custom export dialog). Wins over `isTestSubmission` mapping. */
  includeTestSubmissions?: boolean;
  createdAtFrom?: string;
  createdAtTo?: string;
  modifiedAtFrom?: string;
  modifiedAtTo?: string;
  startedAtFrom?: string;
  startedAtTo?: string;
  completedAtFrom?: string;
  completedAtTo?: string;
  minSubmissionId?: string;
  maxSubmissionId?: string;
  locale?: string;
  completionStatus?: ExportCompletionStatusFilter;
}

export interface ReportingExportUrlOptions {
  formId: string;
  formatKey: string;
  exportFormatId: string;
  allowedFilters?: ReadonlyArray<string>;
  listFilters?: SubmissionExportListFilters;
}

function allowsFilter(
  allowedFilters: ReadonlyArray<string> | undefined,
  filter: ExportRequestFilter,
): boolean {
  return allowedFilters?.includes(filter) ?? false;
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
      EXPORT_REQUEST_FILTER.includeTestSubmissions,
      String(filters.includeTestSubmissions),
    );
    return;
  }

  if (filters.isTestSubmission === undefined) {
    return;
  }

  const includeTest = mapIncludeTestSubmissions(filters.isTestSubmission);
  if (includeTest !== undefined) {
    params.set(
      EXPORT_REQUEST_FILTER.includeTestSubmissions,
      String(includeTest),
    );
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
): void {
  if (
    allowsFilter(allowedFilters, EXPORT_REQUEST_FILTER.includeTestSubmissions)
  ) {
    appendIncludeTestSubmissionsFilter(params, filters);
  }

  if (allowsFilter(allowedFilters, EXPORT_REQUEST_FILTER.createdAtRange)) {
    appendCalendarRange(
      params,
      "createdAfter",
      "createdBefore",
      filters.createdAtFrom,
      filters.createdAtTo,
    );
  }

  if (allowsFilter(allowedFilters, EXPORT_REQUEST_FILTER.startedAtRange)) {
    appendCalendarRange(
      params,
      "startedAfter",
      "startedBefore",
      filters.startedAtFrom,
      filters.startedAtTo,
    );
  }

  if (allowsFilter(allowedFilters, EXPORT_REQUEST_FILTER.completedAtRange)) {
    appendCalendarRange(
      params,
      "completedAfter",
      "completedBefore",
      filters.completedAtFrom,
      filters.completedAtTo,
    );
  }

  if (allowsFilter(allowedFilters, EXPORT_REQUEST_FILTER.submissionIdRange)) {
    appendSubmissionIdRangeFilter(params, filters);
  }

  if (
    allowsFilter(allowedFilters, EXPORT_REQUEST_FILTER.completionStatus) &&
    filters.completionStatus
  ) {
    params.set(
      EXPORT_REQUEST_FILTER.completionStatus,
      filters.completionStatus,
    );
  }

  if (
    allowsFilter(allowedFilters, EXPORT_REQUEST_FILTER.locale) &&
    filters.locale?.trim()
  ) {
    params.set(EXPORT_REQUEST_FILTER.locale, filters.locale.trim());
  }
}

function toReportingExportUrlOptions(
  formIdOrOptions: string | ReportingExportUrlOptions,
  formatKey?: string,
  exportFormatId?: string,
  listFilters?: SubmissionExportListFilters,
  allowedFilters?: ReadonlyArray<string>,
): ReportingExportUrlOptions {
  if (typeof formIdOrOptions !== "string") {
    return formIdOrOptions;
  }

  return {
    formId: formIdOrOptions,
    formatKey: formatKey!,
    exportFormatId: exportFormatId!,
    listFilters,
    allowedFilters,
  };
}

export function buildReportingExportUrl(
  formId: string,
  formatKey: string,
  exportFormatId: string,
  listFilters?: SubmissionExportListFilters,
  allowedFilters?: ReadonlyArray<string>,
): string;
export function buildReportingExportUrl(
  options: ReportingExportUrlOptions,
): string;
export function buildReportingExportUrl(
  formIdOrOptions: string | ReportingExportUrlOptions,
  formatKey?: string,
  exportFormatId?: string,
  listFilters?: SubmissionExportListFilters,
  allowedFilters?: ReadonlyArray<string>,
): string {
  const options = toReportingExportUrlOptions(
    formIdOrOptions,
    formatKey,
    exportFormatId,
    listFilters,
    allowedFilters,
  );

  const params = new URLSearchParams({
    format: options.formatKey,
    exportFormatId: options.exportFormatId,
  });

  if (options.listFilters) {
    appendAllowedListFilters(
      params,
      options.listFilters,
      options.allowedFilters,
    );
  }

  return withBasePath(`/api/forms/${options.formId}/export?${params.toString()}`);
}

export function buildLegacyExportUrl(
  formId: string,
  exportId?: string,
): string {
  if (exportId) {
    return withBasePath(
      `/api/forms/${formId}/export?exportId=${encodeURIComponent(exportId)}`,
    );
  }

  return withBasePath(`/api/forms/${formId}/export`);
}
