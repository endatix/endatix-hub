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
import { FacetedFilter } from "@/components/table";
import { Button } from "@/components/ui/button";
import { COLLECTION_STATUS_FACET_GROUPS } from "@/features/submissions/ui/describe-collection-status";
import type { SubmissionExportListFilters } from "../../export-url";
import {
  DATE_RANGE_HINTS,
  ROW_FILTER_DATE_KEYS,
  createFilterDraftFromListFilters,
  includesIncompleteSubmissions,
  rowFiltersMatch,
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
  /** The table's filters the dialog opened with; absent when not opened from a list. */
  tablePrefill?: SubmissionExportListFilters;
  onPatchFilterDraft: (patch: Partial<ExportFilterDraft>) => void;
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
  tablePrefill,
  onPatchFilterDraft,
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

      <SubmissionsSection
        showRowFilters={showRowFilters}
        filterDraft={filterDraft}
        rangeErrors={rangeErrors}
        showCompletedAt={showCompletedAt}
        controlsLocked={controlsLocked}
        tablePrefill={tablePrefill}
        onPatchFilterDraft={onPatchFilterDraft}
        onDateRangeChange={onDateRangeChange}
      />
    </>
  );
}

type DateRangeKey = (typeof ROW_FILTER_DATE_KEYS)[number];

interface SubmissionsSectionProps {
  showRowFilters: boolean;
  filterDraft: ExportFilterDraft;
  rangeErrors: ExportFilterRangeErrors;
  showCompletedAt: boolean;
  controlsLocked: boolean;
  tablePrefill?: SubmissionExportListFilters;
  onPatchFilterDraft: (patch: Partial<ExportFilterDraft>) => void;
  onDateRangeChange: (
    key: DateRangeKey,
    side: "from" | "to",
    value: string,
  ) => void;
}

/**
 * Which submissions to export. Opened from the list, it starts on the list's
 * filters and says so; once changed, it says that too and offers the way back.
 */
function SubmissionsSection(props: Readonly<SubmissionsSectionProps>) {
  const table = useTableFilters(props);
  return (
    <PanelSection
      icon={ListFilter}
      title="Submissions"
      description={submissionsDescription(props, table.matches)}
      aside={table.resetAction}
    >
      {props.showRowFilters ? (
        <>
          <StatusField {...props} />
          <IncludeTestField {...props} />
          <DateRangeFields {...props} />
        </>
      ) : null}
    </PanelSection>
  );
}

/** The table's prefill as a draft, whether the draft still matches it, and the way back. */
function useTableFilters(props: Readonly<SubmissionsSectionProps>) {
  const { tablePrefill, filterDraft, showCompletedAt, showRowFilters } = props;
  const table = createFilterDraftFromListFilters(tablePrefill);
  const matches = rowFiltersMatch(filterDraft, table, {
    includeCompletedAt: showCompletedAt,
  });
  const canReset = Boolean(tablePrefill) && showRowFilters && !matches;
  return {
    matches,
    resetAction: canReset ? (
      <UseTableFiltersButton
        disabled={props.controlsLocked}
        onClick={() => resetToTable(props, table)}
      />
    ) : null,
  };
}

/** Dates go through onDateRangeChange so their range errors clear too. */
function resetToTable(
  props: Readonly<SubmissionsSectionProps>,
  table: ExportFilterDraft,
) {
  props.onPatchFilterDraft({
    collectionStatus: table.collectionStatus,
    includeTestSubmissions: table.includeTestSubmissions,
  });
  for (const key of ROW_FILTER_DATE_KEYS) {
    props.onDateRangeChange(key, "from", table[key].from);
    props.onDateRangeChange(key, "to", table[key].to);
  }
}

/** `type="button"`: the dialog is a form, and this must not submit it. */
function UseTableFiltersButton({
  disabled,
  onClick,
}: Readonly<{ disabled: boolean; onClick: () => void }>) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={onClick}
      disabled={disabled}
    >
      Use table filters
    </Button>
  );
}

function submissionsDescription(
  props: Readonly<SubmissionsSectionProps>,
  matchesTable: boolean,
): string {
  if (!props.showRowFilters) {
    return "A codebook describes the form's questions, so submission filters don't apply.";
  }
  if (!props.tablePrefill) {
    return "Choose which submissions to export.";
  }
  const origin = matchesTable
    ? "Prefilled from the filters on the submissions table."
    : "Changed from the filters on the submissions table.";
  const tableOnly = props.tablePrefill.tableOnlyFilters ?? [];
  if (tableOnly.length === 0) {
    return origin;
  }
  return `${origin} Its ${joinNames(tableOnly)} ${tableOnly.length > 1 ? "filters don't" : "filter doesn't"} apply to exports, so the file can include rows the table hides.`;
}

function joinNames(names: readonly string[]): string {
  if (names.length < 2) {
    return names.join("");
  }
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

const STATUS_FIELD_ID = "export-submissions-status";
const STATUS_HINT_ID = "export-submissions-status-hint";

const STATUS_FACET = {
  variant: "field",
  id: STATUS_FIELD_ID,
  title: "Status",
  emptyLabel: "All statuses",
  groups: COLLECTION_STATUS_FACET_GROUPS,
} as const;

/** Status, the same grouped facet as the list, as a labelled form field. */
function StatusField(props: Readonly<SubmissionsSectionProps>) {
  const codes = props.filterDraft.collectionStatus;
  const showHint = includesIncompleteSubmissions(codes);
  const onValueChange = (values: Set<string>) =>
    props.onPatchFilterDraft({ collectionStatus: [...values] });
  return (
    <div className="grid gap-2">
      <Label htmlFor={STATUS_FIELD_ID}>Status</Label>
      <FacetedFilter
        {...STATUS_FACET}
        describedBy={showHint ? STATUS_HINT_ID : undefined}
        selectedValues={new Set(codes)}
        onValueChange={onValueChange}
        disabled={props.controlsLocked}
      />
      {showHint ? <IncompleteRefreshHint /> : null}
    </div>
  );
}

/** The consequence of including incomplete rows, on the field that chooses them. */
function IncompleteRefreshHint() {
  return (
    <p id={STATUS_HINT_ID} className="text-xs text-muted-foreground">
      Incomplete submissions are updated first, so this export takes a little
      longer.
    </p>
  );
}

function IncludeTestField(props: Readonly<SubmissionsSectionProps>) {
  return (
    <div className="flex items-center gap-2">
      <Checkbox
        id="export-submissions-include-test"
        checked={props.filterDraft.includeTestSubmissions}
        onCheckedChange={(checked) =>
          props.onPatchFilterDraft({ includeTestSubmissions: checked === true })
        }
        disabled={props.controlsLocked}
      />
      <Label htmlFor="export-submissions-include-test">
        Include test submissions
      </Label>
    </div>
  );
}

const DATE_RANGE_FIELDS: ReadonlyArray<{
  key: DateRangeKey;
  legend: string;
  idStem: string;
}> = [
  { key: "createdAt", legend: "Created at", idStem: "created" },
  { key: "modifiedAt", legend: "Modified at", idStem: "modified" },
  { key: "startedAt", legend: "Started at", idStem: "started" },
  { key: "completedAt", legend: "Completed at", idStem: "completed" },
];

/** Completed at only while the Status choice can include complete submissions. */
function visibleDateRangeFields(showCompletedAt: boolean) {
  return DATE_RANGE_FIELDS.filter(
    (field) => field.key !== "completedAt" || showCompletedAt,
  );
}

function dateRangeIds(idStem: string) {
  return {
    fromId: `export-submissions-${idStem}-from`,
    toId: `export-submissions-${idStem}-to`,
    errorId: `export-submissions-${idStem}-range-error`,
  };
}

function DateRangeFields(props: Readonly<SubmissionsSectionProps>) {
  const { filterDraft, rangeErrors, controlsLocked, onDateRangeChange } = props;
  return visibleDateRangeFields(props.showCompletedAt).map(
    ({ key, legend, idStem }) => (
      <ExportDateRangeFieldset
        key={key}
        legend={legend}
        hint={DATE_RANGE_HINTS[key]}
        {...dateRangeIds(idStem)}
        fromValue={filterDraft[key].from}
        toValue={filterDraft[key].to}
        error={rangeErrors[key]}
        disabled={controlsLocked}
        onFromChange={(value) => onDateRangeChange(key, "from", value)}
        onToChange={(value) => onDateRangeChange(key, "to", value)}
      />
    ),
  );
}
