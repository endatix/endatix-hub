"use server";

import { auth } from "@/auth";
import { authorization, Permissions } from "@/features/auth/authorization";
import { EndatixApi } from "@/lib/endatix-api";
import { Result } from "@/lib/result";
import { revalidatePath } from "next/cache";

export type MoveTemplateToFolderResult = Result<void>;

export async function moveTemplateToFolderAction(
  templateId: string,
  targetFolderId: string | null,
): Promise<MoveTemplateToFolderResult | never> {
  const session = await auth();
  const { requireHubAccess, requirePermission } = await authorization(session);
  await requireHubAccess();
  await requirePermission(Permissions.Folders.Manage);

  const api = new EndatixApi(session?.accessToken);
  const updateCommand = targetFolderId
    ? { folderId: targetFolderId }
    : { clearFolderId: true };
  const updatedResult = await api.formTemplates.partialUpdate(
    templateId,
    updateCommand,
  );

  if (!updatedResult.success) {
    return Result.error(updatedResult.error.message || "Failed to move template");
  }

  revalidatePath("/folders");
  revalidatePath("/forms");
  revalidatePath("/forms/folders");
  revalidatePath("/forms/templates");
  return Result.success(undefined);
}
