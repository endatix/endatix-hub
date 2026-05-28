import "server-only";
import { EndatixApi } from "@/lib/endatix-api";
import { cache } from "react";
import type { FormsHeaderData, FormsNavFolder } from "@/features/folders/types";

/**
 * Loads the forms header data from the API.
 * @param accessToken - The access token to use for the API request.
 * @returns The forms header data.
 */
const loadFormsHeaderData = cache(
  async (accessToken?: string): Promise<FormsHeaderData> => {
    const api = new EndatixApi(accessToken);
    const [settingsRes, foldersRes] = await Promise.all([
      api.tenant.getSettings(),
      api.folders.list(),
    ]);

    const folders: FormsNavFolder[] = foldersRes.success
      ? foldersRes.data.map((folder) => ({
          id: folder.id,
          name: folder.name,
          slug: folder.slug,
          isActive: folder.isActive,
          immutable: folder.immutable,
        }))
      : [];

    return {
      requireFolderForNewForms:
        settingsRes.success &&
        settingsRes.data.requireFolderAssignment === true,
      folders,
      assignableFolders: folders.map((folder) => ({
        id: folder.id,
        name: folder.name,
      })),
    };
  },
);

/**
 * Caches the forms header data from the API.
 * @param accessToken - The access token to use for the API request.
 * @returns The forms header data.
 */
export function getFormsHeaderDataCached(accessToken?: string) {
  return loadFormsHeaderData(accessToken);
}
