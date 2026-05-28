"use server";

import { auth } from "@/auth";
import { authorization } from "@/features/auth/authorization";
import { Permissions } from "@/features/auth/authorization";
import { EndatixApi } from "@/lib/endatix-api";
import type { CreateFolderRequest } from "@/lib/endatix-api/folders/types";
import type { Folder } from "@/lib/endatix-api/folders/types";
import { Result } from "@/lib/result";
import { mapApiErrorToResult } from "@/lib/result/map-api-error-to-result";
import { revalidatePath } from "next/cache";

export type CreateFolderResult = Result<Folder>;

export async function createFolderAction(
  request: CreateFolderRequest,
): Promise<CreateFolderResult | never> {
  const session = await auth();
  const { requireHubAccess, requirePermission } = await authorization(session);
  await requireHubAccess();
  await requirePermission(Permissions.Folders.Manage);

  const api = new EndatixApi(session?.accessToken);
  const created = await api.folders.create(request);

  if (!created.success) {
    return mapApiErrorToResult(created, {
      fallbackMessage: "Failed to create folder",
      preferredFields: ["slug", "name"],
    });
  }

  revalidatePath("/forms");
  revalidatePath("/forms/folders");
  revalidatePath("/folders");
  return Result.success(created.data);
}
