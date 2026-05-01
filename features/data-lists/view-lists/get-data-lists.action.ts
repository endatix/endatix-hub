"use server";

import { auth } from "@/auth";
import { authorization } from "@/features/auth/authorization";
import { ApiResult, EndatixApi } from "@/lib/endatix-api";
import { DataList } from "@/lib/endatix-api/data-lists/types";

/**
 * Gets all data lists via server-side aggregation.
 * TODO: We will add lazy laoding and paging support in a future PR.
 * @returns The data lists.
 */
export async function getDataListsAction(): Promise<
  ApiResult<DataList[]> | never
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
      return result;
    }

    allItems.push(...result.data.items);
    totalPages = Math.max(result.data.totalPages, 1);
    currentPage += 1;
  }

  return ApiResult.success(allItems);
}
