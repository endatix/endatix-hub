"use client";

import { use, useEffect, useState, useTransition } from "react";
import type { Route } from "next";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CellDate,
  createPagedTableFooterProps,
  dataTableBodyCellClassName,
  dataTableBodyRowClassName,
  dataTableColumnLabelClassName,
  dataTableHeaderCellClassName,
  DataTableEmpty,
  DataTableSurface,
  PagedTableFooter,
} from "@/components/table";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/loaders/spinner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "@/components/ui/toast";
import { formatLocaleLabel } from "@/features/data-lists/translations/locale-discovery";
import type {
  DataList,
  FormDependencySummary,
} from "@/lib/endatix-api/data-lists/types";
import type { DataListsPage } from "@/lib/endatix-api/data-lists/data-lists";
import { rememberTableReturnTo } from "@/lib/list-page/table-return-to";
import { useListUrlState } from "@/lib/list-page/use-list-url-state";
import { Result } from "@/lib/result";
import { formatInteger } from "@/lib/utils/formatters";
import { CreateDataListDialog } from "../../create-list/ui/create-data-list-dialog";
import { DataListRowActions } from "./data-list-row-actions";
import { getDataListFormDependenciesAction } from "../get-data-list-form-dependencies.action";
import { deleteDataListAction } from "../../delete-list/delete-data-list.action";
import {
  buildDataListDetailHref,
  buildDataListsListHref,
  DATA_LISTS_TABLE_KEY,
  parseDataListsListParams,
  parseDataListsReturnQuery,
} from "../utils";

interface DataListsPageProps {
  dataListsPromise: Promise<DataListsPage>;
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
  openCreateOnLoad = false,
}: Readonly<DataListsPageProps>) {
  const paged = use(dataListsPromise);
  const router = useRouter();
  const { updateUrl, searchParams } = useListUrlState();
  const hasLocaleInput = searchParams.get("hasLocale") ?? "";
  const searchInput = searchParams.get("search") ?? "";

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

  const buildReturnHref = (): string => {
    const parsed = parseDataListsListParams({
      search: searchParams.get("search") ?? undefined,
      hasLocale: searchParams.get("hasLocale") ?? undefined,
    });

    return buildDataListsListHref({
      page: paged.page,
      pageSize: paged.pageSize,
      search: parsed.search,
      hasLocale: parsed.hasLocale,
    });
  };

  const handleOpenDelete = (dataList: DataList) => {
    setIsCreateDialogOpen(false);
    router.replace(buildReturnHref() as Route);

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
          dependenciesResult.message || "Failed to load dependencies",
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
        toast.error(result.message || "Failed to delete data list");
        return;
      }

      toast.success("Data list deleted successfully");
      setIsDeleteDialogOpen(false);
      setSelectedForDelete(null);
      router.refresh();
    });
  };

  const handleCreateDialogClose = (open: boolean): void => {
    setIsCreateDialogOpen(open);
    if (!open) {
      router.replace(buildReturnHref() as Route);
    }
  };

  const footerProps = createPagedTableFooterProps(paged, "data lists", updateUrl);

  return (
    <>
      <DataTableSurface data-slot="data-lists-table" className="mt-4">
        {paged.items.length === 0 ? (
          <DataTableEmpty>
            {searchInput || hasLocaleInput
              ? "No data lists match the current filters."
              : "No data lists yet."}
          </DataTableEmpty>
        ) : (
          <div className="w-full overflow-x-auto">
            <Table className="border-separate border-spacing-0">
              <TableHeader className="bg-surface-container-low">
                <TableRow className="border-0 hover:bg-transparent">
                  <TableHead
                    className={dataTableHeaderCellClassName({
                      className: "min-w-[12rem]",
                    })}
                  >
                    <span className={dataTableColumnLabelClassName()}>
                      Friendly Name
                    </span>
                  </TableHead>
                  <TableHead className={dataTableHeaderCellClassName({})}>
                    <span className={dataTableColumnLabelClassName()}>
                      Status
                    </span>
                  </TableHead>
                  <TableHead
                    className={dataTableHeaderCellClassName({
                      className: "min-w-[10rem]",
                    })}
                  >
                    <span className={dataTableColumnLabelClassName()}>
                      Locales
                    </span>
                  </TableHead>
                  <TableHead
                    className={dataTableHeaderCellClassName({
                      className: "hidden md:table-cell",
                    })}
                  >
                    <span className={dataTableColumnLabelClassName()}>
                      Created
                    </span>
                  </TableHead>
                  <TableHead
                    className={dataTableHeaderCellClassName({
                      className: "hidden md:table-cell",
                    })}
                  >
                    <span className={dataTableColumnLabelClassName()}>
                      Modified
                    </span>
                  </TableHead>
                  <TableHead
                    className={dataTableHeaderCellClassName({
                      className: "hidden text-right md:table-cell",
                    })}
                  >
                    <span className={dataTableColumnLabelClassName()}>
                      Items
                    </span>
                  </TableHead>
                  <TableHead
                    className={dataTableHeaderCellClassName({
                      className: "text-right",
                    })}
                  >
                    <span className={dataTableColumnLabelClassName()}>
                      Actions
                    </span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paged.items.map((dataList, rowIndex) => {
                  const isEvenRow = rowIndex % 2 === 1;
                  const detailHref = buildDataListDetailHref(
                    String(dataList.id),
                  );
                  return (
                    <TableRow
                      key={dataList.id}
                      className={dataTableBodyRowClassName({ isEvenRow })}
                    >
                      <TableCell
                        className={dataTableBodyCellClassName({
                          isEvenRow,
                          className: "min-w-[12rem]",
                        })}
                      >
                        <Link href={detailHref as Route} className="block min-w-0">
                          <p className="truncate text-sm font-medium">
                            {dataList.name}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">
                            {dataList.description || "No description"}
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground md:hidden">
                            <CellDate date={dataList.modifiedAt ?? dataList.createdAt} />
                          </p>
                        </Link>
                      </TableCell>
                      <TableCell
                        className={dataTableBodyCellClassName({ isEvenRow })}
                      >
                        <StatusPill isActive={dataList.isActive} />
                      </TableCell>
                      <TableCell
                        className={dataTableBodyCellClassName({ isEvenRow })}
                      >
                        <LocalesCell dataList={dataList} />
                      </TableCell>
                      <TableCell
                        className={dataTableBodyCellClassName({
                          isEvenRow,
                          className: "hidden md:table-cell",
                        })}
                      >
                        <CellDate date={dataList.createdAt} />
                      </TableCell>
                      <TableCell
                        className={dataTableBodyCellClassName({
                          isEvenRow,
                          className: "hidden md:table-cell",
                        })}
                      >
                        <CellDate date={dataList.modifiedAt} />
                      </TableCell>
                      <TableCell
                        className={dataTableBodyCellClassName({
                          isEvenRow,
                          className: "hidden text-right md:table-cell",
                        })}
                      >
                        <Link href={detailHref as Route}>
                          {formatInteger(dataList.itemsCount)}
                        </Link>
                      </TableCell>
                      <TableCell
                        className={dataTableBodyCellClassName({
                          isEvenRow,
                          className: "text-right",
                        })}
                      >
                        <DataListRowActions
                          dataList={dataList}
                          onDelete={handleOpenDelete}
                        />
                      </TableCell>
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
                ? "Cannot delete data list"
                : "Delete data list?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {selectedForDelete ? (
                <>
                  <span className="font-medium">{selectedForDelete.name}</span>
                  {isDeleteBlocked
                    ? " is currently used by forms and cannot be deleted."
                    : " will be permanently removed."}
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
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function LocalesCell({ dataList }: Readonly<{ dataList: DataList }>) {
  const defaultLocale = dataList.defaultLocale;
  const extra = dataList.availableLocales ?? [];

  if (!defaultLocale && extra.length === 0) {
    return <span className="text-muted-foreground">—</span>;
  }

  return (
    <div className="flex flex-wrap gap-1">
      {defaultLocale ? (
        <Badge variant="secondary">{formatLocaleLabel(defaultLocale)}</Badge>
      ) : null}
      {extra.map((locale) => (
        <Badge key={locale} variant="outline">
          {formatLocaleLabel(locale)}
        </Badge>
      ))}
    </div>
  );
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
