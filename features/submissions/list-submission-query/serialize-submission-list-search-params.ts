import {
  SUBMISSION_LIST_DEFAULT_PAGE,
  SUBMISSION_LIST_DEFAULT_PAGE_SIZE,
  SUBMISSION_LIST_URL_SEARCH_PARAM_KEYS as searchParamKeys,
} from "./submission-list-query.constants";
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
  if (state.isComplete.length > 0) {
    params.set(searchParamKeys.isComplete, state.isComplete.join(","));
  }
  if (state.status.length > 0) {
    params.set(searchParamKeys.status, state.status.join(","));
  }
  if (state.isTestSubmission.length > 0) {
    params.set(
      searchParamKeys.isTestSubmission,
      state.isTestSubmission.join(","),
    );
  }
  if (state.createdAtFrom) {
    params.set(searchParamKeys.createdAtFrom, state.createdAtFrom);
  }
  if (state.createdAtTo) {
    params.set(searchParamKeys.createdAtTo, state.createdAtTo);
  }
  if (state.startedAtFrom) {
    params.set(searchParamKeys.startedAtFrom, state.startedAtFrom);
  }
  if (state.startedAtTo) {
    params.set(searchParamKeys.startedAtTo, state.startedAtTo);
  }
  if (state.completedAtFrom) {
    params.set(searchParamKeys.completedAtFrom, state.completedAtFrom);
  }
  if (state.completedAtTo) {
    params.set(searchParamKeys.completedAtTo, state.completedAtTo);
  }
  if (state.submitterDisplayId) {
    params.set(searchParamKeys.submitterDisplayId, state.submitterDisplayId);
  }
  if (state.submitterEmail) {
    params.set(searchParamKeys.submitterEmail, state.submitterEmail);
  }

  return params;
}
