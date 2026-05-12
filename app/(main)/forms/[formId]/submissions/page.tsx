import { auth } from "@/auth";
import PageTitle from "@/components/headings/page-title";
import { Skeleton } from "@/components/ui/skeleton";
import { getSession } from "@/features/auth";
import { authorization } from "@/features/auth/authorization";
import {
  buildSubmissionListPath,
  isCanonicalSubmissionListUrl,
  parseSubmissionListPageSize,
  parseSubmissionListSearchParams,
  SUBMISSION_LIST_DEFAULT_PAGE,
  submissionListUrlStateToListRequest,
} from "@/features/submissions/list-submission-query";
import { SubmissionsWithFilters } from "@/features/submissions/ui/submissions-with-filters";
import { EndatixApi } from "@/lib/endatix-api";
import type { Metadata, ResolvingMetadata, Route } from "next";
import { redirect } from "next/navigation";
import { Suspense, type ReactNode } from "react";

type Params = {
  readonly params: Promise<{ formId: string }>;
  readonly searchParams: Promise<{
    page?: string;
    pageSize?: string;
    isComplete?: string;
    status?: string;
    isTestSubmission?: string;
    createdAtFrom?: string;
    createdAtTo?: string;
    completedAtFrom?: string;
    completedAtTo?: string;
  }>;
};

export async function generateMetadata(
  { params, searchParams }: Params,
  parent: ResolvingMetadata,
): Promise<Metadata> {
  const session = await auth();
  const { requireHubAccess } = await authorization(session);
  await requireHubAccess();

  const { formId } = await params;
  const api = new EndatixApi(session?.accessToken);
  const formResult = await api.forms.get(formId);

  const formName = formResult.success ? formResult.data.name : "Form";

  return {
    title: `Submissions for ${formName}`,
    description: `View all submissions for ${formName}`,
    openGraph: {
      title: `Search params: ${JSON.stringify(await searchParams)}`,
      description: `Parent title: ${(await parent).title}`,
    },
  };
}

export default async function ResponsesPage({ params, searchParams }: Params) {
  const { formId } = await params;
  const sp = await searchParams;

  return (
    <>
      <Suspense fallback={<PageTitle title="Submissions..." />}>
        <PageTitleData formId={formId} />
      </Suspense>
      <Suspense
        fallback={
          <TableLoader pageSize={parseSubmissionListPageSize(sp.pageSize)} />
        }
      >
        <SubmissionsTableData formId={formId} searchParams={sp} />
      </Suspense>
    </>
  );
}

async function PageTitleData({ formId }: Readonly<{ formId: string }>) {
  const session = await getSession();
  const api = new EndatixApi(session ?? undefined);
  const formResult = await api.forms.get(formId);

  const formName = formResult.success ? formResult.data.name : "Form";

  return <PageTitle title={`Submissions for ${formName}`} />;
}

async function SubmissionsTableData({
  formId,
  searchParams,
}: {
  readonly formId: string;
  readonly searchParams: {
    page?: string;
    pageSize?: string;
    isComplete?: string;
    status?: string;
    isTestSubmission?: string;
    createdAtFrom?: string;
    createdAtTo?: string;
    completedAtFrom?: string;
    completedAtTo?: string;
  };
}) {
  const listState = parseSubmissionListSearchParams(searchParams);
  const hasActiveFilters =
    listState.isComplete.length > 0 ||
    listState.status.length > 0 ||
    listState.isTestSubmission.length > 0 ||
    Boolean(
      listState.createdAtFrom ||
      listState.createdAtTo ||
      listState.completedAtFrom ||
      listState.completedAtTo,
    );
  const page = listState.page;
  const pageSize = listState.pageSize;

  if (
    !isCanonicalSubmissionListUrl(
      searchParams.page,
      searchParams.pageSize,
      listState,
      {
        rawCreatedAtFrom: searchParams.createdAtFrom,
        rawCreatedAtTo: searchParams.createdAtTo,
        rawCompletedAtFrom: searchParams.completedAtFrom,
        rawCompletedAtTo: searchParams.completedAtTo,
        createdAtFrom: listState.createdAtFrom,
        createdAtTo: listState.createdAtTo,
        completedAtFrom: listState.completedAtFrom,
        completedAtTo: listState.completedAtTo,
      },
    )
  ) {
    redirect(buildSubmissionListPath(formId, listState) as Route);
  }

  const session = await getSession();
  const api = new EndatixApi(session ?? undefined);

  const listRequest = submissionListUrlStateToListRequest(listState);

  const [submissionsResult, fieldsResult, hasAnySubmissionsProbeResult] =
    await Promise.all([
      api.submissions.list(formId, listRequest),
      api.definitions.getFields(formId),
      hasActiveFilters
        ? api.submissions.list(formId, { pageSize: 1 })
        : Promise.resolve(null),
    ]);

  if (!submissionsResult.success) {
    return (
      <SubmissionsLoadError>
        Unable to load submissions. Please try again.
      </SubmissionsLoadError>
    );
  }

  if (!fieldsResult.success) {
    return (
      <SubmissionsLoadError>
        Unable to load submission fields. Please try again.
      </SubmissionsLoadError>
    );
  }

  const definitionFields = fieldsResult.data;

  const canonicalPage = getCanonicalPage(
    page,
    submissionsResult.data.page,
    submissionsResult.data.totalPages,
  );
  if (canonicalPage !== page) {
    redirect(
      buildSubmissionListPath(formId, {
        ...listState,
        page: canonicalPage,
      }) as Route,
    );
  }

  const submissions = submissionsResult.data.items;
  const hasAnySubmissions = hasActiveFilters
    ? hasAnySubmissionsProbeResult?.success === true &&
      hasAnySubmissionsProbeResult.data.totalRecords > 0
    : submissionsResult.data.totalRecords > 0;

  return (
    <SubmissionsWithFilters
      data={submissions}
      formId={formId}
      hasAnySubmissions={hasAnySubmissions}
      definitionFields={definitionFields}
      initialPage={submissionsResult.data.page}
      initialPageSize={submissionsResult.data.pageSize}
      totalRecords={submissionsResult.data.totalRecords}
      totalPages={submissionsResult.data.totalPages}
      initialIsComplete={listState.isComplete}
      initialStatus={listState.status}
      initialIsTestSubmission={listState.isTestSubmission}
      initialCreatedAtFrom={listState.createdAtFrom}
      initialCreatedAtTo={listState.createdAtTo}
      initialCompletedAtFrom={listState.completedAtFrom}
      initialCompletedAtTo={listState.completedAtTo}
    />
  );
}

function getCanonicalPage(
  requestedPage: number,
  responsePage: number,
  totalPages: number,
) {
  if (totalPages <= 0) {
    return SUBMISSION_LIST_DEFAULT_PAGE;
  }

  if (requestedPage > totalPages) {
    return totalPages;
  }

  if (responsePage > 0 && responsePage !== requestedPage) {
    return Math.min(responsePage, totalPages);
  }

  return requestedPage;
}

function SubmissionsLoadError({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <div
      role="alert"
      className="mt-8 rounded-xl border border-destructive/30 bg-destructive/5 px-5 py-4 text-sm text-destructive"
    >
      {children}
    </div>
  );
}

function TableLoader({ pageSize }: Readonly<{ pageSize: number }>) {
  const pageSizeNumber = pageSize;
  const rowHeight = 60;
  const rows = Array.from({ length: pageSizeNumber }, (_, i) => i + 1);
  return (
    <div className="relative flex w-full flex-col space-y-3 overflow-auto">
      <Skeleton className={`h-[${rowHeight}px] w-full bg-gray-200 p-4`} />
      {rows.map((row) => (
        <Skeleton key={row} className={`h-[${rowHeight}px] w-full p-4`} />
      ))}
      <Skeleton className={`h-[${rowHeight}px] w-full bg-gray-200 p-4`} />
    </div>
  );
}
