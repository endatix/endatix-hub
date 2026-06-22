import type { FolderManagementDetailResult } from "@/features/folders/types";
import { toApiPageError } from "@/lib/errors/page-error";
import { ApiResult, EndatixApi } from "@/lib/endatix-api";
import { cache } from "react";

/**
 * Cached per request so parallel `@header` and page can share one folders list fetch.
 */
export const getFolderManagementDetailCached = cache(
  async (
    accessToken: string | undefined,
    folderId: string,
  ): Promise<FolderManagementDetailResult> => {
    const api = new EndatixApi(accessToken);
    const foldersResult = await api.folders.list({ includeInactive: true });
    if (!ApiResult.isSuccess(foldersResult)) {
      return {
        ok: false,
        error: toApiPageError(foldersResult) ?? {
          kind: "api",
          message: "Failed to load folder management detail",
        },
      };
    }

    const folder = foldersResult.data.find(
      (candidate) => candidate.id === folderId,
    );
    if (!folder) {
      return { ok: false, error: { kind: "not_found" } };
    }

    return {
      ok: true,
      data: { folder, allFolders: foldersResult.data },
    };
  },
);
