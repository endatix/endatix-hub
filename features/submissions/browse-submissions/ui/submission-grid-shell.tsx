"use client";

import { rememberSubmissionListReturnTo } from "@/features/submissions/list-submission-query";
import { NoSubmissionsEmptyState } from "@/features/submissions/ui/submissions-empty-state";
import { useSearchParams } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import type { GridReadinessBanner } from "../grid-readiness";
import type { SubmissionTestAccess } from "../submission-test-flag";
import type {
  AnswerColumn,
  ColumnSearchAccess,
} from "../submission-grid-columns";
import { ReadinessBanner } from "./readiness-banner";
import { SubmissionGridToolbar } from "./submission-grid-toolbar";
import { SubmissionGridUrlProvider } from "./submission-grid-url-context";
import { SubmissionTestAccessProvider } from "./submission-test-access-context";

type SubmissionGridShellProps = {
  formId: string;
  /** Every answer column the form has; the column picker chooses from it. */
  catalog: readonly AnswerColumn[];
  columnSearch: ColumnSearchAccess;
  /** Mark as test / Mark as real in each row, Delete test submissions in the toolbar. */
  testAccess: SubmissionTestAccess;
  hasSubmissions: boolean;
  banner: GridReadinessBanner | null;
  /** The keyed rows frame; it remounts per list query, the shell does not. */
  children: ReactNode;
};

/**
 * Owns the grid's URL state and the chrome around the rows: toolbar and
 * readiness banner stay mounted while the rows reload.
 */
export function SubmissionGridShell(props: Readonly<SubmissionGridShellProps>) {
  const { hasSubmissions, banner, children, ...chrome } = props;
  const { formId } = chrome;
  useRememberListQuery(formId);
  return (
    <GridProviders {...chrome}>
      <SubmissionGridToolbar {...chrome} disabled={!hasSubmissions} />
      {banner && <ReadinessBanner formId={formId} banner={banner} />}
      {hasSubmissions ? children : <NoSubmissionsEmptyState />}
    </GridProviders>
  );
}

type GridProvidersProps = Pick<
  SubmissionGridShellProps,
  "catalog" | "testAccess" | "children"
>;

/** URL state and test permissions, shared by the toolbar and every row. */
function GridProviders({
  catalog,
  testAccess,
  children,
}: Readonly<GridProvidersProps>) {
  return (
    <SubmissionGridUrlProvider catalog={catalog}>
      <SubmissionTestAccessProvider access={testAccess}>
        {children}
      </SubmissionTestAccessProvider>
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
