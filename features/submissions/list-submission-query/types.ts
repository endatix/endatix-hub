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
 * @param createdAtFrom - The created at from.
 * @param createdAtTo - The created at to.
 * @param modifiedAtFrom - The modified at from.
 * @param modifiedAtTo - The modified at to.
 * @param startedAtFrom - The started at from.
 * @param startedAtTo - The started at to.
 * @param completedAtFrom - The completed at from.
 * @param completedAtTo - The completed at to.
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
  createdAtFrom?: string;
  createdAtTo?: string;
  modifiedAtFrom?: string;
  modifiedAtTo?: string;
  startedAtFrom?: string;
  startedAtTo?: string;
  completedAtFrom?: string;
  completedAtTo?: string;
  submitterDisplayId?: string;
  submitterEmail?: string;
  sorting: SubmissionListSortItem[];
};

/** Raw Next.js `searchParams` entry values (single string or repeated keys). */
export type SubmissionListRawSearchParams = Record<
  string,
  string | string[] | undefined
>;
