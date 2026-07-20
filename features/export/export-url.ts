import {
  utcCalendarDayStartIso,
  utcCalendarNextDayStartIso,
} from "@/lib/endatix-api/submissions/submission-list-query-params";

/** Query param / capability filter name for including test submissions. */
export const INCLUDE_TEST_SUBMISSIONS_FILTER = "includeTestSubmissions" as const;

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
  const options: ReportingExportUrlOptions =
    typeof formIdOrOptions === "string"
      ? {
          formId: formIdOrOptions,
          wireKey: wireKey!,
          exportFormatId: exportFormatId!,
          listFilters,
          allowedFilters,
        }
      : formIdOrOptions;

  const params = new URLSearchParams({
    format: options.wireKey,
    exportFormatId: options.exportFormatId,
  });

  const filters = options.listFilters;
  if (!filters) {
    return `/api/forms/${options.formId}/export?${params.toString()}`;
  }

  const allowed = options.allowedFilters;
  const wireKeyValue = options.wireKey;

  if (allowsFilter(allowed, INCLUDE_TEST_SUBMISSIONS_FILTER, wireKeyValue)) {
    if (filters.includeTestSubmissions !== undefined) {
      params.set(
        INCLUDE_TEST_SUBMISSIONS_FILTER,
        String(filters.includeTestSubmissions),
      );
    } else if (filters.isTestSubmission !== undefined) {
      const includeTest = mapIncludeTestSubmissions(filters.isTestSubmission);
      if (includeTest !== undefined) {
        params.set(INCLUDE_TEST_SUBMISSIONS_FILTER, String(includeTest));
      }
    }
  }

  if (allowsFilter(allowed, "createdAtRange", wireKeyValue)) {
    appendCalendarRange(
      params,
      "createdAfter",
      "createdBefore",
      filters.createdAtFrom,
      filters.createdAtTo,
    );
  }

  if (allowsFilter(allowed, "completedAtRange", wireKeyValue)) {
    appendCalendarRange(
      params,
      "completedAfter",
      "completedBefore",
      filters.completedAtFrom,
      filters.completedAtTo,
    );
  }

  if (allowsFilter(allowed, "submissionIdRange", wireKeyValue)) {
    if (filters.minSubmissionId) {
      params.set("minSubmissionId", filters.minSubmissionId);
    }
    if (filters.maxSubmissionId) {
      params.set("maxSubmissionId", filters.maxSubmissionId);
    }
  }

  if (allowsFilter(allowed, "locale", wireKeyValue) && filters.locale?.trim()) {
    params.set("locale", filters.locale.trim());
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
