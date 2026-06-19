"use client";

import { useCallback } from "react";
import type { Route } from "next";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

/**
 * The type of a function that updates the URL search params.
 * @param updates - The updates to apply to the URL search params.
 * @returns void.
 */
export type UrlSearchParamsUpdater = (
  updates: Record<string, string | null>,
) => void;

/**
 * A hook that provides a function to update the URL search params.
 * @returns An object with the current URL search params and the function to update the URL search params.
 */
export function useUrlSearchParamsUpdater() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const updateUrl = useCallback<UrlSearchParamsUpdater>(
    (updates) => {
      const nextSearchParams = new URLSearchParams(searchParams.toString());

      Object.entries(updates).forEach(([key, value]) => {
        if (!value) {
          nextSearchParams.delete(key);
          return;
        }

        nextSearchParams.set(key, value);
      });

      const queryString = nextSearchParams.toString();
      const href = (
        queryString ? `${pathname}?${queryString}` : pathname
      ) as Route;
      router.replace(href, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  return { searchParams, updateUrl };
}
