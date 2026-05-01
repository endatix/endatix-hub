import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { authorization } from "@/features/auth/authorization";
import {
  getDataListByIdAction,
  DataListDetailsPage,
} from "@/features/data-lists/view-list-details";
import { isNotFoundError } from "@/lib/endatix-api";

interface DataListDetailsRoutePageProps {
  params: Promise<{ dataListId: string }>;
  searchParams?: Promise<{ replace?: string }>;
}

export default async function DataListDetailsRoutePage({
  params,
  searchParams,
}: Readonly<DataListDetailsRoutePageProps>) {
  const session = await auth();
  const { requireHubAccess } = await authorization(session);
  await requireHubAccess();

  const { dataListId } = await params;
  const dataListResult = await getDataListByIdAction(dataListId);

  if (!dataListResult.success) {
    if (isNotFoundError(dataListResult)) {
      notFound();
    }

    throw new Error(dataListResult.error.message);
  }

  const resolvedSearchParams = (await searchParams) || {};
  const openReplaceOnLoad = resolvedSearchParams.replace === "1";

  return (
    <DataListDetailsPage
      initialDetails={dataListResult.data}
      openReplaceOnLoad={openReplaceOnLoad}
    />
  );
}
