"use client";

import { rememberSubmissionListReturnTo } from "@/features/submissions/list-submission-query";
import { NoSubmissionsEmptyState } from "@/features/submissions/ui/submissions-empty-state";
import { useSearchParams } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import type { GridReadinessBanner } from "../grid-readiness";
import type {
  AnswerColumn,
  ColumnSearchAccess,
} from "../submission-grid-columns";
import { ReadinessBanner } from "./readiness-banner";
import { SubmissionGridToolbar } from "./submission-grid-toolbar";
import { SubmissionGridUrlProvider } from "./submission-grid-url-context";

type SubmissionGridShellProps = {
  formId: string;
  catalog: readonly AnswerColumn[];
  columnSearch: ColumnSearchAccess;
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
  columnSearch,
  hasSubmissions,
  banner,
  children,
}: Readonly<SubmissionGridShellProps>) {
  useRememberListQuery(formId);
  return (
    <SubmissionGridUrlProvider catalog={catalog}>
      <SubmissionGridToolbar
        {...{ formId, catalog, columnSearch }}
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
