import { PublicFormPermissions } from "../domain/public-form-permissions";
import type { PublicFormAccessResponse } from "@/lib/endatix-api/forms/types";
import type { FormStorageAccess } from "../types";

const { Form: FormPerm, Submission: SubmissionPerm } = PublicFormPermissions;

/** Maps a public form access policy to storage access. */
export function mapPublicFormAccessToStorageAccess(
  policy: PublicFormAccessResponse,
  gateFormId: string,
  gateSubmissionId?: string,
): FormStorageAccess {
  const { formPermissions, submissionPermissions } = policy;

  const canViewFiles =
    formPermissions.includes(FormPerm.FileView) ||
    submissionPermissions.includes(SubmissionPerm.FileView);
  
  const canUploadFiles = submissionPermissions.includes(
    SubmissionPerm.FileUpload,
  );
  const canDeleteFiles = submissionPermissions.includes(
    SubmissionPerm.FileDelete,
  );

  return {
    formId: gateFormId,
    submissionId: policy.submissionId ?? gateSubmissionId,
    isPublicForm: false,
    canViewFiles,
    canUploadFiles,
    canDeleteFiles,
  };
}
