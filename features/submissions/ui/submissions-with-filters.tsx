"use client";

import { DataTableToolbar } from "@/components/table";
import { ShareDialog } from "@/features/forms/ui/share-dialog";
import {
  rememberSubmissionListReturnTo,
  serializeSubmissionListSearchParams,
  submissionListUrlStateFromClientFilters,
  type SubmissionListUrlState,
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
import type { PagedResponse } from "@/lib/endatix-api/shared/types";
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

type SubmissionsWithFiltersProps = {
  formId: string;
  hasAnySubmissions: boolean;
  useReportingExport?: boolean;
  definitionFields?: DefinitionField[];
  page: PagedResponse<Submission>;
  listState: SubmissionListUrlState;
};

const EMPTY_INITIAL_SORTING: SortingState = [];
const SUBMITTER_FILTER_DEBOUNCE_MS = 300;

/** Flat URL date stems → table date-filter UI shape (UI-only nest). */
function submissionDateFiltersFromListState(
  listState: SubmissionListUrlState,
): SubmissionDateFilters {
  return {
    createdAt: {
      from: listState.createdFrom,
      to: listState.createdTo,
    },
    modifiedAt: {
      from: listState.modifiedFrom,
      to: listState.modifiedTo,
    },
    startedAt: {
      from: listState.startedFrom,
      to: listState.startedTo,
    },
    completedAt: {
      from: listState.completedFrom,
      to: listState.completedTo,
    },
  };
}

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
  onResetSorting,
  onResetAllFiltersAndSorting,
  isPending,
  allColumns,
  sorting,
  onSortingChange,
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
  onResetSorting: () => void;
  onResetAllFiltersAndSorting: () => void;
  isPending: boolean;
  allColumns: ColumnDef<ParsedSubmission>[];
  sorting: SortingState;
  onSortingChange: Dispatch<SetStateAction<SortingState>>;
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
  const isTrueEmptyState = !hasAnySubmissions;
  const disableTableControls = isTrueEmptyState;

  const exportListFilters = useMemo(
    () => ({
      createdFrom: dateFilters.createdAt.from,
      createdTo: dateFilters.createdAt.to,
      modifiedFrom: dateFilters.modifiedAt.from,
      modifiedTo: dateFilters.modifiedAt.to,
      startedFrom: dateFilters.startedAt.from,
      startedTo: dateFilters.startedAt.to,
      completedFrom: dateFilters.completedAt.from,
      completedTo: dateFilters.completedAt.to,
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

  const handleResetTableLayout = () => {
    if (hasCustomOrder) resetOrder();
    if (hasCustomVisibility) resetVisibility();
    onResetAllFiltersAndSorting();
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
  } else {
    tableRegion = (
      <SubmissionsTable
        data={data}
        columns={allColumns}
        sorting={sorting}
        onSortingChange={onSortingChange}
        pagination={pagination}
        onPaginationChange={onPaginationChange}
        totalRecords={totalRecords}
        totalPages={totalPages}
        onFilteredEmptyClear={onResetFilters}
        isPending={isPending}
      />
    );
  }

  return (
    <>
      <DataTableToolbar
        className="mt-8 mb-4"
        isPending={isPending}
        filters={
          <SubmissionsFilterToolbar
            isCompleteFilter={isCompleteFilter}
            statusFilter={statusFilter}
            testSubmissionFilter={testSubmissionFilter}
            onIsCompleteChange={onIsCompleteChange}
            onStatusChange={onStatusChange}
            onTestSubmissionChange={onTestSubmissionChange}
            onResetFilters={onResetFilters}
            onResetSorting={onResetSorting}
            onResetAll={onResetAllFiltersAndSorting}
            hasSorting={hasSorting}
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
            <ColumnViewOptionsDropdown
              columns={columnHeaders}
              disabled={disableTableControls}
            />
            {isClient && (
              <ResetOptionsDropdown
                options={resetOptions}
                onResetAll={handleResetTableLayout}
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
  formId,
  hasAnySubmissions,
  useReportingExport = false,
  definitionFields = [],
  page,
  listState,
}: SubmissionsWithFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const data = [...page.items];
  const totalRecords = page.totalRecords;
  const totalPages = page.totalPages;

  useEffect(() => {
    rememberSubmissionListReturnTo(formId, searchParams.toString());
  }, [formId, searchParams]);
  const [isCompleteFilter, setIsCompleteFilter] = useState<Set<string>>(
    () => new Set(listState.isComplete),
  );
  const [statusFilter, setStatusFilter] = useState<Set<string>>(
    () => new Set(listState.status),
  );
  const [testSubmissionFilter, setTestSubmissionFilter] = useState<Set<string>>(
    () => new Set(listState.isTestSubmission),
  );
  const [submitterDisplayIdFilter, setSubmitterDisplayIdFilter] = useState(
    listState.submitterDisplayId ?? "",
  );
  const [submitterEmailFilter, setSubmitterEmailFilter] = useState(
    listState.submitterEmail ?? "",
  );
  const [dateFilters, setDateFilters] = useState<SubmissionDateFilters>(() =>
    submissionDateFiltersFromListState(listState),
  );
  const [sorting, setSorting] = useState<SortingState>(() =>
    listState.sorting.length > 0
      ? [...listState.sorting]
      : EMPTY_INITIAL_SORTING,
  );
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: page.page - 1,
    pageSize: page.pageSize,
  });

  useEffect(() => {
    setPagination({
      pageIndex: page.page - 1,
      pageSize: page.pageSize,
    });
  }, [page.page, page.pageSize]);

  useEffect(() => {
    setIsCompleteFilter(new Set(listState.isComplete));
    setStatusFilter(new Set(listState.status));
    setTestSubmissionFilter(new Set(listState.isTestSubmission));
    setSubmitterDisplayIdFilter(listState.submitterDisplayId ?? "");
    setSubmitterEmailFilter(listState.submitterEmail ?? "");
    setDateFilters(submissionDateFiltersFromListState(listState));
    setSorting(
      listState.sorting.length > 0
        ? [...listState.sorting]
        : EMPTY_INITIAL_SORTING,
    );
  }, [listState]);

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
      createdFrom: dates.createdAt.from,
      createdTo: dates.createdAt.to,
      modifiedFrom: dates.modifiedAt.from,
      modifiedTo: dates.modifiedAt.to,
      startedFrom: dates.startedAt.from,
      startedTo: dates.startedAt.to,
      completedFrom: dates.completedAt.from,
      completedTo: dates.completedAt.to,
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

  const handleResetAllFiltersAndSorting = () => {
    const emptySet = new Set<string>();
    setIsCompleteFilter(emptySet);
    setStatusFilter(emptySet);
    setTestSubmissionFilter(emptySet);
    setSubmitterDisplayIdFilter("");
    setSubmitterEmailFilter("");
    setDateFilters(EMPTY_SUBMISSION_DATE_FILTERS);
    setSorting(EMPTY_INITIAL_SORTING);
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
      sorting: EMPTY_INITIAL_SORTING,
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
          onResetSorting={handleResetSorting}
          onResetAllFiltersAndSorting={handleResetAllFiltersAndSorting}
          isPending={isPending}
          allColumns={allColumns}
          sorting={sorting}
          onSortingChange={handleSortingChange}
          pagination={pagination}
          onPaginationChange={handlePaginationChange}
          totalRecords={totalRecords}
          totalPages={totalPages}
        />
      </ColumnVisibilityProvider>
    </ColumnOrderProvider>
  );
}
