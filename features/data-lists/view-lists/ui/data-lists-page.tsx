'use client';

import { use, useEffect, useMemo, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  CellDate,
  createPagedTableFooterProps,
  DataTableColumnHeader,
  dataTableBodyCellClassName,
  dataTableBodyRowClassName,
  dataTableColumnLabelClassName,
  dataTableHeaderCellClassName,
  DataTableEmpty,
  DataTableSurface,
  FacetedFilter,
  PagedTableFooter,
  type DateFilterValue,
  type FacetedFilterOption,
} from '@/components/table';
import { Spinner } from '@/components/loaders/spinner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { toast } from '@/components/ui/toast';
import { formatLocaleLabel } from '@/features/data-lists/translations/locale-discovery';
import type {
  DataList,
  DataListListSortBy,
  FormDependencySummary,
} from '@/lib/endatix-api/data-lists/types';
import type { DataListsPage } from '@/lib/endatix-api/data-lists/data-lists';
import { rememberTableReturnTo } from '@/lib/list-page/table-return-to';
import { useListUrlState } from '@/lib/list-page/use-list-url-state';
import type { UrlSearchParamsUpdater } from '@/lib/utils/hooks/use-url-search-params-updater.hook';
import { Result } from '@/lib/result';
import { formatInteger } from '@/lib/utils/formatters';
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
  type Updater,
} from '@tanstack/react-table';
import type { Route } from 'next';
import { CreateDataListDialog } from '../../create-list/ui/create-data-list-dialog';
import { DataListRowActions } from './data-list-row-actions';
import { DataListLocalesCell } from './data-list-locales-cell';
import { getDataListFormDependenciesAction } from '../get-data-list-form-dependencies.action';
import { deleteDataListAction } from '../../delete-list/delete-data-list.action';
import {
  buildDataListDetailHref,
  buildDataListsListHref,
  currentDataListsListQuery,
  DATA_LISTS_TABLE_KEY,
  listUrlStateFromSearchParams,
  parseDataListsReturnQuery,
  parseHasLocaleFilterSet,
  serializeHasLocaleFilter,
} from '../utils';
import './table-types';

interface DataListsPageProps {
  dataListsPromise: Promise<DataListsPage>;
  localesPromise: Promise<string[]>;
  openCreateOnLoad?: boolean;
}

export function DataListsPageHeader() {
  return (
    <section className="space-y-1">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Data Lists</h1>
        <p className="text-sm text-muted-foreground">
          Manage reusable JSON datasets for form choices.
        </p>
      </div>
    </section>
  );
}

export function DataListsPage({
  dataListsPromise,
  localesPromise,
  openCreateOnLoad = false,
}: Readonly<DataListsPageProps>) {
  const paged = use(dataListsPromise);
  const tenantLocales = use(localesPromise);
  const router = useRouter();
  const { updateUrl, searchParams } = useListUrlState();
  const listQuery = currentDataListsListQuery(searchParams);
  const urlState = listUrlStateFromSearchParams(searchParams);
  const searchInput = searchParams.get('search') ?? '';
  const selectedLocales = useMemo(
    () => parseHasLocaleFilterSet(searchParams.get('hasLocale')),
    [searchParams],
  );

  const localeOptions = useMemo<FacetedFilterOption[]>(
    () =>
      tenantLocales.map((value) => ({
        value,
        label: formatLocaleLabel(value),
      })),
    [tenantLocales],
  );

  const sorting = useMemo<SortingState>(() => {
    if (!urlState.sortBy) {
      return [];
    }
    return [
      {
        id: urlState.sortBy,
        desc: urlState.sortDir !== 'asc',
      },
    ];
  }, [urlState.sortBy, urlState.sortDir]);

  const createdDateFilter: DateFilterValue = useMemo(
    () => ({ from: urlState.createdFrom, to: urlState.createdTo }),
    [urlState.createdFrom, urlState.createdTo],
  );
  const modifiedDateFilter: DateFilterValue = useMemo(
    () => ({ from: urlState.modifiedFrom, to: urlState.modifiedTo }),
    [urlState.modifiedFrom, urlState.modifiedTo],
  );

  // Lets "Back to Data Lists" on the detail page restore paging/filters —
  // see lib/list-page/table-return-to and AGENTS.md "Detail → list back
  // navigation".
  useEffect(() => {
    rememberTableReturnTo(
      DATA_LISTS_TABLE_KEY,
      searchParams.toString(),
      parseDataListsReturnQuery,
    );
  }, [searchParams]);

  const [isCreateDialogOpen, setIsCreateDialogOpen] =
    useState(openCreateOnLoad);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedForDelete, setSelectedForDelete] = useState<DataList | null>(
    null,
  );
  const [dependencies, setDependencies] = useState<FormDependencySummary[]>([]);
  const [isDeleteBlocked, setIsDeleteBlocked] = useState(false);
  const [isDeletePending, startDeleteTransition] = useTransition();
  const [isLoadingDependencies, startDependenciesTransition] = useTransition();

  useEffect(() => {
    setIsCreateDialogOpen(openCreateOnLoad);
  }, [openCreateOnLoad]);

  const replaceListHref = () => {
    router.replace(buildDataListsListHref(urlState) as Route);
  };

  const handleOpenDelete = (dataList: DataList) => {
    setIsCreateDialogOpen(false);
    replaceListHref();

    setSelectedForDelete(dataList);
    setDependencies([]);
    setIsDeleteBlocked(false);
    setIsDeleteDialogOpen(true);

    startDependenciesTransition(async () => {
      const dependenciesResult = await getDataListFormDependenciesAction(
        String(dataList.id),
      );

      if (Result.isError(dependenciesResult)) {
        toast.error(
          dependenciesResult.message || 'Failed to load dependencies',
        );
        return;
      }

      setDependencies(dependenciesResult.value);
      setIsDeleteBlocked(dependenciesResult.value.length > 0);
    });
  };

  const handleDelete = () => {
    if (!selectedForDelete || isDeleteBlocked) {
      return;
    }

    startDeleteTransition(async () => {
      const result = await deleteDataListAction(String(selectedForDelete.id));

      if (Result.isError(result)) {
        toast.error(result.message || 'Failed to delete data list');
        return;
      }

      toast.success('Data list deleted successfully');
      setIsDeleteDialogOpen(false);
      setSelectedForDelete(null);
      router.refresh();
    });
  };

  const handleCreateDialogClose = (open: boolean): void => {
    setIsCreateDialogOpen(open);
    if (!open) {
      replaceListHref();
    }
  };

  const handleSortingChange = (updater: Updater<SortingState>) => {
    const next =
      typeof updater === 'function' ? updater(sorting) : updater;
    const first = next[0];
    if (!first) {
      updateUrl({ sortBy: null, sortDir: null, page: '1' });
      return;
    }

    updateUrl({
      sortBy: first.id,
      sortDir: first.desc ? 'desc' : 'asc',
      page: '1',
    });
  };

  const columns = useMemo(
    () =>
      buildDataListColumns({
        listQuery,
        searchInput,
        updateUrl,
        selectedLocales,
        localeOptions,
        createdDateFilter,
        modifiedDateFilter,
        onDelete: handleOpenDelete,
      }),
    [
      listQuery,
      searchInput,
      updateUrl,
      selectedLocales,
      localeOptions,
      createdDateFilter,
      modifiedDateFilter,
    ],
  );

  const table = useReactTable({
    data: [...paged.items],
    columns,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row) => String(row.id),
    manualSorting: true,
    state: { sorting },
    onSortingChange: handleSortingChange,
  });

  const footerProps = createPagedTableFooterProps(paged, 'data lists', updateUrl);
  const hasFilters = Boolean(
    searchInput.trim() ||
      urlState.hasLocale ||
      urlState.createdFrom ||
      urlState.createdTo ||
      urlState.modifiedFrom ||
      urlState.modifiedTo,
  );

  return (
    <>
      <DataTableSurface data-slot="data-lists-table" className="mt-4">
        {paged.items.length === 0 ? (
          <DataTableEmpty>
            {hasFilters
              ? 'No data lists match the current filters.'
              : 'No data lists yet.'}
          </DataTableEmpty>
        ) : (
          <div className="w-full overflow-x-auto">
            <Table className="border-separate border-spacing-0">
              <TableHeader className="bg-surface-container-low">
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow
                    key={headerGroup.id}
                    className="border-0 hover:bg-transparent"
                  >
                    {headerGroup.headers.map((header) => (
                      <TableHead
                        key={header.id}
                        colSpan={header.colSpan}
                        className={dataTableHeaderCellClassName({
                          className:
                            header.column.columnDef.meta?.headerClassName,
                        })}
                      >
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                              header.column.columnDef.header,
                              header.getContext(),
                            )}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {table.getRowModel().rows.map((row, rowIndex) => {
                  const isEvenRow = rowIndex % 2 === 1;
                  return (
                    <TableRow
                      key={row.id}
                      className={dataTableBodyRowClassName({ isEvenRow })}
                    >
                      {row.getVisibleCells().map((cell) => (
                        <TableCell
                          key={cell.id}
                          className={dataTableBodyCellClassName({
                            isEvenRow,
                            className:
                              cell.column.columnDef.meta?.cellClassName,
                          })}
                        >
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext(),
                          )}
                        </TableCell>
                      ))}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
        <PagedTableFooter {...footerProps} variant="surface" />
      </DataTableSurface>

      <CreateDataListDialog
        open={isCreateDialogOpen}
        onOpenChange={handleCreateDialogClose}
        onCreated={() => {
          router.refresh();
        }}
      />

      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {isDeleteBlocked
                ? 'Cannot delete data list'
                : 'Delete data list?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {selectedForDelete ? (
                <>
                  <span className="font-medium">{selectedForDelete.name}</span>
                  {isDeleteBlocked
                    ? ' is currently used by forms and cannot be deleted.'
                    : ' will be permanently removed.'}
                </>
              ) : null}
            </AlertDialogDescription>
          </AlertDialogHeader>

          {isLoadingDependencies && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Spinner className="h-4 w-4" />
              Loading dependencies...
            </div>
          )}

          {dependencies.length > 0 && (
            <div className="rounded-lg border p-3">
              <p className="mb-2 text-sm font-medium">Dependent forms</p>
              <ul className="space-y-1 text-sm text-muted-foreground">
                {dependencies.map((dependency) => (
                  <li key={dependency.id}>
                    {dependency.name || `Form ${dependency.id}`}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <AlertDialogFooter>
            <AlertDialogCancel>Close</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleteBlocked || isDeletePending}
            >
              {isDeletePending ? (
                <>
                  <Spinner className="mr-1 h-4 w-4" />
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

type BuildColumnsArgs = {
  listQuery: string;
  searchInput: string;
  updateUrl: UrlSearchParamsUpdater;
  selectedLocales: Set<string>;
  localeOptions: FacetedFilterOption[];
  createdDateFilter: DateFilterValue;
  modifiedDateFilter: DateFilterValue;
  onDelete: (dataList: DataList) => void;
};

function buildDataListColumns({
  listQuery,
  searchInput,
  updateUrl,
  selectedLocales,
  localeOptions,
  createdDateFilter,
  modifiedDateFilter,
  onDelete,
}: BuildColumnsArgs): ColumnDef<DataList>[] {
  const sortableId = (id: DataListListSortBy) => id;

  return [
    {
      id: sortableId('name'),
      accessorKey: 'name',
      enableSorting: true,
      meta: {
        headerClassName: 'min-w-[12rem]',
        cellClassName: 'min-w-[12rem]',
      },
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title="Friendly Name"
          isSorted={column.getIsSorted()}
          textFilter={{
            value: searchInput,
            placeholder: 'Search by name',
            onChange: (value) => {
              updateUrl({
                search: value || null,
                page: '1',
              });
            },
          }}
        />
      ),
      cell: ({ row }) => {
        const dataList = row.original;
        const detailHref = buildDataListDetailHref(String(dataList.id), {
          listQuery,
        });
        return (
          <Link href={detailHref as Route} className="block min-w-0">
            <p className="truncate text-sm font-medium">{dataList.name}</p>
            <p className="truncate text-xs text-muted-foreground">
              {dataList.description || 'No description'}
            </p>
            <p className="mt-1 text-xs text-muted-foreground md:hidden">
              <CellDate date={dataList.modifiedAt ?? dataList.createdAt} />
            </p>
          </Link>
        );
      },
    },
    {
      id: sortableId('isActive'),
      accessorKey: 'isActive',
      enableSorting: true,
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title="Status"
          isSorted={column.getIsSorted()}
        />
      ),
      cell: ({ row }) => <StatusPill isActive={row.original.isActive} />,
    },
    {
      id: 'locales',
      enableSorting: false,
      meta: {
        headerClassName: 'min-w-[10rem]',
        cellClassName: 'min-w-[10rem]',
      },
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title="Locales"
          facetFilterActive={selectedLocales.size > 0}
          facetFilter={
            <FacetedFilter
              title="Locale"
              options={localeOptions}
              selectedValues={selectedLocales}
              onValueChange={(values) => {
                updateUrl({
                  hasLocale: serializeHasLocaleFilter(values) ?? null,
                  page: '1',
                });
              }}
            />
          }
        />
      ),
      cell: ({ row }) => (
        <DataListLocalesCell
          defaultLocale={row.original.defaultLocale}
          availableLocales={row.original.availableLocales}
        />
      ),
    },
    {
      id: sortableId('createdAt'),
      accessorKey: 'createdAt',
      enableSorting: true,
      meta: {
        headerClassName: 'hidden md:table-cell',
        cellClassName: 'hidden md:table-cell',
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
                page: '1',
              });
            },
          }}
        />
      ),
      cell: ({ row }) => <CellDate date={row.original.createdAt} />,
    },
    {
      id: sortableId('modifiedAt'),
      accessorKey: 'modifiedAt',
      enableSorting: true,
      meta: {
        headerClassName: 'hidden md:table-cell',
        cellClassName: 'hidden md:table-cell',
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
                page: '1',
              });
            },
          }}
        />
      ),
      cell: ({ row }) => <CellDate date={row.original.modifiedAt} />,
    },
    {
      id: sortableId('itemsCount'),
      accessorKey: 'itemsCount',
      enableSorting: true,
      meta: {
        headerClassName: 'hidden text-right md:table-cell',
        cellClassName: 'hidden text-right md:table-cell',
      },
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title="Items"
          isSorted={column.getIsSorted()}
        />
      ),
      cell: ({ row }) => {
        const detailHref = buildDataListDetailHref(String(row.original.id), {
          listQuery,
        });
        return (
          <Link href={detailHref as Route}>{formatInteger(row.original.itemsCount)}</Link>
        );
      },
    },
    {
      id: 'actions',
      enableSorting: false,
      meta: {
        headerClassName: 'text-right',
        cellClassName: 'text-right',
      },
      header: () => (
        <span className={dataTableColumnLabelClassName()}>Actions</span>
      ),
      cell: ({ row }) => (
        <DataListRowActions
          dataList={row.original}
          listQuery={listQuery}
          onDelete={onDelete}
        />
      ),
    },
  ];
}

function StatusPill({ isActive }: Readonly<{ isActive: boolean }>) {
  if (isActive) {
    return (
      <span className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
        <span className="mr-2 inline-block h-1.5 w-1.5 rounded-full bg-primary"></span>
        Active
      </span>
    );
  }

  return (
    <span className="inline-flex items-center rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
      Inactive
    </span>
  );
}
