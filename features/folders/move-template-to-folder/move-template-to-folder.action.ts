"use server";

import { auth } from "@/auth";
import { authorization, Permissions } from "@/features/auth/authorization";
import { EndatixApi } from "@/lib/endatix-api";
import type { Result } from "@/lib/result";
import { finishFolderMove } from "../move-to-folder/finish-folder-move";

export type MoveTemplateToFolderResult = Result<void>;

export async function moveTemplateToFolderAction(
  templateId: string,
  targetFolderId: string | null,
): Promise<MoveTemplateToFolderResult | never> {
  const session = await auth();
  const { requireHubAccess, requirePermission } = await authorization(session);
  await requireHubAccess();
  await requirePermission(Permissions.Forms.Edit);

  const api = new EndatixApi(session?.accessToken);
  const updateCommand = targetFolderId
    ? { folderId: targetFolderId }
    : { clearFolderId: true };
  const updatedResult = await api.formTemplates.partialUpdate(
    templateId,
    updateCommand,
  );

  return finishFolderMove(updatedResult, "template");
}
