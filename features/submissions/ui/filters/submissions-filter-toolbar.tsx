"use client";

import { X, Sparkles, Eye, CheckSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FacetedFilter } from "./faceted-filter";

interface SubmissionsFilterToolbarProps {
  isCompleteFilter: Set<string>;
  statusFilter: Set<string>;
  onIsCompleteChange: (values: Set<string>) => void;
  onStatusChange: (values: Set<string>) => void;
  onResetFilters: () => void;
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

export function SubmissionsFilterToolbar({
  isCompleteFilter,
  statusFilter,
  onIsCompleteChange,
  onStatusChange,
  onResetFilters,
}: SubmissionsFilterToolbarProps) {
  const hasActiveFilters = isCompleteFilter.size > 0 || statusFilter.size > 0;

  return (
    <div className="flex items-center gap-2">
      <FacetedFilter
        title="Is Complete"
        options={isCompleteOptions}
        selectedValues={isCompleteFilter}
        onValueChange={onIsCompleteChange}
      />
      <FacetedFilter
        title="Status"
        options={statusOptions}
        selectedValues={statusFilter}
        onValueChange={onStatusChange}
      />
      {hasActiveFilters && (
        <Button variant="ghost" onClick={onResetFilters} className="px-2 lg:px-3">
          Reset
          <X className="ml-2 h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
