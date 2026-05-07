import { ApiErrorType, ApiResult, EndatixApi } from "@/lib/endatix-api";
import type { Folder } from "@/lib/endatix-api/folders/types";
import { cache } from "react";

export type FolderManagementDetailSuccess = {
  folder: Folder;
  allFolders: Folder[];
};

export type FolderManagementDetailFailure =
  | { kind: "not_found" }
  | { kind: "auth" }
  | { kind: "api"; message: string };

export type FolderManagementDetailResult =
  | { ok: true; data: FolderManagementDetailSuccess }
  | { ok: false; error: FolderManagementDetailFailure };

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

    const folder = foldersResult.data.find((f) => f.id === folderId);
    if (!folder) {
      return { ok: false, error: { kind: "not_found" } };
    }

    return {
      ok: true,
      data: { folder, allFolders: foldersResult.data },
    };
  },
);
