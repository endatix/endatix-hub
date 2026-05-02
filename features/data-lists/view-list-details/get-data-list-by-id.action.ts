"use server";

import { auth } from "@/auth";
import { authorization } from "@/features/auth/authorization";
import { ApiResult, EndatixApi } from "@/lib/endatix-api";
import type { DataListDetails } from "@/lib/endatix-api/data-lists/types";

export type GetDataListByIdResult = ApiResult<DataListDetails>;

export async function getDataListByIdAction(
  dataListId: string,
): Promise<GetDataListByIdResult | never> {
  const session = await auth();
  const { requireHubAccess } = await authorization(session);
  await requireHubAccess();

  const api = new EndatixApi(session?.accessToken);
  const result = await api.dataLists.getById(dataListId);

  if (ApiResult.isError(result)) {
    return result;
  }

  return ApiResult.success(result.data);
}
