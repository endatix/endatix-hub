"use server";

import { auth } from "@/auth";
import { authorization } from "@/features/auth/authorization";
import { EndatixApi } from "@/lib/endatix-api";
import type { FormDependencySummary } from "@/lib/endatix-api/data-lists/types";
import { Result } from "@/lib/result";

export type GetDataListFormDependenciesResult = Result<FormDependencySummary[]>;

/**
 * Gets the form dependencies for a data list.
 * @param dataListId - The ID of the data list.
 * @returns The form dependencies.
 */
export async function getDataListFormDependenciesAction(
  dataListId: string,
): Promise<GetDataListFormDependenciesResult> {
  const session = await auth();
  const { requireHubAccess } = await authorization(session);
  await requireHubAccess();

  const api = new EndatixApi(session?.accessToken);
  const result = await api.dataLists.listFormDependencies(dataListId);

  if (!result.success) {
    return Result.error(result.error.message || "Failed to load dependencies");
  }

  return Result.success(result.data);
}
