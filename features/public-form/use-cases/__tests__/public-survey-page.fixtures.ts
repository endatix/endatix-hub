import type { Submission } from "@/lib/endatix-api";
import type { ActiveDefinition } from "@/types";

export const formId = "form-1";
const createdAt = new Date("2026-06-10T12:00:00.000Z");

export const publicAccess = {
  formId,
  submissionId: null,
  formPermissions: [],
  submissionPermissions: [],
  limitOnePerUser: false,
  hasUserSubmitted: false,
  canStartNewSubmission: true,
  isRespondentTestMode: false,
  cachedAt: createdAt.toISOString(),
  expiresAt: createdAt.toISOString(),
  eTag: "etag",
};

export const activeDefinition: ActiveDefinition = {
  id: "active-definition-1",
  formId,
  isActive: true,
  isDraft: false,
  jsonData: '{"title":"Active"}',
  createdAt,
  modifiedAt: createdAt,
  customQuestions: ['{"name":"tenantQuestion","title":"Tenant question","questionJSON":{"type":"text"}}'],
  requiresReCaptcha: true,
  limitOnePerUser: true,
  themeModel: '{"themeName":"plain"}',
  metadata: '{"embed":"compact"}',
};

export const savedSubmission: Submission = {
  id: "submission-1",
  createdAt,
  formId,
  formDefinitionId: "snapshot-definition-1",
  isComplete: false,
  jsonData: "{}",
  currentPage: 0,
  metadata: "{}",
  token: "submission-token",
  status: "draft",
  formDefinition: {
    id: "snapshot-definition-1",
    formId,
    isActive: false,
    isDraft: false,
    jsonData: '{"title":"Snapshot"}',
    createdAt,
    modifiedAt: createdAt,
  },
};
