"use server";

import { auth } from "@/auth";
import { authorization } from "@/features/auth/authorization";
import { EndatixApi } from "@/lib/endatix-api";
import { Result } from "@/lib/result";
import { toResult } from "@/lib/result/map-api-result-to-result";
import { revalidatePath } from "next/cache";

const LOGGER_NAME = "data-lists";

export type DeleteDataListResult = Result<string>;

export async function deleteDataListAction(
  dataListId: string,
): Promise<DeleteDataListResult> {
  const session = await auth();
  const { requireHubAccess } = await authorization(session);
  await requireHubAccess();

  const api = new EndatixApi(session?.accessToken);
  const result = toResult(await api.dataLists.delete(dataListId), {
    fallbackMessage: "Failed to delete data list",
    logMessage: "Failed to delete data list",
    loggerName: LOGGER_NAME,
  });
  
  if (Result.isSuccess(result)) {
    revalidatePath("/(main)/data-lists");
  }

  return result;
}
