"use client";

import { use, useMemo, useState } from "react";
import {
  CellDate,
  createPagedTableFooterProps,
  DataTableColumnHeader,
  DATA_TABLE_SHRINK_WRAP_CLASS_NAME,
  dataTableColumnLabelClassName,
  DataTableEmpty,
  DataTableGrid,
  DataTableSurface,
  PagedTableFooter,
  sortingStateFromUrl,
  sortingUrlUpdatesFromState,
  type DateFilterValue,
} from "@/components/table";
import { TruncatedId } from "@/components/common/truncated-id";
import { Badge } from "@/components/ui/badge";
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
import type { PlatformTenantListItem, PlatformTenantListSortBy } from "@/lib/endatix-api";
import type { NormalizedPagedResponse } from "@/lib/endatix-api/shared/paged-response";
import { useListUrlState } from "@/lib/list-page/use-list-url-state";
import type { UrlSearchParamsUpdater } from "@/lib/utils/hooks/use-url-search-params-updater.hook";
import { MoreHorizontal } from "lucide-react";
import {
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
  type Updater,
} from "@tanstack/react-table";
import { listUrlStateFromSearchParams } from "../utils";

interface TenantsTableProps {
  tenants: NormalizedPagedResponse<PlatformTenantListItem>;
  canManage?: boolean;
}

export function TenantsTableFromPromise({
  tenantsPromise,
  ...props
}: Readonly<
  Omit<TenantsTableProps, "tenants"> & {
    tenantsPromise: Promise<NormalizedPagedResponse<PlatformTenantListItem>>;
  }
>) {
  return <TenantsTable tenants={use(tenantsPromise)} {...props} />;
}

export function TenantsTable({
  tenants: paged,
  canManage = false,
}: Readonly<TenantsTableProps>) {
  const { updateUrl, searchParams, isPending } = useListUrlState();
  const urlState = listUrlStateFromSearchParams(searchParams);
  const searchInput = searchParams.get("search") ?? "";
  const [editingTenantId, setEditingTenantId] = useState<string | null>(null);
  const [assumeTarget, setAssumeTarget] = useState<AssumeTenantTarget | null>(
    null,
  );

  const sorting = useMemo(
    () => sortingStateFromUrl(urlState.sortBy, urlState.sortDir),
    [urlState.sortBy, urlState.sortDir],
  );
  const createdDateFilter: DateFilterValue = useMemo(
    () => ({ from: urlState.createdFrom, to: urlState.createdTo }),
    [urlState.createdFrom, urlState.createdTo],
  );
  const modifiedDateFilter: DateFilterValue = useMemo(
    () => ({ from: urlState.modifiedFrom, to: urlState.modifiedTo }),
    [urlState.modifiedFrom, urlState.modifiedTo],
  );

  const handleSortingChange = (updater: Updater<SortingState>) => {
    const next = typeof updater === "function" ? updater(sorting) : updater;
    updateUrl(sortingUrlUpdatesFromState(next));
  };

  const columns = useMemo(
    () =>
      buildTenantColumns({
        canManage,
        onAssume: setAssumeTarget,
        onEdit: setEditingTenantId,
        updateUrl,
        createdDateFilter,
        modifiedDateFilter,
      }),
    [canManage, updateUrl, createdDateFilter, modifiedDateFilter],
  );

  const tableData = useMemo(() => [...paged.items], [paged.items]);
  const table = useReactTable({
    data: tableData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row) => String(row.id),
    manualSorting: true,
    state: { sorting },
    onSortingChange: handleSortingChange,
  });

  const hasFilters = Boolean(
    searchInput.trim() ||
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
  createdDateFilter: DateFilterValue;
  modifiedDateFilter: DateFilterValue;
};

function buildTenantColumns({
  canManage,
  onAssume,
  onEdit,
  updateUrl,
  createdDateFilter,
  modifiedDateFilter,
}: BuildColumnsArgs): ColumnDef<PlatformTenantListItem>[] {
  const sortableId = (id: PlatformTenantListSortBy) => id;
  const columns: ColumnDef<PlatformTenantListItem>[] = [
    {
      id: sortableId("name"),
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
      cell: ({ row }) => (
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{row.original.name}</p>
          <p className="truncate text-xs text-muted-foreground">
            {row.original.description || "No description"}
          </p>
        </div>
      ),
    },
    {
      id: "slug",
      accessorKey: "slug",
      enableSorting: false,
      meta: {
        headerClassName: DATA_TABLE_SHRINK_WRAP_CLASS_NAME,
        cellClassName: DATA_TABLE_SHRINK_WRAP_CLASS_NAME,
      },
      header: () => (
        <span className={dataTableColumnLabelClassName()}>Tenant slug</span>
      ),
      cell: ({ row }) => (
        <TruncatedId
          id={row.original.slug}
          copyLabel="Copy tenant slug"
        />
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
        <Badge
          variant={
            row.original.selfRegistrationEnabled ? "default" : "secondary"
          }
        >
          {row.original.selfRegistrationEnabled ? "On" : "Off"}
        </Badge>
      ),
    },
    {
      id: sortableId("createdAt"),
      accessorKey: "createdAt",
      enableSorting: true,
      meta: {
        headerClassName: `hidden md:table-cell ${DATA_TABLE_SHRINK_WRAP_CLASS_NAME}`,
        cellClassName: `hidden md:table-cell ${DATA_TABLE_SHRINK_WRAP_CLASS_NAME}`,
      },
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title="Created"
          isSorted={column.getIsSorted()}
          dateFilter={{
            value: createdDateFilter,
            onChange: (value) => {
              updateUrl({
                createdFrom: value.from ?? null,
                createdTo: value.to ?? null,
                page: "1",
              });
            },
          }}
        />
      ),
      cell: ({ row }) => <CellDate date={row.original.createdAt} />,
    },
    {
      id: sortableId("modifiedAt"),
      accessorKey: "modifiedAt",
      enableSorting: true,
      meta: {
        headerClassName: `hidden md:table-cell ${DATA_TABLE_SHRINK_WRAP_CLASS_NAME}`,
        cellClassName: `hidden md:table-cell ${DATA_TABLE_SHRINK_WRAP_CLASS_NAME}`,
      },
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title="Modified"
          isSorted={column.getIsSorted()}
          dateFilter={{
            value: modifiedDateFilter,
            onChange: (value) => {
              updateUrl({
                modifiedFrom: value.from ?? null,
                modifiedTo: value.to ?? null,
                page: "1",
              });
            },
          }}
        />
      ),
      cell: ({ row }) => <CellDate date={row.original.modifiedAt} />,
    },
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
                  id: String(row.original.id),
                  name: row.original.name,
                });
              }}
            >
              Assume tenant
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onEdit(String(row.original.id))}
            >
              Edit
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    });
  }

  return columns;
}
