import "server-only";

import { EndatixApi } from "@/lib/endatix-api";
import { cache } from "react";

export type FormsNavFolder = {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  immutable: boolean;
};

export type FormsHeaderData = {
  requireFolderForNewForms: boolean;
  folders: FormsNavFolder[];
  assignableFolders: Array<{ id: string; name: string }>;
};

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

export function getFormsHeaderDataCached(accessToken?: string) {
  return loadFormsHeaderData(accessToken);
}
