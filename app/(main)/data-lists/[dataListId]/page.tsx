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
import { isNotFoundError } from "@/lib/endatix-api";
import { hasValue, SearchParam } from "@/lib/utils/next-utils";

interface DataListDetailsRoutePageProps {
  params: Promise<{ dataListId: string }>;
  searchParams: Promise<{
    action: SearchParam;
    page: SearchParam;
    pageSize: SearchParam;
    search: SearchParam;
    hasLocale: SearchParam;
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
  const dataListResult = await getDataListByIdAction(dataListId);

  if (!dataListResult.success) {
    if (isNotFoundError(dataListResult)) {
      notFound();
    }

    throw new Error(dataListResult.error.message);
  }

  const itemsRequest = parseDataListItemsParams({
    page: firstString(raw.page),
    pageSize: firstString(raw.pageSize),
    search: firstString(raw.search),
    hasLocale: firstString(raw.hasLocale),
  });
  const availableLocales = dataListResult.data.availableLocales ?? [];
  const includeLocales = resolveItemsIncludeLocales({
    hasLocale: itemsRequest.hasLocale,
    availableLocales,
  });
  const searchLocale = includeLocales[0] ?? dataListResult.data.defaultLocale;
  const itemsPromise = getDataListItemsPage(dataListId, {
    page: itemsRequest.page,
    pageSize: itemsRequest.pageSize,
    query: itemsRequest.query,
    includeLocales,
    locale: searchLocale,
  });
  const openReplaceOnLoad = hasValue(raw.action, "replace");

  return (
    <DataListDetailsPage
      initialDetails={dataListResult.data}
      itemsPromise={itemsPromise}
      openReplaceOnLoad={openReplaceOnLoad}
    />
  );
}
