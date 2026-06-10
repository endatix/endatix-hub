"use client";

import { ShareDialog } from "@/features/forms/ui/share-dialog";
import {
  buildSubmissionsTableKey,
  serializeSubmissionListSearchParams,
  submissionListUrlStateFromClientFilters,
} from "@/features/submissions/list-submission-query";
import { ExportSubmissionsButton } from "@/features/submissions/ui/export";
import { SubmissionsFilterToolbar } from "@/features/submissions/ui/filters/submissions-filter-toolbar";
import { NoSubmissionsEmptyState } from "@/features/submissions/ui/submissions-empty-state";
import {
  buildSubmissionDataColumns,
  buildSubmissionSystemColumns,
  ColumnOrderProvider,
  ColumnViewOptionsDropdown,
  ColumnVisibilityProvider,
  EMPTY_SUBMISSION_DATE_FILTERS,
  ResetOptionsDropdown,
  useColumnOrder,
  useColumnVisibility,
} from "@/features/submissions/ui/table";
import type {
  DateFilterColumnId,
  DateFilterValue,
  ParsedSubmission,
  SubmissionDateFilters,
} from "@/features/submissions/ui/table";
import type { DefinitionField } from "@/lib/endatix-api";
import type { Submission } from "@/lib/endatix-api/submissions/types";
import type {
  ColumnDef,
  PaginationState,
  SortingState,
} from "@tanstack/react-table";
import type { Route } from "next";
import { usePathname, useRouter } from "next/navigation";
import {
  Dispatch,
  SetStateAction,
  useEffect,
  useState,
  useTransition,
} from "react";
import SubmissionsTable from "@/features/submissions/ui/submissions-table";

interface SubmissionsWithFiltersProps {
  data: Submission[];
  formId: string;
  hasAnySubmissions: boolean;
  definitionFields?: DefinitionField[];
  initialIsComplete?: string[];
  initialStatus?: string[];
  initialIsTestSubmission?: string[];
  initialCreatedAtFrom?: string;
  initialCreatedAtTo?: string;
  initialCompletedAtFrom?: string;
  initialCompletedAtTo?: string;
  initialSubmitterDisplayId?: string;
  initialSubmitterEmail?: string;
  initialPage: number;
  initialPageSize: number;
  totalRecords: number;
  totalPages: number;
}

const EMPTY_INITIAL_FILTER_VALUES: string[] = [];

function SubmissionsContent({
  data,
  formId,
  hasAnySubmissions,
  isCompleteFilter,
  statusFilter,
  testSubmissionFilter,
  submitterDisplayIdFilter,
  submitterEmailFilter,
  dateFilters,
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
  isCompleteFilter: Set<string>;
  statusFilter: Set<string>;
  testSubmissionFilter: Set<string>;
  submitterDisplayIdFilter: string;
  submitterEmailFilter: string;
  dateFilters: SubmissionDateFilters;
  onIsCompleteChange: (values: Set<string>) => void;
  onStatusChange: (values: Set<string>) => void;
  onTestSubmissionChange: (values: Set<string>) => void;
  onResetFilters: () => void;
  isPending: boolean;
  tableKey: string;
  allColumns: ColumnDef<ParsedSubmission>[];
  sorting: SortingState;
  onSortingChange: Dispatch<SetStateAction<SortingState>>;
  onResetSorting: () => void;
  pagination: PaginationState;
  onPaginationChange: Dispatch<SetStateAction<PaginationState>>;
  totalRecords: number;
  totalPages: number;
}) {
  const { resetToDefault: resetOrder, hasCustomOrder } = useColumnOrder();
  const { resetToDefault: resetVisibility, hasCustomVisibility } =
    useColumnVisibility();
  const [isClient, setIsClient] = useState(false);
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);

  const hasSorting = sorting.length > 0;
  const hasActiveFilters =
    isCompleteFilter.size > 0 ||
    statusFilter.size > 0 ||
    testSubmissionFilter.size > 0 ||
    submitterDisplayIdFilter.length > 0 ||
    submitterEmailFilter.length > 0 ||
    hasDateFilters(dateFilters);
  const isTrueEmptyState = !hasAnySubmissions;
  const disableTableControls = isTrueEmptyState;

  useEffect(() => {
    setIsClient(true);
  }, []);

  const getColumnHeaderText = (col: ColumnDef<ParsedSubmission>): string => {
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
    if (hasActiveFilters) onResetFilters();
  };

  return (
    <>
      <div className="mt-8 mb-4 flex items-center justify-between gap-4">
        <SubmissionsFilterToolbar
          isCompleteFilter={isCompleteFilter}
          statusFilter={statusFilter}
          testSubmissionFilter={testSubmissionFilter}
          onIsCompleteChange={onIsCompleteChange}
          onStatusChange={onStatusChange}
          onTestSubmissionChange={onTestSubmissionChange}
          onResetFilters={onResetFilters}
          disabled={disableTableControls}
          hasAdditionalFilters={
            hasDateFilters(dateFilters) ||
            submitterDisplayIdFilter.length > 0 ||
            submitterEmailFilter.length > 0
          }
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
      ) : (
        <SubmissionsTable
          key={tableKey}
          data={data}
          formId={formId}
          columns={allColumns}
          sorting={sorting}
          onSortingChange={onSortingChange}
          pagination={pagination}
          onPaginationChange={onPaginationChange}
          totalRecords={totalRecords}
          totalPages={totalPages}
          onFilteredEmptyClear={onResetFilters}
        />
      )}
    </>
  );
}

function hasDateFilters(dateFilters: SubmissionDateFilters) {
  return Boolean(
    dateFilters.createdAt.from ||
    dateFilters.createdAt.to ||
    dateFilters.completedAt.from ||
    dateFilters.completedAt.to,
  );
}

export function SubmissionsWithFilters({
  data,
  formId,
  hasAnySubmissions,
  definitionFields = [],
  initialIsComplete = EMPTY_INITIAL_FILTER_VALUES,
  initialStatus = EMPTY_INITIAL_FILTER_VALUES,
  initialIsTestSubmission = EMPTY_INITIAL_FILTER_VALUES,
  initialCreatedAtFrom,
  initialCreatedAtTo,
  initialCompletedAtFrom,
  initialCompletedAtTo,
  initialSubmitterDisplayId = "",
  initialSubmitterEmail = "",
  initialPage,
  initialPageSize,
  totalRecords,
  totalPages,
}: SubmissionsWithFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  const [isCompleteFilter, setIsCompleteFilter] = useState<Set<string>>(
    new Set(initialIsComplete),
  );
  const [statusFilter, setStatusFilter] = useState<Set<string>>(
    new Set(initialStatus),
  );
  const [testSubmissionFilter, setTestSubmissionFilter] = useState<Set<string>>(
    new Set(initialIsTestSubmission),
  );
  const [submitterDisplayIdFilter, setSubmitterDisplayIdFilter] = useState(
    initialSubmitterDisplayId,
  );
  const [submitterEmailFilter, setSubmitterEmailFilter] = useState(
    initialSubmitterEmail,
  );
  const [dateFilters, setDateFilters] = useState<SubmissionDateFilters>({
    createdAt: {
      from: initialCreatedAtFrom,
      to: initialCreatedAtTo,
    },
    completedAt: {
      from: initialCompletedAtFrom,
      to: initialCompletedAtTo,
    },
  });
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

  useEffect(() => {
    setIsCompleteFilter(new Set(initialIsComplete));
    setStatusFilter(new Set(initialStatus));
    setTestSubmissionFilter(new Set(initialIsTestSubmission));
    setSubmitterDisplayIdFilter(initialSubmitterDisplayId);
    setSubmitterEmailFilter(initialSubmitterEmail);
    setDateFilters({
      createdAt: {
        from: initialCreatedAtFrom,
        to: initialCreatedAtTo,
      },
      completedAt: {
        from: initialCompletedAtFrom,
        to: initialCompletedAtTo,
      },
    });
  }, [
    initialIsComplete,
    initialStatus,
    initialIsTestSubmission,
    initialCreatedAtFrom,
    initialCreatedAtTo,
    initialCompletedAtFrom,
    initialCompletedAtTo,
    initialSubmitterDisplayId,
    initialSubmitterEmail,
  ]);

  const updateURL = (
    isComplete: Set<string>,
    status: Set<string>,
    isTestSubmission: Set<string>,
    submitterDisplayId: string,
    submitterEmail: string,
    dates: SubmissionDateFilters,
    page: number,
    pageSize: number,
  ) => {
    const listState = submissionListUrlStateFromClientFilters({
      page,
      pageSize,
      isComplete,
      status,
      isTestSubmission,
      submitterDisplayId,
      submitterEmail,
      createdAtFrom: dates.createdAt.from,
      createdAtTo: dates.createdAt.to,
      completedAtFrom: dates.completedAt.from,
      completedAtTo: dates.completedAt.to,
    });
    const queryString =
      serializeSubmissionListSearchParams(listState).toString();
    const url = queryString ? `${pathname}?${queryString}` : pathname;

    startTransition(() => {
      router.push(url as Route, { scroll: false });
    });
  };

  const handleIsCompleteChange = (values: Set<string>) => {
    setIsCompleteFilter(values);
    setPagination((current) => ({ ...current, pageIndex: 0 }));
    updateURL(
      values,
      statusFilter,
      testSubmissionFilter,
      submitterDisplayIdFilter,
      submitterEmailFilter,
      dateFilters,
      1,
      pagination.pageSize,
    );
  };

  const handleStatusChange = (values: Set<string>) => {
    setStatusFilter(values);
    setPagination((current) => ({ ...current, pageIndex: 0 }));
    updateURL(
      isCompleteFilter,
      values,
      testSubmissionFilter,
      submitterDisplayIdFilter,
      submitterEmailFilter,
      dateFilters,
      1,
      pagination.pageSize,
    );
  };

  const handleTestSubmissionChange = (values: Set<string>) => {
    setTestSubmissionFilter(values);
    setPagination((current) => ({ ...current, pageIndex: 0 }));
    updateURL(
      isCompleteFilter,
      statusFilter,
      values,
      submitterDisplayIdFilter,
      submitterEmailFilter,
      dateFilters,
      1,
      pagination.pageSize,
    );
  };

  const handleDateFilterChange = (
    columnId: DateFilterColumnId,
    value: DateFilterValue,
  ) => {
    const nextDateFilters = {
      ...dateFilters,
      [columnId]: value,
    };
    setDateFilters(nextDateFilters);
    setPagination((current) => ({ ...current, pageIndex: 0 }));
    updateURL(
      isCompleteFilter,
      statusFilter,
      testSubmissionFilter,
      submitterDisplayIdFilter,
      submitterEmailFilter,
      nextDateFilters,
      1,
      pagination.pageSize,
    );
  };

  const handleSubmitterDisplayIdChange = (value: string) => {
    setSubmitterDisplayIdFilter(value);
    setPagination((current) => ({ ...current, pageIndex: 0 }));
    updateURL(
      isCompleteFilter,
      statusFilter,
      testSubmissionFilter,
      value,
      submitterEmailFilter,
      dateFilters,
      1,
      pagination.pageSize,
    );
  };

  const handleSubmitterEmailChange = (value: string) => {
    setSubmitterEmailFilter(value);
    setPagination((current) => ({ ...current, pageIndex: 0 }));
    updateURL(
      isCompleteFilter,
      statusFilter,
      testSubmissionFilter,
      submitterDisplayIdFilter,
      value,
      dateFilters,
      1,
      pagination.pageSize,
    );
  };

  const handleResetFilters = () => {
    const emptySet = new Set<string>();
    setIsCompleteFilter(emptySet);
    setStatusFilter(emptySet);
    setTestSubmissionFilter(emptySet);
    setSubmitterDisplayIdFilter("");
    setSubmitterEmailFilter("");
    setDateFilters(EMPTY_SUBMISSION_DATE_FILTERS);
    setPagination((current) => ({ ...current, pageIndex: 0 }));
    updateURL(
      emptySet,
      emptySet,
      emptySet,
      "",
      "",
      EMPTY_SUBMISSION_DATE_FILTERS,
      1,
      pagination.pageSize,
    );
  };

  const handleResetSorting = () => {
    setSorting([]);
  };

  const handlePaginationChange: Dispatch<SetStateAction<PaginationState>> = (
    updater,
  ) => {
    const next = typeof updater === "function" ? updater(pagination) : updater;
    setPagination(next);
    updateURL(
      isCompleteFilter,
      statusFilter,
      testSubmissionFilter,
      submitterDisplayIdFilter,
      submitterEmailFilter,
      dateFilters,
      next.pageIndex + 1,
      next.pageSize,
    );
  };

  const tableKey = buildSubmissionsTableKey({
    isCompleteFilter,
    statusFilter,
    testSubmissionFilter,
    submitterDisplayId: submitterDisplayIdFilter,
    submitterEmail: submitterEmailFilter,
    dateFilters,
    pagination,
    dataLength: data.length,
  });

  const allColumns = [
    ...buildSubmissionSystemColumns({
      dateFilters,
      onDateFilterChange: handleDateFilterChange,
      submitterDisplayIdFilter,
      onSubmitterDisplayIdFilterChange: handleSubmitterDisplayIdChange,
      submitterEmailFilter,
      onSubmitterEmailFilterChange: handleSubmitterEmailChange,
    }),
    ...buildSubmissionDataColumns(definitionFields),
  ];

  return (
    <ColumnOrderProvider formId={formId} defaultColumns={allColumns}>
      <ColumnVisibilityProvider formId={formId} defaultColumns={allColumns}>
        <SubmissionsContent
          data={data}
          formId={formId}
          hasAnySubmissions={hasAnySubmissions}
          isCompleteFilter={isCompleteFilter}
          statusFilter={statusFilter}
          testSubmissionFilter={testSubmissionFilter}
          submitterDisplayIdFilter={submitterDisplayIdFilter}
          submitterEmailFilter={submitterEmailFilter}
          dateFilters={dateFilters}
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
