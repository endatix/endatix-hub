import type { ExportTarget } from "@/lib/endatix-api/reporting/reporting";
import { isCodebookFormatKey } from "@/lib/endatix-api/reporting/reporting-export-wire";
import {
  DEFAULT_REPORTING_LOCALE,
  EXPORT_REQUEST_FILTER,
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
  collectionStatus: string[];
  createdAt: DateRangeDraft;
  modifiedAt: DateRangeDraft;
  startedAt: DateRangeDraft;
  completedAt: DateRangeDraft;
  locale: string;
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

export function createEmptyFilterDraft(): ExportFilterDraft {
  return {
    includeTestSubmissions: false,
    collectionStatus: [],
    createdAt: { ...EMPTY_DATE_RANGE },
    modifiedAt: { ...EMPTY_DATE_RANGE },
    startedAt: { ...EMPTY_DATE_RANGE },
    completedAt: { ...EMPTY_DATE_RANGE },
    locale: DEFAULT_REPORTING_LOCALE,
  };
}

export function createFilterDraftFromListFilters(
  listFilters?: SubmissionExportListFilters,
): ExportFilterDraft {
  return {
    includeTestSubmissions: listFilters?.includeTestSubmissions ?? false,
    collectionStatus: listFilters?.collectionStatus ?? [],
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
  };
}

function dateRangeDraft(from?: string, to?: string): DateRangeDraft {
  return { from: from ?? "", to: to ?? "" };
}

export const ROW_FILTER_DATE_KEYS = [
  "createdAt",
  "modifiedAt",
  "startedAt",
  "completedAt",
] as const;

/**
 * True when the draft's row filters equal the table's prefill. Completed at
 * only counts while it is shown: the dialog clears it when the Status choice
 * has no complete rows, and that is not a change the user made.
 */
export function rowFiltersMatch(
  draft: ExportFilterDraft,
  table: ExportFilterDraft,
  args: { includeCompletedAt: boolean },
): boolean {
  const dateKeys = ROW_FILTER_DATE_KEYS.filter(
    (key) => key !== "completedAt" || args.includeCompletedAt,
  );
  return (
    sameCodes(draft.collectionStatus, table.collectionStatus) &&
    dateKeys.every((key) => sameRange(draft[key], table[key])) &&
    draft.includeTestSubmissions === table.includeTestSubmissions
  );
}

function sameCodes(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && a.every((code) => b.includes(code));
}

function sameRange(a: DateRangeDraft, b: DateRangeDraft): boolean {
  return a.from === b.from && a.to === b.to;
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

export function includesIncompleteSubmissions(
  codes: readonly string[],
): boolean {
  return codes.length === 0 || codes.some((code) => code !== "complete");
}

export function showsCompletedAtFields(codes: readonly string[]): boolean {
  return codes.length === 0 || codes.includes("complete");
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
    if (draft.collectionStatus.length > 0) {
      filters.collectionStatus = draft.collectionStatus;
    }
    applyDateDrafts(filters, draft, args.showCompletedAt);
  }

  return filters;
}

function applyDateDrafts(
  filters: SubmissionExportListFilters,
  draft: ExportFilterDraft,
  showCompletedAt: boolean,
): void {
  filters.createdFrom = draft.createdAt.from || undefined;
  filters.createdTo = draft.createdAt.to || undefined;
  filters.modifiedFrom = draft.modifiedAt.from || undefined;
  filters.modifiedTo = draft.modifiedAt.to || undefined;
  filters.startedFrom = draft.startedAt.from || undefined;
  filters.startedTo = draft.startedAt.to || undefined;
  if (showCompletedAt) {
    filters.completedFrom = draft.completedAt.from || undefined;
    filters.completedTo = draft.completedAt.to || undefined;
  }
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
