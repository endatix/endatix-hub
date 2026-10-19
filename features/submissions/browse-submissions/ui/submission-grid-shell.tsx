"use client";

import { rememberSubmissionListReturnTo } from "@/features/submissions/list-submission-query";
import { NoSubmissionsEmptyState } from "@/features/submissions/ui/submissions-empty-state";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, type ReactNode } from "react";
import type { GridReadinessBanner } from "../grid-readiness";
import type { AnswerColumn } from "../submission-grid-columns";
import {
  viewDefaults,
  type SubmissionGridViewLoad,
} from "../submission-grid-view";
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
  /** The form's shared view; the URL overrides its columns, page size and sort. */
  view: SubmissionGridViewLoad;
  /** Form editors get Save view. */
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

/** URL state with the saved view filled in, then the unsaved view on top. */
function SubmissionGridProviders({
  view,
  children,
  ...props
}: Readonly<ProvidersProps>) {
  const defaults = useMemo(() => viewDefaults(view.settings), [view.settings]);
  return (
    <SubmissionGridUrlProvider viewDefaults={defaults}>
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
