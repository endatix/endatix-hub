import "server-only";

import type { FormsNavFolder } from "@/features/folders/types";
import { EndatixApi } from "@/lib/endatix-api";
import { folderSlugsMatch } from "./folder-slug.utils";

export { folderSlugsMatch, normalizeFolderSlug } from "./folder-slug.utils";

/**
 * Resolves a folder for forms navigation from the cached list, falling back to API by slug.
 */
export async function resolveFormsNavFolderBySlug(
  accessToken: string | undefined,
  folderSlug: string,
  folders: FormsNavFolder[],
): Promise<FormsNavFolder | null> {
  const folderFromList = folders.find((folder) =>
    folderSlugsMatch(folder.slug, folderSlug),
  );
  if (folderFromList) {
    return folderFromList;
  }

  const api = new EndatixApi(accessToken);
  const folderResult = await api.folders.getBySlug(folderSlug);
  if (!folderResult.success) {
    return null;
  }

  const folder = folderResult.data;
  return {
    id: folder.id,
    name: folder.name,
    slug: folder.slug,
    isActive: folder.isActive,
    immutable: folder.immutable,
  };
}
