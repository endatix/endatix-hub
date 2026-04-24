"use server";

import { auth } from "@/auth";
import { authorization } from "@/features/auth/authorization";
import { EndatixApi } from "@/lib/endatix-api";
import { DataListSummary } from "@/lib/endatix-api/data-lists/types";
import { Result } from "@/lib/result";

export type GetDataListsResult = Result<DataListSummary[]>;

export async function getDataListsAction(): Promise<
  GetDataListsResult | never
> {
  const session = await auth();
  const { requireHubAccess } = await authorization(session);
  await requireHubAccess();

  const api = new EndatixApi(session?.accessToken);
  const result = await api.dataLists.list({ page: 1, pageSize: 200 });

  if (!result.success) {
    console.error("Failed to fetch data lists", result.error);
    return Result.error("Failed to fetch data lists");
  }

  return Result.success(result.data);
}
