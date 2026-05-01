import { auth } from "@/auth";
import { authorization } from "@/features/auth/authorization";
import { DataListsPage } from "@/features/data-lists/view-lists/ui/data-lists-page";
import { getDataListsAction } from "@/features/data-lists/view-lists/get-data-lists.action";
import { Result } from "@/lib/result";

interface DataListsRoutePageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

export default async function DataListsRoutePage({
  searchParams,
}: DataListsRoutePageProps) {
  const session = await auth();
  const { requireHubAccess } = await authorization(session);
  await requireHubAccess();

  const dataListsResult = await getDataListsAction();
  if (Result.isError(dataListsResult)) {
    return (
      <div className="rounded-lg border bg-card p-6 text-sm text-destructive">
        {dataListsResult.message}
      </div>
    );
  }

  const resolvedSearchParams = (await searchParams) || {};
  const openCreateOnLoad = resolvedSearchParams.create === "1";

  return (
    <DataListsPage
      initialDataLists={dataListsResult.value}
      openCreateOnLoad={openCreateOnLoad}
    />
  );
}
