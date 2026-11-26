"use server";

import { auth } from "@/auth";
import { authorization, Permissions } from "@/features/auth/authorization";
import { EndatixApi } from "@/lib/endatix-api";
import type { Result } from "@/lib/result";
import { finishFolderMove } from "../move-to-folder/finish-folder-move";

export type MoveFormToFolderResult = Result<void>;

export async function moveFormToFolderAction(
  formId: string,
  targetFolderId: string | null,
): Promise<MoveFormToFolderResult | never> {
  const session = await auth();
  const { requireHubAccess, requirePermission } = await authorization(session);
  await requireHubAccess();
  await requirePermission(Permissions.Forms.Edit);

  const api = new EndatixApi(session?.accessToken);
  const updated = targetFolderId
    ? await api.forms.update(formId, { folderId: targetFolderId })
    : await api.forms.update(formId, { clearFolderId: true });

  return finishFolderMove(updated, "form");
}
