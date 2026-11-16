"use client";

import {
  DataTableToolbar,
  FacetedFilter,
  type ResetFiltersButtonProps,
} from "@/components/table";
import {
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  ExportSubmissionsButton,
  type SubmissionExportAccess,
} from "@/features/export";
import { collectionStatusFacetGroups } from "@/features/submissions/ui/describe-collection-status";
import {
  REVIEW_STATUS_OPTIONS,
  SUBMISSION_TYPE_OPTIONS,
} from "@/features/submissions/ui/filters/submission-facet-options";
import { Settings2 } from "lucide-react";
import { useState, type ReactNode } from "react";
import type {
  AnswerColumn,
  ColumnSearchAccess,
} from "../submission-grid-columns";
import { exportFiltersFromGrid } from "../submission-grid-export-filters";
import type { SubmissionGridUrlState } from "../submission-grid-url";
import { SUBMISSION_GRID_URL_KEYS as keys } from "../submission-grid-url.constants";
import {
  clearFiltersUpdate,
  CLEAR_SORT_UPDATE,
  facetUpdate,
  hasActiveFilters,
  type SubmissionGridFacetKey,
} from "../submission-grid-url-updates";
import { useDeleteTestSubmissionsAction } from "./delete-test-submissions";
import {
  SubmissionGridColumnPicker,
  SubmissionGridColumnPickerOverlay,
  useColumnPickerAvailable,
} from "./submission-grid-column-picker";
import { useSubmissionTestAccess } from "./submission-test-access-context";
import { useSubmissionGridUrl } from "./submission-grid-url-context";
import { useSubmissionGridView } from "./submission-grid-view-context";
import {
  SubmissionGridViewItems,
  SubmissionGridViewMenu,
} from "./submission-grid-view-menu";

const OPTION_FACETS = [
  {
    key: keys.status,
    title: "Review",
    options: REVIEW_STATUS_OPTIONS,
  },
  {
    key: keys.isTestSubmission,
    title: "Submission Type",
    options: SUBMISSION_TYPE_OPTIONS,
  },
] as const;

type ToolbarProps = {
  formId: string;
  catalog: readonly AnswerColumn[];
  columnSearch: ColumnSearchAccess;
  exportAccess: SubmissionExportAccess;
  /** No submissions yet: the filters have nothing to narrow. */
  disabled: boolean;
};

export function SubmissionGridToolbar(props: Readonly<ToolbarProps>) {
  const { formId, disabled } = props;
  const { urlState } = useSubmissionGridUrl();
  const { canDeleteTests } = useSubmissionTestAccess();
  const deleteTests = useDeleteTestSubmissionsAction(formId, disabled);
  const columns = useColumnsAction(props);
  const reset = useResetProps(disabled);
  return (
    <>
      <DataTableToolbar
        className="mt-8 mb-4"
        filters={<GridFacets disabled={disabled} />}
        activeFilterCount={countActiveFacets(urlState)}
        filtersDisabled={disabled}
        reset={reset}
        collapsibleActions={{
          inline: <LayoutActions {...props} />,
          menuItems: (
            <LayoutMenuItems {...props} columnsItem={columns.menuItem} />
          ),
        }}
        actions={<ExportButton {...props} />}
        moreActions={canDeleteTests ? deleteTests.menuItem : undefined}
      />
      {columns.overlay}
      {canDeleteTests && deleteTests.confirm}
    </>
  );
}

function GridFacets({ disabled }: Readonly<{ disabled: boolean }>) {
  return (
    <>
      <StatusFacet disabled={disabled} />
      <OptionFacets disabled={disabled} />
    </>
  );
}

/** Columns and View in the row from 768 px. */
function LayoutActions(props: Readonly<ToolbarProps>) {
  return (
    <>
      <SubmissionGridColumnPicker {...props} />
      <SubmissionGridViewMenu disabled={props.disabled} />
    </>
  );
}

/** Columns and View as `⋯` items below 768 px. */
function LayoutMenuItems({
  disabled,
  columnsItem,
}: Readonly<ToolbarProps & { columnsItem: ReactNode }>) {
  const view = useSubmissionGridView();
  return (
    <>
      {columnsItem}
      <DropdownMenuSeparator />
      <SubmissionGridViewItems view={view} disabled={disabled} />
    </>
  );
}

/** The facets in the Filters drawer that have a selection. */
function countActiveFacets(urlState: SubmissionGridUrlState): number {
  const facets = [
    urlState.collectionStatus,
    ...OPTION_FACETS.map(({ key }) => urlState[key]),
  ];
  return facets.filter((values) => values.length > 0).length;
}

/**
 * Below 768 px, `⋯ > Columns…` opens the picker in a drawer beside the menu. Each open mounts a
 * fresh picker (its draft starts from the URL), and nothing mounts before the first open.
 */
function useColumnsAction(props: Readonly<ToolbarProps>) {
  const [open, setOpen] = useState(false);
  const [opens, setOpens] = useState(0);
  const available = useColumnPickerAvailable(props);
  const menuItem = (
    <DropdownMenuItem
      disabled={!available}
      onSelect={() => {
        setOpens((count) => count + 1);
        setOpen(true);
      }}
    >
      <Settings2 />
      Columns…
    </DropdownMenuItem>
  );
  const overlay = opens > 0 && (
    <SubmissionGridColumnPickerOverlay
      key={opens}
      {...props}
      open={open}
      onOpenChange={setOpen}
    />
  );
  return { menuItem, overlay };
}

function useFacetChange() {
  const { updateUrl } = useSubmissionGridUrl();
  return (key: SubmissionGridFacetKey) => (values: Set<string>) =>
    updateUrl(facetUpdate(key, values));
}

function StatusFacet({ disabled }: Readonly<{ disabled: boolean }>) {
  const { urlState } = useSubmissionGridUrl();
  const onChange = useFacetChange();
  return (
    <FacetedFilter
      title="Status"
      groups={collectionStatusFacetGroups(urlState.collectionStatus)}
      selectedValues={new Set(urlState.collectionStatus)}
      onValueChange={onChange(keys.collectionStatus)}
      disabled={disabled}
    />
  );
}

function OptionFacets({ disabled }: Readonly<{ disabled: boolean }>) {
  const { urlState } = useSubmissionGridUrl();
  const onChange = useFacetChange();
  return OPTION_FACETS.map(({ key, title, options }) => (
    <FacetedFilter
      key={key}
      title={title}
      options={[...options]}
      selectedValues={new Set<string>(urlState[key])}
      onValueChange={onChange(key)}
      disabled={disabled}
    />
  ));
}

function useResetProps(disabled: boolean): ResetFiltersButtonProps {
  const { urlState, urlSets, updateUrl } = useSubmissionGridUrl();
  const clearFilters = clearFiltersUpdate(urlState);
  return {
    onClick: () => updateUrl(clearFilters),
    onResetSorting: () => updateUrl(CLEAR_SORT_UPDATE),
    onResetAll: () => updateUrl({ ...clearFilters, ...CLEAR_SORT_UPDATE }),
    hasFilters: hasActiveFilters(urlState),
    hasSorting: urlSets.sort,
    disabled,
  };
}

function ExportButton({
  formId,
  disabled,
  exportAccess,
}: Readonly<Pick<ToolbarProps, "formId" | "disabled" | "exportAccess">>) {
  const { urlState } = useSubmissionGridUrl();
  return (
    <ExportSubmissionsButton
      formId={formId}
      disabled={disabled}
      useReportingExport
      access={exportAccess}
      listFilters={exportFiltersFromGrid(urlState)}
      statusGroups={collectionStatusFacetGroups(urlState.collectionStatus)}
    />
  );
}
