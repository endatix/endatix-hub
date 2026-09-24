"use client";

import { Suspense, type ReactNode } from "react";
import { listScopeKey } from "@/lib/list-page/list-query-key";
import { useOptionalPagedListUrl } from "./paged-list-url-provider";
import { StableListRegion } from "./stable-list-region";

type PagedListFrameProps = {
  /**
   * `listQueryKey(parsedRequest)`. Remounts the grid so `use(promise)` reads
   * the page the URL just requested; without it the first resolved page stays
   * until a full reload. Keep the toolbar outside this frame.
   */
  listKey: string;
  /** Row skeleton: shown on first load and while the next page is pending. */
  fallback: ReactNode;
  children: ReactNode;
  /**
   * Swap the rows for `fallback` while a page, filter, or sort change is in
   * flight. Defaults to `PagedListUrlProvider`'s pending state. Lists whose
   * grid renders its own skeleton rows (`DataTableGrid isPending`) leave it
   * off so the column header stays mounted.
   */
  isPending?: boolean;
};

/**
 * The rows region of a paged list: keyed per page, height held per scope so
 * the pager stays put, and a skeleton while the next page is on its way.
 */
export function PagedListFrame({
  listKey,
  fallback,
  children,
  isPending,
}: Readonly<PagedListFrameProps>) {
  const provided = useOptionalPagedListUrl();
  const showSkeleton = isPending ?? provided?.isPending ?? false;

  return (
    <StableListRegion
      scopeKey={listScopeKey(listKey)}
      aria-busy={showSkeleton || undefined}
    >
      {showSkeleton ? (
        fallback
      ) : (
        <Suspense key={listKey} fallback={fallback}>
          {children}
        </Suspense>
      )}
    </StableListRegion>
  );
}
