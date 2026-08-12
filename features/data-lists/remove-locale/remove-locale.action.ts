"use server";

import { auth } from "@/auth";
import { authorization } from "@/features/auth/authorization";
import { EndatixApi } from "@/lib/endatix-api";
import type { DataListDetails } from "@/lib/endatix-api/data-lists/types";
import { tryNormalizeCultureCode } from "@/lib/localization";
import { Result } from "@/lib/result";
import { toResult } from "@/lib/result/map-api-result-to-result";
import { validateEndatixId } from "@/lib/utils/type-validators";
import { revalidatePath } from "next/cache";

export type RemoveLocaleResult = Result<DataListDetails>;

/**
 * Removes a catalog locale and strips that key from every item's labels.
 */
export async function removeLocaleAction(
  dataListId: string,
  locale: string,
): Promise<RemoveLocaleResult> {
  const session = await auth();
  const { requireHubAccess } = await authorization(session);
  await requireHubAccess();

  const idResult = validateEndatixId(dataListId, "dataListId");
  if (Result.isError(idResult)) {
    return idResult;
  }

  const normalized = tryNormalizeCultureCode(locale);
  if (normalized === null) {
    return Result.error(
      `'${locale.trim() || locale}' is not a valid culture code.`,
    );
  }

  const api = new EndatixApi(session?.accessToken);
  const result = toResult(
    await api.dataLists.removeLocale(idResult.value, normalized),
    {
      fallbackMessage: "Failed to remove locale",
      logMessage: "Failed to remove locale",
      loggerName: "data-lists.removeLocale",
    },
  );

  if (Result.isSuccess(result)) {
    revalidatePath(`/data-lists/${idResult.value}`);
  }

  return result;
}
