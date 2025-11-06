export type Form = {
  id: string;
  name: string;
  description?: string;
  isEnabled: boolean;
  createdAt: Date;
  modifiedAt?: Date;
  submissionsCount?: number;
  themeId?: string;
  webHookSettingsJson?: string;
};

export type FormDefinition = {
  id: string;
  isDraft: boolean;
  jsonData: string;
  formId: string;
  isActive: boolean;
  createdAt: Date;
  modifiedAt: Date;
};

export type ActiveDefinition = FormDefinition & {
  themeModel?: string;
  requiresReCaptcha?: boolean;
  customQuestions?: string[];
};

export type FormTemplate = {
  id: string;
  name: string;
  description?: string;
  isEnabled: boolean;
  createdAt: Date;
  modifiedAt?: Date;
  jsonData?: string;
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
  Events: {
    [eventName: string]: WebHookEventConfig;
  };
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
  slackSettings?: SlackSettings;
  webHookSettings?: WebHookSettings;
  modifiedAt?: string | null;
};

export * from "./submission-status";
