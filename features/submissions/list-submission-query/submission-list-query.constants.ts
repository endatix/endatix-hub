export const SUBMISSION_LIST_DEFAULT_PAGE = 1;
export const SUBMISSION_LIST_DEFAULT_PAGE_SIZE = 10;
export const SUBMISSION_LIST_PAGE_SIZE_OPTIONS = [10, 20, 30, 40, 50] as const;
export const SUBMISSION_LIST_MAX_PAGE_SIZE = 50;
export const SUBMISSION_LIST_BOOLEAN_FILTER_VALUES = ["true", "false"] as const;
export const SUBMISSION_LIST_REVIEW_STATUS_VALUES = [
  "new",
  "read",
  "approved",
] as const;

/** Keys on `/forms/:formId/submissions` searchParams (Hub URL, not API `filter`). */
export const SUBMISSION_LIST_URL_SEARCH_PARAM_KEYS = Object.freeze({
  page: "page",
  pageSize: "pageSize",
  isComplete: "isComplete",
  status: "status",
  isTestSubmission: "isTestSubmission",
  createdAtFrom: "createdAtFrom",
  createdAtTo: "createdAtTo",
  startedAtFrom: "startedAtFrom",
  startedAtTo: "startedAtTo",
  completedAtFrom: "completedAtFrom",
  completedAtTo: "completedAtTo",
  submitterDisplayId: "submitterDisplayId",
  submitterEmail: "submitterEmail",
  sort: "sort",
} as const);
