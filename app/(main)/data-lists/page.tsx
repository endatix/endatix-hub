import { auth } from "@/auth";
import { authorization } from "@/features/auth/authorization";
import {
  DataListsPage,
  DataListsPageHeader,
} from "@/features/data-lists/view-lists/ui/data-lists-page";
import { DataListsListToolbar } from "@/features/data-lists/view-lists/ui/data-lists-list-toolbar";
import { DataListsTableSkeleton } from "@/features/data-lists/view-lists/ui/data-lists-table-skeleton";
import {
  getDataListLocales,
  getDataListsPage,
} from "@/features/data-lists/view-lists/get-data-lists.server";
import {
  firstString,
  parseDataListsListParams,
} from "@/features/data-lists/view-lists/utils";
import { hasValue, SearchParam } from "@/lib/utils/next-utils";
import { Suspense } from "react";

interface DataListsRoutePageProps {
  searchParams: Promise<{
    action: SearchParam;
    page: SearchParam;
    pageSize: SearchParam;
    search: SearchParam;
    hasLocale: SearchParam;
    sortBy: SearchParam;
    sortDir: SearchParam;
    createdFrom: SearchParam;
    createdTo: SearchParam;
    modifiedFrom: SearchParam;
    modifiedTo: SearchParam;
  }>;
}

export default async function DataListsRoutePage({
  searchParams,
}: Readonly<DataListsRoutePageProps>) {
  const session = await auth();
  const { requireHubAccess } = await authorization(session);
  await requireHubAccess();

  const raw = await searchParams;
  const listRequest = parseDataListsListParams({
    page: firstString(raw.page),
    pageSize: firstString(raw.pageSize),
    search: firstString(raw.search),
    hasLocale: firstString(raw.hasLocale),
    sortBy: firstString(raw.sortBy),
    sortDir: firstString(raw.sortDir),
    createdFrom: firstString(raw.createdFrom),
    createdTo: firstString(raw.createdTo),
    modifiedFrom: firstString(raw.modifiedFrom),
    modifiedTo: firstString(raw.modifiedTo),
  });
  const dataListsPromise = getDataListsPage(listRequest);
  const localesPromise = getDataListLocales();
  const openCreateOnLoad = hasValue(raw.action, "create");

  return (
    <>
      <DataListsPageHeader />
      <Suspense fallback={<DataListsListToolbar />}>
        <DataListsToolbar localesPromise={localesPromise} />
      </Suspense>
      <Suspense fallback={<DataListsTableSkeleton />}>
        <DataListsPage
          dataListsPromise={dataListsPromise}
          openCreateOnLoad={openCreateOnLoad}
        />
      </Suspense>
    </>
  );
}

interface DataListsToolbarProps {
  localesPromise: Promise<string[]>;
}

async function DataListsToolbar({
  localesPromise,
}: Readonly<DataListsToolbarProps>) {
  const locales = await localesPromise;
  return <DataListsListToolbar locales={locales} />;
}
