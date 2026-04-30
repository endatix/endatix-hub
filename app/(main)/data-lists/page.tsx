import { auth } from "@/auth";
import { authorization } from "@/features/auth/authorization";
import { dataListsFlag } from "@/lib/feature-flags";
import { redirect } from "next/navigation";
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

  const enabled = await dataListsFlag();
  if (!enabled) {
    redirect("/forms");
  }

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
