import { auth } from "@/auth";
import { authorization } from "@/features/auth/authorization";
import {
  buildSubmissionListPath,
  isCanonicalSubmissionListUrl,
  parseSubmissionListSearchParams,
} from "@/features/submissions/list-submission-query";
import { SubmissionListSection } from "@/features/submissions/list-submissions";
import {
  SubmissionGridSection,
  SubmissionGridSkeleton,
} from "@/features/submissions/browse-submissions";
import { FormWorkspaceHeader } from "@/features/forms/form-workspace";
import { getWorkspaceForm } from "@/features/forms/form-workspace/load-workspace-form.server";
import { SubmissionsTableSkeleton } from "@/features/submissions/ui/table/submissions-table-skeleton";
import { PagedListFrame } from "@/components/table";
import { listQueryKey } from "@/lib/list-page/list-query-key";
import { reportingExportFlag } from "@/lib/feature-flags/flags";
import type { Metadata, ResolvingMetadata, Route } from "next";
import { redirect } from "next/navigation";
import { Suspense, type ReactNode } from "react";

type Params = {
  readonly params: Promise<{ formId: string }>;
  readonly searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata(
  { params, searchParams }: Params,
  parent: ResolvingMetadata,
): Promise<Metadata> {
  const session = await auth();
  const { requireHubAccess } = await authorization(session);
  await requireHubAccess();

  const { formId } = await params;
  const formResult = await getWorkspaceForm(formId);

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
  const legacyGrid = (
    <LegacySubmissionsGrid formId={formId} searchParams={sp} />
  );
  const grid = (await reportingExportFlag()) ? (
    <ReportingGrid formId={formId} searchParams={sp} legacyGrid={legacyGrid} />
  ) : (
    legacyGrid
  );

  return (
    <>
      <FormWorkspaceHeader title="Submissions" />
      {grid}
    </>
  );
}

type GridProps = Readonly<{
  formId: string;
  searchParams: Awaited<Params["searchParams"]>;
}>;

function ReportingGrid({
  formId,
  searchParams,
  legacyGrid,
}: GridProps & Readonly<{ legacyGrid: ReactNode }>) {
  return (
    <Suspense fallback={<ReportingGridSkeleton />}>
      <SubmissionGridSection
        formId={formId}
        searchParams={searchParams}
        unavailable={legacyGrid}
      />
    </Suspense>
  );
}

function LegacySubmissionsGrid({ formId, searchParams }: GridProps) {
  const listState = parseSubmissionListSearchParams(searchParams);

  if (!isCanonicalSubmissionListUrl(searchParams, listState)) {
    redirect(buildSubmissionListPath(formId, listState) as Route);
  }

  return (
    <PagedListFrame
      listKey={listQueryKey(listState)}
      fallback={<SubmissionsListSkeleton pageSize={listState.pageSize} />}
    >
      <SubmissionListSection formId={formId} listState={listState} />
    </PagedListFrame>
  );
}

function ReportingGridSkeleton() {
  return (
    <div className="mt-8">
      <SubmissionGridSkeleton pageSize={10} />
    </div>
  );
}

function SubmissionsListSkeleton({ pageSize }: Readonly<{ pageSize: number }>) {
  return (
    <div className="mt-8">
      <SubmissionsTableSkeleton pageSize={pageSize} />
    </div>
  );
}
