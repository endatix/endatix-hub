import { auth } from "@/auth";
import { authorization } from "@/features/auth/authorization";
import { DataListsPage } from "@/features/data-lists/view-lists/ui/data-lists-page";
import { getDataListsPage } from "@/features/data-lists/view-lists/get-data-lists.server";
import { parseDataListsListParams } from "@/features/data-lists/view-lists/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { hasValue, SearchParam } from "@/lib/utils/next-utils";
import { Suspense } from "react";

interface DataListsRoutePageProps {
  searchParams: Promise<{
    action?: SearchParam;
    page?: SearchParam;
    pageSize?: SearchParam;
    search?: SearchParam;
    hasLocale?: SearchParam;
  }>;
}

function firstString(value: SearchParam): string | undefined {
  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
}

function DataListsTableSkeleton() {
  return (
    <div className="mt-6 space-y-3">
      <Skeleton className="h-10 w-full" />
      {[1, 2, 3, 4, 5].map((row) => (
        <Skeleton key={row} className="h-14 w-full" />
      ))}
    </div>
  );
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
  });
  const dataListsPromise = getDataListsPage(listRequest);
  const openCreateOnLoad = hasValue(raw.action, "create");

  return (
    <Suspense fallback={<DataListsTableSkeleton />}>
      <DataListsPage
        dataListsPromise={dataListsPromise}
        openCreateOnLoad={openCreateOnLoad}
      />
    </Suspense>
  );
}
