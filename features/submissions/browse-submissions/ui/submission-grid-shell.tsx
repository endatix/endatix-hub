"use client";

import { rememberSubmissionListReturnTo } from "@/features/submissions/list-submission-query";
import { NoSubmissionsEmptyState } from "@/features/submissions/ui/submissions-empty-state";
import { useSearchParams } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import type { GridReadinessBanner } from "../grid-readiness";
import type { AnswerColumn } from "../submission-grid-columns";
import type { SubmissionGridViewLoad } from "../submission-grid-view";
import { ReadinessBanner } from "./readiness-banner";
import { SubmissionGridToolbar } from "./submission-grid-toolbar";
import { SubmissionGridUrlProvider } from "./submission-grid-url-context";
import { SubmissionGridViewProvider } from "./submission-grid-view-context";
import { SubmissionGridViewError } from "./submission-grid-view-menu";

type SubmissionGridShellProps = {
  formId: string;
  catalog: readonly AnswerColumn[];
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
  hasSubmissions,
  banner,
  children,
  ...viewProps
}: Readonly<SubmissionGridShellProps>) {
  useRememberListQuery(formId);
  const disabled = !hasSubmissions;
  return (
    <SubmissionGridProviders {...{ formId, catalog, ...viewProps }}>
      <SubmissionGridToolbar {...{ formId, catalog, disabled }} />
      <SubmissionGridViewError />
      {banner && <ReadinessBanner formId={formId} banner={banner} />}
      {hasSubmissions ? children : <NoSubmissionsEmptyState />}
    </SubmissionGridProviders>
  );
}

type ProvidersProps = Pick<
  SubmissionGridShellProps,
  "formId" | "catalog" | "view" | "canSaveView" | "children"
>;

function SubmissionGridProviders({
  view,
  children,
  ...props
}: Readonly<ProvidersProps>) {
  return (
    <SubmissionGridUrlProvider viewSettings={view.settings}>
      <SubmissionGridViewProvider view={view} {...props}>
        {children}
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
