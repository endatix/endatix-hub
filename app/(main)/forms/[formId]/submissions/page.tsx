import { auth } from "@/auth";
import PageTitle from "@/components/headings/page-title";
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
import { SubmissionsTableSkeleton } from "@/features/submissions/ui/table";
import { SubmissionsWithFilters } from "@/features/submissions/ui";
import { reportingExportFlag } from "@/lib/feature-flags/flags";
import { EndatixApi } from "@/lib/endatix-api";
import type { Metadata, ResolvingMetadata, Route } from "next";
import { redirect } from "next/navigation";
import { Suspense, type ReactNode } from "react";

type SubmissionListSearchParams = {
  page?: string;
  pageSize?: string;
  isComplete?: string;
  status?: string;
  isTestSubmission?: string;
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
  sort?: string;
};

type Params = {
  readonly params: Promise<{ formId: string }>;
  readonly searchParams: Promise<SubmissionListSearchParams>;
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
  readonly searchParams: SubmissionListSearchParams;
}) {
  const listState = parseSubmissionListSearchParams(searchParams);
  const hasActiveFilters =
    listState.isComplete.length > 0 ||
    listState.status.length > 0 ||
    listState.isTestSubmission.length > 0 ||
    Boolean(
      listState.createdAtFrom ||
      listState.createdAtTo ||
      listState.modifiedAtFrom ||
      listState.modifiedAtTo ||
      listState.startedAtFrom ||
      listState.startedAtTo ||
      listState.completedAtFrom ||
      listState.completedAtTo ||
      listState.submitterDisplayId ||
      listState.submitterEmail,
    );
  const page = listState.page;

  if (
    !isCanonicalSubmissionListUrl(
      searchParams.page,
      searchParams.pageSize,
      listState,
      {
        rawCreatedAtFrom: searchParams.createdAtFrom,
        rawCreatedAtTo: searchParams.createdAtTo,
        rawModifiedAtFrom: searchParams.modifiedAtFrom,
        rawModifiedAtTo: searchParams.modifiedAtTo,
        rawStartedAtFrom: searchParams.startedAtFrom,
        rawStartedAtTo: searchParams.startedAtTo,
        rawCompletedAtFrom: searchParams.completedAtFrom,
        rawCompletedAtTo: searchParams.completedAtTo,
        rawSubmitterDisplayId: searchParams.submitterDisplayId,
        rawSubmitterEmail: searchParams.submitterEmail,
        rawSort: searchParams.sort,
        createdAtFrom: listState.createdAtFrom,
        createdAtTo: listState.createdAtTo,
        modifiedAtFrom: listState.modifiedAtFrom,
        modifiedAtTo: listState.modifiedAtTo,
        startedAtFrom: listState.startedAtFrom,
        startedAtTo: listState.startedAtTo,
        completedAtFrom: listState.completedAtFrom,
        completedAtTo: listState.completedAtTo,
        submitterDisplayId: listState.submitterDisplayId,
        submitterEmail: listState.submitterEmail,
      },
    )
  ) {
    redirect(buildSubmissionListPath(formId, listState) as Route);
  }

  const session = await getSession();
  const api = new EndatixApi(session ?? undefined);
  const useReportingExport = await reportingExportFlag();

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
      useReportingExport={useReportingExport}
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
      initialModifiedAtFrom={listState.modifiedAtFrom}
      initialModifiedAtTo={listState.modifiedAtTo}
      initialStartedAtFrom={listState.startedAtFrom}
      initialStartedAtTo={listState.startedAtTo}
      initialCompletedAtFrom={listState.completedAtFrom}
      initialCompletedAtTo={listState.completedAtTo}
      initialSubmitterDisplayId={listState.submitterDisplayId}
      initialSubmitterEmail={listState.submitterEmail}
      initialSorting={listState.sorting}
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
  return <SubmissionsTableSkeleton pageSize={pageSize} />;
}
