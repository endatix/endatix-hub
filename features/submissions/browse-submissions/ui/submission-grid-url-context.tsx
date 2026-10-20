"use client";

import { useTableFiltersUrlState } from "@/components/table";
import type { UrlSearchParamsUpdater } from "@/lib/utils/hooks/use-url-search-params-updater.hook";
import { createContext, use, useMemo, type ReactNode } from "react";
import { SUBMISSION_GRID_TEXT_FILTER_KEYS } from "../submission-grid-url.constants";
import {
  parseSubmissionGridUrl,
  type SubmissionGridUrlState,
} from "../submission-grid-url";
import type { SubmissionViewSettings } from "@/lib/endatix-api/reporting/submission-view-types";
import {
  applyViewDefaults,
  viewDefaults,
  type SubmissionGridViewDefaults,
} from "../submission-grid-view";

/**
 * The grid's one URL writer. Toolbar, banner and table share it, so a filter,
 * a page change and the debounced text filters never race each other.
 */
export type SubmissionGridUrl = {
  /** The URL, with the saved view's columns, page size and sort where it says nothing. */
  urlState: SubmissionGridUrlState;
  /**
   * What the URL itself sets, before the saved view fills in. Clearing a
   * value the view supplies changes nothing, so its reset is not offered.
   */
  urlSets: SubmissionGridUrlSets;
  updateUrl: UrlSearchParamsUpdater;
  isPending: boolean;
  /** Uncommitted text filter values, keyed by URL key. */
  textFilters: Record<string, string>;
  setTextFilter: (key: string, value: string) => void;
};

export type SubmissionGridUrlSets = { sort: boolean; columns: boolean };

const SubmissionGridUrlContext = createContext<SubmissionGridUrl | null>(null);

type SubmissionGridUrlProviderProps = {
  viewSettings: SubmissionViewSettings;
  children: ReactNode;
};

export function SubmissionGridUrlProvider({
  viewSettings,
  children,
}: Readonly<SubmissionGridUrlProviderProps>) {
  const defaults = useMemo(() => viewDefaults(viewSettings), [viewSettings]);
  const value = useSubmissionGridUrlState(defaults);
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
  const url = useMemo(
    () => readGridUrl(searchParams, viewDefaults),
    [searchParams, viewDefaults],
  );
  return useMemo(
    () => ({
      ...url,
      updateUrl,
      isPending,
      textFilters: values,
      setTextFilter: setValue,
    }),
    [url, updateUrl, isPending, values, setValue],
  );
}

function readGridUrl(
  searchParams: URLSearchParams,
  viewDefaults: SubmissionGridViewDefaults,
): Pick<SubmissionGridUrl, "urlState" | "urlSets"> {
  const raw = Object.fromEntries(searchParams);
  const parsed = parseSubmissionGridUrl(raw);
  return {
    urlState: applyViewDefaults(parsed, raw, viewDefaults),
    urlSets: {
      sort: parsed.sort !== undefined,
      columns: parsed.columns !== undefined,
    },
  };
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
