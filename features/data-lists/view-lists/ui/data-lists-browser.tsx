"use client";

import { type ReactNode } from "react";
import { PagedListFrame, useListUrlState } from "@/components/table";
import type { DataListsPage as DataListsPageData } from "@/lib/endatix-api/data-lists/data-lists";
import { DataListsListToolbar } from "./data-lists-list-toolbar";
import { DataListsPage } from "./data-lists-page";
import { DataListsTableSkeleton } from "./data-lists-table-skeleton";

type DataListsBrowserProps = {
  dataListsPromise: Promise<DataListsPageData>;
  /** Changes with page, filters, and sort so the grid re-reads the paged promise. */
  listKey: string;
  openCreateOnLoad?: boolean;
  localeFilter?: ReactNode;
};

/**
 * One URL writer for the toolbar and the grid. The keyed Suspense is inside
 * this client shell so a page change replaces the resolved list, matching
 * tenants and the data-list items section.
 */
export function DataListsBrowser({
  dataListsPromise,
  listKey,
  openCreateOnLoad = false,
  localeFilter,
}: Readonly<DataListsBrowserProps>) {
  const { search, setSearch, updateUrl, searchParams, isPending } =
    useListUrlState();

  return (
    <>
      <DataListsListToolbar
        localeFilter={localeFilter}
        search={search}
        setSearch={setSearch}
        updateUrl={updateUrl}
        searchParams={searchParams}
      />
      <PagedListFrame listKey={listKey} fallback={<DataListsTableSkeleton />}>
        <DataListsPage
          dataListsPromise={dataListsPromise}
          openCreateOnLoad={openCreateOnLoad}
          updateUrl={updateUrl}
          searchParams={searchParams}
          isPending={isPending}
        />
      </PagedListFrame>
    </>
  );
}
