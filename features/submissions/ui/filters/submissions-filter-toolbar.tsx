"use client";

import { Button } from "@/components/ui/button";
import { CheckSquare, Eye, Sparkles, X } from "lucide-react";
import { FacetedFilter } from "./faceted-filter";

interface SubmissionsFilterToolbarProps {
  isCompleteFilter: Set<string>;
  statusFilter: Set<string>;
  testSubmissionFilter: Set<string>;
  onIsCompleteChange: (values: Set<string>) => void;
  onStatusChange: (values: Set<string>) => void;
  onTestSubmissionChange: (values: Set<string>) => void;
  onResetFilters: () => void;
  disabled?: boolean;
  hasAdditionalFilters?: boolean;
}

const isCompleteOptions = [
  { label: "Yes", value: "true" },
  { label: "No", value: "false" },
];

const statusOptions = [
  { label: "New", value: "new", icon: Sparkles },
  { label: "Read", value: "read", icon: Eye },
  { label: "Approved", value: "approved", icon: CheckSquare },
];

const testSubmissionOptions = [
  { label: "Production", value: "false" },
  { label: "Test", value: "true" },
];

export function SubmissionsFilterToolbar({
  isCompleteFilter,
  statusFilter,
  testSubmissionFilter,
  onIsCompleteChange,
  onStatusChange,
  onTestSubmissionChange,
  onResetFilters,
  disabled = false,
  hasAdditionalFilters = false,
}: SubmissionsFilterToolbarProps) {
  const hasActiveFilters =
    isCompleteFilter.size > 0 ||
    statusFilter.size > 0 ||
    testSubmissionFilter.size > 0 ||
    hasAdditionalFilters;

  return (
    <>
      <FacetedFilter
        title="Complete"
        options={isCompleteOptions}
        selectedValues={isCompleteFilter}
        onValueChange={onIsCompleteChange}
        disabled={disabled}
      />
      <FacetedFilter
        title="Status"
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
      {hasActiveFilters && (
        <Button
          variant="ghost"
          onClick={onResetFilters}
          disabled={disabled}
          className="shrink-0 px-2 lg:px-3"
        >
          Reset Filters
          <X />
        </Button>
      )}
    </>
  );
}
