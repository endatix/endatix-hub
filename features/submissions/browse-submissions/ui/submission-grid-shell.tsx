"use client";

import { rememberSubmissionListReturnTo } from "@/features/submissions/list-submission-query";
import { NoSubmissionsEmptyState } from "@/features/submissions/ui/submissions-empty-state";
import { useSearchParams } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import type { GridReadinessBanner } from "../grid-readiness";
import type { AnswerColumn } from "../submission-grid-columns";
import { ReadinessBanner } from "./readiness-banner";
import { SubmissionGridToolbar } from "./submission-grid-toolbar";
import { SubmissionGridUrlProvider } from "./submission-grid-url-context";

type SubmissionGridShellProps = {
  formId: string;
  /** Every answer column the form has; the column picker chooses from it. */
  catalog: readonly AnswerColumn[];
  hasSubmissions: boolean;
  banner: GridReadinessBanner | null;
  /** The keyed rows frame; it remounts per list query, the shell does not. */
  children: ReactNode;
};

/**
 * Owns the grid's URL state and the chrome around the rows: toolbar and
 * readiness banner stay mounted while the rows reload.
 */
export function SubmissionGridShell({
  formId,
  catalog,
  hasSubmissions,
  banner,
  children,
}: Readonly<SubmissionGridShellProps>) {
  useRememberListQuery(formId);
  return (
    <SubmissionGridUrlProvider>
      <SubmissionGridToolbar
        formId={formId}
        catalog={catalog}
        disabled={!hasSubmissions}
      />
      {banner && <ReadinessBanner formId={formId} banner={banner} />}
      {hasSubmissions ? children : <NoSubmissionsEmptyState />}
    </SubmissionGridUrlProvider>
  );
}

/** Lets a submission's Back link return to this page, filters and paging kept. */
function useRememberListQuery(formId: string) {
  const searchParams = useSearchParams();
  useEffect(() => {
    rememberSubmissionListReturnTo(formId, searchParams.toString());
  }, [formId, searchParams]);
}
