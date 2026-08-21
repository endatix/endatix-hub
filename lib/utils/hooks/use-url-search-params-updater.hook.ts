'use client';

import { useCallback, useRef } from 'react';
import type { Route } from 'next';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

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
 * `updateUrl` is identity-stable across searchParams changes (reads via ref)
 * so debounced search effects do not re-arm on every filter navigation.
 */
export function useUrlSearchParamsUpdater() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const searchParamsRef = useRef(searchParams);
  searchParamsRef.current = searchParams;

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
      router.replace(href, { scroll: false });
    },
    [pathname, router],
  );

  return { searchParams, updateUrl };
}
