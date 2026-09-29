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
import {
  catalogLocaleCodeLabel,
  catalogLocaleEnglishName,
} from "@/lib/localization";
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
  includesIncompleteSubmissions,
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
  formatPrepareOutcome,
  getPhaseDescription,
  isBusyPhase,
  isControlsLocked,
  showsFiltersForm,
  showsPrepareCta,
  showsPrepareOptions,
  showsRebuildEntry,
  type ExportDialogPhase,
  type PrepareOutcome,
} from "./export-dialog-phase";
import { listFormReportingLocalesAction } from "./list-form-reporting-locales.action";
import {
  refreshIncompleteSubmissionsAction,
  type IncompleteRefreshOutcome,
} from "./refresh-incomplete-submissions.action";
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
  includingIncomplete: boolean;
  /** Set after an export that refreshed incomplete submissions first. */
  incompleteRefresh: IncompleteRefreshOutcome | null;
  description: string;
  busy: boolean;
  controlsLocked: boolean;
  rebuildMode: boolean;
  showFiltersForm: boolean;
  showPrepareCta: boolean;
  showPrepareOptions: boolean;
  showRebuildEntry: boolean;
  showBackToExport: boolean;
  showExportSubmit: boolean;
  showGroupLabels: boolean;
  inlineError: string | null;
  prepareOutcome: PrepareOutcome | null;
  fullRecompile: boolean;
  setFullRecompile: (fullRecompile: boolean) => void;
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
  enterRebuildMode: () => void;
  exitRebuildMode: () => void;
  handlePrepare: () => Promise<void>;
  handleSubmit: (event: SubmitEvent<HTMLFormElement>) => Promise<void>;
  patchFilterDraft: (patch: Partial<ExportFilterDraft>) => void;
  setDateRange: (
    key: "createdAt" | "modifiedAt" | "startedAt" | "completedAt",
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
  const [includingIncomplete, setIncludingIncomplete] = useState(false);
  const [incompleteRefresh, setIncompleteRefresh] =
    useState<IncompleteRefreshOutcome | null>(null);
  const [inlineError, setInlineError] = useState<string | null>(null);
  const [prepareOutcome, setPrepareOutcome] = useState<PrepareOutcome | null>(
    null,
  );
  const [rebuildMode, setRebuildMode] = useState(false);
  const [fullRecompile, setFullRecompile] = useState(false);
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
  const [readinessPassed, setReadinessPassed] = useState(false);

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
        label: `${catalogLocaleEnglishName(localeCode)} ${catalogLocaleCodeLabel(localeCode)}`,
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
      setReadinessPassed(true);
      setPhase("ready");
      return true;
    }

    setReadinessPassed(false);

    if (isExportSchemaMissingError(result.message)) {
      setFormLocales([DEFAULT_REPORTING_LOCALE]);
      setInlineError(SCHEMA_NEEDS_PREPARE_MESSAGE);
      setPhase("needsPrepare");
      return false;
    }

    setInlineError(result.message || GENERIC_EXPORT_FAILURE_MESSAGE);
    setPhase("error");
    return false;
  };

  const refreshReadiness = async (): Promise<boolean> => {
    setPhase("checking");
    setReadinessPassed(false);
    setInlineError(null);
    const result = await listFormReportingLocalesAction(formId);
    return applyReadinessResult(result);
  };

  const enterRebuildMode = () => {
    setRebuildMode(true);
    setFullRecompile(false);
    setInlineError(null);
    setPhase("needsPrepare");
  };

  const exitRebuildMode = () => {
    setRebuildMode(false);
    setFullRecompile(false);
    setInlineError(null);
    if (readinessPassed) {
      setPhase("ready");
    }
  };

  const handlePrepare = async () => {
    setPhase("preparing");
    setInlineError(null);
    setPrepareOutcome(null);

    const result = await prepareReportingExportAction(formId, {
      fullRecompile,
    });
    if (Result.isError(result)) {
      setInlineError(result.message);
      setPhase("error");
      return;
    }

    const outcome = formatPrepareOutcome(result.value);
    setRebuildMode(false);
    setFullRecompile(false);
    const ready = await refreshReadiness();
    if (ready) {
      setPrepareOutcome(outcome);
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
    setIncludingIncomplete(false);
    setIncompleteRefresh(null);
    previousExportFormatIdRef.current = null;
    setInlineError(null);
    setPrepareOutcome(null);
    setRebuildMode(false);
    setFullRecompile(false);

    let cancelled = false;
    void (async () => {
      setPhase("checking");
      setReadinessPassed(false);
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
    key: "createdAt" | "modifiedAt" | "startedAt" | "completedAt",
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

    const includesIncomplete =
      showRowFilters &&
      includesIncompleteSubmissions(filterDraft.completionStatus);

    setPhase("exporting");
    setInlineError(null);
    setPrepareOutcome(null);
    setIncludingIncomplete(includesIncomplete);
    setIncompleteRefresh(null);

    try {
      if (includesIncomplete) {
        const refresh = await refreshIncompleteSubmissionsAction(formId);
        setIncludingIncomplete(false);
        if (Result.isError(refresh)) {
          setInlineError(refresh.message);
          setPhase("error");
          return;
        }
        setIncompleteRefresh(refresh.value);
      }

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
    } catch {
      setIncludingIncomplete(false);
      setInlineError(GENERIC_EXPORT_FAILURE_MESSAGE);
      setPhase("error");
    }
  };

  // Rebuild prepare can fail with a message that is not a "prepare recovery"
  // export error; keep retry + Back to export available in that case.
  const prepareCtaVisible =
    showsPrepareCta(phase, inlineError) || (rebuildMode && phase === "error");

  return {
    phase,
    includingIncomplete,
    incompleteRefresh,
    description: getPhaseDescription(phase, {
      rebuildMode,
      includingIncomplete,
    }),
    busy,
    controlsLocked,
    rebuildMode,
    showFiltersForm: showsFiltersForm(phase) && readinessPassed && !rebuildMode,
    showPrepareCta: prepareCtaVisible,
    showPrepareOptions: showsPrepareOptions(phase, rebuildMode),
    showRebuildEntry: showsRebuildEntry(phase),
    showBackToExport:
      rebuildMode && (phase === "needsPrepare" || phase === "error"),
    showExportSubmit: readinessPassed && !prepareCtaVisible && !rebuildMode,
    showGroupLabels: groups.length > 1,
    inlineError,
    prepareOutcome,
    fullRecompile,
    setFullRecompile,
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
    enterRebuildMode,
    exitRebuildMode,
    handlePrepare,
    handleSubmit,
    patchFilterDraft,
    setDateRange,
    setLocale,
  };
}
