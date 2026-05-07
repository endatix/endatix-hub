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
