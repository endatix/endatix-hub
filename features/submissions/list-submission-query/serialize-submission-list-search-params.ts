import {
  SUBMISSION_LIST_DEFAULT_PAGE,
  SUBMISSION_LIST_DEFAULT_PAGE_SIZE,
  SUBMISSION_LIST_URL_SEARCH_PARAM_KEYS as searchParamKeys,
} from "./submission-list-query.constants";
import { serializeSubmissionListSorting } from "./parse-submission-list-search-params";
import type { SubmissionListUrlState } from "./types";

/**
 * Serializes the submission list URL state to a URL search params.
 * @param state - The submission list URL state.
 * @returns The URL search params.
 */
export function serializeSubmissionListSearchParams(
  state: SubmissionListUrlState,
): URLSearchParams {
  const params = new URLSearchParams();

  if (state.page > SUBMISSION_LIST_DEFAULT_PAGE) {
    params.set(searchParamKeys.page, String(state.page));
  }
  if (state.pageSize !== SUBMISSION_LIST_DEFAULT_PAGE_SIZE) {
    params.set(searchParamKeys.pageSize, String(state.pageSize));
  }

  setJoinedParam(params, searchParamKeys.isComplete, state.isComplete);
  setJoinedParam(params, searchParamKeys.status, state.status);
  setJoinedParam(
    params,
    searchParamKeys.isTestSubmission,
    state.isTestSubmission,
  );

  for (const [key, value] of OPTIONAL_STRING_PARAMS) {
    setOptionalParam(params, key, state[value]);
  }

  const sort = serializeSubmissionListSorting(state.sorting);
  setOptionalParam(params, searchParamKeys.sort, sort);

  return params;
}

const OPTIONAL_STRING_PARAMS = [
  [searchParamKeys.createdAtFrom, "createdAtFrom"],
  [searchParamKeys.createdAtTo, "createdAtTo"],
  [searchParamKeys.modifiedAtFrom, "modifiedAtFrom"],
  [searchParamKeys.modifiedAtTo, "modifiedAtTo"],
  [searchParamKeys.startedAtFrom, "startedAtFrom"],
  [searchParamKeys.startedAtTo, "startedAtTo"],
  [searchParamKeys.completedAtFrom, "completedAtFrom"],
  [searchParamKeys.completedAtTo, "completedAtTo"],
  [searchParamKeys.submitterDisplayId, "submitterDisplayId"],
  [searchParamKeys.submitterEmail, "submitterEmail"],
] as const satisfies ReadonlyArray<
  readonly [string, keyof SubmissionListUrlState]
>;

function setOptionalParam(
  params: URLSearchParams,
  key: string,
  value: string | undefined,
): void {
  if (value) {
    params.set(key, value);
  }
}

function setJoinedParam(
  params: URLSearchParams,
  key: string,
  values: readonly string[],
): void {
  if (values.length > 0) {
    params.set(key, values.join(","));
  }
}
