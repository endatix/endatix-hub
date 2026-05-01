"use client";

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
import { toast } from "@/components/ui/toast";
import type {
  DataList,
  FormDependencySummary,
} from "@/lib/endatix-api/data-lists/types";
import { Result } from "@/lib/result";
import { getFormattedDate } from "@/lib/utils";
import { useEffect, useState, useTransition } from "react";
import { CreateDataListDialog } from "../../create-list/ui/create-data-list-dialog";
import { DataListRowActions } from "./data-list-row-actions";
import { getDataListFormDependenciesAction } from "../get-data-list-form-dependencies.action";
import { getDataListsAction } from "../get-data-lists.action";
import { deleteDataListAction } from "../../delete-list/delete-data-list.action";
import Link from "next/link";

interface DataListsPageProps {
  initialDataLists: DataList[];
  openCreateOnLoad?: boolean;
}

export function DataListsPage({
  initialDataLists,
  openCreateOnLoad = false,
}: DataListsPageProps) {
  const [dataLists, setDataLists] = useState<DataList[]>(initialDataLists);
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
    if (openCreateOnLoad) {
      setIsCreateDialogOpen(true);
    }
  }, [openCreateOnLoad]);

  const refreshDataLists = async () => {
    const result = await getDataListsAction();
    if (Result.isError(result)) {
      toast.error(result.message || "Failed to refresh data lists");
      return;
    }

    setDataLists(result.value);
  };

  const handleOpenDelete = (dataList: DataList) => {
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
      await refreshDataLists();
    });
  };

  const handleCreateDialogClose = (open: boolean) => {
    setIsCreateDialogOpen(open);
  };

  return (
    <>
      <section className="space-y-1">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Data Lists</h1>
          <p className="text-sm text-muted-foreground">
            Manage reusable JSON datasets for form choices.
          </p>
        </div>
      </section>

      <div className="mt-6 flex flex-col gap-2">
        <div className="grid grid-cols-[minmax(0,1fr)_auto_64px] items-center px-4 py-1 text-xs text-muted-foreground md:grid-cols-[2fr_2fr_1.2fr_1.2fr_0.8fr_64px]">
          <span>Friendly Name</span>
          <span>Status</span>
          <span className="hidden md:block">Created</span>
          <span className="hidden md:block">Modified</span>
          <span className="hidden text-center md:block">Items Count</span>
          <span className="text-right">Actions</span>
        </div>

        {dataLists.length === 0 ? (
          <div className="rounded-xl border border-dashed bg-card p-10 text-center">
            <p className="text-sm text-muted-foreground">No data lists yet.</p>
          </div>
        ) : (
          dataLists.map((dataList) => (
            <div
              key={dataList.id}
              className="grid grid-cols-[minmax(0,1fr)_auto_64px] items-center gap-4 rounded-xl border bg-card px-4 py-4 transition-colors hover:bg-muted/20 md:grid-cols-[2fr_2fr_1.2fr_1.2fr_0.8fr_64px]"
            >
              <div className="min-w-0">
                <p className="truncate text-base font-semibold">
                  {dataList.name}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {dataList.description || "No description"}
                </p>
              </div>

              <div>
                <StatusPill isActive={dataList.isActive} />
              </div>

              <div className="hidden text-sm text-muted-foreground md:block">
                {getFormattedDate(dataList.createdAt)}
              </div>
              <div className="hidden text-sm text-muted-foreground md:block">
                {getFormattedDate(dataList.modifiedAt)}
              </div>

              <div className="hidden justify-center text-sm text-muted-foreground md:flex">
                <Link
                  href={`/data-lists/${dataList.id}`}
                  className="flex items-center gap-1"
                >
                  {dataList.itemsCount}
                </Link>
              </div>

              <div className="flex justify-end">
                <DataListRowActions
                  dataList={dataList}
                  onDelete={handleOpenDelete}
                />
              </div>
            </div>
          ))
        )}
      </div>

      <CreateDataListDialog
        open={isCreateDialogOpen}
        onOpenChange={handleCreateDialogClose}
        onCreated={() => {
          void refreshDataLists();
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

function StatusPill({ isActive }: { isActive: boolean }) {
  if (isActive) {
    return (
      <span className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
        <span className="mr-2 inline-block h-1.5 w-1.5 rounded-full bg-primary" />
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
