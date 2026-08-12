"use server";

import { auth } from "@/auth";
import { authorization } from "@/features/auth/authorization";
import { guardImportPayload } from "@/features/data-lists/import-payload-guards";
import { EndatixApi } from "@/lib/endatix-api";
import type {
  DataListChoiceItem,
  DataListDetails,
} from "@/lib/endatix-api/data-lists/types";
import { normalizeCultureCodes } from "@/lib/localization";
import { Result } from "@/lib/result";
import { toResult } from "@/lib/result/map-api-result-to-result";
import { validateEndatixId } from "@/lib/utils/type-validators";
import { revalidatePath } from "next/cache";

export type ReplaceDataListItemsResult = Result<DataListDetails>;

export async function replaceDataListItemsAction(
  dataListId: string,
  items: DataListChoiceItem[],
  ensureLocales: string[] = [],
): Promise<ReplaceDataListItemsResult> {
  const session = await auth();
  const { requireHubAccess } = await authorization(session);
  await requireHubAccess();

  const idResult = validateEndatixId(dataListId, "dataListId");
  if (Result.isError(idResult)) {
    return idResult;
  }

  const localesResult = normalizeCultureCodes(ensureLocales);
  if (!localesResult.ok) {
    return Result.error(
      `'${localesResult.invalid}' is not a valid culture code.`,
    );
  }

  const api = new EndatixApi(session?.accessToken);
  const detailsResult = toResult(await api.dataLists.getById(idResult.value), {
    fallbackMessage: "Failed to load data list",
    logMessage: "Failed to load data list before replace",
    loggerName: "data-lists.replaceItems",
  });
  if (Result.isError(detailsResult)) {
    return detailsResult;
  }

  const catalogLocaleCount = detailsResult.value.availableLocales?.length ?? 0;
  const payloadGuard = guardImportPayload({
    format: "json",
    items,
    ensureLocales: localesResult.value,
    catalogLocaleCount,
  });
  if (Result.isError(payloadGuard)) {
    return payloadGuard;
  }

  const result = toResult(
    await api.dataLists.replaceItems(idResult.value, items, {
      ensureLocales: localesResult.value,
    }),
    {
      fallbackMessage: "Failed to replace data list items",
      logMessage: "Failed to replace data list items",
      loggerName: "data-lists.replaceItems",
    },
  );

  if (Result.isSuccess(result)) {
    revalidatePath(`/data-lists/${idResult.value}`);
  }

  return result;
}
