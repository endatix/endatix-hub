import { getActiveDefinitionUseCase } from "@/features/public-form/use-cases/get-active-definition.use-case";
import { getPartialSubmissionUseCase } from "@/features/public-form/use-cases/get-partial-submission.use-case";
import { getPublicFormAccessUseCase } from "@/features/public-form/use-cases/get-public-form-access.use-case";
import { loadPublicSurveyPageUseCase } from "@/features/public-form/use-cases/load-public-survey-page.use-case";
import { getSubmissionByAccessTokenUseCase } from "@/features/public-submissions/edit/get-submission-by-access-token.use-case";
import { ApiResult, type Submission } from "@/lib/endatix-api";
import { Result } from "@/lib/result";
import type { ActiveDefinition } from "@/types";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock(
  "@/features/public-form/use-cases/get-active-definition.use-case",
  () => ({
    getActiveDefinitionUseCase: vi.fn(),
  }),
);

vi.mock(
  "@/features/public-form/use-cases/get-partial-submission.use-case",
  () => ({
    getPartialSubmissionUseCase: vi.fn(),
  }),
);

vi.mock(
  "@/features/public-form/use-cases/get-public-form-access.use-case",
  () => ({
    getPublicFormAccessUseCase: vi.fn(),
  }),
);

vi.mock(
  "@/features/public-submissions/edit/get-submission-by-access-token.use-case",
  () => ({
    getSubmissionByAccessTokenUseCase: vi.fn(),
  }),
);

const formId = "form-1";
const token = "access-token";
const createdAt = new Date("2026-06-10T12:00:00.000Z");
const tokenStore = {} as never;

const publicAccess = {
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

const activeDefinition: ActiveDefinition = {
  id: "active-definition-1",
  formId,
  isActive: true,
  isDraft: false,
  jsonData: '{"title":"Active"}',
  createdAt,
  modifiedAt: createdAt,
  customQuestions: [],
  requiresReCaptcha: false,
  limitOnePerUser: false,
};

const accessTokenSubmission: Submission = {
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
    isActive: true,
    isDraft: false,
    jsonData: '{"title":"Snapshot"}',
    createdAt,
    modifiedAt: createdAt,
  },
};

describe("loadPublicSurveyPageUseCase", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getPublicFormAccessUseCase).mockResolvedValue(
      Result.success(publicAccess),
    );
  });

  it("uses the access-token submission definition and skips active definition lookup", async () => {
    vi.mocked(getSubmissionByAccessTokenUseCase).mockResolvedValue(
      Result.success(accessTokenSubmission),
    );
    vi.mocked(getActiveDefinitionUseCase).mockRejectedValue(
      new Error("private form definition should not be fetched"),
    );

    const result = await loadPublicSurveyPageUseCase({
      formId,
      tokenStore,
      urlToken: token,
    });

    expect(result.kind).toBe("success");
    if (result.kind === "success") {
      expect(result.activeDefinition.jsonData).toBe('{"title":"Snapshot"}');
      expect(result.submission).toBe(accessTokenSubmission);
      expect(result.submissionPhase).toBe("active");
    }

    expect(getSubmissionByAccessTokenUseCase).toHaveBeenCalledWith({
      formId,
      token,
    });
    expect(getActiveDefinitionUseCase).not.toHaveBeenCalled();
    expect(getPartialSubmissionUseCase).not.toHaveBeenCalled();
  });

  it("keeps the active definition lookup for non-token public form loads", async () => {
    vi.mocked(getPartialSubmissionUseCase).mockResolvedValue(
      ApiResult.notFoundError("No partial submission"),
    );
    vi.mocked(getActiveDefinitionUseCase).mockResolvedValue(
      Result.success(activeDefinition),
    );

    const result = await loadPublicSurveyPageUseCase({
      formId,
      tokenStore,
    });

    expect(result.kind).toBe("success");
    if (result.kind === "success") {
      expect(result.activeDefinition).toBe(activeDefinition);
      expect(result.submission).toBeUndefined();
    }

    expect(getActiveDefinitionUseCase).toHaveBeenCalledWith({ formId });
    expect(getSubmissionByAccessTokenUseCase).not.toHaveBeenCalled();
  });
});
