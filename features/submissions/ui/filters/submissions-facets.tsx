"use client";

import { CheckSquare, Eye, Sparkles } from "lucide-react";
import { FacetedFilter } from "@/components/table";
import { collectionStatusFacetGroups } from "@/features/submissions/ui/describe-collection-status";

interface SubmissionsFacetsProps {
  collectionStatusFilter: Set<string>;
  statusFilter: Set<string>;
  testSubmissionFilter: Set<string>;
  onCollectionStatusChange: (values: Set<string>) => void;
  onStatusChange: (values: Set<string>) => void;
  onTestSubmissionChange: (values: Set<string>) => void;
  disabled?: boolean;
}

const statusOptions = [
  { label: "New", value: "new", icon: Sparkles },
  { label: "Read", value: "read", icon: Eye },
  { label: "Approved", value: "approved", icon: CheckSquare },
];

const testSubmissionOptions = [
  { label: "Production", value: "false" },
  { label: "Test", value: "true" },
];

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
        options={statusOptions}
        selectedValues={statusFilter}
        onValueChange={onStatusChange}
        disabled={disabled}
      />
      <FacetedFilter
        title="Submission Type"
        options={testSubmissionOptions}
        selectedValues={testSubmissionFilter}
        onValueChange={onTestSubmissionChange}
        disabled={disabled}
      />
    </>
  );
}
