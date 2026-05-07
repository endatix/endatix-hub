"use server";

import { auth } from "@/auth";
import { authorization, Permissions } from "@/features/auth/authorization";
import { EndatixApi } from "@/lib/endatix-api";
import { Result } from "@/lib/result";
import { revalidatePath } from "next/cache";

export type MoveFormToFolderResult = Result<void>;

export async function moveFormToFolderAction(
  formId: string,
  targetFolderId: string | null,
): Promise<MoveFormToFolderResult | never> {
  const session = await auth();
  const { requireHubAccess, requirePermission } = await authorization(session);
  await requireHubAccess();
  await requirePermission(Permissions.Folders.Manage);

  const api = new EndatixApi(session?.accessToken);
  const updated = targetFolderId
    ? await api.forms.update(formId, { folderId: targetFolderId })
    : await api.forms.update(formId, { clearFolderId: true });

  if (!updated.success) {
    return Result.error(updated.error.message || "Failed to move form");
  }

  revalidatePath("/folders");
  revalidatePath("/forms");
  revalidatePath("/forms/folders");
  revalidatePath("/forms/templates");
  return Result.success(undefined);
}
