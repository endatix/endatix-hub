import { getActiveDefinitionUseCase } from "@/features/public-form/use-cases/get-active-definition.use-case";
import { getPartialSubmissionUseCase } from "@/features/public-form/use-cases/get-partial-submission.use-case";
import { getPublicFormAccessUseCase } from "@/features/public-form/use-cases/get-public-form-access.use-case";
import { loadPublicSurveyPageUseCase } from "@/features/public-form/use-cases/load-public-survey-page.use-case";
import { getSubmissionByAccessTokenUseCase } from "@/features/public-submissions/edit/get-submission-by-access-token.use-case";
import { ApiResult, type Submission } from "@/lib/endatix-api";
import { ERROR_CODE } from "@/lib/endatix-api/shared/error-codes";
import { Result } from "@/lib/result";
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
  () => ({ getSubmissionByAccessTokenUseCase: vi.fn() }),
);

const formId = "form-1";
const token = "submission-1.1893456000.s.stamp~sig";
const createdAt = new Date("2026-06-10T12:00:00.000Z");
const tokenStore = {
  getToken: () => Result.error("No cookie found"),
} as never;

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

describe("loadPublicSurveyPageUseCase with a personalized link's access token", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getPublicFormAccessUseCase).mockResolvedValue(
      Result.success(publicAccess),
    );
  });

  it("loads a personalized link's cookie access token like a URL token, with no Start over", async () => {
    const linkToken = "submission-1.1893456000.s.stamp~sig";
    const cookieTokenStore = {
      getToken: vi.fn().mockReturnValue(Result.success(linkToken)),
    } as never;
    vi.mocked(getSubmissionByAccessTokenUseCase).mockResolvedValue(
      Result.success(accessTokenSubmission),
    );

    const result = await loadPublicSurveyPageUseCase({
      formId,
      tokenStore: cookieTokenStore,
    });

    expect(getPublicFormAccessUseCase).toHaveBeenCalledWith({
      formId,
      token: linkToken,
    });
    expect(getSubmissionByAccessTokenUseCase).toHaveBeenCalledWith({
      formId,
      token: linkToken,
    });
    expect(getActiveDefinitionUseCase).not.toHaveBeenCalled();
    expect(getPartialSubmissionUseCase).not.toHaveBeenCalled();
    expect(result.kind).toBe("success");
    if (result.kind === "success") {
      expect(result.activeDefinition.jsonData).toBe('{"title":"Snapshot"}');
      expect(result.canStartOver).toBe(false);
      expect(result.submissionPhase).toBe("resume");
    }
  });

  it.each([
    ERROR_CODE.TOKEN_REVOKED,
    ERROR_CODE.TOKEN_EXPIRED,
    ERROR_CODE.INVALID_ACCESS_TOKEN,
  ])(
    "shows the invalid-link page when the access check refuses the token with %s",
    async (errorCode) => {
      vi.mocked(getPublicFormAccessUseCase).mockResolvedValue(
        Result.validationError("Token refused", undefined, errorCode),
      );

      const result = await loadPublicSurveyPageUseCase({
        formId,
        tokenStore,
        urlToken: token,
      });

      expect(result).toEqual({ kind: "tokenSubmissionError", errorCode });
      expect(getSubmissionByAccessTokenUseCase).not.toHaveBeenCalled();
    },
  );

  it("keeps the submission-token path for an opaque cookie token", async () => {
    const cookieTokenStore = {
      getToken: vi.fn().mockReturnValue(Result.success("opaque-token")),
    } as never;
    vi.mocked(getPartialSubmissionUseCase).mockResolvedValue(
      ApiResult.notFoundError("No partial submission"),
    );
    vi.mocked(getActiveDefinitionUseCase).mockResolvedValue(
      Result.error("Not needed"),
    );

    await loadPublicSurveyPageUseCase({ formId, tokenStore: cookieTokenStore });

    expect(getPublicFormAccessUseCase).toHaveBeenCalledWith({ formId });
    expect(getSubmissionByAccessTokenUseCase).not.toHaveBeenCalled();
  });
});
