import { auth } from "@/auth";
import PageTitle from "@/components/headings/page-title";
import { getSession } from "@/features/auth";
import { authorization } from "@/features/auth/authorization";
import {
  buildSubmissionListPath,
  isCanonicalSubmissionListUrl,
  parseSubmissionListSearchParams,
} from "@/features/submissions/list-submission-query";
import { SubmissionListSection } from "@/features/submissions/list-submissions";
import { SubmissionsTableSkeleton } from "@/features/submissions/ui/table/submissions-table-skeleton";
import { EndatixApi } from "@/lib/endatix-api";
import type { Metadata, ResolvingMetadata, Route } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";

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
  const listState = parseSubmissionListSearchParams(sp);

  if (!isCanonicalSubmissionListUrl(sp, listState)) {
    redirect(buildSubmissionListPath(formId, listState) as Route);
  }

  return (
    <>
      <Suspense fallback={<PageTitle title="Submissions..." />}>
        <PageTitleData formId={formId} />
      </Suspense>
      <Suspense fallback={<TableLoader pageSize={listState.pageSize} />}>
        <SubmissionListSection formId={formId} listState={listState} />
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

function TableLoader({ pageSize }: Readonly<{ pageSize: number }>) {
  return (
    <div className="mt-8">
      <SubmissionsTableSkeleton pageSize={pageSize} />
    </div>
  );
}
