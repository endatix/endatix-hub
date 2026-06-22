"use server";

import { auth } from "@/auth";
import { authorization } from "@/features/auth/authorization";
import { EndatixApi } from "@/lib/endatix-api";
import type { Folder } from "@/lib/endatix-api/folders/types";
import { Result } from "@/lib/result";
import { toResult } from "@/lib/result/map-api-result-to-result";

export type GetFolderBySlugResult = Result<Folder>;

export async function getFolderBySlugAction(
  slug: string,
): Promise<GetFolderBySlugResult> {
  const session = await auth();
  const { requireHubAccess } = await authorization(session);
  await requireHubAccess();

  const trimmedSlug = slug.trim();
  if (!trimmedSlug) {
    return Result.error("Folder slug is required");
  }

  const api = new EndatixApi(session?.accessToken);
  const folderResult = await api.folders.getBySlug(trimmedSlug);

  if (!folderResult.success) {
    return toResult(folderResult, {
      fallbackMessage: "Failed to load folder",
      logMessage: "Failed to load folder",
      loggerName: "getFolderBySlugAction",
    });
  }

  return Result.success(folderResult.data);
}
