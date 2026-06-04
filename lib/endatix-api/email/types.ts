export type EmailProviderInfo = {
  providerName: string;
  isConfigured: boolean;
};

export type EmailTemplateSummary = {
  id: number;
  name: string;
  subject: string;
  fromAddress: string;
};

export type SendTestEmailRequest = {
  toEmail: string;
  fromEmail: string;
  templateId?: string;
};
