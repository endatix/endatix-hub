"use server";

import { auth } from "@/auth";
import { authorization } from "@/features/auth/authorization";
import { TelemetryLogger } from "@/features/telemetry";
import { EndatixApi } from "@/lib/endatix-api";
import { Result } from "@/lib/result";
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
  const result = await api.dataLists.delete(dataListId);

  if (!result.success) {
    TelemetryLogger.error(
      result.error.message || "Error during deleting data list",
      result?.error,
      {},
      LOGGER_NAME,
    );
    return Result.error(result.error.message || "Failed to delete data list");
  }

  revalidatePath("/(main)/data-lists");
  return Result.success(result.data);
}
