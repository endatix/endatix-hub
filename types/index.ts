export type Form = {
  id: string;
  name: string;
  description?: string;
  isEnabled: boolean;
  isPublic: boolean;
  limitOnePerUser?: boolean;
  metadata?: string;
  createdAt: Date;
  modifiedAt?: Date;
  submissionsCount?: number;
  themeId?: string;
  webHookSettingsJson?: string;
  activeDefinitionId?: string;
  folderId: string | null;
};

export type FormDefinition = {
  id: string;
  isDraft: boolean;
  jsonData: string;
  formId: string;
  isActive: boolean;
  createdAt: Date;
  modifiedAt: Date;
  themeModel?: string;
  customQuestions?: string[];
  requiresReCaptcha?: boolean;
  limitOnePerUser?: boolean;
  metadata?: string;
};

export type ActiveDefinition = FormDefinition;

export type FormTemplate = {
  id: string;
  name: string;
  description?: string;
  createdAt: Date;
  modifiedAt?: Date;
  jsonData?: string;
  folderId: string | null;
};

export type SlackAuthResponse = {
  ok: boolean;
  error: string;
  access_token: string;
};

export type WebHookEndpointConfig = {
  Url: string;
};

export type WebHookEventConfig = {
  IsEnabled: boolean;
  WebHookEndpoints: WebHookEndpointConfig[];
};

export type WebHookConfiguration = {
  Events: Record<string, WebHookEventConfig>;
};

export type SlackSettings = {
  token?: string;
  endatixHubBaseUrl?: string;
  channelId?: string;
  active: boolean;
};

export type WebHookSettings = {
  events: {
    [eventName: string]: {
      isEnabled: boolean;
      webHookEndpoints: Array<{ url: string }>;
    };
  };
};

export type TenantSettings = {
  tenantId: string;
  submissionTokenExpiryHours: number;
  isSubmissionTokenValidAfterCompletion: boolean;
  requireFolderAssignment: boolean;
  slackSettings?: SlackSettings;
  webHookSettings?: WebHookSettings;
  modifiedAt?: string | null;
};

export * from "./submission-status";
