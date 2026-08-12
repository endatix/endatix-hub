"use server";

import { auth } from "@/auth";
import { authorization } from "@/features/auth/authorization";
import { EndatixApi } from "@/lib/endatix-api";
import type { DataListDetails } from "@/lib/endatix-api/data-lists/types";
import { DATA_LIST_NAME_MAX_LENGTH } from "@/lib/survey-features/data-lists/constants";
import { Result } from "@/lib/result";
import { toResult } from "@/lib/result/map-api-result-to-result";

export type CreateDataListResult = Result<DataListDetails>;

interface CreateDataListInput {
  name: string;
  description?: string;
}

export async function createDataListAction(
  input: CreateDataListInput,
): Promise<CreateDataListResult> {
  const session = await auth();
  const { requireHubAccess } = await authorization(session);
  await requireHubAccess();

  const normalizedName = (input.name ?? "")
    .trim()
    .slice(0, DATA_LIST_NAME_MAX_LENGTH);
  if (!normalizedName) {
    return Result.error("Name: data list name is required.");
  }

  const api = new EndatixApi(session?.accessToken);
  return toResult(
    await api.dataLists.create({
      ...input,
      name: normalizedName,
    }),
    {
      fallbackMessage: "Failed to create data list",
      preferredFields: ["name"],
      logMessage: "Failed to create data list",
      loggerName: "data-lists.create",
    },
  );
}
