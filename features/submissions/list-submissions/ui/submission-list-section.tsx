import { HubPageLoadError } from "@/components/error-handling/error-page";
import { NotFoundComponent } from "@/components/error-handling/not-found";
import { Button } from "@/components/ui/button";
import { getSession } from "@/features/auth";
import type { SubmissionListUrlState } from "@/features/submissions/list-submission-query";
import { SubmissionsWithFilters } from "@/features/submissions/ui/submissions-with-filters";
import { reportingExportFlag } from "@/lib/feature-flags/flags";
import type { Route } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { loadSubmissionListPage } from "../list-submissions.server";

type SubmissionListSectionProps = {
  formId: string;
  listState: SubmissionListUrlState;
};

/**
 * Matches a submissions list page-load outcome to chrome or the table.
 * Keeps post-fetch `redirect()` in a Server Component (not a `use()` client).
 */
export async function SubmissionListSection({
  formId,
  listState,
}: Readonly<SubmissionListSectionProps>) {
  const session = await getSession();
  const useReportingExport = await reportingExportFlag();
  const outcome = await loadSubmissionListPage({
    formId,
    listState,
    sessionOrToken: session,
    useReportingExport,
  });

  switch (outcome.kind) {
    case "redirect":
      redirect(outcome.href as Route);
    case "notFound":
      return <FormNotFound />;
    case "error":
      return <HubPageLoadError result={outcome.result} />;
    case "ready":
      return <SubmissionsWithFilters {...outcome.model} />;
  }
}

function FormNotFound() {
  return (
    <NotFoundComponent
      notFoundTitle="Form not found"
      notFoundSubtitle="We couldn't find that form."
      notFoundMessage="It may have been deleted, or the ID in the URL is wrong."
    >
      <Link href="/forms">
        <Button>Back to forms</Button>
      </Link>
    </NotFoundComponent>
  );
}
