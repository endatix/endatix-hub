export interface FormsListRequest {
  filter?: string;
  folderId?: string;
}

export interface UpdateFormRequest {
  name?: string;
  isEnabled?: boolean;
  isPublic?: boolean;
  limitOnePerUser?: boolean;
  metadata?: string | null;
  themeId?: string | null;
  webHookSettingsJson?: string;
  folderId?: string | null;
  clearFolderId?: boolean;
}

/** Optional body for POST /public/forms/{formId}/access-tokens. */
export interface CreateFormAccessTokenRequest {
  token?: string;
  tokenType?: "AccessToken" | "SubmissionToken";
}

export interface FormAccessTokenResponse {
  token: string;
  expiresAtUtc: string;
}

/** Query for GET /public/forms/{formId}/access. */
export interface GetPublicFormAccessRequest {
  token?: string;
  tokenType?: "AccessToken" | "SubmissionToken";
}

/** Response from GET /public/forms/{formId}/access. */
export interface PublicFormAccessResponse {
  formId: string;
  submissionId: string | null;
  formPermissions: string[];
  submissionPermissions: string[];
  limitOnePerUser: boolean;
  hasUserSubmitted: boolean;
  canStartNewSubmission: boolean;
  isRespondentTestMode: boolean;
  cachedAt: string;
  expiresAt: string;
  eTag: string;
}
