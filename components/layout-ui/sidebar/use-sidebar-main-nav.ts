"use client";

import { mergeTopLevelNavWithFolderForms } from "@/features/folders/utils";
import { filterNavByKeys } from "@/features/navigation/filter-nav-by-auth";
import { Result } from "@/lib/result";
import { SitemapService } from "@/services/sitemap-service";
import type { INavItem } from "@/types/navigation-models";
import { useEffect, useState } from "react";

type SidebarFolder = {
  id: string;
  name: string;
  slug: string;
};

function authorizedNav(keys?: string[]): INavItem[] {
  return filterNavByKeys(SitemapService.getTopLevelSitemap(), keys);
}

function navWithFolders(
  keys: string[] | undefined,
  folders?: SidebarFolder[],
): INavItem[] {
  const base = authorizedNav(keys);
  if (!folders) {
    return base;
  }
  return mergeTopLevelNavWithFolderForms(base, folders);
}

/**
 * Folder links follow the latest server props, including an empty list.
 * The fetch runs only when the nav slot did not pass folders.
 */
export function useSidebarMainNav(
  initialFolders: SidebarFolder[] | undefined,
  initialNavItemKeys: string[] | undefined,
  isAuthenticated: boolean,
): INavItem[] {
  const [mainNavItems, setMainNavItems] = useState<INavItem[]>(() =>
    navWithFolders(initialNavItemKeys, initialFolders),
  );

  useEffect(() => {
    if (initialFolders) {
      setMainNavItems(navWithFolders(initialNavItemKeys, initialFolders));
      return;
    }

    if (!isAuthenticated) {
      return;
    }

    let cancelled = false;
    void (async () => {
      const { listFoldersAction } = await import("@/features/folders/server");
      const result = await listFoldersAction();
      if (cancelled) {
        return;
      }
      if (!Result.isSuccess(result)) {
        setMainNavItems(navWithFolders(initialNavItemKeys));
        return;
      }
      setMainNavItems(navWithFolders(initialNavItemKeys, result.value));
    })();

    return () => {
      cancelled = true;
    };
  }, [initialFolders, initialNavItemKeys, isAuthenticated]);

  return mainNavItems;
}
