"use server";

import { auth } from "@/auth";
import { authorization } from "@/features/auth/authorization";
import { EndatixApi } from "@/lib/endatix-api";
import { DataList } from "@/lib/endatix-api/data-lists/types";
import { Result } from "@/lib/result";

export type GetDataListsResult = Result<DataList[]>;

/**
 * Gets all data lists via server-side aggregation.
 * TODO: We will add lazy laoding and paging support in a future PR.
 * @returns The data lists.
 */
export async function getDataListsAction(): Promise<
  GetDataListsResult | never
> {
  const session = await auth();
  const { requireHubAccess } = await authorization(session);
  await requireHubAccess();

  const api = new EndatixApi(session?.accessToken);
  const pageSize = 100;
  const allItems: DataList[] = [];
  let currentPage = 1;
  let totalPages = 1;

  while (currentPage <= totalPages) {
    const result = await api.dataLists.list({
      page: currentPage,
      pageSize,
    });

    if (!result.success) {
      console.error("Failed to fetch data lists", result.error);
      return Result.error("Failed to fetch data lists");
    }

    allItems.push(...result.data.items);
    totalPages = Math.max(result.data.totalPages, 1);
    currentPage += 1;
  }

  return Result.success(allItems);
}
