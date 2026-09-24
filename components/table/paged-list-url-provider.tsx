"use client";

import { createContext, use, type ReactNode } from "react";
import { useListUrlState, type ListUrlState } from "./use-list-url-state";

const PagedListUrlContext = createContext<ListUrlState | null>(null);

/**
 * Owns `useListUrlState` once for a list whose toolbar and grid are composed
 * as **server** children (e.g. `/forms`, where folder cards sit between them).
 * Toolbar and grid read it with `usePagedListUrl()`, so they share one URL
 * writer and one pending flag. A client shell that renders both itself
 * (`TenantsList`, `UsersList`) calls `useListUrlState` and passes props instead.
 */
export function PagedListUrlProvider({
  children,
}: Readonly<{ children: ReactNode }>) {
  const state = useListUrlState();
  return <PagedListUrlContext value={state}>{children}</PagedListUrlContext>;
}

/** The provider's state, or `null` outside one (for shared chrome). */
export function useOptionalPagedListUrl(): ListUrlState | null {
  return use(PagedListUrlContext);
}

export function usePagedListUrl(): ListUrlState {
  const state = use(PagedListUrlContext);
  if (!state) {
    throw new Error("usePagedListUrl must be used inside PagedListUrlProvider");
  }
  return state;
}
