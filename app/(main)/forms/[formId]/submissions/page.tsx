import { auth } from "@/auth";
import PageTitle from "@/components/headings/page-title";
import { Skeleton } from "@/components/ui/skeleton";
import { getSession } from "@/features/auth";
import { authorization } from "@/features/auth/authorization";
import { EndatixApi } from "@/lib/endatix-api";
import type { Metadata, ResolvingMetadata } from "next";
import { Suspense, type ReactNode } from "react";
import { SubmissionsWithFilters } from "./ui/submissions-with-filters";

type Params = {
  params: Promise<{ formId: string }>;
  searchParams: Promise<{
    page?: string;
    pageSize?: string;
    isComplete?: string;
    status?: string;
    isTestSubmission?: string;
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
      <Suspense fallback={<TableLoader pageSize={sp.pageSize ?? "10"} />}>
        <SubmissionsTableData formId={formId} searchParams={sp} />
      </Suspense>
    </>
  );
}

async function PageTitleData({ formId }: { formId: string }) {
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
  formId: string;
  searchParams: {
    page?: string;
    pageSize?: string;
    isComplete?: string;
    status?: string;
    isTestSubmission?: string;
  };
}) {
  const isCompleteFilter = searchParams.isComplete
    ? searchParams.isComplete.split(",")
    : [];

  const statusFilter = searchParams.status
    ? searchParams.status.split(",")
    : [];
  const isTestSubmissionFilter = searchParams.isTestSubmission
    ? searchParams.isTestSubmission.split(",")
    : [];
  const hasActiveFilters =
    isCompleteFilter.length > 0 ||
    statusFilter.length > 0 ||
    isTestSubmissionFilter.length > 0;
  const page = parsePositiveInteger(searchParams.page, 1);
  const pageSize = parsePositiveInteger(searchParams.pageSize, 10);

  const session = await getSession();
  const api = new EndatixApi(session ?? undefined);

  const [submissionsResult, fieldsResult, unfilteredSubmissionsResult] = await Promise.all([
    api.submissions.list(formId, {
      page,
      pageSize,
      isComplete: isCompleteFilter,
      status: statusFilter,
      isTestSubmission: isTestSubmissionFilter,
    }),
    api.definitions.getFields(formId),
    hasActiveFilters
      ? api.submissions.list(formId, { pageSize: 1 })
      : Promise.resolve(null),
  ]);

  if (
    !submissionsResult.success ||
    (unfilteredSubmissionsResult && !unfilteredSubmissionsResult.success)
  ) {
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

  const submissions = submissionsResult.data.items;
  const hasAnySubmissions = hasActiveFilters
    ? unfilteredSubmissionsResult?.success === true &&
      unfilteredSubmissionsResult.data.totalRecords > 0
    : submissionsResult.data.totalRecords > 0;
  const definitionFields = fieldsResult.data;

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
      initialIsComplete={isCompleteFilter}
      initialStatus={statusFilter}
      initialIsTestSubmission={isTestSubmissionFilter}
    />
  );
}

function parsePositiveInteger(value: string | undefined, fallback: number) {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function SubmissionsLoadError({ children }: { children: ReactNode }) {
  return (
    <div
      role="alert"
      className="mt-8 rounded-xl border border-destructive/30 bg-destructive/5 px-5 py-4 text-sm text-destructive"
    >
      {children}
    </div>
  );
}

function TableLoader({ pageSize }: { pageSize: string }) {
  const pageSizeNumber = parseInt(pageSize) || 10;
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
