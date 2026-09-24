"use client";

import { Suspense, type ReactNode } from "react";
import { useOptionalPagedListUrl } from "./paged-list-url-provider";
import { useHeldHeight } from "./use-held-height";

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
 * The rows region of a paged list: keyed per page, and a skeleton at the
 * current height while the next page is on its way.
 */
export function PagedListFrame({
  listKey,
  fallback,
  children,
  isPending,
}: Readonly<PagedListFrameProps>) {
  const provided = useOptionalPagedListUrl();
  const pending = isPending ?? provided?.isPending ?? false;
  const { ref, style } = useHeldHeight(pending);

  return (
    <div ref={ref} style={style} aria-busy={pending || undefined}>
      {pending ? (
        fallback
      ) : (
        <Suspense key={listKey} fallback={fallback}>
          {children}
        </Suspense>
      )}
    </div>
  );
}
