"use client";

import { ExportSubmissionsButton } from "@/features/submissions/ui/export";
import { ShareDialog } from "@/features/forms/ui/share-dialog";
import { SubmissionsFilterToolbar } from "@/features/submissions/ui/filters/submissions-filter-toolbar";
import {
  NoMatchingSubmissionsEmptyState,
  NoSubmissionsEmptyState,
} from "@/features/submissions/ui/submissions-empty-state";
import {
  buildSubmissionDataColumns,
  ColumnOrderProvider,
  COLUMNS_DEFINITION,
  ColumnViewOptionsDropdown,
  ColumnVisibilityProvider,
  ResetOptionsDropdown,
  useColumnOrder,
  useColumnVisibility,
} from "@/features/submissions/ui/table";
import { DefinitionField } from "@/lib/endatix-api";
import { Submission } from "@/lib/endatix-api/submissions/types";
import { ColumnDef, PaginationState, SortingState } from "@tanstack/react-table";
import type { Route } from "next";
import { usePathname, useRouter } from "next/navigation";
import { Dispatch, SetStateAction, useEffect, useState, useTransition } from "react";
import SubmissionsTable from "./submissions-table";

interface SubmissionsWithFiltersProps {
  data: Submission[];
  formId: string;
  hasAnySubmissions: boolean;
  definitionFields?: DefinitionField[];
  initialIsComplete?: string[];
  initialStatus?: string[];
  initialIsTestSubmission?: string[];
  initialPage: number;
  initialPageSize: number;
  totalRecords: number;
  totalPages: number;
}

function SubmissionsContent({
  data,
  formId,
  hasAnySubmissions,
  definitionFields,
  isCompleteFilter,
  statusFilter,
  testSubmissionFilter,
  onIsCompleteChange,
  onStatusChange,
  onTestSubmissionChange,
  onResetFilters,
  isPending,
  tableKey,
  allColumns,
  sorting,
  onSortingChange,
  onResetSorting,
  pagination,
  onPaginationChange,
  totalRecords,
  totalPages,
}: {
  data: Submission[];
  formId: string;
  hasAnySubmissions: boolean;
  definitionFields: DefinitionField[];
  isCompleteFilter: Set<string>;
  statusFilter: Set<string>;
  testSubmissionFilter: Set<string>;
  onIsCompleteChange: (values: Set<string>) => void;
  onStatusChange: (values: Set<string>) => void;
  onTestSubmissionChange: (values: Set<string>) => void;
  onResetFilters: () => void;
  isPending: boolean;
  tableKey: string;
  allColumns: ColumnDef<any>[];
  sorting: SortingState;
  onSortingChange: Dispatch<SetStateAction<SortingState>>;
  onResetSorting: () => void;
  pagination: PaginationState;
  onPaginationChange: Dispatch<SetStateAction<PaginationState>>;
  totalRecords: number;
  totalPages: number;
}) {
  const { resetToDefault: resetOrder, hasCustomOrder } = useColumnOrder();
  const { resetToDefault: resetVisibility, hasCustomVisibility } = useColumnVisibility();
  const [isClient, setIsClient] = useState(false);
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);

  const hasSorting = sorting.length > 0;
  const hasActiveFilters =
    isCompleteFilter.size > 0 ||
    statusFilter.size > 0 ||
    testSubmissionFilter.size > 0;
  const isTrueEmptyState = !hasAnySubmissions;
  const isFilteredEmptyState = hasAnySubmissions && hasActiveFilters && data.length === 0;
  const disableTableControls = isTrueEmptyState;

  useEffect(() => {
    setIsClient(true);
  }, []);

  const getColumnHeaderText = (col: ColumnDef<any>): string => {
    if (col.meta?.displayName) {
      return col.meta.displayName as string;
    }

    if (typeof col.header === "string") {
      return col.header;
    }

    return col.id || "Column";
  };

  const columnHeaders = allColumns
    .filter((col) => col.id && col.id !== "actions")
    .map((col) => ({
      id: col.id as string,
      header: getColumnHeaderText(col),
    }));

  const resetOptions = [];
  if (hasCustomOrder) {
    resetOptions.push({
      label: "Reset Column Order",
      onClick: resetOrder,
    });
  }
  if (hasCustomVisibility) {
    resetOptions.push({
      label: "Reset Column Visibility",
      onClick: resetVisibility,
    });
  }
  if (hasSorting) {
    resetOptions.push({
      label: "Reset Sorting",
      onClick: onResetSorting,
    });
  }

  const handleResetAll = () => {
    if (hasCustomOrder) resetOrder();
    if (hasCustomVisibility) resetVisibility();
    if (hasSorting) onResetSorting();
  };

  return (
    <>
      <div className="flex items-center justify-between gap-4 mt-8 mb-4">
        <SubmissionsFilterToolbar
          isCompleteFilter={isCompleteFilter}
          statusFilter={statusFilter}
          testSubmissionFilter={testSubmissionFilter}
          onIsCompleteChange={onIsCompleteChange}
          onStatusChange={onStatusChange}
          onTestSubmissionChange={onTestSubmissionChange}
          onResetFilters={onResetFilters}
          disabled={disableTableControls}
        />
        <div className="flex items-center gap-2">
          <div
            role="status"
            aria-live="polite"
            className="min-w-[5rem] text-right text-sm text-muted-foreground"
          >
            {isPending ? "Updating..." : null}
          </div>
          <ColumnViewOptionsDropdown
            columns={columnHeaders}
            disabled={disableTableControls}
          />
          {isClient && (
            <ResetOptionsDropdown
              options={resetOptions}
              onResetAll={handleResetAll}
              disabled={disableTableControls}
            />
          )}
          <ExportSubmissionsButton
            formId={formId}
            disabled={disableTableControls}
          />
        </div>
      </div>
      {isTrueEmptyState ? (
        <>
          <NoSubmissionsEmptyState
            onShareForm={() => setIsShareDialogOpen(true)}
          />
          <ShareDialog
            formId={formId}
            open={isShareDialogOpen}
            onOpenChange={setIsShareDialogOpen}
          />
        </>
      ) : isFilteredEmptyState ? (
        <NoMatchingSubmissionsEmptyState onClearFilters={onResetFilters} />
      ) : (
        <SubmissionsTable
          key={tableKey}
          data={data}
          formId={formId}
          definitionFields={definitionFields}
          sorting={sorting}
          onSortingChange={onSortingChange}
          pagination={pagination}
          onPaginationChange={onPaginationChange}
          totalRecords={totalRecords}
          totalPages={totalPages}
        />
      )}
    </>
  );
}

export function SubmissionsWithFilters({
  data,
  formId,
  hasAnySubmissions,
  definitionFields = [],
  initialIsComplete = [],
  initialStatus = [],
  initialIsTestSubmission = [],
  initialPage,
  initialPageSize,
  totalRecords,
  totalPages,
}: SubmissionsWithFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  const [isCompleteFilter, setIsCompleteFilter] = useState<Set<string>>(
    new Set(initialIsComplete)
  );
  const [statusFilter, setStatusFilter] = useState<Set<string>>(
    new Set(initialStatus)
  );
  const [testSubmissionFilter, setTestSubmissionFilter] = useState<Set<string>>(
    new Set(initialIsTestSubmission),
  );
  const [sorting, setSorting] = useState<SortingState>([]);
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: initialPage - 1,
    pageSize: initialPageSize,
  });

  useEffect(() => {
    setPagination({
      pageIndex: initialPage - 1,
      pageSize: initialPageSize,
    });
  }, [initialPage, initialPageSize]);

  const updateURL = (
    isComplete: Set<string>,
    status: Set<string>,
    isTestSubmission: Set<string>,
    page: number,
    pageSize: number,
  ) => {
    const params = new URLSearchParams();

    if (page > 1) {
      params.set("page", String(page));
    }
    if (pageSize !== 10) {
      params.set("pageSize", String(pageSize));
    }
    if (isComplete.size > 0) {
      params.set("isComplete", Array.from(isComplete).join(","));
    }
    if (status.size > 0) {
      params.set("status", Array.from(status).join(","));
    }
    if (isTestSubmission.size > 0) {
      params.set("isTestSubmission", Array.from(isTestSubmission).join(","));
    }

    const queryString = params.toString();
    const url = queryString ? `${pathname}?${queryString}` : pathname;

    startTransition(() => {
      router.push(url as Route, { scroll: false });
    });
  };

  const handleIsCompleteChange = (values: Set<string>) => {
    setIsCompleteFilter(values);
    setPagination((current) => ({ ...current, pageIndex: 0 }));
    updateURL(values, statusFilter, testSubmissionFilter, 1, pagination.pageSize);
  };

  const handleStatusChange = (values: Set<string>) => {
    setStatusFilter(values);
    setPagination((current) => ({ ...current, pageIndex: 0 }));
    updateURL(isCompleteFilter, values, testSubmissionFilter, 1, pagination.pageSize);
  };

  const handleTestSubmissionChange = (values: Set<string>) => {
    setTestSubmissionFilter(values);
    setPagination((current) => ({ ...current, pageIndex: 0 }));
    updateURL(isCompleteFilter, statusFilter, values, 1, pagination.pageSize);
  };

  const handleResetFilters = () => {
    const emptySet = new Set<string>();
    setIsCompleteFilter(emptySet);
    setStatusFilter(emptySet);
    setTestSubmissionFilter(emptySet);
    setPagination((current) => ({ ...current, pageIndex: 0 }));
    updateURL(emptySet, emptySet, emptySet, 1, pagination.pageSize);
  };

  const handleResetSorting = () => {
    setSorting([]);
  };

  const handlePaginationChange: Dispatch<SetStateAction<PaginationState>> = (updater) => {
    const next = typeof updater === "function" ? updater(pagination) : updater;
    setPagination(next);
    updateURL(
      isCompleteFilter,
      statusFilter,
      testSubmissionFilter,
      next.pageIndex + 1,
      next.pageSize,
    );
  };

  // Create a key that changes when filters change to force table re-mount
  const tableKey = `${Array.from(isCompleteFilter).sort((a, b) => a.localeCompare(b)).join(',')}-${Array.from(statusFilter).sort((a, b) => a.localeCompare(b)).join(',')}-${Array.from(testSubmissionFilter).sort((a, b) => a.localeCompare(b)).join(',')}-${pagination.pageIndex}-${pagination.pageSize}-${data.length}`;

  const allColumns = [...COLUMNS_DEFINITION, ...buildSubmissionDataColumns(definitionFields)];

  return (
    <ColumnOrderProvider formId={formId} defaultColumns={allColumns}>
      <ColumnVisibilityProvider formId={formId} defaultColumns={allColumns}>
        <SubmissionsContent
          data={data}
          formId={formId}
          hasAnySubmissions={hasAnySubmissions}
          definitionFields={definitionFields}
          isCompleteFilter={isCompleteFilter}
          statusFilter={statusFilter}
          testSubmissionFilter={testSubmissionFilter}
          onIsCompleteChange={handleIsCompleteChange}
          onStatusChange={handleStatusChange}
          onTestSubmissionChange={handleTestSubmissionChange}
          onResetFilters={handleResetFilters}
          isPending={isPending}
          tableKey={tableKey}
          allColumns={allColumns}
          sorting={sorting}
          onSortingChange={setSorting}
          onResetSorting={handleResetSorting}
          pagination={pagination}
          onPaginationChange={handlePaginationChange}
          totalRecords={totalRecords}
          totalPages={totalPages}
        />
      </ColumnVisibilityProvider>
    </ColumnOrderProvider>
  );
}
