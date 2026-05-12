import type {
  BooleanFilterValue,
  SubmissionReviewStatus,
} from "@/lib/endatix-api/submissions/types";

/**
 * The submission list URL state.
 * @param page - The page.
 * @param pageSize - The page size.
 * @param isComplete - The is complete.
 * @param status - The status.
 * @param isTestSubmission - The is test submission.
 * @param createdAtFrom - The created at from.
 * @param createdAtTo - The created at to.
 * @param completedAtFrom - The completed at from.
 * @param completedAtTo - The completed at to.
 */
export type SubmissionListUrlState = {
  page: number;
  pageSize: number;
  isComplete: BooleanFilterValue[];
  status: SubmissionReviewStatus[];
  isTestSubmission: BooleanFilterValue[];
  createdAtFrom?: string;
  createdAtTo?: string;
  completedAtFrom?: string;
  completedAtTo?: string;
};

/** Raw Next.js `searchParams` entry values (single string or repeated keys). */
export type SubmissionListRawSearchParams = Record<
  string,
  string | string[] | undefined
>;
