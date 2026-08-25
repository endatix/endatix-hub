import type {
  BooleanFilterValue,
  SubmissionReviewStatus,
} from "@/lib/endatix-api/submissions/types";

/** One client-side table sort column (TanStack SortingState-compatible). */
export type SubmissionListSortItem = {
  id: string;
  desc: boolean;
};

/**
 * The submission list URL state.
 * @param page - The page.
 * @param pageSize - The page size.
 * @param isComplete - The is complete.
 * @param status - The status.
 * @param isTestSubmission - The is test submission.
 * @param createdFrom - The created at from.
 * @param createdTo - The created at to.
 * @param modifiedFrom - The modified at from.
 * @param modifiedTo - The modified at to.
 * @param startedFrom - The started at from.
 * @param startedTo - The started at to.
 * @param completedFrom - The completed at from.
 * @param completedTo - The completed at to.
 * @param submitterDisplayId - The submitter display id filter.
 * @param submitterEmail - The submitter profile email filter.
 * @param sorting - Client-side table sorting restored from the URL.
 */
export type SubmissionListUrlState = {
  page: number;
  pageSize: number;
  isComplete: BooleanFilterValue[];
  status: SubmissionReviewStatus[];
  isTestSubmission: BooleanFilterValue[];
  createdFrom?: string;
  createdTo?: string;
  modifiedFrom?: string;
  modifiedTo?: string;
  startedFrom?: string;
  startedTo?: string;
  completedFrom?: string;
  completedTo?: string;
  submitterDisplayId?: string;
  submitterEmail?: string;
  sorting: SubmissionListSortItem[];
};

/** Raw Next.js `searchParams` entry values (single string or repeated keys). */
export type SubmissionListRawSearchParams = Record<
  string,
  string | string[] | undefined
>;
