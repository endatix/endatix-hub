"use client";

import { FacetedFilter } from "@/components/table";
import { collectionStatusFacetGroups } from "@/features/submissions/ui/describe-collection-status";
import {
  REVIEW_STATUS_OPTIONS,
  SUBMISSION_TYPE_OPTIONS,
} from "./submission-facet-options";

interface SubmissionsFacetsProps {
  collectionStatusFilter: Set<string>;
  statusFilter: Set<string>;
  testSubmissionFilter: Set<string>;
  onCollectionStatusChange: (values: Set<string>) => void;
  onStatusChange: (values: Set<string>) => void;
  onTestSubmissionChange: (values: Set<string>) => void;
  disabled?: boolean;
}

/** How many of the facets have a selection, for the toolbar's "Filters · n". */
export function countActiveSubmissionFacets(
  filters: Pick<
    SubmissionsFacetsProps,
    "collectionStatusFilter" | "statusFilter" | "testSubmissionFilter"
  >,
): number {
  return [
    filters.collectionStatusFilter,
    filters.statusFilter,
    filters.testSubmissionFilter,
  ].filter((values) => values.size > 0).length;
}

/** The legacy list's facets: Status, Review and Submission Type. */
export function SubmissionsFacets({
  collectionStatusFilter,
  statusFilter,
  testSubmissionFilter,
  onCollectionStatusChange,
  onStatusChange,
  onTestSubmissionChange,
  disabled = false,
}: Readonly<SubmissionsFacetsProps>) {
  return (
    <>
      <FacetedFilter
        title="Status"
        groups={collectionStatusFacetGroups(collectionStatusFilter)}
        selectedValues={collectionStatusFilter}
        onValueChange={onCollectionStatusChange}
        disabled={disabled}
      />
      <FacetedFilter
        title="Review"
        options={REVIEW_STATUS_OPTIONS}
        selectedValues={statusFilter}
        onValueChange={onStatusChange}
        disabled={disabled}
      />
      <FacetedFilter
        title="Submission Type"
        options={SUBMISSION_TYPE_OPTIONS}
        selectedValues={testSubmissionFilter}
        onValueChange={onTestSubmissionChange}
        disabled={disabled}
      />
    </>
  );
}
