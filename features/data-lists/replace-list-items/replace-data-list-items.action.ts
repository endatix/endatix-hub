"use server";

import { auth } from "@/auth";
import { authorization } from "@/features/auth/authorization";
import { TelemetryLogger } from "@/features/telemetry";
import { EndatixApi } from "@/lib/endatix-api";
import type {
  DataListChoiceItem,
  DataListDetails,
} from "@/lib/endatix-api/data-lists/types";
import { Result } from "@/lib/result";

const LOGGER_NAME = "data-lists";
export type ReplaceDataListItemsResult = Result<DataListDetails>;

export async function replaceDataListItemsAction(
  dataListId: string,
  items: DataListChoiceItem[],
): Promise<ReplaceDataListItemsResult | never> {
  const session = await auth();
  const { requireHubAccess } = await authorization(session);
  await requireHubAccess();

  const api = new EndatixApi(session?.accessToken);
  const result = await api.dataLists.replaceItems(dataListId, items);

  if (!result.success) {
    const errorMessage =
      result.error.message || "Failed to replace data list items";
    TelemetryLogger.error(errorMessage, result.error, {}, LOGGER_NAME);
    return Result.error(errorMessage);
  }

  return Result.success(result.data);
}
