"use client";

import { DataTableToolbar } from "@/components/table";
import { ShareDialog } from "@/features/forms/ui/share-dialog";
import {
  buildSubmissionsTableKey,
  rememberSubmissionListReturnTo,
  serializeSubmissionListSearchParams,
  submissionListUrlStateFromClientFilters,
} from "@/features/submissions/list-submission-query";
import { ExportSubmissionsButton } from "@/features/export";
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
  SubmissionsTableSkeleton,
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
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Dispatch,
  type ReactNode,
  SetStateAction,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import SubmissionsTable from "@/features/submissions/ui/submissions-table";

interface SubmissionsWithFiltersProps {
  data: Submission[];
  formId: string;
  hasAnySubmissions: boolean;
  useReportingExport?: boolean;
  definitionFields?: DefinitionField[];
  initialIsComplete?: string[];
  initialStatus?: string[];
  initialIsTestSubmission?: string[];
  initialCreatedAtFrom?: string;
  initialCreatedAtTo?: string;
  initialModifiedAtFrom?: string;
  initialModifiedAtTo?: string;
  initialStartedAtFrom?: string;
  initialStartedAtTo?: string;
  initialCompletedAtFrom?: string;
  initialCompletedAtTo?: string;
  initialSubmitterDisplayId?: string;
  initialSubmitterEmail?: string;
  initialSorting?: SortingState;
  initialPage: number;
  initialPageSize: number;
  totalRecords: number;
  totalPages: number;
}

const EMPTY_INITIAL_FILTER_VALUES: string[] = [];
const EMPTY_INITIAL_SORTING: SortingState = [];
const SUBMITTER_FILTER_DEBOUNCE_MS = 300;

type NavigationMode = "push" | "replace";

interface UpdateSubmissionListUrlArgs {
  isComplete: Set<string>;
  status: Set<string>;
  isTestSubmission: Set<string>;
  submitterDisplayId: string;
  submitterEmail: string;
  dates: SubmissionDateFilters;
  page: number;
  pageSize: number;
  sorting: SortingState;
  navigation?: NavigationMode;
}

function SubmissionsContent({
  data,
  formId,
  hasAnySubmissions,
  useReportingExport = false,
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
  useReportingExport?: boolean;
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

  const exportListFilters = useMemo(
    () => ({
      createdAtFrom: dateFilters.createdAt.from,
      createdAtTo: dateFilters.createdAt.to,
      modifiedAtFrom: dateFilters.modifiedAt.from,
      modifiedAtTo: dateFilters.modifiedAt.to,
      startedAtFrom: dateFilters.startedAt.from,
      startedAtTo: dateFilters.startedAt.to,
      completedAtFrom: dateFilters.completedAt.from,
      completedAtTo: dateFilters.completedAt.to,
    }),
    [
      dateFilters.createdAt.from,
      dateFilters.createdAt.to,
      dateFilters.modifiedAt.from,
      dateFilters.modifiedAt.to,
      dateFilters.startedAt.from,
      dateFilters.startedAt.to,
      dateFilters.completedAt.from,
      dateFilters.completedAt.to,
    ],
  );

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

  let tableRegion: ReactNode;
  if (isTrueEmptyState) {
    tableRegion = (
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
    );
  } else if (isPending) {
    tableRegion = (
      <SubmissionsTableSkeleton
        pageSize={pagination.pageSize}
        loadingLabel="Updating submissions…"
      />
    );
  } else {
    tableRegion = (
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
    );
  }

  return (
    <>
      <DataTableToolbar
        className="mt-8 mb-4"
        filters={
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
        }
        actions={
          <>
            <div
              role="status"
              aria-live="polite"
              className="hidden min-w-[5rem] text-right text-sm text-muted-foreground sm:block"
            >
              {isPending ? "Updating…" : null}
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
              useReportingExport={useReportingExport}
              listFilters={exportListFilters}
            />
          </>
        }
      />
      {tableRegion}
    </>
  );
}

function hasDateFilters(dateFilters: SubmissionDateFilters) {
  return Boolean(
    dateFilters.createdAt.from ||
    dateFilters.createdAt.to ||
    dateFilters.modifiedAt.from ||
    dateFilters.modifiedAt.to ||
    dateFilters.startedAt.from ||
    dateFilters.startedAt.to ||
    dateFilters.completedAt.from ||
    dateFilters.completedAt.to,
  );
}

export function SubmissionsWithFilters({
  data,
  formId,
  hasAnySubmissions,
  useReportingExport = false,
  definitionFields = [],
  initialIsComplete = EMPTY_INITIAL_FILTER_VALUES,
  initialStatus = EMPTY_INITIAL_FILTER_VALUES,
  initialIsTestSubmission = EMPTY_INITIAL_FILTER_VALUES,
  initialCreatedAtFrom,
  initialCreatedAtTo,
  initialModifiedAtFrom,
  initialModifiedAtTo,
  initialStartedAtFrom,
  initialStartedAtTo,
  initialCompletedAtFrom,
  initialCompletedAtTo,
  initialSubmitterDisplayId = "",
  initialSubmitterEmail = "",
  initialSorting,
  initialPage,
  initialPageSize,
  totalRecords,
  totalPages,
}: SubmissionsWithFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const resolvedInitialSorting = initialSorting ?? EMPTY_INITIAL_SORTING;

  useEffect(() => {
    rememberSubmissionListReturnTo(formId, searchParams.toString());
  }, [formId, searchParams]);
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
    modifiedAt: {
      from: initialModifiedAtFrom,
      to: initialModifiedAtTo,
    },
    startedAt: {
      from: initialStartedAtFrom,
      to: initialStartedAtTo,
    },
    completedAt: {
      from: initialCompletedAtFrom,
      to: initialCompletedAtTo,
    },
  });
  const [sorting, setSorting] = useState<SortingState>(resolvedInitialSorting);
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
    setSorting(resolvedInitialSorting);
  }, [resolvedInitialSorting]);

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
      modifiedAt: {
        from: initialModifiedAtFrom,
        to: initialModifiedAtTo,
      },
      startedAt: {
        from: initialStartedAtFrom,
        to: initialStartedAtTo,
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
    initialModifiedAtFrom,
    initialModifiedAtTo,
    initialStartedAtFrom,
    initialStartedAtTo,
    initialCompletedAtFrom,
    initialCompletedAtTo,
    initialSubmitterDisplayId,
    initialSubmitterEmail,
  ]);

  const submitterFilterDebounceRef = useRef<ReturnType<
    typeof setTimeout
  > | null>(null);

  const clearPendingSubmitterFilterUpdate = () => {
    if (submitterFilterDebounceRef.current) {
      clearTimeout(submitterFilterDebounceRef.current);
      submitterFilterDebounceRef.current = null;
    }
  };

  const updateURL = ({
    isComplete,
    status,
    isTestSubmission,
    submitterDisplayId,
    submitterEmail,
    dates,
    page,
    pageSize,
    sorting: nextSorting,
    navigation = "push",
  }: UpdateSubmissionListUrlArgs) => {
    clearPendingSubmitterFilterUpdate();

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
      modifiedAtFrom: dates.modifiedAt.from,
      modifiedAtTo: dates.modifiedAt.to,
      startedAtFrom: dates.startedAt.from,
      startedAtTo: dates.startedAt.to,
      completedAtFrom: dates.completedAt.from,
      completedAtTo: dates.completedAt.to,
      sorting: nextSorting,
    });
    const queryString =
      serializeSubmissionListSearchParams(listState).toString();
    const url = queryString ? `${pathname}?${queryString}` : pathname;

    startTransition(() => {
      if (navigation === "replace") {
        router.replace(url as Route, { scroll: false });
        return;
      }

      router.push(url as Route, { scroll: false });
    });
  };

  const scheduleSubmitterFilterUpdate = (
    nextSubmitterDisplayId: string,
    nextSubmitterEmail: string,
  ) => {
    clearPendingSubmitterFilterUpdate();

    submitterFilterDebounceRef.current = setTimeout(() => {
      updateURL({
        isComplete: isCompleteFilter,
        status: statusFilter,
        isTestSubmission: testSubmissionFilter,
        submitterDisplayId: nextSubmitterDisplayId,
        submitterEmail: nextSubmitterEmail,
        dates: dateFilters,
        page: 1,
        pageSize: pagination.pageSize,
        sorting,
        navigation: "replace",
      });
    }, SUBMITTER_FILTER_DEBOUNCE_MS);
  };

  useEffect(() => {
    return clearPendingSubmitterFilterUpdate;
  }, []);

  const handleIsCompleteChange = (values: Set<string>) => {
    setIsCompleteFilter(values);
    setPagination((current) => ({ ...current, pageIndex: 0 }));
    updateURL({
      isComplete: values,
      status: statusFilter,
      isTestSubmission: testSubmissionFilter,
      submitterDisplayId: submitterDisplayIdFilter,
      submitterEmail: submitterEmailFilter,
      dates: dateFilters,
      page: 1,
      pageSize: pagination.pageSize,
      sorting,
    });
  };

  const handleStatusChange = (values: Set<string>) => {
    setStatusFilter(values);
    setPagination((current) => ({ ...current, pageIndex: 0 }));
    updateURL({
      isComplete: isCompleteFilter,
      status: values,
      isTestSubmission: testSubmissionFilter,
      submitterDisplayId: submitterDisplayIdFilter,
      submitterEmail: submitterEmailFilter,
      dates: dateFilters,
      page: 1,
      pageSize: pagination.pageSize,
      sorting,
    });
  };

  const handleTestSubmissionChange = (values: Set<string>) => {
    setTestSubmissionFilter(values);
    setPagination((current) => ({ ...current, pageIndex: 0 }));
    updateURL({
      isComplete: isCompleteFilter,
      status: statusFilter,
      isTestSubmission: values,
      submitterDisplayId: submitterDisplayIdFilter,
      submitterEmail: submitterEmailFilter,
      dates: dateFilters,
      page: 1,
      pageSize: pagination.pageSize,
      sorting,
    });
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
    updateURL({
      isComplete: isCompleteFilter,
      status: statusFilter,
      isTestSubmission: testSubmissionFilter,
      submitterDisplayId: submitterDisplayIdFilter,
      submitterEmail: submitterEmailFilter,
      dates: nextDateFilters,
      page: 1,
      pageSize: pagination.pageSize,
      sorting,
    });
  };

  const handleSubmitterDisplayIdChange = (value: string) => {
    setSubmitterDisplayIdFilter(value);
    setPagination((current) => ({ ...current, pageIndex: 0 }));
    scheduleSubmitterFilterUpdate(value, submitterEmailFilter);
  };

  const handleSubmitterEmailChange = (value: string) => {
    setSubmitterEmailFilter(value);
    setPagination((current) => ({ ...current, pageIndex: 0 }));
    scheduleSubmitterFilterUpdate(submitterDisplayIdFilter, value);
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
    updateURL({
      isComplete: emptySet,
      status: emptySet,
      isTestSubmission: emptySet,
      submitterDisplayId: "",
      submitterEmail: "",
      dates: EMPTY_SUBMISSION_DATE_FILTERS,
      page: 1,
      pageSize: pagination.pageSize,
      sorting,
    });
  };

  const handleSortingChange: Dispatch<SetStateAction<SortingState>> = (
    updater,
  ) => {
    const next = typeof updater === "function" ? updater(sorting) : updater;
    setSorting(next);
    updateURL({
      isComplete: isCompleteFilter,
      status: statusFilter,
      isTestSubmission: testSubmissionFilter,
      submitterDisplayId: submitterDisplayIdFilter,
      submitterEmail: submitterEmailFilter,
      dates: dateFilters,
      page: pagination.pageIndex + 1,
      pageSize: pagination.pageSize,
      sorting: next,
      navigation: "replace",
    });
  };

  const handleResetSorting = () => {
    setSorting(EMPTY_INITIAL_SORTING);
    updateURL({
      isComplete: isCompleteFilter,
      status: statusFilter,
      isTestSubmission: testSubmissionFilter,
      submitterDisplayId: submitterDisplayIdFilter,
      submitterEmail: submitterEmailFilter,
      dates: dateFilters,
      page: pagination.pageIndex + 1,
      pageSize: pagination.pageSize,
      sorting: EMPTY_INITIAL_SORTING,
      navigation: "replace",
    });
  };

  const handlePaginationChange: Dispatch<SetStateAction<PaginationState>> = (
    updater,
  ) => {
    const next = typeof updater === "function" ? updater(pagination) : updater;
    setPagination(next);
    updateURL({
      isComplete: isCompleteFilter,
      status: statusFilter,
      isTestSubmission: testSubmissionFilter,
      submitterDisplayId: submitterDisplayIdFilter,
      submitterEmail: submitterEmailFilter,
      dates: dateFilters,
      page: next.pageIndex + 1,
      pageSize: next.pageSize,
      sorting,
    });
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
          useReportingExport={useReportingExport}
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
          onSortingChange={handleSortingChange}
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
