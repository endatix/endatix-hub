"use client";

import { useEffect, useMemo, useRef, useState, type SubmitEvent } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Spinner } from "@/components/loaders/spinner";
import { useTrackEvent } from "@/features/analytics/posthog/client";
import type { ExportTarget } from "@/lib/endatix-api/reporting/reporting";
import { Result } from "@/lib/result";
import { Info } from "lucide-react";
import {
  isCodebookFormatKey,
  type ExportCompletionStatusFilter,
  type SubmissionExportListFilters,
} from "../../export-url";
import { listFormReportingLocalesAction } from "../list-form-reporting-locales.action";
import type {
  TenantExportOption,
  TenantExportOptionGroup,
} from "../map-tenant-export-options";

const CREATED_AT_RANGE_ERROR = "Created From must be on or before Created To.";
const STARTED_AT_RANGE_ERROR = "Started From must be on or before Started To.";
const COMPLETED_AT_RANGE_ERROR =
  "Completed From must be on or before Completed To.";

const CREATED_AT_TOOLTIP =
  "When the submission record was created — including prefill or create-on-behalf before a respondent opens the form.";
const STARTED_AT_TOOLTIP =
  "When the respondent first saved an answer. Use this for time-to-complete; created can be much earlier for prefilled submissions.";

const COMPLETION_STATUS_OPTIONS: ReadonlyArray<{
  value: ExportCompletionStatusFilter;
  label: string;
}> = [
  { value: "completed", label: "Completed" },
  { value: "incomplete", label: "Incomplete" },
  { value: "all", label: "All" },
];

function showsLocale(
  option: Pick<TenantExportOption, "allowedFilters">,
): boolean {
  return option.allowedFilters.includes("locale");
}

function resolveDefaultLocale(
  formLocales: readonly string[],
  listLocale: string | undefined,
): string {
  if (listLocale && formLocales.includes(listLocale)) {
    return listLocale;
  }

  if (formLocales.includes("default")) {
    return "default";
  }

  return formLocales[0] ?? "default";
}

function coerceLocaleToOptions(
  locale: string,
  options: ReadonlyArray<{ value: string }>,
): string {
  if (options.some((option) => option.value === locale)) {
    return locale;
  }

  return options[0]?.value ?? locale;
}

export interface ExportSubmissionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  formId: string;
  /** Grouped by export target (Submissions / Codebook) — same grouping as the former dropdown. */
  groups: TenantExportOptionGroup[];
  listFilters?: SubmissionExportListFilters;
  isExporting: boolean;
  onExport: (args: {
    formatKey: string;
    exportName: string;
    exportFormatId: string;
    fallbackExtension: string;
    filters: SubmissionExportListFilters;
  }) => boolean | void | Promise<boolean | void>;
}

function showsSubmissionRowFilters(
  exportTarget: ExportTarget,
  formatKey: string,
): boolean {
  if (exportTarget === "Codebook" || isCodebookFormatKey(formatKey)) {
    return false;
  }

  return true;
}

function showsCompletedAtFields(
  completionStatus: ExportCompletionStatusFilter,
): boolean {
  return completionStatus === "completed" || completionStatus === "all";
}

function isInvalidDateRange(from: string, to: string): boolean {
  return Boolean(from && to && from > to);
}

function resolveDateRangeErrors(args: {
  showRowFilters: boolean;
  showCompletedAt: boolean;
  createdAtFrom: string;
  createdAtTo: string;
  startedAtFrom: string;
  startedAtTo: string;
  completedAtFrom: string;
  completedAtTo: string;
}): {
  createdAtRangeError: string | null;
  startedAtRangeError: string | null;
  completedAtRangeError: string | null;
} {
  if (!args.showRowFilters) {
    return {
      createdAtRangeError: null,
      startedAtRangeError: null,
      completedAtRangeError: null,
    };
  }

  return {
    createdAtRangeError: isInvalidDateRange(
      args.createdAtFrom,
      args.createdAtTo,
    )
      ? CREATED_AT_RANGE_ERROR
      : null,
    startedAtRangeError: isInvalidDateRange(
      args.startedAtFrom,
      args.startedAtTo,
    )
      ? STARTED_AT_RANGE_ERROR
      : null,
    completedAtRangeError:
      args.showCompletedAt &&
      isInvalidDateRange(args.completedAtFrom, args.completedAtTo)
        ? COMPLETED_AT_RANGE_ERROR
        : null,
  };
}

function buildExportFilters(args: {
  showLocaleField: boolean;
  showRowFilters: boolean;
  showCompletedAt: boolean;
  locale: string;
  completionStatus: ExportCompletionStatusFilter;
  includeTestSubmissions: boolean;
  createdAtFrom: string;
  createdAtTo: string;
  startedAtFrom: string;
  startedAtTo: string;
  completedAtFrom: string;
  completedAtTo: string;
}): SubmissionExportListFilters {
  const filters: SubmissionExportListFilters = {};

  if (args.showLocaleField && args.locale.trim()) {
    filters.locale = args.locale.trim();
  }

  if (args.showRowFilters) {
    filters.includeTestSubmissions = args.includeTestSubmissions;
    filters.completionStatus = args.completionStatus;
    filters.createdAtFrom = args.createdAtFrom || undefined;
    filters.createdAtTo = args.createdAtTo || undefined;
    filters.startedAtFrom = args.startedAtFrom || undefined;
    filters.startedAtTo = args.startedAtTo || undefined;
    if (args.showCompletedAt) {
      filters.completedAtFrom = args.completedAtFrom || undefined;
      filters.completedAtTo = args.completedAtTo || undefined;
    }
  }

  return filters;
}

function ExportDateRangeFieldset({
  legend,
  legendTooltip,
  fromId,
  toId,
  errorId,
  fromValue,
  toValue,
  error,
  disabled,
  onFromChange,
  onToChange,
}: Readonly<{
  legend: string;
  legendTooltip?: string;
  fromId: string;
  toId: string;
  errorId: string;
  fromValue: string;
  toValue: string;
  error: string | null;
  disabled: boolean;
  onFromChange: (value: string) => void;
  onToChange: (value: string) => void;
}>) {
  const hasError = error != null;

  return (
    <fieldset className="grid gap-2">
      <legend className="flex items-center gap-1.5 text-sm font-medium">
        <span>{legend}</span>
        {legendTooltip ? (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className="rounded-full text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                  aria-label={`${legend} info`}
                >
                  <Info className="h-3.5 w-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p className="text-sm">{legendTooltip}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ) : null}
      </legend>
      <div className="grid grid-cols-2 gap-2">
        <div className="grid gap-1">
          <Label htmlFor={fromId} className="text-xs text-muted-foreground">
            From
          </Label>
          <Input
            id={fromId}
            type="date"
            value={fromValue}
            onChange={(event) => onFromChange(event.target.value)}
            disabled={disabled}
            aria-invalid={hasError}
            aria-describedby={hasError ? errorId : undefined}
          />
        </div>
        <div className="grid gap-1">
          <Label htmlFor={toId} className="text-xs text-muted-foreground">
            To
          </Label>
          <Input
            id={toId}
            type="date"
            value={toValue}
            onChange={(event) => onToChange(event.target.value)}
            disabled={disabled}
            aria-invalid={hasError}
            aria-describedby={hasError ? errorId : undefined}
          />
        </div>
      </div>
      {hasError ? (
        <p id={errorId} className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </fieldset>
  );
}

export function ExportSubmissionsDialog({
  open,
  onOpenChange,
  formId,
  groups,
  listFilters,
  isExporting,
  onExport,
}: Readonly<ExportSubmissionsDialogProps>) {
  const { trackFeatureUsage } = useTrackEvent();
  const exportButtonRef = useRef<HTMLButtonElement>(null);
  const wasOpenRef = useRef(false);
  const [exportFormatId, setExportFormatId] = useState("");
  const [includeTestSubmissions, setIncludeTestSubmissions] = useState(false);
  const [completionStatus, setCompletionStatus] =
    useState<ExportCompletionStatusFilter>("completed");
  const [createdAtFrom, setCreatedAtFrom] = useState("");
  const [createdAtTo, setCreatedAtTo] = useState("");
  const [startedAtFrom, setStartedAtFrom] = useState("");
  const [startedAtTo, setStartedAtTo] = useState("");
  const [completedAtFrom, setCompletedAtFrom] = useState("");
  const [completedAtTo, setCompletedAtTo] = useState("");
  const [locale, setLocale] = useState("default");
  const [localeDirty, setLocaleDirty] = useState(false);
  const [formLocales, setFormLocales] = useState<string[]>(["default"]);
  const [isLoadingLocales, setIsLoadingLocales] = useState(false);
  const previousExportFormatIdRef = useRef<string | null>(null);
  const [createdAtRangeError, setCreatedAtRangeError] = useState<string | null>(
    null,
  );
  const [startedAtRangeError, setStartedAtRangeError] = useState<string | null>(
    null,
  );
  const [completedAtRangeError, setCompletedAtRangeError] = useState<
    string | null
  >(null);

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
  const showLocaleField = selectedOption ? showsLocale(selectedOption) : false;
  const showCompletedAt = showsCompletedAtFields(completionStatus);
  const localeSelectOptions = useMemo(
    () =>
      formLocales.map((localeCode) => ({
        value: localeCode,
        label: localeCode,
      })),
    [formLocales],
  );
  const localeSelectValue = coerceLocaleToOptions(locale, localeSelectOptions);

  const anyFormatAllowsLocale = useMemo(
    () => options.some((option) => showsLocale(option)),
    [options],
  );

  // Keep latest props in refs so open-edge hydration does not re-run when the
  // parent passes a new listFilters object identity on every render.
  const listFiltersRef = useRef(listFilters);
  listFiltersRef.current = listFilters;
  const optionsRef = useRef(options);
  optionsRef.current = options;

  useEffect(() => {
    const justOpened = open && !wasOpenRef.current;
    wasOpenRef.current = open;

    if (!justOpened) {
      return;
    }

    const currentOptions = optionsRef.current;
    const currentListFilters = listFiltersRef.current;

    // Prefer a submissions format so row filters (created/started/completed) are
    // visible. Preserving a prior codebook selection hid those fields on reopen
    // and looked like grid prefill was lost.
    const defaultFormatId =
      currentOptions.find((option) =>
        showsSubmissionRowFilters(option.exportTarget, option.formatKey),
      )?.exportFormatId ??
      currentOptions[0]?.exportFormatId ??
      "";
    setExportFormatId(defaultFormatId);

    // Include-test defaults off. Grid "test only" is not mirrored (API has no test-only mode).
    setIncludeTestSubmissions(
      currentListFilters?.includeTestSubmissions ?? false,
    );
    setCompletionStatus(currentListFilters?.completionStatus ?? "completed");
    setCreatedAtFrom(currentListFilters?.createdAtFrom ?? "");
    setCreatedAtTo(currentListFilters?.createdAtTo ?? "");
    setStartedAtFrom(currentListFilters?.startedAtFrom ?? "");
    setStartedAtTo(currentListFilters?.startedAtTo ?? "");
    setCompletedAtFrom(currentListFilters?.completedAtFrom ?? "");
    setCompletedAtTo(currentListFilters?.completedAtTo ?? "");
    setCreatedAtRangeError(null);
    setStartedAtRangeError(null);
    setCompletedAtRangeError(null);
    setLocaleDirty(false);
    previousExportFormatIdRef.current = null;
  }, [open]);

  useEffect(() => {
    if (!open || !formId || !anyFormatAllowsLocale) {
      return;
    }

    let cancelled = false;
    setIsLoadingLocales(true);

    void listFormReportingLocalesAction(formId)
      .then((result) => {
        if (cancelled) {
          return;
        }

        const locales = Result.isSuccess(result) ? result.value : ["default"];
        setFormLocales(locales);
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoadingLocales(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [open, formId, anyFormatAllowsLocale]);

  useEffect(() => {
    if (!open || !showLocaleField || !selectedOption) {
      return;
    }

    const formatChanged =
      previousExportFormatIdRef.current !== selectedOption.exportFormatId;
    if (formatChanged) {
      previousExportFormatIdRef.current = selectedOption.exportFormatId;
      setLocaleDirty(false);
    }

    setLocale((current) => {
      const optionsForFormat = formLocales.map((localeCode) => ({
        value: localeCode,
      }));

      if (!formatChanged && localeDirty) {
        return coerceLocaleToOptions(current, optionsForFormat);
      }

      return resolveDefaultLocale(formLocales, listFilters?.locale?.trim());
    });
  }, [
    open,
    showLocaleField,
    selectedOption,
    formLocales,
    listFilters?.locale,
    localeDirty,
  ]);

  useEffect(() => {
    if (completionStatus === "incomplete") {
      setCompletedAtFrom("");
      setCompletedAtTo("");
      setCompletedAtRangeError(null);
    }
  }, [completionStatus]);

  const showGroupLabels = groups.length > 1;

  const handleSubmit = async (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedOption) {
      return;
    }

    const rangeErrors = resolveDateRangeErrors({
      showRowFilters,
      showCompletedAt,
      createdAtFrom,
      createdAtTo,
      startedAtFrom,
      startedAtTo,
      completedAtFrom,
      completedAtTo,
    });
    setCreatedAtRangeError(rangeErrors.createdAtRangeError);
    setStartedAtRangeError(rangeErrors.startedAtRangeError);
    setCompletedAtRangeError(rangeErrors.completedAtRangeError);

    if (
      rangeErrors.createdAtRangeError ||
      rangeErrors.startedAtRangeError ||
      rangeErrors.completedAtRangeError
    ) {
      return;
    }

    const filters = buildExportFilters({
      showLocaleField,
      showRowFilters,
      showCompletedAt,
      locale: localeSelectValue,
      completionStatus,
      includeTestSubmissions,
      createdAtFrom,
      createdAtTo,
      startedAtFrom,
      startedAtTo,
      completedAtFrom,
      completedAtTo,
    });

    try {
      const succeeded = await onExport({
        formatKey: selectedOption.formatKey,
        exportName: selectedOption.label,
        exportFormatId: selectedOption.exportFormatId,
        fallbackExtension: selectedOption.fallbackExtension,
        filters,
      });

      if (succeeded === false) {
        return;
      }

      trackFeatureUsage("export", "submissions_export", {
        format_key: selectedOption.formatKey,
        export_format_id: selectedOption.exportFormatId,
        export_target: selectedOption.exportTarget,
        export_name: selectedOption.label,
      });
    } catch {
      // Export failures are reported by the owner; do not track.
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-md"
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          exportButtonRef.current?.focus();
        }}
      >
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Export submissions</DialogTitle>
            <DialogDescription>
              Choose a format and filters. Date ranges are prefilled from the
              table when set. Press Enter to export with the current options.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="export-submissions-format">Export format</Label>
              <Select
                value={exportFormatId}
                onValueChange={setExportFormatId}
                disabled={isExporting || options.length === 0}
              >
                <SelectTrigger
                  id="export-submissions-format"
                  className="w-full"
                >
                  <SelectValue placeholder="Select format" />
                </SelectTrigger>
                <SelectContent>
                  {groups.map((group) => (
                    <SelectGroup key={group.target}>
                      {showGroupLabels ? (
                        <SelectLabel>{group.label}</SelectLabel>
                      ) : null}
                      {group.options.map((option) => (
                        <SelectItem
                          key={option.exportFormatId}
                          value={option.exportFormatId}
                        >
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {showLocaleField ? (
              <div className="grid gap-2">
                <Label htmlFor="export-submissions-locale">Locale</Label>
                <Select
                  value={localeSelectValue}
                  onValueChange={(value) => {
                    setLocaleDirty(true);
                    setLocale(value);
                  }}
                  disabled={isExporting || isLoadingLocales}
                >
                  <SelectTrigger
                    id="export-submissions-locale"
                    className="w-full"
                  >
                    <SelectValue placeholder="Select locale" />
                  </SelectTrigger>
                  <SelectContent>
                    {localeSelectOptions.map((localeOption) => (
                      <SelectItem
                        key={localeOption.value}
                        value={localeOption.value}
                      >
                        {localeOption.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Label language for this codebook export.
                </p>
              </div>
            ) : null}

            {showRowFilters ? (
              <>
                <div className="grid gap-2">
                  <Label htmlFor="export-submissions-completion">
                    Completion
                  </Label>
                  <Select
                    value={completionStatus}
                    onValueChange={(value) =>
                      setCompletionStatus(value as ExportCompletionStatusFilter)
                    }
                    disabled={isExporting}
                  >
                    <SelectTrigger
                      id="export-submissions-completion"
                      className="w-full"
                    >
                      <SelectValue placeholder="Select completion" />
                    </SelectTrigger>
                    <SelectContent>
                      {COMPLETION_STATUS_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center gap-2">
                  <Checkbox
                    id="export-submissions-include-test"
                    checked={includeTestSubmissions}
                    onCheckedChange={(checked) =>
                      setIncludeTestSubmissions(checked === true)
                    }
                    disabled={isExporting}
                  />
                  <Label htmlFor="export-submissions-include-test">
                    Include test submissions
                  </Label>
                </div>

                <ExportDateRangeFieldset
                  legend="Created at"
                  legendTooltip={CREATED_AT_TOOLTIP}
                  fromId="export-submissions-created-from"
                  toId="export-submissions-created-to"
                  errorId="export-submissions-created-range-error"
                  fromValue={createdAtFrom}
                  toValue={createdAtTo}
                  error={createdAtRangeError}
                  disabled={isExporting}
                  onFromChange={(value) => {
                    setCreatedAtFrom(value);
                    setCreatedAtRangeError(null);
                  }}
                  onToChange={(value) => {
                    setCreatedAtTo(value);
                    setCreatedAtRangeError(null);
                  }}
                />

                <ExportDateRangeFieldset
                  legend="Started at"
                  legendTooltip={STARTED_AT_TOOLTIP}
                  fromId="export-submissions-started-from"
                  toId="export-submissions-started-to"
                  errorId="export-submissions-started-range-error"
                  fromValue={startedAtFrom}
                  toValue={startedAtTo}
                  error={startedAtRangeError}
                  disabled={isExporting}
                  onFromChange={(value) => {
                    setStartedAtFrom(value);
                    setStartedAtRangeError(null);
                  }}
                  onToChange={(value) => {
                    setStartedAtTo(value);
                    setStartedAtRangeError(null);
                  }}
                />

                {showCompletedAt ? (
                  <ExportDateRangeFieldset
                    legend="Completed at"
                    fromId="export-submissions-completed-from"
                    toId="export-submissions-completed-to"
                    errorId="export-submissions-completed-range-error"
                    fromValue={completedAtFrom}
                    toValue={completedAtTo}
                    error={completedAtRangeError}
                    disabled={isExporting}
                    onFromChange={(value) => {
                      setCompletedAtFrom(value);
                      setCompletedAtRangeError(null);
                    }}
                    onToChange={(value) => {
                      setCompletedAtTo(value);
                      setCompletedAtRangeError(null);
                    }}
                  />
                ) : null}
              </>
            ) : (
              <p className="text-xs text-muted-foreground">
                Codebook exports do not use submission row filters (test or
                dates).
              </p>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isExporting}
            >
              Cancel
            </Button>
            <Button
              ref={exportButtonRef}
              type="submit"
              disabled={isExporting || !selectedOption}
            >
              {isExporting ? (
                <>
                  <Spinner className="mr-2 h-4 w-4" />
                  Exporting...
                </>
              ) : (
                "Export"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
