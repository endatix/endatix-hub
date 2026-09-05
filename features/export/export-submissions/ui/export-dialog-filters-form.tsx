"use client";

import { Checkbox } from "@/components/ui/checkbox";
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
  EXPORT_COMPLETION_STATUS,
  type ExportCompletionStatusFilter,
} from "../../export-url";
import {
  COMPLETION_STATUS_OPTIONS,
  CREATED_AT_TOOLTIP,
  STARTED_AT_TOOLTIP,
  type ExportFilterDraft,
  type ExportFilterRangeErrors,
} from "../export-dialog-filters";
import type { TenantExportOptionGroup } from "../map-tenant-export-options";
import { FileKindLabel } from "@/components/common/file-kind-icon";
import { getExportWireKeyFileKind } from "@/features/export/utils";
import { ExportDateRangeFieldset } from "./export-date-range-fieldset";

interface ExportDialogFiltersFormProps {
  groups: TenantExportOptionGroup[];
  showGroupLabels: boolean;
  exportFormatId: string;
  onExportFormatIdChange: (id: string) => void;
  controlsLocked: boolean;
  optionsEmpty: boolean;
  showLocaleField: boolean;
  localeSelectValue: string;
  localeSelectOptions: ReadonlyArray<{ value: string; label: string }>;
  onLocaleChange: (locale: string) => void;
  showRowFilters: boolean;
  filterDraft: ExportFilterDraft;
  rangeErrors: ExportFilterRangeErrors;
  showCompletedAt: boolean;
  onCompletionStatusChange: (status: ExportCompletionStatusFilter) => void;
  onIncludeTestChange: (include: boolean) => void;
  onDateRangeChange: (
    key: "createdAt" | "startedAt" | "completedAt",
    side: "from" | "to",
    value: string,
  ) => void;
}

export function ExportDialogFiltersForm({
  groups,
  showGroupLabels,
  exportFormatId,
  onExportFormatIdChange,
  controlsLocked,
  optionsEmpty,
  showLocaleField,
  localeSelectValue,
  localeSelectOptions,
  onLocaleChange,
  showRowFilters,
  filterDraft,
  rangeErrors,
  showCompletedAt,
  onCompletionStatusChange,
  onIncludeTestChange,
  onDateRangeChange,
}: Readonly<ExportDialogFiltersFormProps>) {
  return (
    <div className="grid gap-5">
      <div className="grid gap-2">
        <Label htmlFor="export-submissions-format">Export format</Label>
        <Select
          value={exportFormatId}
          onValueChange={onExportFormatIdChange}
          disabled={controlsLocked || optionsEmpty}
        >
          <SelectTrigger id="export-submissions-format" className="w-full">
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
                    <FileKindLabel
                      kind={getExportWireKeyFileKind(option.formatKey)}
                    >
                      {option.label}
                    </FileKindLabel>
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
            onValueChange={onLocaleChange}
            disabled={controlsLocked}
          >
            <SelectTrigger id="export-submissions-locale" className="w-full">
              <SelectValue placeholder="Select locale" />
            </SelectTrigger>
            <SelectContent>
              {localeSelectOptions.map((localeOption) => (
                <SelectItem key={localeOption.value} value={localeOption.value}>
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
            <Label htmlFor="export-submissions-completion">Completion</Label>
            <Select
              value={filterDraft.completionStatus}
              onValueChange={(value) =>
                onCompletionStatusChange(value as ExportCompletionStatusFilter)
              }
              disabled={controlsLocked}
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
            {filterDraft.completionStatus ===
            EXPORT_COMPLETION_STATUS.incomplete ? (
              <p className="text-xs text-muted-foreground">
                Reporting export only includes completed submissions that have
                been flattened. Incomplete drafts are not in the read model yet.
              </p>
            ) : null}
          </div>

          <div className="flex items-center gap-2 pt-0.5">
            <Checkbox
              id="export-submissions-include-test"
              checked={filterDraft.includeTestSubmissions}
              onCheckedChange={(checked) =>
                onIncludeTestChange(checked === true)
              }
              disabled={controlsLocked}
            />
            <Label htmlFor="export-submissions-include-test">
              Include test submissions
            </Label>
          </div>

          <div className="grid gap-5">
            <ExportDateRangeFieldset
              legend="Created at"
              legendTooltip={CREATED_AT_TOOLTIP}
              fromId="export-submissions-created-from"
              toId="export-submissions-created-to"
              errorId="export-submissions-created-range-error"
              fromValue={filterDraft.createdAt.from}
              toValue={filterDraft.createdAt.to}
              error={rangeErrors.createdAt}
              disabled={controlsLocked}
              onFromChange={(value) =>
                onDateRangeChange("createdAt", "from", value)
              }
              onToChange={(value) =>
                onDateRangeChange("createdAt", "to", value)
              }
            />

            <ExportDateRangeFieldset
              legend="Started at"
              legendTooltip={STARTED_AT_TOOLTIP}
              fromId="export-submissions-started-from"
              toId="export-submissions-started-to"
              errorId="export-submissions-started-range-error"
              fromValue={filterDraft.startedAt.from}
              toValue={filterDraft.startedAt.to}
              error={rangeErrors.startedAt}
              disabled={controlsLocked}
              onFromChange={(value) =>
                onDateRangeChange("startedAt", "from", value)
              }
              onToChange={(value) =>
                onDateRangeChange("startedAt", "to", value)
              }
            />

            {showCompletedAt ? (
              <ExportDateRangeFieldset
                legend="Completed at"
                fromId="export-submissions-completed-from"
                toId="export-submissions-completed-to"
                errorId="export-submissions-completed-range-error"
                fromValue={filterDraft.completedAt.from}
                toValue={filterDraft.completedAt.to}
                error={rangeErrors.completedAt}
                disabled={controlsLocked}
                onFromChange={(value) =>
                  onDateRangeChange("completedAt", "from", value)
                }
                onToChange={(value) =>
                  onDateRangeChange("completedAt", "to", value)
                }
              />
            ) : null}
          </div>
        </>
      ) : (
        <p className="text-xs text-muted-foreground">
          Codebook exports do not use submission row filters (test or dates).
        </p>
      )}
    </div>
  );
}
