"use client";

import { use, useMemo } from "react";
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
import { StatusBadge, type StatusTone } from "@/components/common/status-badge";
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

// Created is secondary to who is asking; it steps aside on phones, like the audit dates elsewhere.
const CREATED_CELL_CLASS_NAME = `hidden md:table-cell ${DATA_TABLE_SHRINK_WRAP_CLASS_NAME}`;

interface SignupRequestsTableProps {
  requests: NormalizedPagedResponse<SignupRequestListItem>;
  updateUrl: UrlSearchParamsUpdater;
  urlState: SignupRequestsUrlState;
  isPending: boolean;
}

export function SignupRequestsTableFromPromise({
  requestsPromise,
  ...props
}: Readonly<
  Omit<SignupRequestsTableProps, "requests"> & {
    requestsPromise: Promise<
      ResultType<NormalizedPagedResponse<SignupRequestListItem>>
    >;
  }
>) {
  const result = use(requestsPromise);
  if (Result.isError(result)) {
    return <HubPageLoadError result={result} />;
  }

  return <SignupRequestsTable requests={result.value} {...props} />;
}

export function SignupRequestsTable({
  requests: paged,
  updateUrl,
  urlState,
  isPending,
}: Readonly<SignupRequestsTableProps>) {
  const { sorting, onSortingChange } = useListTableState(urlState, updateUrl);
  const columns = useMemo(() => buildColumns(), []);
  const tableData = useMemo(() => [...paged.items], [paged.items]);
  const table = useReactTable({
    data: tableData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row) => row.id,
    manualSorting: true,
    state: { sorting },
    onSortingChange,
  });

  return (
    <DataTableSurface data-slot="signup-requests-table">
      <DataTableGrid
        table={table}
        isPending={isPending}
        hasRows={paged.items.length > 0}
        empty={<DataTableEmpty>{emptyMessage(urlState)}</DataTableEmpty>}
      />
      <PagedTableFooter
        {...createPagedTableFooterProps(paged, "signup requests", updateUrl)}
        variant="surface"
      />
    </DataTableSurface>
  );
}

function buildColumns(): ColumnDef<SignupRequestListItem>[] {
  return [
    {
      id: "email",
      accessorKey: "email",
      enableSorting: true,
      meta: {
        headerClassName: "min-w-[12rem]",
        cellClassName: "min-w-[12rem]",
      },
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title="Email"
          isSorted={column.getIsSorted()}
        />
      ),
      // The email is what the reviewer came to read: wrap it, never truncate it.
      cell: ({ row }) => (
        <span className="text-sm font-medium break-all">
          {row.original.email}
        </span>
      ),
    },
    {
      id: "companyName",
      accessorKey: "companyName",
      enableSorting: false,
      header: () => (
        <span className={dataTableColumnLabelClassName()}>Company</span>
      ),
      cell: ({ row }) =>
        row.original.companyName || (
          <span className="text-muted-foreground">
            <span aria-hidden="true">—</span>
            <span className="sr-only">Not set</span>
          </span>
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
        <StatusBadge
          tone={statusTone(row.original.status)}
          label={statusLabel(row.original.status)}
        />
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
          title="Created"
          isSorted={column.getIsSorted()}
        />
      ),
      cell: ({ row }) => <CellDate date={row.original.createdAt} />,
    },
  ];
}

function emptyMessage(urlState: SignupRequestsUrlState): string {
  if (urlState.search.trim()) {
    return "No signup requests match your search.";
  }

  switch (urlState.status) {
    case DEFAULT_SIGNUP_REQUEST_STATUS_FILTER:
      return "No requests are waiting for a decision.";
    case "approved":
      return "No approved signup requests.";
    case "rejected":
      return "No rejected signup requests.";
    default:
      return "No signup requests yet. Requests from the signup page appear here.";
  }
}

// Pending needs the reviewer (attention); approved is done (on); rejected is a
// legitimate closed state (off), not a failure — so never destructive.
function statusTone(status: string): StatusTone {
  if (status === "approved") {
    return "on";
  }
  if (status === "rejected") {
    return "off";
  }
  return "attention";
}

function statusLabel(status: string): string {
  if (status === "approved" || status === "rejected" || status === "pending") {
    return status.charAt(0).toUpperCase() + status.slice(1);
  }
  return status;
}
