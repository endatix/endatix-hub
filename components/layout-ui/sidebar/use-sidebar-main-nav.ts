"use client";

import { mergeTopLevelNavWithFolderForms } from "@/features/folders/utils";
import { filterNavByKeys } from "@/features/navigation/filter-nav-by-auth";
import { Result } from "@/lib/result";
import { useBrand, type Brand } from "@/lib/branding/client";
import { withBrandHelpLinks } from "@/lib/constants";
import { SitemapService } from "@/services/sitemap-service";
import type { INavItem } from "@/types/navigation-models";
import { useEffect, useState } from "react";

type SidebarFolder = {
  id: string;
  name: string;
  slug: string;
};

function authorizedNav(keys: string[] | undefined, brand: Brand): INavItem[] {
  return filterNavByKeys(
    withBrandHelpLinks(SitemapService.getTopLevelSitemap(), brand),
    keys,
  );
}

function navWithFolders(
  brand: Brand,
  keys: string[] | undefined,
  folders?: SidebarFolder[],
): INavItem[] {
  const base = authorizedNav(keys, brand);
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
  const brand = useBrand();
  const [mainNavItems, setMainNavItems] = useState<INavItem[]>(() =>
    navWithFolders(brand, initialNavItemKeys, initialFolders),
  );

  useEffect(() => {
    if (initialFolders) {
      setMainNavItems(
        navWithFolders(brand, initialNavItemKeys, initialFolders),
      );
      return;
    }

    if (!isAuthenticated) {
      setMainNavItems(navWithFolders(brand, initialNavItemKeys));
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
        setMainNavItems(navWithFolders(brand, initialNavItemKeys));
        return;
      }
      setMainNavItems(navWithFolders(brand, initialNavItemKeys, result.value));
    })();

    return () => {
      cancelled = true;
    };
  }, [brand, initialFolders, initialNavItemKeys, isAuthenticated]);

  return mainNavItems;
}
