import type {
  AuditDateFilters,
  DateRangeFilter,
} from "@/lib/endatix-api/shared/types";
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
 * Hub URL state for `/forms/:formId/submissions`.
 * Runtime wire stays flat (`createdFrom` / `createdTo`); date stems are composed
 * via `AuditDateFilters` + `DateRangeFilter` like `ListSubmissionsRequest`.
 */
export type SubmissionListUrlState = {
  page: number;
  pageSize: number;
  isComplete: BooleanFilterValue[];
  status: SubmissionReviewStatus[];
  isTestSubmission: BooleanFilterValue[];
  sorting: SubmissionListSortItem[];
  submitterDisplayId?: string;
  submitterEmail?: string;
} & AuditDateFilters &
  DateRangeFilter<"started" | "completed">;

/** Raw Next.js `searchParams` entry values (single string or repeated keys). */
export type SubmissionListRawSearchParams = Record<
  string,
  string | string[] | undefined
>;
