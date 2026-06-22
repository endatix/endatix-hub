import type { FormsNavFolder } from "@/features/folders/types";
import type { Folder } from "@/lib/endatix-api/folders/types";
import { normalizeBasePath } from "@/lib/hosting/base-path";

const formsFolderSlugPathRegex = /^\/forms\/folders\/([^/?#]+)/;

function normalizeFolderSlug(slug: string): string {
  try {
    return decodeURIComponent(slug.trim());
  } catch {
    return slug.trim();
  }
}

export function mapNavFoldersForCreate(
  folders: ReadonlyArray<
    Pick<FormsNavFolder, "id" | "name" | "slug" | "isActive" | "immutable">
  >,
): Folder[] {
  return folders.map((folder) => ({
    id: folder.id,
    name: folder.name,
    slug: folder.slug,
    isActive: folder.isActive,
    immutable: folder.immutable,
  }));
}

export function stripBasePathFromPathname(pathname: string): string {
  const basePath = normalizeBasePath(process.env.NEXT_PUBLIC_BASE_PATH ?? "");
  if (!basePath) {
    return pathname;
  }

  if (pathname === basePath) {
    return "/";
  }

  if (pathname.startsWith(`${basePath}/`)) {
    return pathname.slice(basePath.length) || "/";
  }

  return pathname;
}

export function parseFormsFolderSlugFromPathname(
  pathname: string,
): string | null {
  const path = stripBasePathFromPathname(pathname);
  const match = formsFolderSlugPathRegex.exec(path);
  if (!match?.[1]) {
    return null;
  }

  return normalizeFolderSlug(match[1]);
}

export function resolveDefaultCreateFolder(
  folders: Folder[],
  params: { folderId?: string | null; folderSlug?: string | null },
): Folder | undefined {
  const folderId = params.folderId?.trim();
  if (folderId) {
    const match = folders.find(
      (folder) => String(folder.id) === String(folderId) && folder.isActive,
    );
    if (match) {
      return match;
    }
  }

  const folderSlug = params.folderSlug?.trim();
  if (folderSlug) {
    const normalizedSlug = normalizeFolderSlug(folderSlug);
    return folders.find(
      (folder) =>
        normalizeFolderSlug(folder.slug) === normalizedSlug && folder.isActive,
    );
  }

  return undefined;
}

export function resolveEffectiveCreateFolderId(
  folders: Folder[],
  params: {
    folderId?: string | null;
    folderSlug?: string | null;
  },
): string | undefined {
  const resolved = resolveDefaultCreateFolder(folders, params);
  if (resolved) {
    return String(resolved.id);
  }

  const folderId = params.folderId?.trim();
  return folderId ? String(folderId) : undefined;
}

export function buildCreateFormHref(options?: {
  folderId?: string;
  folderSlug?: string;
}): string {
  if (options?.folderId) {
    return `/forms/create?folderId=${encodeURIComponent(options.folderId)}`;
  }

  if (options?.folderSlug) {
    return `/forms/create?folderSlug=${encodeURIComponent(options.folderSlug)}`;
  }

  return "/forms/create";
}

export function getSelectableCreateFolders(
  folders: Folder[],
  defaultFolderId?: string,
  defaultFolderName?: string,
): Folder[] {
  const activeFolders = folders.filter((folder) => folder.isActive);
  if (!defaultFolderId) {
    return activeFolders;
  }

  const normalizedDefaultFolderId = String(defaultFolderId);
  const defaultFolder = folders.find(
    (folder) => String(folder.id) === normalizedDefaultFolderId,
  );
  if (
    activeFolders.some(
      (folder) => String(folder.id) === normalizedDefaultFolderId,
    )
  ) {
    return activeFolders;
  }

  if (defaultFolder) {
    return [...activeFolders, defaultFolder];
  }

  if (defaultFolderName) {
    return [
      ...activeFolders,
      {
        id: normalizedDefaultFolderId,
        name: defaultFolderName,
        slug: "",
        isActive: true,
        immutable: false,
      },
    ];
  }

  return activeFolders;
}
