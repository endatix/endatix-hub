import { ApiErrorType, ApiResult, EndatixApi } from "@/lib/endatix-api";
import { cache } from "react";
import type { FolderManagementDetailResult } from "@/features/folders/types";

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
    if (ApiResult.isError(foldersResult)) {
      if (foldersResult.error.type === ApiErrorType.AuthError) {
        return { ok: false, error: { kind: "auth" } };
      }
      return {
        ok: false,
        error: { kind: "api", message: foldersResult.error.message },
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
