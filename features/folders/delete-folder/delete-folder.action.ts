"use server";

import { auth } from "@/auth";
import { authorization, Permissions } from "@/features/auth/authorization";
import { EndatixApi } from "@/lib/endatix-api";
import { Result } from "@/lib/result";
import { mapToResult } from "@/lib/result/map-api-result-to-result";
import { revalidatePath } from "next/cache";

export async function deleteFolderAction(
  folderId: string,
): Promise<Result<void> | never> {
  const session = await auth();
  const { requireHubAccess, requirePermission } = await authorization(session);
  await requireHubAccess();
  await requirePermission(Permissions.Folders.Manage);

  const api = new EndatixApi(session?.accessToken);
  const deleted = await api.folders.delete(folderId);

  if (!deleted.success) {
    return mapToResult<void>(deleted, {
      fallbackMessage: "Failed to delete folder",
      logMessage: "Failed to delete folder",
      loggerName: "folders",
    });
  }

  revalidatePath("/forms");
  revalidatePath("/forms/folders");
  revalidatePath("/forms/templates");
  revalidatePath("/forms/templates/folders");
  revalidatePath("/folders");
  revalidatePath("/settings/organization/forms");

  return Result.success(undefined);
}
