"use client";

import { getFolderBySlugAction } from "@/features/folders/server";
import { Result } from "@/lib/result";
import type { Folder } from "@/lib/endatix-api/folders/types";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  parseFormsFolderSlugFromPathname,
  resolveDefaultCreateFolder,
  resolveEffectiveCreateFolderId,
} from "./resolve-default-create-folder";

function mergeFolderIntoList(folders: Folder[], folder: Folder): Folder[] {
  if (folders.some((item) => String(item.id) === String(folder.id))) {
    return folders;
  }

  return [...folders, folder];
}

export function useCreateFormFolderContext({
  folders,
  defaultFolderId,
  defaultFolderSlug,
  defaultFolderName,
}: {
  folders: Folder[];
  defaultFolderId?: string;
  defaultFolderSlug?: string;
  defaultFolderName?: string;
}) {
  const pathname = usePathname();
  const pathnameFolderSlug = parseFormsFolderSlugFromPathname(pathname);
  const effectiveFolderSlug =
    defaultFolderSlug ?? pathnameFolderSlug ?? undefined;
  const [fetchedFolder, setFetchedFolder] = useState<Folder | null>(null);

  const foldersWithFetched = useMemo(() => {
    if (!fetchedFolder) {
      return folders;
    }

    return mergeFolderIntoList(folders, fetchedFolder);
  }, [folders, fetchedFolder]);

  const resolvedFolder = useMemo(
    () =>
      resolveDefaultCreateFolder(foldersWithFetched, {
        folderId: defaultFolderId,
        folderSlug: effectiveFolderSlug,
      }),
    [foldersWithFetched, defaultFolderId, effectiveFolderSlug],
  );

  const effectiveFolderId = useMemo(() => {
    const fromList = resolveEffectiveCreateFolderId(foldersWithFetched, {
      folderId: defaultFolderId,
      folderSlug: effectiveFolderSlug,
    });

    if (fromList) {
      return fromList;
    }

    if (fetchedFolder) {
      return String(fetchedFolder.id);
    }

    return defaultFolderId ? String(defaultFolderId) : undefined;
  }, [foldersWithFetched, defaultFolderId, effectiveFolderSlug, fetchedFolder]);

  const effectiveFolderName =
    defaultFolderName ??
    resolvedFolder?.name ??
    fetchedFolder?.name ??
    undefined;

  useEffect(() => {
    if (!pathnameFolderSlug) {
      return;
    }

    if (
      fetchedFolder &&
      normalizeFolderSlugFromContext(fetchedFolder.slug) === pathnameFolderSlug
    ) {
      return;
    }

    let cancelled = false;

    void getFolderBySlugAction(pathnameFolderSlug).then((result) => {
      if (cancelled || !Result.isSuccess(result)) {
        return;
      }

      setFetchedFolder(result.value);
    });

    return () => {
      cancelled = true;
    };
  }, [fetchedFolder, pathnameFolderSlug]);

  return {
    effectiveFolderId,
    effectiveFolderName,
    effectiveFolderSlug,
    resolvedFolder,
    foldersWithFetched,
  };
}

function normalizeFolderSlugFromContext(slug: string): string {
  try {
    return decodeURIComponent(slug.trim());
  } catch {
    return slug.trim();
  }
}
