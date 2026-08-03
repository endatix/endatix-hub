import PageTitle from "@/components/headings/page-title";
import { SUBMISSION_LIST_DEFAULT_PAGE_SIZE } from "@/features/submissions/list-submission-query/submission-list-query.constants";
import { SubmissionsTableSkeleton } from "@/features/submissions/ui/table/submissions-table-skeleton";

/**
 * Instant fallback for navigations into `/forms/[formId]/submissions`.
 * Complements the in-page Suspense boundary (streaming) and the client
 * `isPending` skeleton (filter/sort/paging URL transitions).
 */
export default function SubmissionsLoading() {
  return (
    <>
      <PageTitle title="Submissions..." />
      <div className="mt-8">
        <SubmissionsTableSkeleton
          pageSize={SUBMISSION_LIST_DEFAULT_PAGE_SIZE}
          loadingLabel="Loading submissions…"
        />
      </div>
    </>
  );
}
