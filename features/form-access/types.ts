export type FormStorageTokenType = "AccessToken" | "SubmissionToken";

export function isFormStorageTokenType(
  value: string,
): value is FormStorageTokenType {
  return value === "AccessToken" || value === "SubmissionToken";
}

/** Gate input resolved from the request body and optional submission cookie. */
export interface FormStorageGateInput {
  formId: string;
  submissionId?: string;
  token?: string;
  tokenType?: FormStorageTokenType;
}

/** Resolved storage permissions for public-form storage routes. */
export interface FormStorageAccess {
  /** Snapshot already loaded by the gate. Null means an expected snapshot was missing. */
  definitionJson?: string | null;
  formId: string;
  submissionId?: string;
  isPublicForm: boolean;
  canViewFiles: boolean;
  canUploadFiles: boolean;
  canDeleteFiles: boolean;
}

export type HubStorageScope = {
  formId?: string;
  templateId?: string;
  submissionId?: string;
};
