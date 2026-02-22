import { auth } from "@/auth";
import PageTitle from "@/components/headings/page-title";
import { Skeleton } from "@/components/ui/skeleton";
import { authorization } from "@/features/auth/authorization";
import { getForm, getSubmissions } from "@/services/api";
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
  const form = await getForm(formId);

  return {
    title: `Submissions for ${form.name}`,
    description: `View all submissions for ${form.name}`,
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
  const form = await getForm(formId);
  return <PageTitle title={`Submissions for ${form.name}`} />;
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
    ? searchParams.isComplete.split(",")
    : [];

  const statusFilter = searchParams.status
    ? searchParams.status.split(",")
    : [];

  const submissions = await getSubmissions(formId, {
    isComplete: isCompleteFilter,
    status: statusFilter,
  });

  return (
    <SubmissionsWithFilters
      data={submissions}
      formId={formId}
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
    <div className="relative flex w-full flex-col space-y-3 overflow-auto">
      <Skeleton className={`h-[${rowHeight}px] w-full bg-gray-200 p-4`} />
      {rows.map((row) => (
        <Skeleton key={row} className={`h-[${rowHeight}px] w-full p-4`} />
      ))}
      <Skeleton className={`h-[${rowHeight}px] w-full bg-gray-200 p-4`} />
    </div>
  );
}
