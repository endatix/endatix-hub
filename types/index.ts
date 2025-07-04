export type Form = {
  id: string;
  name: string;
  description?: string;
  isEnabled: boolean;
  createdAt: Date;
  modifiedAt?: Date;
  submissionsCount?: number;
  themeId?: string;
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

export type Submission = {
  id: string;
  formId: string;
  isComplete: boolean;
  jsonData: string;
  formDefinitionId: string;
  formDefinition?: FormDefinition;
  currentPage: number;
  metadata: string;
  token: string;
  completedAt: Date;
  createdAt: Date;
  modifiedAt: Date;
  status: string;
};

export type SlackAuthResponse = {
  ok: boolean;
  error: string;
  access_token: string;
};

export * from "./submission-status";
