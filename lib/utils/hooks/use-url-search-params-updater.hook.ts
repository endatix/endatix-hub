"use client";

import { useCallback, useEffect, useRef, useTransition } from "react";
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
 * URL search-param updater. `updateUrl` is identity-stable (reads via ref)
 * so debounced search effects do not re-arm on every filter navigation.
 * `router.replace` runs in a transition; `isPending` is that transition.
 * Each hook instance has its own pending flag — lift `updateUrl`/`isPending`
 * to a parent when toolbar and table must share one indicator.
 */
export function useUrlSearchParamsUpdater() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const searchParamsRef = useRef(searchParams);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    searchParamsRef.current = searchParams;
  }, [searchParams]);

  const updateUrl = useCallback<UrlSearchParamsUpdater>(
    (updates) => {
      const current = searchParamsRef.current;
      const nextSearchParams = new URLSearchParams(current.toString());

      Object.entries(updates).forEach(([key, value]) => {
        if (!value) {
          nextSearchParams.delete(key);
          return;
        }

        nextSearchParams.set(key, value);
      });

      const queryString = nextSearchParams.toString();
      if (queryString === current.toString()) {
        return;
      }

      const href = (
        queryString ? `${pathname}?${queryString}` : pathname
      ) as Route;
      startTransition(() => {
        router.replace(href, { scroll: false });
      });
    },
    [pathname, router, startTransition],
  );

  return { searchParams, updateUrl, isPending };
}
