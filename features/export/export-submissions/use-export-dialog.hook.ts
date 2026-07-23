"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type RefObject,
  type SubmitEvent,
} from "react";
import { useTrackEvent } from "@/features/analytics/posthog/client";
import { prepareReportingExportAction } from "@/features/export/prepare-reporting-export";
import { Result } from "@/lib/result";
import {
  DEFAULT_REPORTING_LOCALE,
  EXPORT_COMPLETION_STATUS,
  type SubmissionExportListFilters,
} from "../export-url";
import {
  GENERIC_EXPORT_FAILURE_MESSAGE,
  isExportSchemaMissingError,
  SCHEMA_NEEDS_PREPARE_MESSAGE,
} from "../export-error-message";
import {
  clearCompletedAtRange,
  coerceLocaleToOptions,
  createFilterDraftFromListFilters,
  EMPTY_RANGE_ERRORS,
  hasFilterRangeErrors,
  pickDefaultExportFormatId,
  resolveDefaultLocale,
  showsCompletedAtFields,
  showsLocaleField,
  showsSubmissionRowFilters,
  toSubmissionExportListFilters,
  validateFilterDraft,
  type ExportFilterDraft,
  type ExportFilterRangeErrors,
} from "./export-dialog-filters";
import {
  formatPrepareSuccessSummary,
  getPhaseDescription,
  isBusyPhase,
  isControlsLocked,
  showsFiltersForm,
  showsPrepareCta,
  type ExportDialogPhase,
} from "./export-dialog-phase";
import { listFormReportingLocalesAction } from "./list-form-reporting-locales.action";
import type {
  TenantExportOption,
  TenantExportOptionGroup,
} from "./map-tenant-export-options";

export type ExportDialogSubmitArgs = {
  formatKey: string;
  exportName: string;
  exportFormatId: string;
  fallbackExtension: string;
  filters: SubmissionExportListFilters;
};

export type UseExportDialogArgs = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  formId: string;
  groups: TenantExportOptionGroup[];
  listFilters?: SubmissionExportListFilters;
  isExporting: boolean;
  onExport: (
    args: ExportDialogSubmitArgs,
  ) => Promise<{ succeeded: boolean; message?: string }>;
};

export type UseExportDialogResult = {
  phase: ExportDialogPhase;
  description: string;
  busy: boolean;
  controlsLocked: boolean;
  showFiltersForm: boolean;
  showPrepareCta: boolean;
  showGroupLabels: boolean;
  inlineError: string | null;
  prepareSuccessSummary: string | null;
  exportFormatId: string;
  setExportFormatId: (id: string) => void;
  options: TenantExportOption[];
  selectedOption: TenantExportOption | undefined;
  showRowFilters: boolean;
  showLocaleField: boolean;
  showCompletedAt: boolean;
  filterDraft: ExportFilterDraft;
  rangeErrors: ExportFilterRangeErrors;
  localeSelectOptions: ReadonlyArray<{ value: string; label: string }>;
  localeSelectValue: string;
  exportButtonRef: RefObject<HTMLButtonElement | null>;
  handleOpenChange: (nextOpen: boolean) => void;
  handlePrepare: () => Promise<void>;
  handleSubmit: (event: SubmitEvent<HTMLFormElement>) => Promise<void>;
  patchFilterDraft: (patch: Partial<ExportFilterDraft>) => void;
  setDateRange: (
    key: "createdAt" | "startedAt" | "completedAt",
    side: "from" | "to",
    value: string,
  ) => void;
  setLocale: (locale: string) => void;
};

export function useExportDialog({
  open,
  onOpenChange,
  formId,
  groups,
  listFilters,
  isExporting,
  onExport,
}: UseExportDialogArgs): UseExportDialogResult {
  const { trackFeatureUsage } = useTrackEvent();
  const exportButtonRef = useRef<HTMLButtonElement>(null);
  const wasOpenRef = useRef(false);
  const previousExportFormatIdRef = useRef<string | null>(null);

  const [phase, setPhase] = useState<ExportDialogPhase>("checking");
  const [inlineError, setInlineError] = useState<string | null>(null);
  const [prepareSuccessSummary, setPrepareSuccessSummary] = useState<
    string | null
  >(null);
  const [exportFormatId, setExportFormatId] = useState("");
  const [filterDraft, setFilterDraft] = useState<ExportFilterDraft>(
    createFilterDraftFromListFilters,
  );
  const [rangeErrors, setRangeErrors] =
    useState<ExportFilterRangeErrors>(EMPTY_RANGE_ERRORS);
  const [localeDirty, setLocaleDirty] = useState(false);
  const [formLocales, setFormLocales] = useState<string[]>([
    DEFAULT_REPORTING_LOCALE,
  ]);

  const options = useMemo(
    () => groups.flatMap((group) => group.options),
    [groups],
  );

  const selectedOption = useMemo(
    () => options.find((option) => option.exportFormatId === exportFormatId),
    [exportFormatId, options],
  );

  const showRowFilters = selectedOption
    ? showsSubmissionRowFilters(
        selectedOption.exportTarget,
        selectedOption.formatKey,
      )
    : false;
  const showLocale = selectedOption ? showsLocaleField(selectedOption) : false;
  const showCompletedAt = showsCompletedAtFields(filterDraft.completionStatus);

  const localeSelectOptions = useMemo(
    () =>
      formLocales.map((localeCode) => ({
        value: localeCode,
        label: localeCode,
      })),
    [formLocales],
  );
  const localeSelectValue = coerceLocaleToOptions(
    filterDraft.locale,
    localeSelectOptions,
  );

  const busy = isBusyPhase(phase) || isExporting;
  const controlsLocked = isControlsLocked(phase) || isExporting;

  const listFiltersRef = useRef(listFilters);
  listFiltersRef.current = listFilters;
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const applyReadinessResult = (
    result: Awaited<ReturnType<typeof listFormReportingLocalesAction>>,
  ): boolean => {
    if (Result.isSuccess(result)) {
      setFormLocales(result.value);
      setPhase("ready");
      return true;
    }

    if (isExportSchemaMissingError(result.message)) {
      setFormLocales([DEFAULT_REPORTING_LOCALE]);
      setInlineError(SCHEMA_NEEDS_PREPARE_MESSAGE);
      setPhase("needsPrepare");
      return false;
    }

    setFormLocales([DEFAULT_REPORTING_LOCALE]);
    setInlineError(result.message || GENERIC_EXPORT_FAILURE_MESSAGE);
    setPhase("ready");
    return true;
  };

  const refreshReadiness = async (): Promise<boolean> => {
    setPhase("checking");
    setInlineError(null);
    const result = await listFormReportingLocalesAction(formId);
    return applyReadinessResult(result);
  };

  const handlePrepare = async () => {
    setPhase("preparing");
    setInlineError(null);
    setPrepareSuccessSummary(null);

    const result = await prepareReportingExportAction(formId);
    if (Result.isError(result)) {
      setInlineError(result.message);
      setPhase("error");
      return;
    }

    const successSummary = formatPrepareSuccessSummary(result.value);
    const ready = await refreshReadiness();
    if (ready) {
      setPrepareSuccessSummary(successSummary);
    }
  };

  useEffect(() => {
    const justOpened = open && !wasOpenRef.current;
    wasOpenRef.current = open;

    if (!justOpened) {
      return;
    }

    const currentOptions = optionsRef.current;
    const currentListFilters = listFiltersRef.current;

    setExportFormatId(pickDefaultExportFormatId(currentOptions));
    setFilterDraft(createFilterDraftFromListFilters(currentListFilters));
    setRangeErrors(EMPTY_RANGE_ERRORS);
    setLocaleDirty(false);
    previousExportFormatIdRef.current = null;
    setInlineError(null);
    setPrepareSuccessSummary(null);

    let cancelled = false;
    void (async () => {
      setPhase("checking");
      setInlineError(null);
      const result = await listFormReportingLocalesAction(formId);
      if (!cancelled) {
        applyReadinessResult(result);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, formId]);

  useEffect(() => {
    if (!open || !showLocale || !selectedOption) {
      return;
    }

    const formatChanged =
      previousExportFormatIdRef.current !== selectedOption.exportFormatId;
    if (formatChanged) {
      previousExportFormatIdRef.current = selectedOption.exportFormatId;
      setLocaleDirty(false);
    }

    setFilterDraft((current) => {
      const optionsForFormat = formLocales.map((localeCode) => ({
        value: localeCode,
      }));

      const nextLocale =
        !formatChanged && localeDirty
          ? coerceLocaleToOptions(current.locale, optionsForFormat)
          : resolveDefaultLocale(formLocales, listFilters?.locale?.trim());

      if (nextLocale === current.locale) {
        return current;
      }

      return { ...current, locale: nextLocale };
    });
  }, [
    open,
    showLocale,
    selectedOption,
    formLocales,
    listFilters?.locale,
    localeDirty,
  ]);

  useEffect(() => {
    if (filterDraft.completionStatus !== EXPORT_COMPLETION_STATUS.incomplete) {
      return;
    }

    setFilterDraft((current) => {
      if (!current.completedAt.from && !current.completedAt.to) {
        return current;
      }
      return clearCompletedAtRange(current);
    });
    setRangeErrors((current) =>
      current.completedAt == null ? current : { ...current, completedAt: null },
    );
  }, [filterDraft.completionStatus]);

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen && busy) {
      return;
    }
    onOpenChange(nextOpen);
  };

  const patchFilterDraft = (patch: Partial<ExportFilterDraft>) => {
    setFilterDraft((current) => ({ ...current, ...patch }));
  };

  const setDateRange = (
    key: "createdAt" | "startedAt" | "completedAt",
    side: "from" | "to",
    value: string,
  ) => {
    setFilterDraft((current) => ({
      ...current,
      [key]: { ...current[key], [side]: value },
    }));
    setRangeErrors((current) => ({ ...current, [key]: null }));
  };

  const setLocale = (locale: string) => {
    setLocaleDirty(true);
    patchFilterDraft({ locale });
  };

  const handleSubmit = async (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedOption || phase === "needsPrepare" || busy) {
      return;
    }

    const nextErrors = validateFilterDraft(filterDraft, {
      showRowFilters,
      showCompletedAt,
    });
    setRangeErrors(nextErrors);
    if (hasFilterRangeErrors(nextErrors)) {
      return;
    }

    const filters = toSubmissionExportListFilters(filterDraft, {
      showLocaleField: showLocale,
      showRowFilters,
      showCompletedAt,
      locale: localeSelectValue,
    });

    setPhase("exporting");
    setInlineError(null);
    setPrepareSuccessSummary(null);

    try {
      const result = await onExport({
        formatKey: selectedOption.formatKey,
        exportName: selectedOption.label,
        exportFormatId: selectedOption.exportFormatId,
        fallbackExtension: selectedOption.fallbackExtension,
        filters,
      });

      if (!result.succeeded) {
        setInlineError(result.message ?? GENERIC_EXPORT_FAILURE_MESSAGE);
        setPhase("error");
        return;
      }

      trackFeatureUsage("export", "submissions_export", {
        format_key: selectedOption.formatKey,
        export_format_id: selectedOption.exportFormatId,
        export_target: selectedOption.exportTarget,
        export_name: selectedOption.label,
      });
      setPhase("success");
    } catch (error) {
      setInlineError(
        error instanceof Error ? error.message : GENERIC_EXPORT_FAILURE_MESSAGE,
      );
      setPhase("error");
    }
  };

  return {
    phase,
    description: getPhaseDescription(phase),
    busy,
    controlsLocked,
    showFiltersForm: showsFiltersForm(phase),
    showPrepareCta: showsPrepareCta(phase, inlineError),
    showGroupLabels: groups.length > 1,
    inlineError,
    prepareSuccessSummary,
    exportFormatId,
    setExportFormatId,
    options,
    selectedOption,
    showRowFilters,
    showLocaleField: showLocale,
    showCompletedAt,
    filterDraft,
    rangeErrors,
    localeSelectOptions,
    localeSelectValue,
    exportButtonRef,
    handleOpenChange,
    handlePrepare,
    handleSubmit,
    patchFilterDraft,
    setDateRange,
    setLocale,
  };
}
