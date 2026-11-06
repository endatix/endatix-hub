import "server-only";

import { authorization, Permissions } from "@/features/auth/authorization";
import {
  NO_SUBMISSION_EXPORT_ACCESS,
  submissionExportAccess,
  type SubmissionExportAccess,
} from "./export-access";

/** One permission check for the submissions page; a failed check allows nothing. */
export async function loadSubmissionExportAccess(): Promise<SubmissionExportAccess> {
  const { evaluatePermissions } = await authorization();
  const { Forms, Submissions } = Permissions;
  const result = await evaluatePermissions([Submissions.Export, Forms.Edit]);
  if (!result.success) return NO_SUBMISSION_EXPORT_ACCESS;
  return submissionExportAccess({
    submissionsExport: result.data[Submissions.Export],
    formsEdit: result.data[Forms.Edit],
  });
}
