"use client";

import { Inbox } from "lucide-react";
import { Suspense, use, useMemo, useState } from "react";
import {
  CellDate,
  createPagedTableFooterProps,
  DataTableColumnHeader,
  dataTableColumnLabelClassName,
  DataTableEmpty,
  DataTableGrid,
  DataTableSurface,
  DATA_TABLE_SHRINK_WRAP_CLASS_NAME,
  PagedTableFooter,
  useListTableState,
} from "@/components/table";
import { HubPageLoadError } from "@/components/error-handling/error-page";
import { StatusBadge } from "@/components/common/status-badge";
import type { SignupRequestListItem } from "@/lib/endatix-api/signup-requests/types";
import type { NormalizedPagedResponse } from "@/lib/endatix-api/shared/paged-response";
import { Result, type ResultType } from "@/lib/result";
import type { UrlSearchParamsUpdater } from "@/lib/utils/hooks/use-url-search-params-updater.hook";
import {
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from "@tanstack/react-table";
import type { SignupRequestsUrlState } from "../signup-requests-url-state";
import { DEFAULT_SIGNUP_REQUEST_STATUS_FILTER } from "../types";
import { Button } from "@/components/ui/button";
import { describeSignupRequest } from "../../review-signup-request/signup-request-state";
import type { SignupReviewers } from "../../review-signup-request/types";
import { SignupRequestReviewPanel } from "../../review-signup-request/ui/signup-request-review-panel";
import { SignupReviewerLabel } from "../../review-signup-request/ui/signup-reviewer-label";

// Dates are secondary to who is asking; they step aside on phones, like the audit dates elsewhere.
const CREATED_CELL_CLASS_NAME = `hidden md:table-cell ${DATA_TABLE_SHRINK_WRAP_CLASS_NAME}`;

interface SignupRequestsTableProps {
  requests: NormalizedPagedResponse<SignupRequestListItem>;
  reviewers: SignupReviewers;
  updateUrl: UrlSearchParamsUpdater;
  urlState: SignupRequestsUrlState;
  isPending: boolean;
  onClearFilters: () => void;
}

export function SignupRequestsTableFromPromise({
  requestsPromise,
  reviewersPromise,
  ...props
}: Readonly<
  Omit<SignupRequestsTableProps, "requests" | "reviewers"> & {
    requestsPromise: Promise<
      ResultType<NormalizedPagedResponse<SignupRequestListItem>>
    >;
    reviewersPromise: Promise<SignupReviewers>;
  }
>) {
  const result = use(requestsPromise);
  if (Result.isError(result)) {
    return <HubPageLoadError result={result} />;
  }

  return (
    <Suspense
      fallback={
        <SignupRequestsTable
          requests={result.value}
          reviewers={{}}
          {...props}
        />
      }
    >
      <SignupRequestsTableWithReviewers
        requests={result.value}
        reviewersPromise={reviewersPromise}
        {...props}
      />
    </Suspense>
  );
}

function SignupRequestsTableWithReviewers({
  requests,
  reviewersPromise,
  ...props
}: Readonly<
  Omit<SignupRequestsTableProps, "requests" | "reviewers"> & {
    requests: NormalizedPagedResponse<SignupRequestListItem>;
    reviewersPromise: Promise<SignupReviewers>;
  }
>) {
  const reviewers = use(reviewersPromise);

  return (
    <SignupRequestsTable requests={requests} reviewers={reviewers} {...props} />
  );
}

export function SignupRequestsTable({
  requests: paged,
  reviewers,
  updateUrl,
  urlState,
  isPending,
  onClearFilters,
}: Readonly<SignupRequestsTableProps>) {
  const { sorting, onSortingChange } = useListTableState(urlState, updateUrl);
  // The snapshot keeps the panel filled while it closes, and after a decision
  // moves the row off this filter.
  const [reviewing, setReviewing] = useState<SignupRequestListItem | null>(
    null,
  );
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const columns = useMemo(
    () =>
      buildColumns({
        reviewers,
        onReview: (request) => {
          setReviewing(request);
          setIsReviewOpen(true);
        },
      }),
    [reviewers],
  );
  const reviewed =
    (reviewing && paged.items.find((item) => item.id === reviewing.id)) ??
    reviewing;
  const tableData = useMemo(() => [...paged.items], [paged.items]);
  const table = useReactTable({
    data: tableData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row) => row.id,
    manualSorting: true,
    state: {
      sorting,
      // Nobody has decided a pending request; the column only earns its width elsewhere.
      columnVisibility: {
        decidedBy: urlState.status !== DEFAULT_SIGNUP_REQUEST_STATUS_FILTER,
      },
    },
    onSortingChange,
  });

  return (
    <DataTableSurface data-slot="signup-requests-table">
      <DataTableGrid
        table={table}
        isPending={isPending}
        hasRows={paged.items.length > 0}
        empty={
          <SignupRequestsEmpty
            urlState={urlState}
            onClearFilters={onClearFilters}
            onShowAll={() => updateUrl({ status: "all", page: "1" })}
          />
        }
      />
      <PagedTableFooter
        {...createPagedTableFooterProps(paged, "signup requests", updateUrl)}
        variant="surface"
      />
      <SignupRequestReviewPanel
        request={reviewed}
        open={isReviewOpen}
        reviewers={reviewers}
        onOpenChange={setIsReviewOpen}
      />
    </DataTableSurface>
  );
}

function buildColumns({
  reviewers,
  onReview,
}: {
  reviewers: SignupReviewers;
  onReview: (request: SignupRequestListItem) => void;
}): ColumnDef<SignupRequestListItem>[] {
  return [
    {
      id: "email",
      accessorKey: "email",
      enableSorting: true,
      meta: {
        headerClassName: "min-w-[14rem]",
        cellClassName: "min-w-[14rem]",
      },
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title="Requester"
          isSorted={column.getIsSorted()}
        />
      ),
      // The email is what the reviewer came to read: wrap it, never truncate it.
      cell: ({ row }) => (
        <button
          type="button"
          className="grid min-w-0 text-left hover:underline focus-visible:underline focus-visible:outline-none"
          onClick={() => onReview(row.original)}
        >
          <span className="text-sm font-medium break-all">
            {row.original.email}
          </span>
          <span className="text-xs break-words text-muted-foreground">
            {row.original.companyName ?? "No company given"}
          </span>
        </button>
      ),
    },
    {
      id: "status",
      accessorKey: "status",
      enableSorting: false,
      meta: {
        headerClassName: DATA_TABLE_SHRINK_WRAP_CLASS_NAME,
        cellClassName: DATA_TABLE_SHRINK_WRAP_CLASS_NAME,
      },
      header: () => (
        <span className={dataTableColumnLabelClassName()}>Status</span>
      ),
      cell: ({ row }) => (
        <StatusBadge {...describeSignupRequest(row.original).row} />
      ),
    },
    {
      id: "decidedBy",
      accessorKey: "decidedByUserId",
      enableSorting: false,
      meta: {
        headerClassName: "hidden lg:table-cell",
        cellClassName: "hidden lg:table-cell",
      },
      header: () => (
        <span className={dataTableColumnLabelClassName()}>Decided by</span>
      ),
      cell: ({ row }) => (
        <span className="text-sm">
          <SignupReviewerLabel
            userId={row.original.decidedByUserId}
            reviewers={reviewers}
          />
        </span>
      ),
    },
    {
      id: "createdAt",
      accessorKey: "createdAt",
      enableSorting: true,
      meta: {
        headerClassName: CREATED_CELL_CLASS_NAME,
        cellClassName: CREATED_CELL_CLASS_NAME,
      },
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title="Submitted"
          isSorted={column.getIsSorted()}
        />
      ),
      cell: ({ row }) => <CellDate date={row.original.createdAt} />,
    },
    {
      id: "actions",
      enableSorting: false,
      meta: {
        headerClassName: `text-right ${DATA_TABLE_SHRINK_WRAP_CLASS_NAME}`,
        cellClassName: `text-right ${DATA_TABLE_SHRINK_WRAP_CLASS_NAME}`,
      },
      header: () => (
        <span className={dataTableColumnLabelClassName()}>Actions</span>
      ),
      // One entry point per row: decisions happen after the record is read.
      cell: ({ row }) => {
        const needsReviewer =
          describeSignupRequest(row.original).nextStep !== null;
        return (
          <Button
            size="sm"
            variant={needsReviewer ? "secondary" : "ghost"}
            aria-label={`${needsReviewer ? "Review" : "View"} request from ${row.original.email}`}
            onClick={() => onReview(row.original)}
          >
            {needsReviewer ? "Review" : "View"}
          </Button>
        );
      },
    },
  ];
}

const STATUS_NOUN: Record<SignupRequestsUrlState["status"], string> = {
  pending: "pending",
  approved: "approved",
  rejected: "rejected",
  all: "",
};

/**
 * One icon for "nothing yet" and "nothing matches" — the sidebar's `Inbox` — so
 * an empty filter reads as this list, not as an error. The copy and the way out differ.
 */
function SignupRequestsEmpty({
  urlState,
  onClearFilters,
  onShowAll,
}: Readonly<{
  urlState: SignupRequestsUrlState;
  onClearFilters: () => void;
  onShowAll: () => void;
}>) {
  const search = urlState.search.trim();
  const noun = STATUS_NOUN[urlState.status];

  if (search) {
    return (
      <DataTableEmpty
        icon={Inbox}
        title="No matching requests"
        onClearFilters={onClearFilters}
      >
        No {noun ? `${noun} ` : ""}request matches “{search}”. Search looks at
        the email and company.
      </DataTableEmpty>
    );
  }

  if (urlState.status === DEFAULT_SIGNUP_REQUEST_STATUS_FILTER) {
    return (
      <DataTableEmpty
        icon={Inbox}
        title="No requests waiting for a decision"
        action={
          <Button variant="ghost" size="sm" onClick={onShowAll}>
            Show all requests
          </Button>
        }
      >
        New requests from the public signup page appear here for review.
      </DataTableEmpty>
    );
  }

  if (urlState.status === "all") {
    return (
      <DataTableEmpty icon={Inbox} title="No signup requests yet">
        Requests submitted from the public signup page appear here.
      </DataTableEmpty>
    );
  }

  return (
    <DataTableEmpty
      icon={Inbox}
      title={`No ${noun} requests`}
      onClearFilters={onClearFilters}
    >
      Requests move here once an admin{" "}
      {urlState.status === "approved" ? "approves" : "rejects"} them.
    </DataTableEmpty>
  );
}
