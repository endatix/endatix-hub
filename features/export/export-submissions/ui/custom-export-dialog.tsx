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
import { Spinner } from "@/components/loaders/spinner";
import { useTrackEvent } from "@/features/analytics/posthog/client";
import type { ExportTarget } from "@/lib/endatix-api/reporting/reporting";
import {
  isCodebookWireKey,
  type SubmissionExportListFilters,
} from "../../export-url";
import type { TenantExportOptionGroup } from "../map-tenant-export-options";

const CREATED_AT_RANGE_ERROR = "Created From must be on or before Created To.";
const COMPLETED_AT_RANGE_ERROR =
  "Completed From must be on or before Completed To.";

export interface ExportSubmissionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Grouped by export target (Submissions / Codebook) — same grouping as the former dropdown. */
  groups: TenantExportOptionGroup[];
  listFilters?: SubmissionExportListFilters;
  isExporting: boolean;
  onExport: (args: {
    wireKey: string;
    exportName: string;
    exportFormatId: string;
    fallbackExtension: string;
    filters: SubmissionExportListFilters;
  }) => boolean | void | Promise<boolean | void>;
}

function showsSubmissionRowFilters(
  exportTarget: ExportTarget,
  wireKey: string,
): boolean {
  if (exportTarget === "Codebook" || isCodebookWireKey(wireKey)) {
    return false;
  }

  return true;
}

function showsLocale(wireKey: string): boolean {
  // Native codebook streams FormSchema JSON as-is (no request locale).
  return wireKey !== "codebook";
}

function isInvalidDateRange(from: string, to: string): boolean {
  return Boolean(from && to && from > to);
}

function resolveDateRangeErrors(args: {
  showRowFilters: boolean;
  createdAtFrom: string;
  createdAtTo: string;
  completedAtFrom: string;
  completedAtTo: string;
}): {
  createdAtRangeError: string | null;
  completedAtRangeError: string | null;
} {
  if (!args.showRowFilters) {
    return { createdAtRangeError: null, completedAtRangeError: null };
  }

  return {
    createdAtRangeError: isInvalidDateRange(
      args.createdAtFrom,
      args.createdAtTo,
    )
      ? CREATED_AT_RANGE_ERROR
      : null,
    completedAtRangeError: isInvalidDateRange(
      args.completedAtFrom,
      args.completedAtTo,
    )
      ? COMPLETED_AT_RANGE_ERROR
      : null,
  };
}

function buildExportFilters(args: {
  showLocaleField: boolean;
  showRowFilters: boolean;
  locale: string;
  includeTestSubmissions: boolean;
  createdAtFrom: string;
  createdAtTo: string;
  completedAtFrom: string;
  completedAtTo: string;
}): SubmissionExportListFilters {
  const filters: SubmissionExportListFilters = {};

  if (args.showLocaleField) {
    const trimmedLocale = args.locale.trim();
    if (trimmedLocale && trimmedLocale !== "default") {
      filters.locale = trimmedLocale;
    }
  }

  if (args.showRowFilters) {
    filters.includeTestSubmissions = args.includeTestSubmissions;
    filters.createdAtFrom = args.createdAtFrom || undefined;
    filters.createdAtTo = args.createdAtTo || undefined;
    filters.completedAtFrom = args.completedAtFrom || undefined;
    filters.completedAtTo = args.completedAtTo || undefined;
  }

  return filters;
}

function ExportDateRangeFieldset({
  legend,
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
      <legend className="text-sm font-medium">{legend}</legend>
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
  const [createdAtFrom, setCreatedAtFrom] = useState("");
  const [createdAtTo, setCreatedAtTo] = useState("");
  const [completedAtFrom, setCompletedAtFrom] = useState("");
  const [completedAtTo, setCompletedAtTo] = useState("");
  const [locale, setLocale] = useState("default");
  const [createdAtRangeError, setCreatedAtRangeError] = useState<string | null>(
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
        selectedOption.wireKey,
      )
    : false;
  const showLocaleField = selectedOption
    ? showsLocale(selectedOption.wireKey)
    : false;

  useEffect(() => {
    const justOpened = open && !wasOpenRef.current;
    wasOpenRef.current = open;

    if (!justOpened) {
      return;
    }

    const defaultFormatId = options[0]?.exportFormatId ?? "";
    setExportFormatId((current) =>
      current && options.some((option) => option.exportFormatId === current)
        ? current
        : defaultFormatId,
    );
    // Include-test defaults off. Grid "test only" is not mirrored (API has no test-only mode).
    setIncludeTestSubmissions(listFilters?.includeTestSubmissions ?? false);
    setCreatedAtFrom(listFilters?.createdAtFrom ?? "");
    setCreatedAtTo(listFilters?.createdAtTo ?? "");
    setCompletedAtFrom(listFilters?.completedAtFrom ?? "");
    setCompletedAtTo(listFilters?.completedAtTo ?? "");
    setLocale(listFilters?.locale?.trim() || "default");
    setCreatedAtRangeError(null);
    setCompletedAtRangeError(null);
  }, [open, options, listFilters]);

  const showGroupLabels = groups.length > 1;

  const handleSubmit = async (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedOption) {
      return;
    }

    const rangeErrors = resolveDateRangeErrors({
      showRowFilters,
      createdAtFrom,
      createdAtTo,
      completedAtFrom,
      completedAtTo,
    });
    setCreatedAtRangeError(rangeErrors.createdAtRangeError);
    setCompletedAtRangeError(rangeErrors.completedAtRangeError);

    if (rangeErrors.createdAtRangeError || rangeErrors.completedAtRangeError) {
      return;
    }

    const filters = buildExportFilters({
      showLocaleField,
      showRowFilters,
      locale,
      includeTestSubmissions,
      createdAtFrom,
      createdAtTo,
      completedAtFrom,
      completedAtTo,
    });

    try {
      const succeeded = await onExport({
        wireKey: selectedOption.wireKey,
        exportName: selectedOption.label,
        exportFormatId: selectedOption.exportFormatId,
        fallbackExtension: selectedOption.fallbackExtension,
        filters,
      });

      if (succeeded === false) {
        return;
      }

      trackFeatureUsage("export", "submissions_export", {
        wire_key: selectedOption.wireKey,
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
                <Input
                  id="export-submissions-locale"
                  value={locale}
                  onChange={(event) => setLocale(event.target.value)}
                  placeholder="default"
                  maxLength={32}
                  disabled={isExporting}
                />
                <p className="text-xs text-muted-foreground">
                  Leave as <code>default</code> or set a locale code (e.g.{" "}
                  <code>es</code>) for translated labels.
                </p>
              </div>
            ) : null}

            {showRowFilters ? (
              <>
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
