"use server";

import { auth } from "@/auth";
import { authorization } from "@/features/auth/authorization";
import { Permissions } from "@/features/auth/authorization";
import { EndatixApi } from "@/lib/endatix-api";
import type { Folder } from "@/lib/endatix-api/folders/types";
import type { UpdateFolderRequest } from "@/lib/endatix-api/folders/types";
import { Result } from "@/lib/result";
import { mapApiErrorToResult } from "@/lib/result/map-api-error-to-result";
import { revalidatePath } from "next/cache";

export type UpdateFolderResult = Result<Folder>;

export async function updateFolderAction(
  folderId: string,
  request: UpdateFolderRequest,
): Promise<UpdateFolderResult | never> {
  const session = await auth();
  const { requireHubAccess, requirePermission } = await authorization(session);
  await requireHubAccess();
  await requirePermission(Permissions.Folders.Manage);

  const api = new EndatixApi(session?.accessToken);
  const updated = await api.folders.update(folderId, request);

  if (!updated.success) {
    return mapApiErrorToResult(updated, {
      fallbackMessage: "Failed to update folder",
      preferredFields: ["metadata", "slug", "name", "isActive", "immutable"],
    });
  }

  revalidatePath("/forms");
  revalidatePath("/forms/folders");
  revalidatePath("/folders");
  revalidatePath("/settings/organization/forms");
  return Result.success(updated.data);
}
