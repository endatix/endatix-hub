import { auth } from "@/auth";
import { authorization } from "@/features/auth/authorization";
import { dataListsFlag } from "@/lib/feature-flags";
import { redirect } from "next/navigation";
import { getDataListByIdAction } from "@/features/data-lists/list/get-data-list-by-id.action";
import { Result } from "@/lib/result";
import { DataListDetailsPage } from "@/features/data-lists/list/data-list-details-page";

interface DataListDetailsRoutePageProps {
  params: Promise<{ dataListId: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

export default async function DataListDetailsRoutePage({
  params,
  searchParams,
}: DataListDetailsRoutePageProps) {
  const session = await auth();
  const { requireHubAccess } = await authorization(session);
  await requireHubAccess();

  const enabled = await dataListsFlag();
  if (!enabled) {
    redirect("/forms");
  }

  const { dataListId } = await params;
  const dataListResult = await getDataListByIdAction(dataListId);

  if (Result.isError(dataListResult)) {
    return (
      <div className="rounded-lg border bg-card p-6 text-sm text-destructive">
        {dataListResult.message}
      </div>
    );
  }

  const resolvedSearchParams = (await searchParams) || {};
  const openReplaceOnLoad = resolvedSearchParams.replace === "1";

  return (
    <DataListDetailsPage
      initialDetails={dataListResult.value}
      openReplaceOnLoad={openReplaceOnLoad}
    />
  );
}
