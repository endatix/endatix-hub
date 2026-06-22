import "server-only";

import { folderSlugsMatch } from "@/features/folders/lib/folder-slug-matching";
import type { FormsNavFolder } from "@/features/folders/types";
import { EndatixApi } from "@/lib/endatix-api";
import { mapFolderToNavFolder } from "./map-folder-to-nav-folder";

/**
 * Resolves a folder for forms navigation: match against a preloaded list first,
 * then fall back to API lookup by slug.
 */
export async function resolveFolderForNavBySlug(
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

  return mapFolderToNavFolder(folderResult.data);
}

/** @deprecated Use resolveFolderForNavBySlug */
export const resolveFormsNavFolderBySlug = resolveFolderForNavBySlug;
