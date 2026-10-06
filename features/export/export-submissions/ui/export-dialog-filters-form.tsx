"use client";

import { FileKindLabel } from "@/components/common/file-kind-icon";
import { LocaleLabel } from "@/components/common/locale-label";
import { PanelSection } from "@/components/common/panel-section";
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
import { type ExportCompletionStatusFilter } from "../../export-url";
import {
  COMPLETION_STATUS_OPTIONS,
  DATE_RANGE_HINTS,
  includesIncompleteSubmissions,
  type ExportFilterDraft,
  type ExportFilterRangeErrors,
} from "../export-dialog-filters";
import type { TenantExportOptionGroup } from "../map-tenant-export-options";
import { getExportWireKeyFileKind } from "@/features/export/utils";
import { FileDown, ListFilter } from "lucide-react";
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
    key: "createdAt" | "modifiedAt" | "startedAt" | "completedAt",
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
    <>
      <PanelSection icon={FileDown} title="File">
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
                      textValue={option.label}
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
            <Label htmlFor="export-submissions-locale">Language</Label>
            <Select
              value={localeSelectValue}
              onValueChange={onLocaleChange}
              disabled={controlsLocked}
            >
              <SelectTrigger
                id="export-submissions-locale"
                className="w-full"
                aria-describedby="export-submissions-locale-hint"
              >
                <SelectValue placeholder="Select language" />
              </SelectTrigger>
              <SelectContent>
                {localeSelectOptions.map((localeOption) => (
                  <SelectItem
                    key={localeOption.value}
                    value={localeOption.value}
                    textValue={localeOption.label}
                  >
                    <LocaleLabel catalogLocale={localeOption.value} />
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p
              id="export-submissions-locale-hint"
              className="text-xs text-muted-foreground"
            >
              Question and choice labels in the codebook.
            </p>
          </div>
        ) : null}
      </PanelSection>

      <PanelSection
        icon={ListFilter}
        title="Submissions"
        description={
          showRowFilters
            ? "Prefilled from the filters on the submissions table."
            : "A codebook describes the form's questions, so submission filters don't apply."
        }
      >
        {showRowFilters ? (
          <>
            <CompletionField
              filterDraft={filterDraft}
              controlsLocked={controlsLocked}
              onCompletionStatusChange={onCompletionStatusChange}
            />

            <div className="flex items-center gap-2">
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

            <ExportDateRangeFieldset
              legend="Created at"
              hint={DATE_RANGE_HINTS.createdAt}
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
              legend="Modified at"
              hint={DATE_RANGE_HINTS.modifiedAt}
              fromId="export-submissions-modified-from"
              toId="export-submissions-modified-to"
              errorId="export-submissions-modified-range-error"
              fromValue={filterDraft.modifiedAt.from}
              toValue={filterDraft.modifiedAt.to}
              error={rangeErrors.modifiedAt}
              disabled={controlsLocked}
              onFromChange={(value) =>
                onDateRangeChange("modifiedAt", "from", value)
              }
              onToChange={(value) =>
                onDateRangeChange("modifiedAt", "to", value)
              }
            />

            <ExportDateRangeFieldset
              legend="Started at"
              hint={DATE_RANGE_HINTS.startedAt}
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
                hint={DATE_RANGE_HINTS.completedAt}
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
          </>
        ) : null}
      </PanelSection>
    </>
  );
}

const COMPLETION_HINT_ID = "export-submissions-completion-hint";
const WIDER_THAN_LIST_HINT_ID = "export-submissions-completion-wider-hint";

interface CompletionFieldProps {
  filterDraft: ExportFilterDraft;
  controlsLocked: boolean;
  onCompletionStatusChange: (status: ExportCompletionStatusFilter) => void;
}

/**
 * Completion, with the consequences of the choice under it — not a standing
 * alert above the form: incomplete rows are refreshed first, and the table's
 * Status filter may be narrower than any choice here.
 */
function CompletionField({
  filterDraft,
  controlsLocked,
  onCompletionStatusChange,
}: Readonly<CompletionFieldProps>) {
  const hints = completionHints(filterDraft);
  return (
    <div className="grid gap-2">
      <Label htmlFor="export-submissions-completion">Completion</Label>
      <CompletionSelect
        value={filterDraft.completionStatus}
        describedBy={hints.map((hint) => hint.id).join(" ") || undefined}
        disabled={controlsLocked}
        onChange={onCompletionStatusChange}
      />
      <FieldHints hints={hints} />
    </div>
  );
}

type FieldHint = { id: string; text: string };

function FieldHints({ hints }: Readonly<{ hints: FieldHint[] }>) {
  return hints.map((hint) => (
    <p key={hint.id} id={hint.id} className="text-xs text-muted-foreground">
      {hint.text}
    </p>
  ));
}

const COMPLETION_ITEMS = COMPLETION_STATUS_OPTIONS.map((option) => (
  <SelectItem key={option.value} value={option.value}>
    {option.label}
  </SelectItem>
));

interface CompletionSelectProps {
  value: ExportCompletionStatusFilter;
  describedBy?: string;
  disabled: boolean;
  onChange: (status: ExportCompletionStatusFilter) => void;
}

function CompletionSelect(props: Readonly<CompletionSelectProps>) {
  const onValueChange = (value: string) =>
    props.onChange(value as ExportCompletionStatusFilter);
  return (
    <Select
      value={props.value}
      onValueChange={onValueChange}
      disabled={props.disabled}
    >
      <SelectTrigger
        id="export-submissions-completion"
        className="w-full"
        aria-describedby={props.describedBy}
      >
        <SelectValue placeholder="Select completion" />
      </SelectTrigger>
      <SelectContent>{COMPLETION_ITEMS}</SelectContent>
    </Select>
  );
}

function completionHints(draft: ExportFilterDraft): FieldHint[] {
  const hints: FieldHint[] = [];
  if (draft.statusFilterWiderThanList) {
    hints.push({
      id: WIDER_THAN_LIST_HINT_ID,
      text: "The table's Status filter can't be applied to exports exactly, so this export can include statuses the table hides.",
    });
  }
  if (includesIncompleteSubmissions(draft.completionStatus)) {
    hints.push({
      id: COMPLETION_HINT_ID,
      text: "Incomplete submissions are updated first, so this export takes a little longer.",
    });
  }
  return hints;
}
