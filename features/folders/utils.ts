import type { Folder } from "@/lib/endatix-api/folders/types";
import type { INavItem } from "@/types/navigation-models";

/** Sidebar links under Forms when folders exist (GET /folders returns active folders only). */
export function buildFormsSidebarChildren(
  folders: Pick<Folder, "id" | "name" | "slug">[],
): INavItem[] {
  return folders.map((folder) => ({
    key: `forms-folder-${folder.id}`,
    title: folder.name,
    url: `/forms/folders/${encodeURIComponent(folder.slug)}`,
  }));
}

export function mergeTopLevelNavWithFolderForms(
  baseItems: INavItem[],
  folders: Pick<Folder, "id" | "name" | "slug">[],
): INavItem[] {
  if (folders.length === 0) {
    return baseItems;
  }

  const children = buildFormsSidebarChildren(folders);
  return baseItems.map((item) =>
    item.key === "forms" ? { ...item, children } : item,
  );
}
