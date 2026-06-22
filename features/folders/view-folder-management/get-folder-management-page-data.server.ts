import "server-only";

import type { FolderManagementPageResult } from "@/features/folders/types";
import { cache } from "react";
import { getFolderContents } from "./get-folder-contents.server";
import { getFolderManagementDetailCached } from "./get-folder-management-detail.server";

/**
 * Cached per request so parallel `@header` and page can share one folders list fetch.
 */
export const getFolderManagementPageDataCached = cache(
  async (
    accessToken: string | undefined,
    folderId: string,
  ): Promise<FolderManagementPageResult> => {
    const detail = await getFolderManagementDetailCached(accessToken, folderId);
    if (!detail.ok) {
      return detail;
    }

    const contents = await getFolderContents(
      accessToken,
      detail.data.folder.id,
    );
    if (!contents.ok) {
      return contents;
    }

    return {
      ok: true,
      data: {
        folder: detail.data.folder,
        moveTargetFolders: detail.data.allFolders,
        forms: contents.data.forms,
        templates: contents.data.templates,
        contentsPreview: contents.data.preview,
      },
    };
  },
);
