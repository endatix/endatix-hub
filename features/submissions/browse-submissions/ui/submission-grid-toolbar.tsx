"use client";

import {
  DataTableToolbar,
  FacetedFilter,
  ResetFiltersButton,
} from "@/components/table";
import { ExportSubmissionsButton } from "@/features/export";
import { collectionStatusFacetGroups } from "@/features/submissions/ui/describe-collection-status";
import { CheckSquare, Eye, Sparkles } from "lucide-react";
import type { AnswerColumn } from "../submission-grid-columns";
import { exportFiltersFromGrid } from "../submission-grid-export-filters";
import { SUBMISSION_GRID_URL_KEYS as keys } from "../submission-grid-url.constants";
import {
  clearFiltersUpdate,
  CLEAR_SORT_UPDATE,
  facetUpdate,
  hasActiveFilters,
  type SubmissionGridFacetKey,
} from "../submission-grid-url-updates";
import { SubmissionGridColumnPicker } from "./submission-grid-column-picker";
import { useSubmissionGridUrl } from "./submission-grid-url-context";

const OPTION_FACETS = [
  {
    key: keys.status,
    title: "Review",
    options: [
      { label: "New", value: "new", icon: Sparkles },
      { label: "Read", value: "read", icon: Eye },
      { label: "Approved", value: "approved", icon: CheckSquare },
    ],
  },
  {
    key: keys.isTestSubmission,
    title: "Submission Type",
    options: [
      { label: "Production", value: "false" },
      { label: "Test", value: "true" },
    ],
  },
] as const;

type ToolbarProps = {
  formId: string;
  catalog: readonly AnswerColumn[];
  /** No submissions yet: the filters have nothing to narrow. */
  disabled: boolean;
};

export function SubmissionGridToolbar({
  formId,
  catalog,
  disabled,
}: Readonly<ToolbarProps>) {
  return (
    <DataTableToolbar
      className="mt-8 mb-4"
      filters={
        <>
          <StatusFacet disabled={disabled} />
          <OptionFacets disabled={disabled} />
          <ResetButton disabled={disabled} />
        </>
      }
      actions={<ToolbarActions {...{ formId, catalog, disabled }} />}
    />
  );
}

function ToolbarActions({ formId, catalog, disabled }: Readonly<ToolbarProps>) {
  return (
    <>
      <SubmissionGridColumnPicker catalog={catalog} disabled={disabled} />
      <ExportButton formId={formId} disabled={disabled} />
    </>
  );
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

function ResetButton({ disabled }: Readonly<{ disabled: boolean }>) {
  const { urlState, updateUrl } = useSubmissionGridUrl();
  const clearFilters = clearFiltersUpdate(urlState);
  return (
    <ResetFiltersButton
      onClick={() => updateUrl(clearFilters)}
      onResetSorting={() => updateUrl(CLEAR_SORT_UPDATE)}
      onResetAll={() => updateUrl({ ...clearFilters, ...CLEAR_SORT_UPDATE })}
      hasFilters={hasActiveFilters(urlState)}
      hasSorting={urlState.sort !== undefined}
      disabled={disabled}
    />
  );
}

function ExportButton({
  formId,
  disabled,
}: Readonly<Omit<ToolbarProps, "catalog">>) {
  const { urlState } = useSubmissionGridUrl();
  return (
    <ExportSubmissionsButton
      formId={formId}
      disabled={disabled}
      useReportingExport
      listFilters={exportFiltersFromGrid(urlState)}
      statusGroups={collectionStatusFacetGroups(urlState.collectionStatus)}
    />
  );
}
