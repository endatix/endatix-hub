import {
  isCodebookFormatKey,
  type BuiltInExportFileKind,
} from "@/lib/endatix-api/reporting/reporting-export-wire";
import { appendDateRangeFilters } from "@/lib/endatix-api/shared/list-query";
import { withBasePath } from "@/lib/hosting";

export { isCodebookFormatKey };

/**
 * SurveyJS / FormSchema default locale key (SurveyJS uses "default" when no
 * language pack is selected). Shared with reporting export locale catalog.
 */
export const DEFAULT_REPORTING_LOCALE = "default" as const;

/** Filter names from ExportCapabilityDto.allowedFilters (Reporting API). */
export const EXPORT_REQUEST_FILTER = {
  includeTestSubmissions: "includeTestSubmissions",
  createdAtRange: "createdAtRange",
  modifiedAtRange: "modifiedAtRange",
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

/** Filters inherited from the submissions list URL or custom export dialog. */
export interface SubmissionExportListFilters {
  isTestSubmission?: string[];
  /** Explicit override (custom export dialog). Wins over `isTestSubmission` mapping. */
  includeTestSubmissions?: boolean;
  createdFrom?: string;
  createdTo?: string;
  modifiedFrom?: string;
  modifiedTo?: string;
  startedFrom?: string;
  startedTo?: string;
  completedFrom?: string;
  completedTo?: string;
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

  const allowedDateStems = (
    [
      ["created", EXPORT_REQUEST_FILTER.createdAtRange],
      ["modified", EXPORT_REQUEST_FILTER.modifiedAtRange],
      ["started", EXPORT_REQUEST_FILTER.startedAtRange],
      ["completed", EXPORT_REQUEST_FILTER.completedAtRange],
    ] as const
  )
    .filter(([, filter]) => allowsFilter(allowedFilters, filter))
    .map(([stem]) => stem);

  if (allowedDateStems.length > 0) {
    appendDateRangeFilters(params, filters, allowedDateStems);
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

  return withBasePath(
    `/api/forms/${options.formId}/export?${params.toString()}`,
  );
}

export function buildLegacyExportUrl(
  formId: string,
  exportId?: string,
  format: BuiltInExportFileKind = "csv",
): string {
  const params = new URLSearchParams();
  if (exportId) {
    params.set("exportId", exportId);
  }
  if (format !== "csv") {
    params.set("format", format);
  }

  const query = params.toString();
  return withBasePath(
    `/api/forms/${formId}/export${query ? `?${query}` : ""}`,
  );
}
