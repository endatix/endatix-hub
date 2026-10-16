"use client";

import { useTableFiltersUrlState } from "@/components/table";
import type { UrlSearchParamsUpdater } from "@/lib/utils/hooks/use-url-search-params-updater.hook";
import { createContext, use, useMemo, type ReactNode } from "react";
import { answerTextFilterUrlKeys } from "../submission-grid-answer-filters";
import type { AnswerColumn } from "../submission-grid-columns";
import { SUBMISSION_GRID_TEXT_FILTER_KEYS } from "../submission-grid-url.constants";
import {
  parseSubmissionGridUrl,
  type SubmissionGridUrlState,
} from "../submission-grid-url";

/**
 * The grid's one URL writer. Toolbar, banner and table share it, so a filter,
 * a page change and the debounced text filters never race each other.
 */
export type SubmissionGridUrl = {
  urlState: SubmissionGridUrlState;
  updateUrl: UrlSearchParamsUpdater;
  isPending: boolean;
  /** Uncommitted text filter values, keyed by URL key. */
  textFilters: Record<string, string>;
  setTextFilter: (key: string, value: string) => void;
};

const SubmissionGridUrlContext = createContext<SubmissionGridUrl | null>(null);

type SubmissionGridUrlProviderProps = {
  /** The form's answer columns; each text one adds a debounced filter. */
  catalog: readonly AnswerColumn[];
  children: ReactNode;
};

export function SubmissionGridUrlProvider({
  catalog,
  children,
}: Readonly<SubmissionGridUrlProviderProps>) {
  const value = useSubmissionGridUrlState(catalog);
  return (
    <SubmissionGridUrlContext value={value}>
      {children}
    </SubmissionGridUrlContext>
  );
}

function useSubmissionGridUrlState(
  catalog: readonly AnswerColumn[],
): SubmissionGridUrl {
  const { values, setValue, searchParams, updateUrl, isPending } =
    useTableFiltersUrlState(useTextFilterKeys(catalog));
  const urlState = useMemo(
    () => parseSubmissionGridUrl(Object.fromEntries(searchParams)),
    [searchParams],
  );
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

/**
 * Metadata and answer text filter keys in one list, so one writer commits
 * them all. The list keeps its identity while its keys do: each navigation
 * hands the shell a new catalog array, and a new list would drop a filter not yet committed.
 */
function useTextFilterKeys(catalog: readonly AnswerColumn[]): string[] {
  const signature = JSON.stringify(answerTextFilterUrlKeys(catalog));
  return useMemo(
    () => [
      ...SUBMISSION_GRID_TEXT_FILTER_KEYS,
      ...(JSON.parse(signature) as string[]),
    ],
    [signature],
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
