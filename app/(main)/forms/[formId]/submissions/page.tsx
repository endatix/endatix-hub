import { auth } from "@/auth";
import PageTitle from "@/components/headings/page-title";
import { Skeleton } from "@/components/ui/skeleton";
import { getSession } from "@/features/auth";
import { authorization } from "@/features/auth/authorization";
import { EndatixApi } from "@/lib/endatix-api";
import type { Metadata, ResolvingMetadata } from "next";
import { Suspense } from "react";
import { SubmissionsWithFilters } from "./ui/submissions-with-filters";

type Params = {
  params: Promise<{ formId: string }>;
  searchParams: Promise<{
    page?: string;
    pageSize?: string;
    isComplete?: string;
    status?: string;
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
    isComplete?: string;
    status?: string;
  };
}) {
  const isCompleteFilter = searchParams.isComplete
    ? searchParams.isComplete.split(',')
    : [];

  const statusFilter = searchParams.status
    ? searchParams.status.split(',')
    : [];

  const session = await getSession();
  const api = new EndatixApi(session ?? undefined);

  const [submissionsResult, fieldsResult] = await Promise.all([
    api.submissions.list(formId, {
      isComplete: isCompleteFilter,
      status: statusFilter,
    }),
    api.definitions.getFields(formId),
  ]);

  const submissions = submissionsResult.success ? submissionsResult.data : [];
  const definitionFields = fieldsResult.success ? fieldsResult.data : [];

  return (
    <SubmissionsWithFilters
      data={submissions}
      formId={formId}
      definitionFields={definitionFields}
      initialIsComplete={isCompleteFilter}
      initialStatus={statusFilter}
    />
  );
}

function TableLoader({ pageSize }: { pageSize: string }) {
  const pageSizeNumber = parseInt(pageSize) || 10;
  const rowHeight = 60;
  const rows = Array.from({ length: pageSizeNumber }, (_, i) => i + 1);
  return (
    <div className="flex flex-col space-y-3 relative w-full overflow-auto">
      <Skeleton className={`h-[${rowHeight}px] bg-gray-200 w-full p-4`} />
      {rows.map((row) => (
        <Skeleton key={row} className={`h-[${rowHeight}px] w-full p-4`} />
      ))}
      <Skeleton className={`h-[${rowHeight}px] bg-gray-200 w-full p-4`} />
    </div>
  );
}
