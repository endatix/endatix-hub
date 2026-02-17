export interface FormAccessData {
  formId: string;
  submissionId?: string;
  formPermissions: string[];
  submissionPermissions: string[];
}

export const FormPermissions = {
  VIEW: "form.view",
  DESIGN: "form.design",
} as const;

export const SubmissionPermissions = {
  CREATE: "submission.create",
  VIEW: "submission.view",
  EDIT: "submission.edit",
  UPLOAD_FILE: "submission.file.upload",
  DELETE_FILE: "submission.file.delete",
  VIEW_FILES: "submission.file.view",
} as const;

export type FormPermission =
  (typeof FormPermissions)[keyof typeof FormPermissions];
export type SubmissionPermission =
  (typeof SubmissionPermissions)[keyof typeof SubmissionPermissions];
