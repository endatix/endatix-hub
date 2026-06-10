import type { SubmissionDateFilters } from "@/features/submissions/ui/table";
import type { PaginationState } from "@tanstack/react-table";

function sortedSetJoin(set: Set<string>): string {
  return Array.from(set)
    .sort((a, b) => a.localeCompare(b))
    .join(",");
}

/**
 * Builds a unique key for the submissions table based on the current filter and pagination state.
 * This is used to prevent the table from re-rendering when the filter or pagination state changes.
 * @param options - The options for building the key.
 * @returns The key for the submissions table.
 */
export function buildSubmissionsTableKey(options: {
  isCompleteFilter: Set<string>;
  statusFilter: Set<string>;
  testSubmissionFilter: Set<string>;
  dateFilters: SubmissionDateFilters;
  submitterDisplayId: string;
  submitterEmail: string;
  pagination: PaginationState;
  dataLength: number;
}): string {
  const {
    dateFilters,
    submitterDisplayId,
    submitterEmail,
    pagination,
    dataLength,
    isCompleteFilter,
    statusFilter,
    testSubmissionFilter,
  } = options;

  const parts = [
    sortedSetJoin(isCompleteFilter),
    sortedSetJoin(statusFilter),
    sortedSetJoin(testSubmissionFilter),
    dateFilters.createdAt.from ?? "",
    dateFilters.createdAt.to ?? "",
    dateFilters.completedAt.from ?? "",
    dateFilters.completedAt.to ?? "",
    submitterDisplayId,
    submitterEmail,
    String(pagination.pageIndex),
    String(pagination.pageSize),
    String(dataLength),
  ];

  return parts.join("-");
}
