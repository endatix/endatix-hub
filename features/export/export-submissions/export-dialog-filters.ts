import type { ExportTarget } from "@/lib/endatix-api/reporting/reporting";
import { isCodebookFormatKey } from "@/lib/endatix-api/reporting/reporting-export-wire";
import {
  DEFAULT_EXPORT_COMPLETION_STATUS,
  DEFAULT_REPORTING_LOCALE,
  EXPORT_COMPLETION_STATUS,
  EXPORT_REQUEST_FILTER,
  type ExportCompletionStatusFilter,
  type SubmissionExportListFilters,
} from "../export-url";
import type { TenantExportOption } from "./map-tenant-export-options";

export type DateRangeDraft = {
  from: string;
  to: string;
};

/** Cohesive draft of dialog filter fields (not a wall of loose useState). */
export type ExportFilterDraft = {
  includeTestSubmissions: boolean;
  completionStatus: ExportCompletionStatusFilter;
  createdAt: DateRangeDraft;
  modifiedAt: DateRangeDraft;
  startedAt: DateRangeDraft;
  completedAt: DateRangeDraft;
  locale: string;
  statusFilterWiderThanList: boolean;
};

export type ExportFilterRangeErrors = {
  createdAt: string | null;
  modifiedAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
};

export const EMPTY_DATE_RANGE: DateRangeDraft = { from: "", to: "" };

export const EMPTY_RANGE_ERRORS: ExportFilterRangeErrors = {
  createdAt: null,
  modifiedAt: null,
  startedAt: null,
  completedAt: null,
};

const CREATED_AT_RANGE_ERROR = "Created From must be on or before Created To.";
const MODIFIED_AT_RANGE_ERROR =
  "Modified From must be on or before Modified To.";
const STARTED_AT_RANGE_ERROR = "Started From must be on or before Started To.";
const COMPLETED_AT_RANGE_ERROR =
  "Completed From must be on or before Completed To.";

/**
 * One line under each date range, all three or none: the three dates differ
 * for prefilled and saved-for-later submissions, and the difference decides
 * which one a reader should filter on.
 */
export const DATE_RANGE_HINTS = {
  createdAt:
    "When the submission was created, including prefilled ones no one has opened yet.",
  modifiedAt: "When the submission was last changed.",
  startedAt: "When the respondent first saved an answer.",
  completedAt: "When the respondent submitted the form.",
} as const;

export const COMPLETION_STATUS_OPTIONS: ReadonlyArray<{
  value: ExportCompletionStatusFilter;
  label: string;
}> = [
  { value: EXPORT_COMPLETION_STATUS.completed, label: "Completed" },
  { value: EXPORT_COMPLETION_STATUS.incomplete, label: "Incomplete" },
  { value: EXPORT_COMPLETION_STATUS.all, label: "All" },
];

export function createEmptyFilterDraft(): ExportFilterDraft {
  return {
    includeTestSubmissions: false,
    completionStatus: DEFAULT_EXPORT_COMPLETION_STATUS,
    createdAt: { ...EMPTY_DATE_RANGE },
    modifiedAt: { ...EMPTY_DATE_RANGE },
    startedAt: { ...EMPTY_DATE_RANGE },
    completedAt: { ...EMPTY_DATE_RANGE },
    locale: DEFAULT_REPORTING_LOCALE,
    statusFilterWiderThanList: false,
  };
}

export function createFilterDraftFromListFilters(
  listFilters?: SubmissionExportListFilters,
): ExportFilterDraft {
  return {
    includeTestSubmissions: listFilters?.includeTestSubmissions ?? false,
    completionStatus:
      listFilters?.completionStatus ?? DEFAULT_EXPORT_COMPLETION_STATUS,
    createdAt: dateRangeDraft(listFilters?.createdFrom, listFilters?.createdTo),
    modifiedAt: dateRangeDraft(
      listFilters?.modifiedFrom,
      listFilters?.modifiedTo,
    ),
    startedAt: dateRangeDraft(listFilters?.startedFrom, listFilters?.startedTo),
    completedAt: dateRangeDraft(
      listFilters?.completedFrom,
      listFilters?.completedTo,
    ),
    locale: listFilters?.locale?.trim() || DEFAULT_REPORTING_LOCALE,
    statusFilterWiderThanList: listFilters?.statusFilterWiderThanList ?? false,
  };
}

function dateRangeDraft(from?: string, to?: string): DateRangeDraft {
  return { from: from ?? "", to: to ?? "" };
}

/**
 * Grid Complete filter (Yes/No) → export completion.
 * No selection, or both, matches the grid: every completion state.
 */
export function completionStatusFromIsCompleteFilter(
  values: Iterable<string>,
): ExportCompletionStatusFilter {
  const selected = new Set(values);
  const complete = selected.has("true");
  const incomplete = selected.has("false");
  if (complete && !incomplete) {
    return EXPORT_COMPLETION_STATUS.completed;
  }
  if (incomplete && !complete) {
    return EXPORT_COMPLETION_STATUS.incomplete;
  }
  return EXPORT_COMPLETION_STATUS.all;
}

/**
 * Grid Submission Type filter → Include test submissions.
 * Production-only excludes tests. No selection, test-only, or both includes them,
 * matching a grid that is not limited to production rows.
 */
export function includeTestSubmissionsFromGridFilter(
  values: Iterable<string>,
): boolean {
  const selected = new Set(values);
  return !(selected.has("false") && !selected.has("true"));
}

export function showsLocaleField(
  option: Pick<TenantExportOption, "allowedFilters">,
): boolean {
  return option.allowedFilters.includes(EXPORT_REQUEST_FILTER.locale);
}

export function showsSubmissionRowFilters(
  exportTarget: ExportTarget,
  formatKey: string,
): boolean {
  if (exportTarget === "Codebook" || isCodebookFormatKey(formatKey)) {
    return false;
  }

  return true;
}

/** Incomplete and All need a refresh of incomplete submissions before export. */
export function includesIncompleteSubmissions(
  completionStatus: ExportCompletionStatusFilter,
): boolean {
  return (
    completionStatus === EXPORT_COMPLETION_STATUS.incomplete ||
    completionStatus === EXPORT_COMPLETION_STATUS.all
  );
}

export function showsCompletedAtFields(
  completionStatus: ExportCompletionStatusFilter,
): boolean {
  return (
    completionStatus === EXPORT_COMPLETION_STATUS.completed ||
    completionStatus === EXPORT_COMPLETION_STATUS.all
  );
}

export function resolveDefaultLocale(
  formLocales: readonly string[],
  listLocale: string | undefined,
): string {
  if (listLocale && formLocales.includes(listLocale)) {
    return listLocale;
  }

  if (formLocales.includes(DEFAULT_REPORTING_LOCALE)) {
    return DEFAULT_REPORTING_LOCALE;
  }

  return formLocales[0] ?? DEFAULT_REPORTING_LOCALE;
}

export function coerceLocaleToOptions(
  locale: string,
  options: ReadonlyArray<{ value: string }>,
): string {
  if (options.some((option) => option.value === locale)) {
    return locale;
  }

  return options[0]?.value ?? locale;
}

function isInvalidDateRange(from: string, to: string): boolean {
  return Boolean(from && to && from > to);
}

export function validateFilterDraft(
  draft: ExportFilterDraft,
  args: { showRowFilters: boolean; showCompletedAt: boolean },
): ExportFilterRangeErrors {
  if (!args.showRowFilters) {
    return { ...EMPTY_RANGE_ERRORS };
  }

  return {
    createdAt: isInvalidDateRange(draft.createdAt.from, draft.createdAt.to)
      ? CREATED_AT_RANGE_ERROR
      : null,
    modifiedAt: isInvalidDateRange(draft.modifiedAt.from, draft.modifiedAt.to)
      ? MODIFIED_AT_RANGE_ERROR
      : null,
    startedAt: isInvalidDateRange(draft.startedAt.from, draft.startedAt.to)
      ? STARTED_AT_RANGE_ERROR
      : null,
    completedAt:
      args.showCompletedAt &&
      isInvalidDateRange(draft.completedAt.from, draft.completedAt.to)
        ? COMPLETED_AT_RANGE_ERROR
        : null,
  };
}

export function hasFilterRangeErrors(errors: ExportFilterRangeErrors): boolean {
  return (
    errors.createdAt != null ||
    errors.modifiedAt != null ||
    errors.startedAt != null ||
    errors.completedAt != null
  );
}

export function toSubmissionExportListFilters(
  draft: ExportFilterDraft,
  args: {
    showLocaleField: boolean;
    showRowFilters: boolean;
    showCompletedAt: boolean;
    locale: string;
  },
): SubmissionExportListFilters {
  const filters: SubmissionExportListFilters = {};

  if (args.showLocaleField && args.locale.trim()) {
    filters.locale = args.locale.trim();
  }

  if (args.showRowFilters) {
    filters.includeTestSubmissions = draft.includeTestSubmissions;
    filters.completionStatus = draft.completionStatus;
    filters.createdFrom = draft.createdAt.from || undefined;
    filters.createdTo = draft.createdAt.to || undefined;
    filters.modifiedFrom = draft.modifiedAt.from || undefined;
    filters.modifiedTo = draft.modifiedAt.to || undefined;
    filters.startedFrom = draft.startedAt.from || undefined;
    filters.startedTo = draft.startedAt.to || undefined;
    if (args.showCompletedAt) {
      filters.completedFrom = draft.completedAt.from || undefined;
      filters.completedTo = draft.completedAt.to || undefined;
    }
  }

  return filters;
}

export function clearCompletedAtRange(
  draft: ExportFilterDraft,
): ExportFilterDraft {
  return {
    ...draft,
    completedAt: { ...EMPTY_DATE_RANGE },
  };
}

export function pickDefaultExportFormatId(
  options: ReadonlyArray<
    Pick<TenantExportOption, "exportFormatId" | "exportTarget" | "formatKey">
  >,
): string {
  return (
    options.find((option) =>
      showsSubmissionRowFilters(option.exportTarget, option.formatKey),
    )?.exportFormatId ??
    options[0]?.exportFormatId ??
    ""
  );
}
