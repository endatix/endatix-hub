export type SlackSettings = {
  active: boolean;
  webhookUrl?: string;
  channelName?: string;
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
