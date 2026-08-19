import { getActiveDefinitionUseCase } from "@/features/public-form/use-cases/get-active-definition.use-case";
import { getPartialSubmissionUseCase } from "@/features/public-form/use-cases/get-partial-submission.use-case";
import { getPublicFormAccessUseCase } from "@/features/public-form/use-cases/get-public-form-access.use-case";
import { loadPublicSurveyPageUseCase } from "@/features/public-form/use-cases/load-public-survey-page.use-case";
import { getSubmissionByAccessTokenUseCase } from "@/features/public-submissions/edit/get-submission-by-access-token.use-case";
import { ApiResult, type Submission } from "@/lib/endatix-api";
import { ERROR_CODE } from "@/lib/endatix-api/shared/error-codes";
import { Result, type ResultType } from "@/lib/result";
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
    vi.mocked(getActiveDefinitionUseCase).mockResolvedValue(
      Result.success(activeDefinition),
    );
    vi.mocked(getPartialSubmissionUseCase).mockResolvedValue(
      ApiResult.notFoundError("No partial submission"),
    );
  });

  it("loads access, submission, and definition in one async pass", async () => {
    const definition = createDeferred<ResultType<ActiveDefinition>>();
    vi.mocked(getActiveDefinitionUseCase).mockReturnValue(definition.promise);

    const resultPromise = loadPublicSurveyPageUseCase({
      formId,
      tokenStore,
    });

    expect(getPublicFormAccessUseCase).toHaveBeenCalledWith({ formId });
    expect(getPartialSubmissionUseCase).toHaveBeenCalledWith({
      formId,
      tokenStore,
    });
    expect(getActiveDefinitionUseCase).toHaveBeenCalledWith({ formId });

    definition.resolve(Result.success(activeDefinition));
    const result = await resultPromise;

    expect(result.kind).toBe("success");
  });

  it("returns success with blocked phase when respondent already submitted", async () => {
    vi.mocked(getPublicFormAccessUseCase).mockResolvedValue(
      Result.success({
        ...publicAccess,
        limitOnePerUser: true,
        hasUserSubmitted: true,
        canStartNewSubmission: false,
      }),
    );

    const result = await loadPublicSurveyPageUseCase({
      formId,
      tokenStore,
    });

    expect(result).toMatchObject({
      kind: "success",
      submissionPhase: "blocked",
      activeDefinition,
    });
  });

  it("keeps survey active when user can view but cannot create a submission", async () => {
    vi.mocked(getPublicFormAccessUseCase).mockResolvedValue(
      Result.success({
        ...publicAccess,
        hasUserSubmitted: false,
        canStartNewSubmission: false,
      }),
    );

    const result = await loadPublicSurveyPageUseCase({
      formId,
      tokenStore,
    });

    expect(result).toMatchObject({
      kind: "success",
      submissionPhase: "active",
      activeDefinition,
    });
  });

  it("keeps a cookie draft active when respondent already submitted", async () => {
    vi.mocked(getPublicFormAccessUseCase).mockResolvedValue(
      Result.success({
        ...publicAccess,
        limitOnePerUser: true,
        hasUserSubmitted: true,
        canStartNewSubmission: false,
      }),
    );
    vi.mocked(getPartialSubmissionUseCase).mockResolvedValue(
      ApiResult.success({
        id: "submission-1",
        isComplete: false,
      } as Submission),
    );

    const result = await loadPublicSurveyPageUseCase({
      formId,
      tokenStore,
    });

    expect(result).toMatchObject({
      kind: "success",
      submissionPhase: "active",
      submission: { id: "submission-1" },
    });
  });

  it("loads token submissions through the access token use case", async () => {
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

  it("keeps completed access-token submissions active for the completed-token view", async () => {
    const completedSubmission: Submission = {
      ...accessTokenSubmission,
      isComplete: true,
      status: "completed",
    };
    vi.mocked(getPublicFormAccessUseCase).mockResolvedValue(
      Result.success({
        ...publicAccess,
        hasUserSubmitted: true,
        canStartNewSubmission: false,
      }),
    );
    vi.mocked(getSubmissionByAccessTokenUseCase).mockResolvedValue(
      Result.success(completedSubmission),
    );

    const result = await loadPublicSurveyPageUseCase({
      formId,
      tokenStore,
      urlToken: token,
    });

    expect(result.kind).toBe("success");
    if (result.kind === "success") {
      expect(result.submissionPhase).toBe("active");
      expect(result.submission).toBe(completedSubmission);
    }
    expect(getActiveDefinitionUseCase).not.toHaveBeenCalled();
    expect(getPartialSubmissionUseCase).not.toHaveBeenCalled();
  });

  it.each([
    ["invalid token", ERROR_CODE.INVALID_TOKEN],
    ["submission token invalid", ERROR_CODE.SUBMISSION_TOKEN_INVALID],
    ["access forbidden", ERROR_CODE.ACCESS_FORBIDDEN],
    ["authentication required", ERROR_CODE.AUTHENTICATION_REQUIRED],
    ["resource not found", ERROR_CODE.RESOURCE_NOT_FOUND],
    ["unknown error", ERROR_CODE.UNKNOWN_ERROR],
  ] as const)(
    "propagates token submission error code %s",
    async (_name, errorCode) => {
      vi.mocked(getSubmissionByAccessTokenUseCase).mockResolvedValue(
        Result.error("Failed to load submission", undefined, errorCode),
      );

      const result = await loadPublicSurveyPageUseCase({
        formId,
        tokenStore,
        urlToken: token,
      });

      expect(result).toEqual({
        kind: "tokenSubmissionError",
        errorCode,
      });
    },
  );

  it("falls back to unknown_error when access token result has no error code", async () => {
    vi.mocked(getSubmissionByAccessTokenUseCase).mockResolvedValue(
      Result.error("Failed to load submission"),
    );

    const result = await loadPublicSurveyPageUseCase({
      formId,
      tokenStore,
      urlToken: token,
    });

    expect(result).toEqual({
      kind: "tokenSubmissionError",
      errorCode: ERROR_CODE.UNKNOWN_ERROR,
    });
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

  it("propagates partial submission lookup failures instead of treating them as no draft", async () => {
    vi.mocked(getPartialSubmissionUseCase).mockResolvedValue(
      ApiResult.networkError("Upstream unavailable"),
    );

    const result = await loadPublicSurveyPageUseCase({
      formId,
      tokenStore,
    });

    expect(result).toEqual({
      kind: "submissionLoadError",
      errorCode: ERROR_CODE.NETWORK_ERROR,
    });
  });

  it("returns notFound when access or definition cannot be loaded", async () => {
    vi.mocked(getPublicFormAccessUseCase).mockResolvedValue(
      Result.error("Access denied"),
    );

    const accessResult = await loadPublicSurveyPageUseCase({
      formId,
      tokenStore,
    });

    vi.mocked(getPublicFormAccessUseCase).mockResolvedValue(
      Result.success(publicAccess),
    );
    vi.mocked(getActiveDefinitionUseCase).mockResolvedValue(
      Result.error("Definition missing"),
    );

    const definitionResult = await loadPublicSurveyPageUseCase({
      formId,
      tokenStore,
    });

    expect(accessResult).toEqual({ kind: "notFound" });
    expect(definitionResult).toEqual({ kind: "notFound" });
  });

  it("returns unauthorized when anonymous access to a private form is denied", async () => {
    vi.mocked(getPublicFormAccessUseCase).mockResolvedValue(
      Result.error(
        "You must be authenticated to access this form",
        undefined,
        ERROR_CODE.AUTHENTICATION_REQUIRED,
      ),
    );

    const result = await loadPublicSurveyPageUseCase({
      formId,
      tokenStore,
    });

    expect(result).toEqual({ kind: "unauthorized" });
  });

  it("returns forbidden when authenticated access to a private form is denied", async () => {
    vi.mocked(getPublicFormAccessUseCase).mockResolvedValue(
      Result.error(
        "You are not allowed to access this form",
        undefined,
        ERROR_CODE.ACCESS_FORBIDDEN,
      ),
    );

    const result = await loadPublicSurveyPageUseCase({
      formId,
      tokenStore,
    });

    expect(result).toEqual({ kind: "forbidden" });
  });
});

function createDeferred<T>(): {
  promise: Promise<T>;
  resolve: (value: T) => void;
} {
  let resolve: (value: T) => void = () => {};
  const promise = new Promise<T>((promiseResolve) => {
    resolve = promiseResolve;
  });

  return { promise, resolve };
}
