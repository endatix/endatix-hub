import PageTitle from "@/components/headings/page-title";
import { SUBMISSION_LIST_DEFAULT_PAGE_SIZE } from "@/features/submissions/list-submission-query/submission-list-query.constants";
import { SubmissionsTableSkeleton } from "@/features/submissions/ui/table/submissions-table-skeleton";

/**
 * Instant fallback for navigations into `/forms/[formId]/submissions`.
 * Complements the in-page Suspense boundary. Filter/sort/page transitions
 * keep the current table and dim it instead of using this skeleton.
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
