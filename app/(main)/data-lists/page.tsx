import { auth } from "@/auth";
import { authorization } from "@/features/auth/authorization";
import { DataListsPage } from "@/features/data-lists/view-lists/ui/data-lists-page";
import { getDataListsAction } from "@/features/data-lists/view-lists/get-data-lists.action";
import { isNotFoundError } from "@/lib/endatix-api";
import { notFound } from "next/navigation";

interface DataListsRoutePageProps {
  searchParams?: Promise<{ action?: string }>;
}

export default async function DataListsRoutePage({
  searchParams,
}: Readonly<DataListsRoutePageProps>) {
  const session = await auth();
  const { requireHubAccess } = await authorization(session);
  await requireHubAccess();

  const dataListsResult = await getDataListsAction();
  if (!dataListsResult.success) {
    if (isNotFoundError(dataListsResult)) {
      notFound();
    }

    throw new Error(dataListsResult.error.message);
  }

  const resolvedSearchParams = (await searchParams) || {};
  const openCreateOnLoad = resolvedSearchParams.action === "create";

  return (
    <DataListsPage
      initialDataLists={dataListsResult.data}
      openCreateOnLoad={openCreateOnLoad}
    />
  );
}
