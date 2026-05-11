"use server";

import { auth } from "@/auth";
import { authorization, Permissions } from "@/features/auth/authorization";
import { EndatixApi } from "@/lib/endatix-api";
import type { Folder } from "@/lib/endatix-api/folders/types";
import { Result } from "@/lib/result";

export type ListFoldersResult = Result<Folder[]>;

export async function listFoldersAction(options?: {
  includeInactive?: boolean;
}): Promise<ListFoldersResult | never> {
  const session = await auth();
  const { requireHubAccess, requirePermission } = await authorization(session);
  await requireHubAccess();

  if (options?.includeInactive) {
    await requirePermission(Permissions.Folders.Manage);
  }

  const api = new EndatixApi(session?.accessToken);
  const foldersResult = await api.folders.list({
    includeInactive: options?.includeInactive,
  });

  if (!foldersResult.success) {
    return Result.error(
      foldersResult.error.message || "Failed to list folders",
    );
  }

  return Result.success(foldersResult.data);
}
