export interface FormsListRequest {
  filter?: string;
}

export interface UpdateFormRequest {
  name?: string;
  isEnabled?: boolean;
  isPublic?: boolean;
  limitOnePerUser?: boolean;
  metadata?: string | null;
  themeId?: string | null;
  webHookSettingsJson?: string;
}
