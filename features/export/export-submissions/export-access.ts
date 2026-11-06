/**
 * What the user may do with a form's export, from the API's own rules: export
 * needs `submissions.export`; preparing (compile, backfill, draft refresh)
 * needs `submissions.export` or `forms.edit`; a rebuild from scratch clears
 * flattened data, so it needs `forms.edit`.
 */
export type SubmissionExportAccess = {
  /** Shows **Export Submissions**. */
  canExport: boolean;
  /** Shows the readiness banner's **Prepare** and **Include in-progress submissions**. */
  canPrepare: boolean;
  /** Shows **Rebuild reporting data…** in the export dialog. */
  canRebuild: boolean;
};

export const NO_SUBMISSION_EXPORT_ACCESS: SubmissionExportAccess = {
  canExport: false,
  canPrepare: false,
  canRebuild: false,
};

/** Maps the two grants to what the page shows: export needs export, prepare needs either, rebuild needs edit. */
export function submissionExportAccess(granted: {
  submissionsExport: boolean;
  formsEdit: boolean;
}): SubmissionExportAccess {
  return {
    canExport: granted.submissionsExport,
    canPrepare: granted.submissionsExport || granted.formsEdit,
    canRebuild: granted.formsEdit,
  };
}
