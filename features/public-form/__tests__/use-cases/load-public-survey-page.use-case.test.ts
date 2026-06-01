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
  async (importOriginal) => {
    const actual =
      await importOriginal<
        typeof import("@/features/public-submissions/edit/get-submission-by-access-token.use-case")
      >();

    return {
      ...actual,
      getSubmissionByAccessTokenUseCase: vi.fn(),
    };
  },
);

const tokenStore = {};

const activeDefinition = {
  id: "definition-1",
  jsonData: "{}",
  formId: "form-1",
  isActive: true,
  isDraft: false,
  createdAt: new Date(),
  modifiedAt: new Date(),
} satisfies ActiveDefinition;

const publicFormAccess = {
  formId: "form-1",
  submissionId: null,
  formPermissions: [],
  submissionPermissions: [],
  limitOnePerUser: false,
  hasUserSubmitted: false,
  canStartNewSubmission: true,
  isRespondentTestMode: false,
  cachedAt: "2026-01-01T00:00:00.000Z",
  expiresAt: "2026-01-01T00:05:00.000Z",
  eTag: "etag-1",
};

describe("loadPublicSurveyPageUseCase", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getPublicFormAccessUseCase).mockResolvedValue(
      Result.success(publicFormAccess),
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
      formId: "form-1",
      tokenStore: tokenStore as never,
    });

    expect(getPublicFormAccessUseCase).toHaveBeenCalledWith({
      formId: "form-1",
      token: undefined,
    });
    expect(getPartialSubmissionUseCase).toHaveBeenCalledWith({
      formId: "form-1",
      tokenStore,
    });
    expect(getActiveDefinitionUseCase).toHaveBeenCalledWith({
      formId: "form-1",
    });

    definition.resolve(Result.success(activeDefinition));
    const result = await resultPromise;

    expect(result.kind).toBe("success");
  });

  it("returns success with blocked phase when respondent already submitted", async () => {
    vi.mocked(getPublicFormAccessUseCase).mockResolvedValue(
      Result.success({
        ...publicFormAccess,
        limitOnePerUser: true,
        hasUserSubmitted: true,
        canStartNewSubmission: false,
      }),
    );

    const result = await loadPublicSurveyPageUseCase({
      formId: "form-1",
      tokenStore: tokenStore as never,
    });

    expect(result).toMatchObject({
      kind: "success",
      submissionPhase: "blocked",
      activeDefinition,
    });
  });

  it("keeps a cookie draft active when respondent already submitted", async () => {
    vi.mocked(getPublicFormAccessUseCase).mockResolvedValue(
      Result.success({
        ...publicFormAccess,
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
      formId: "form-1",
      tokenStore: tokenStore as never,
    });

    expect(result).toMatchObject({
      kind: "success",
      submissionPhase: "active",
      submission: { id: "submission-1" },
    });
  });

  it("loads token submissions through the access token use case", async () => {
    const submission = { id: "submission-1", isComplete: true } as Submission;
    vi.mocked(getSubmissionByAccessTokenUseCase).mockResolvedValue(
      Result.success(submission),
    );

    const result = await loadPublicSurveyPageUseCase({
      formId: "form-1",
      tokenStore: tokenStore as never,
      urlToken: "token.rw",
    });

    expect(getSubmissionByAccessTokenUseCase).toHaveBeenCalledWith({
      formId: "form-1",
      token: "token.rw",
    });
    expect(getPartialSubmissionUseCase).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      kind: "success",
      submissionPhase: "active",
      submission,
    });
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
        formId: "form-1",
        tokenStore: tokenStore as never,
        urlToken: "token.rw",
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
      formId: "form-1",
      tokenStore: tokenStore as never,
      urlToken: "token.rw",
    });

    expect(result).toEqual({
      kind: "tokenSubmissionError",
      errorCode: ERROR_CODE.UNKNOWN_ERROR,
    });
  });

  it("returns notFound when access or definition cannot be loaded", async () => {
    vi.mocked(getPublicFormAccessUseCase).mockResolvedValue(
      Result.error("Access denied"),
    );

    const accessResult = await loadPublicSurveyPageUseCase({
      formId: "form-1",
      tokenStore: tokenStore as never,
    });

    vi.mocked(getPublicFormAccessUseCase).mockResolvedValue(
      Result.success(publicFormAccess),
    );
    vi.mocked(getActiveDefinitionUseCase).mockResolvedValue(
      Result.error("Definition missing"),
    );

    const definitionResult = await loadPublicSurveyPageUseCase({
      formId: "form-1",
      tokenStore: tokenStore as never,
    });

    expect(accessResult).toEqual({ kind: "notFound" });
    expect(definitionResult).toEqual({ kind: "notFound" });
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
