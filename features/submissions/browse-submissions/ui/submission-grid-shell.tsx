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
import type { SubmissionGridViewLoad } from "../submission-grid-view";
import { ReadinessBanner } from "./readiness-banner";
import { SubmissionGridToolbar } from "./submission-grid-toolbar";
import { SubmissionGridUrlProvider } from "./submission-grid-url-context";
import { SubmissionGridViewProvider } from "./submission-grid-view-context";
import { SubmissionGridViewError } from "./submission-grid-view-menu";
import { SubmissionTestAccessProvider } from "./submission-test-access-context";

type SubmissionGridShellProps = {
  formId: string;
  catalog: readonly AnswerColumn[];
  columnSearch: ColumnSearchAccess;
  /** Mark as test / Mark as real in each row, Delete test submissions in the toolbar. */
  testAccess: SubmissionTestAccess;
  hasSubmissions: boolean;
  banner: GridReadinessBanner | null;
  view: SubmissionGridViewLoad;
  canSaveView: boolean;
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
  ...viewProps
}: Readonly<SubmissionGridShellProps>) {
  useRememberListQuery(formId);
  const disabled = !hasSubmissions;
  return (
    <SubmissionGridProviders {...{ formId, catalog, ...viewProps }}>
      <SubmissionGridToolbar {...{ formId, catalog, columnSearch, disabled }} />
      <SubmissionGridViewError />
      {banner && <ReadinessBanner formId={formId} banner={banner} />}
      {hasSubmissions ? children : <NoSubmissionsEmptyState />}
    </SubmissionGridProviders>
  );
}

type ProvidersProps = Pick<
  SubmissionGridShellProps,
  "formId" | "catalog" | "testAccess" | "view" | "canSaveView" | "children"
>;

/** URL state, the saved view and test permissions, shared by the toolbar and every row. */
function SubmissionGridProviders({
  view,
  testAccess,
  children,
  ...props
}: Readonly<ProvidersProps>) {
  return (
    <SubmissionGridUrlProvider
      catalog={props.catalog}
      viewSettings={view.settings}
    >
      <SubmissionGridViewProvider view={view} {...props}>
        <SubmissionTestAccessProvider access={testAccess}>
          {children}
        </SubmissionTestAccessProvider>
      </SubmissionGridViewProvider>
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
