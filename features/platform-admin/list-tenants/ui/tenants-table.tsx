"use client";

import { use, useMemo, useState } from "react";
import {
  auditDateColumns,
  createPagedTableFooterProps,
  DataTableColumnHeader,
  DATA_TABLE_SHRINK_WRAP_CLASS_NAME,
  dataTableColumnLabelClassName,
  DataTableEmpty,
  DataTableGrid,
  DataTableSurface,
  PagedTableFooter,
  useListTableState,
  type DateFilterValue,
} from "@/components/table";
import { HubPageLoadError } from "@/components/error-handling/error-page";
import { StatusBadge } from "@/components/common/status-badge";
import { TruncatedId } from "@/components/common/truncated-id";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AssumeTenantConfirmDialog,
  type AssumeTenantTarget,
} from "@/features/platform-admin/assume-tenant/ui/assume-tenant-confirm-dialog";
import { EditTenantSheet } from "@/features/platform-admin/update-tenant/ui/edit-tenant-sheet";
import type {
  PlatformTenantListItem,
  PlatformTenantListSortBy,
} from "@/lib/endatix-api";
import type { NormalizedPagedResponse } from "@/lib/endatix-api/shared/paged-response";
import { Result, type ResultType } from "@/lib/result";
import type { UrlSearchParamsUpdater } from "@/lib/utils/hooks/use-url-search-params-updater.hook";
import { LogIn, MoreHorizontal, Pencil } from "lucide-react";
import {
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from "@tanstack/react-table";
import type { TenantsListUrlState } from "../utils";

interface TenantsTableProps {
  tenants: NormalizedPagedResponse<PlatformTenantListItem>;
  updateUrl: UrlSearchParamsUpdater;
  urlState: TenantsListUrlState;
  isPending: boolean;
  canManage?: boolean;
}

export function TenantsTableFromPromise({
  tenantsPromise,
  ...props
}: Readonly<
  Omit<TenantsTableProps, "tenants"> & {
    tenantsPromise: Promise<
      ResultType<NormalizedPagedResponse<PlatformTenantListItem>>
    >;
  }
>) {
  const result = use(tenantsPromise);
  if (Result.isError(result)) {
    return <HubPageLoadError result={result} />;
  }

  return <TenantsTable tenants={result.value} {...props} />;
}

export function TenantsTable({
  tenants: paged,
  updateUrl,
  urlState,
  isPending,
  canManage = false,
}: Readonly<TenantsTableProps>) {
  const [editingTenantId, setEditingTenantId] = useState<string | null>(null);
  const [assumeTarget, setAssumeTarget] = useState<AssumeTenantTarget | null>(
    null,
  );

  const { sorting, created, modified, onSortingChange } = useListTableState(
    urlState,
    updateUrl,
  );

  const columns = useMemo(
    () =>
      buildTenantColumns({
        canManage,
        onAssume: setAssumeTarget,
        onEdit: setEditingTenantId,
        updateUrl,
        created,
        modified,
      }),
    [canManage, updateUrl, created, modified],
  );

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

  const hasFilters = Boolean(
    urlState.search?.trim() ||
    urlState.createdFrom ||
    urlState.createdTo ||
    urlState.modifiedFrom ||
    urlState.modifiedTo,
  );

  return (
    <>
      <DataTableSurface data-slot="tenants-table" isPending={isPending}>
        <DataTableGrid
          table={table}
          hasRows={paged.items.length > 0}
          empty={
            <DataTableEmpty>
              {hasFilters
                ? "No tenants match the current filters."
                : "No tenants found."}
            </DataTableEmpty>
          }
        />
        <PagedTableFooter
          {...createPagedTableFooterProps(paged, "tenants", updateUrl)}
          variant="surface"
        />
      </DataTableSurface>
      {canManage && (
        <>
          <AssumeTenantConfirmDialog
            tenant={assumeTarget}
            onOpenChange={(open) => {
              if (!open) {
                setAssumeTarget(null);
              }
            }}
          />
          <EditTenantSheet
            tenantId={editingTenantId}
            onOpenChange={(isOpen) => {
              if (!isOpen) {
                setEditingTenantId(null);
              }
            }}
          />
        </>
      )}
    </>
  );
}

type BuildColumnsArgs = {
  canManage: boolean;
  onAssume: (tenant: AssumeTenantTarget) => void;
  onEdit: (tenantId: string) => void;
  updateUrl: UrlSearchParamsUpdater;
  created: DateFilterValue;
  modified: DateFilterValue;
};

function buildTenantColumns({
  canManage,
  onAssume,
  onEdit,
  updateUrl,
  created,
  modified,
}: BuildColumnsArgs): ColumnDef<PlatformTenantListItem>[] {
  const columns: ColumnDef<PlatformTenantListItem>[] = [
    {
      id: "name" satisfies PlatformTenantListSortBy,
      accessorKey: "name",
      enableSorting: true,
      meta: {
        headerClassName: "min-w-[12rem]",
        cellClassName: "min-w-[12rem]",
      },
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title="Tenant"
          isSorted={column.getIsSorted()}
        />
      ),
      cell: ({ row }) => {
        const nameBlock = (
          <>
            <p className="truncate text-sm font-medium">{row.original.name}</p>
            <p className="truncate text-xs text-muted-foreground">
              {row.original.description || "No description"}
            </p>
          </>
        );

        if (!canManage) {
          return <div className="min-w-0">{nameBlock}</div>;
        }

        return (
          <button
            type="button"
            className="min-w-0 text-left hover:underline focus-visible:underline focus-visible:outline-none"
            onClick={() => onEdit(row.original.id)}
          >
            {nameBlock}
          </button>
        );
      },
    },
    {
      id: "shortUrl",
      accessorKey: "shortUrl",
      enableSorting: false,
      meta: {
        headerClassName: DATA_TABLE_SHRINK_WRAP_CLASS_NAME,
        cellClassName: DATA_TABLE_SHRINK_WRAP_CLASS_NAME,
      },
      header: () => (
        <span className={dataTableColumnLabelClassName()}>Public id</span>
      ),
      cell: ({ row }) => (
        <TruncatedId id={row.original.shortUrl} copyLabel="Copy public id" />
      ),
    },
    {
      id: "selfRegistrationEnabled",
      accessorKey: "selfRegistrationEnabled",
      enableSorting: false,
      meta: {
        headerClassName: DATA_TABLE_SHRINK_WRAP_CLASS_NAME,
        cellClassName: DATA_TABLE_SHRINK_WRAP_CLASS_NAME,
      },
      header: () => (
        <span className={dataTableColumnLabelClassName()}>Self-reg</span>
      ),
      cell: ({ row }) => (
        <StatusBadge
          tone={row.original.selfRegistrationEnabled ? "on" : "off"}
          label={row.original.selfRegistrationEnabled ? "On" : "Off"}
        />
      ),
    },
    ...auditDateColumns<PlatformTenantListItem>({
      created,
      modified,
      updateUrl,
    }),
  ];

  if (canManage) {
    columns.push({
      id: "actions",
      enableSorting: false,
      meta: {
        headerClassName: `text-right ${DATA_TABLE_SHRINK_WRAP_CLASS_NAME}`,
        cellClassName: `text-right ${DATA_TABLE_SHRINK_WRAP_CLASS_NAME}`,
      },
      header: () => (
        <span className={dataTableColumnLabelClassName()}>Actions</span>
      ),
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreHorizontal />
              <span className="sr-only">Open tenant actions</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onSelect={() => {
                onAssume({
                  id: row.original.id,
                  name: row.original.name,
                });
              }}
            >
              <LogIn />
              Assume tenant
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => onEdit(row.original.id)}>
              <Pencil />
              Edit
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    });
  }

  return columns;
}
