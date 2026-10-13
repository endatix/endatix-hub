/**
 * The rules for moving a form or a template into a folder. Plain data and functions: no React, no
 * Next.js, no UI copy.
 */

/** The picker's value for "not in any folder". */
export const NO_FOLDER_VALUE = "__none__";

export type MovableKind = "form" | "template";

/** What moves: a form or a template, by id, with the folder it is in now. */
export interface MovableItem {
  kind: MovableKind;
  id: string;
  name: string;
  folderId?: string | null;
}

/** A folder the picker offers. */
export interface FolderChoice {
  id: string;
  name: string;
  slug: string;
}

interface ListedFolder extends FolderChoice {
  isActive: boolean;
}

const FOLDER_PATHS: Record<MovableKind, string> = {
  form: "/forms/folders",
  template: "/forms/templates/folders",
};

/** Only active folders take new items. */
export function choosableFolders(
  folders: readonly ListedFolder[],
): FolderChoice[] {
  return folders
    .filter((folder) => folder.isActive)
    .map(({ id, name, slug }) => ({ id, name, slug }));
}

/** The picker's value for the folder an item is in. */
export const pickerValue = (folderId: string | null | undefined): string =>
  folderId ?? NO_FOLDER_VALUE;

/** The folder id a move sends: `null` takes the item out of its folder. */
export const targetFolderId = (picked: string): string | null =>
  picked === NO_FOLDER_VALUE ? null : picked;

/** A move must change the item's folder. */
export const canMove = (picked: string, current: string): boolean =>
  picked !== current;

/** Where a kind's folder opens. Forms and templates list a folder on different pages. */
export const folderHref = (kind: MovableKind, slug: string): string =>
  `${FOLDER_PATHS[kind]}/${encodeURIComponent(slug)}`;
