"use client";

import { useTableFiltersUrlState } from "@/components/table";
import type { UrlSearchParamsUpdater } from "@/lib/utils/hooks/use-url-search-params-updater.hook";
import { createContext, use, useMemo, type ReactNode } from "react";
import { SUBMISSION_GRID_TEXT_FILTER_KEYS } from "../submission-grid-url.constants";
import {
  parseSubmissionGridUrl,
  type SubmissionGridUrlState,
} from "../submission-grid-url";
import {
  applyViewDefaults,
  type SubmissionGridViewDefaults,
} from "../submission-grid-view";

/**
 * The grid's one URL writer. Toolbar, banner and table share it, so a filter,
 * a page change and the debounced text filters never race each other.
 */
export type SubmissionGridUrl = {
  /** The URL, with the saved view's columns, page size and sort where it says nothing. */
  urlState: SubmissionGridUrlState;
  updateUrl: UrlSearchParamsUpdater;
  isPending: boolean;
  /** Uncommitted text filter values, keyed by URL key. */
  textFilters: Record<string, string>;
  setTextFilter: (key: string, value: string) => void;
};

const SubmissionGridUrlContext = createContext<SubmissionGridUrl | null>(null);

type SubmissionGridUrlProviderProps = {
  /** From the saved view; stable between server renders. */
  viewDefaults: SubmissionGridViewDefaults;
  children: ReactNode;
};

export function SubmissionGridUrlProvider({
  viewDefaults,
  children,
}: Readonly<SubmissionGridUrlProviderProps>) {
  const value = useSubmissionGridUrlState(viewDefaults);
  return (
    <SubmissionGridUrlContext value={value}>
      {children}
    </SubmissionGridUrlContext>
  );
}

function useSubmissionGridUrlState(
  viewDefaults: SubmissionGridViewDefaults,
): SubmissionGridUrl {
  const { values, setValue, searchParams, updateUrl, isPending } =
    useTableFiltersUrlState(SUBMISSION_GRID_TEXT_FILTER_KEYS);
  const urlState = useMemo(() => {
    const raw = Object.fromEntries(searchParams);
    return applyViewDefaults(parseSubmissionGridUrl(raw), raw, viewDefaults);
  }, [searchParams, viewDefaults]);
  return useMemo(
    () => ({
      urlState,
      updateUrl,
      isPending,
      textFilters: values,
      setTextFilter: setValue,
    }),
    [urlState, updateUrl, isPending, values, setValue],
  );
}

export function useSubmissionGridUrl(): SubmissionGridUrl {
  const value = use(SubmissionGridUrlContext);
  if (!value) {
    throw new Error(
      "useSubmissionGridUrl must be used inside SubmissionGridUrlProvider",
    );
  }
  return value;
}
