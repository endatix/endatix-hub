import type { FormsNavFolder } from "@/features/folders/types";
import type { Folder } from "@/lib/endatix-api/folders/types";

/**
 * Maps a folder to a forms navigation folder.
 * @param folder The folder to map.
 * @returns The forms navigation folder.
 */
export function mapFolderToNavFolder(folder: Folder): FormsNavFolder {
  return {
    id: folder.id,
    name: folder.name,
    slug: folder.slug,
    isActive: folder.isActive,
    immutable: folder.immutable,
  };
}
