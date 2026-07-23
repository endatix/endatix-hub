import type { ExportTarget } from "@/lib/endatix-api/reporting/reporting";
import {
  DEFAULT_EXPORT_COMPLETION_STATUS,
  DEFAULT_REPORTING_LOCALE,
  EXPORT_COMPLETION_STATUS,
  EXPORT_REQUEST_FILTER,
  isCodebookFormatKey,
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
  startedAt: DateRangeDraft;
  completedAt: DateRangeDraft;
  locale: string;
};

export type ExportFilterRangeErrors = {
  createdAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
};

export const EMPTY_DATE_RANGE: DateRangeDraft = { from: "", to: "" };

export const EMPTY_RANGE_ERRORS: ExportFilterRangeErrors = {
  createdAt: null,
  startedAt: null,
  completedAt: null,
};

const CREATED_AT_RANGE_ERROR = "Created From must be on or before Created To.";
const STARTED_AT_RANGE_ERROR = "Started From must be on or before Started To.";
const COMPLETED_AT_RANGE_ERROR =
  "Completed From must be on or before Completed To.";

export const CREATED_AT_TOOLTIP =
  "When the submission record was created — including prefill or create-on-behalf before a respondent opens the form.";
export const STARTED_AT_TOOLTIP =
  "When the respondent first saved an answer. Use this for time-to-complete; created can be much earlier for prefilled submissions.";

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
    completionStatus:
      listFilters?.completionStatus ?? DEFAULT_EXPORT_COMPLETION_STATUS,
    createdAt: {
      from: listFilters?.createdAtFrom ?? "",
      to: listFilters?.createdAtTo ?? "",
    },
    startedAt: {
      from: listFilters?.startedAtFrom ?? "",
      to: listFilters?.startedAtTo ?? "",
    },
    completedAt: {
      from: listFilters?.completedAtFrom ?? "",
      to: listFilters?.completedAtTo ?? "",
    },
    locale: listFilters?.locale?.trim() || DEFAULT_REPORTING_LOCALE,
  };
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
    filters.createdAtFrom = draft.createdAt.from || undefined;
    filters.createdAtTo = draft.createdAt.to || undefined;
    filters.startedAtFrom = draft.startedAt.from || undefined;
    filters.startedAtTo = draft.startedAt.to || undefined;
    if (args.showCompletedAt) {
      filters.completedAtFrom = draft.completedAt.from || undefined;
      filters.completedAtTo = draft.completedAt.to || undefined;
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
