import { auth } from "@/auth";
import { authorization } from "@/features/auth/authorization";
import { DataListsPageHeader } from "@/features/data-lists/view-lists/ui/data-lists-page";
import { DataListsBrowser } from "@/features/data-lists/view-lists/ui/data-lists-browser";
import { DataListsLocaleFilter } from "@/features/data-lists/view-lists/ui/data-lists-locale-filter";
import { getDataListsPage } from "@/features/data-lists/view-lists/get-data-lists.server";
import {
  dataListsListSuspenseKey,
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
  const openCreateOnLoad = hasValue(raw.action, "create");

  return (
    <>
      <DataListsPageHeader />
      <DataListsBrowser
        dataListsPromise={dataListsPromise}
        listKey={dataListsListSuspenseKey(listRequest)}
        openCreateOnLoad={openCreateOnLoad}
        localeFilter={
          <Suspense fallback={null}>
            <DataListsLocaleFilter />
          </Suspense>
        }
      />
    </>
  );
}
