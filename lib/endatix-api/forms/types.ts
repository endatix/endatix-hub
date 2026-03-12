export interface FormsListRequest {
  filter?: string;
}

export interface UpdateFormRequest {
  name?: string;
  isEnabled?: boolean;
  isPublic?: boolean;
  themeId?: string | null;
  webHookSettingsJson?: string;
}
