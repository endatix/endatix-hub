import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { authorization } from "@/features/auth/authorization";
import {
  getDataListByIdAction,
  DataListDetailsPage,
} from "@/features/data-lists/view-list-details";
import { getDataListItemsPage } from "@/features/data-lists/view-list-details/get-data-list-items.server";
import {
  parseDataListItemsParams,
  resolveItemsIncludeLocales,
} from "@/features/data-lists/view-list-details/utils";
import { firstString } from "@/features/data-lists/view-lists/utils";
import { HubPageLoadError } from "@/components/error-handling/error-page";
import { isNotFoundError } from "@/lib/endatix-api";
import { Result, toResult } from "@/lib/result";
import { hasValue, SearchParam } from "@/lib/utils/next-utils";

interface DataListDetailsRoutePageProps {
  params: Promise<{ dataListId: string }>;
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

export default async function DataListDetailsRoutePage({
  params,
  searchParams,
}: Readonly<DataListDetailsRoutePageProps>) {
  const session = await auth();
  const { requireHubAccess } = await authorization(session);
  await requireHubAccess();

  const { dataListId } = await params;
  const raw = await searchParams;
  const dataListApiResult = await getDataListByIdAction(dataListId);

  if (isNotFoundError(dataListApiResult)) {
    notFound();
  }

  const dataListResult = toResult(dataListApiResult, {
    fallbackMessage: "Failed to load data list.",
    logMessage: "Failed to load data list details.",
    loggerName: "data-lists.details",
  });

  if (Result.isError(dataListResult)) {
    return <HubPageLoadError result={dataListResult} />;
  }

  const dataList = dataListResult.value;

  const itemsRequest = parseDataListItemsParams({
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
  const availableLocales = dataList.availableLocales ?? [];
  const includeLocales = resolveItemsIncludeLocales({
    hasLocale: itemsRequest.hasLocale,
    availableLocales,
  });
  const searchLocale = includeLocales[0] ?? dataList.defaultLocale;
  const itemsPromise = getDataListItemsPage(dataListId, {
    page: itemsRequest.page,
    pageSize: itemsRequest.pageSize,
    query: itemsRequest.query,
    includeLocales,
    locale: searchLocale,
    sortBy: itemsRequest.sortBy,
    sortDir: itemsRequest.sortDir,
    createdFrom: itemsRequest.createdFrom,
    createdTo: itemsRequest.createdTo,
    modifiedFrom: itemsRequest.modifiedFrom,
    modifiedTo: itemsRequest.modifiedTo,
  });
  const openReplaceOnLoad = hasValue(raw.action, "replace");
  const openEditOnLoad = hasValue(raw.action, "edit");

  return (
    <DataListDetailsPage
      initialDetails={dataList}
      itemsPromise={itemsPromise}
      openReplaceOnLoad={openReplaceOnLoad}
      openEditOnLoad={openEditOnLoad}
    />
  );
}
