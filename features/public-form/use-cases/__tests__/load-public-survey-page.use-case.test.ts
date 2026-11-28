import { getActiveDefinitionUseCase } from "@/features/public-form/use-cases/get-active-definition.use-case";
import { getPartialSubmissionUseCase } from "@/features/public-form/use-cases/get-partial-submission.use-case";
import { getPublicFormAccessUseCase } from "@/features/public-form/use-cases/get-public-form-access.use-case";
import { loadPublicSurveyPageUseCase } from "@/features/public-form/use-cases/load-public-survey-page.use-case";
import { getSubmissionByAccessTokenUseCase } from "@/features/public-submissions/edit/get-submission-by-access-token.use-case";
import { ApiResult, type Submission } from "@/lib/endatix-api";
import { ERROR_CODE } from "@/lib/endatix-api/shared/error-codes";
import { Result } from "@/lib/result";
import { activeDefinition, formId, publicAccess, savedSubmission } from "./public-survey-page.fixtures";
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

const token = "access-token";
const tokenStore = { getAccessToken: () => undefined } as never;

describe("loadPublicSurveyPageUseCase", () => {
  beforeEach(() => {
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

  it("does not load a cookie submission or active definition when access is denied", async () => {
    // Arrange
    vi.mocked(getPublicFormAccessUseCase).mockResolvedValue(
      Result.error("Access denied", undefined, ERROR_CODE.ACCESS_FORBIDDEN),
    );

    // Act
    const result = await loadPublicSurveyPageUseCase({ formId, tokenStore });

    // Assert
    expect(result).toEqual({ kind: "forbidden" });
    expect(getPartialSubmissionUseCase).not.toHaveBeenCalled();
    expect(getActiveDefinitionUseCase).not.toHaveBeenCalled();
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
      submissionPhase: "resume",
      activeDefinition,
    });
  });

  it("resumes the cookie submission on its bound definition even when the respondent cannot start another", async () => {
    // Arrange
    vi.mocked(getPublicFormAccessUseCase).mockResolvedValue(
      Result.success({
        ...publicAccess,
        limitOnePerUser: true,
        hasUserSubmitted: true,
        canStartNewSubmission: false,
      }),
    );
    vi.mocked(getPartialSubmissionUseCase).mockResolvedValue(
      ApiResult.success(savedSubmission),
    );

    // Act
    const result = await loadPublicSurveyPageUseCase({ formId, tokenStore });

    // Assert
    expect(result).toMatchObject({
      kind: "success",
      submissionPhase: "resume",
      activeDefinition: {
        ...activeDefinition,
        isActive: false,
        id: "snapshot-definition-1",
        jsonData: '{"title":"Snapshot"}',
      },
      submission: savedSubmission,
    });
  });

  it("loads token submissions through the access token use case", async () => {
    vi.mocked(getSubmissionByAccessTokenUseCase).mockResolvedValue(
      Result.success(savedSubmission),
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
      expect(result.submission).toBe(savedSubmission);
      expect(result.submissionPhase).toBe("resume");
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
      ...savedSubmission,
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
      expect(result.submissionPhase).toBe("completed");
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

  it("loads the active definition for a new respondent", async () => {
    // Act
    const result = await loadPublicSurveyPageUseCase({ formId, tokenStore });

    // Assert
    expect(result).toMatchObject({
      kind: "success",
      activeDefinition,
      submission: undefined,
    });
  });

  it("does not render a saved response without its current form settings", async () => {
    // Arrange
    vi.mocked(getPartialSubmissionUseCase).mockResolvedValue(
      ApiResult.success(savedSubmission),
    );
    vi.mocked(getActiveDefinitionUseCase).mockResolvedValue(
      Result.error("Settings unavailable"),
    );

    // Act
    const result = await loadPublicSurveyPageUseCase({ formId, tokenStore });

    // Assert
    expect(result.kind).toBe("submissionLoadError");
  });

  it.each([undefined, "not json", "[]"])(
    "returns a submission error for unreadable bound questions (%s)",
    async (jsonData) => {
      // Arrange
      vi.mocked(getPartialSubmissionUseCase).mockResolvedValue(
        ApiResult.success({
          ...savedSubmission,
          formDefinition: jsonData
            ? { ...activeDefinition, jsonData }
            : undefined,
        }),
      );
      // Act
      const result = await loadPublicSurveyPageUseCase({ formId, tokenStore });
      // Assert
      expect(result).toEqual({
        kind: "submissionLoadError",
        errorCode: ERROR_CODE.RESOURCE_NOT_FOUND,
      });
    },
  );

  it.each([
    ["complete", "completed"],
    ["cancelled", "closed"],
  ] as const)(
    "shows %s with restart allowed even when questions are unavailable",
    async (collectionStatus, submissionPhase) => {
      // Arrange
      vi.mocked(getPartialSubmissionUseCase).mockResolvedValue(
        ApiResult.success({
          ...savedSubmission,
          collectionStatus,
          formDefinition: undefined,
        }),
      );
      // Act
      const result = await loadPublicSurveyPageUseCase({ formId, tokenStore });
      // Assert
      expect(result).toMatchObject({
        kind: "finished",
        submissionPhase,
        canStartOver: true,
      });
      expect(getActiveDefinitionUseCase).not.toHaveBeenCalled();
    },
  );

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

  it("returns notFound for a confirmed missing form", async () => {
    vi.mocked(getPublicFormAccessUseCase).mockResolvedValue(
      Result.error("Form not found", undefined, ERROR_CODE.RESOURCE_NOT_FOUND),
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

  it("returns accessLoadError for invalid form identifiers", async () => {
    vi.mocked(getPublicFormAccessUseCase).mockResolvedValue(
      Result.error("Invalid formId", undefined, ERROR_CODE.VALIDATION_ERROR),
    );

    const result = await loadPublicSurveyPageUseCase({
      formId,
      tokenStore,
    });

    expect(result).toEqual({
      kind: "accessLoadError",
      errorCode: ERROR_CODE.VALIDATION_ERROR,
    });
  });

  it("returns accessLoadError for operational access failures", async () => {
    vi.mocked(getPublicFormAccessUseCase).mockResolvedValue(
      Result.error("Upstream unavailable", undefined, ERROR_CODE.NETWORK_ERROR),
    );

    const result = await loadPublicSurveyPageUseCase({
      formId,
      tokenStore,
    });

    expect(result).toEqual({
      kind: "accessLoadError",
      errorCode: ERROR_CODE.NETWORK_ERROR,
    });
  });

  it("returns accessLoadError when access fails without a mapped error code", async () => {
    vi.mocked(getPublicFormAccessUseCase).mockResolvedValue(
      Result.error("Access denied"),
    );

    const result = await loadPublicSurveyPageUseCase({
      formId,
      tokenStore,
    });

    expect(result).toEqual({
      kind: "accessLoadError",
      errorCode: ERROR_CODE.UNKNOWN_ERROR,
    });
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

  it("does not load the submission when public access is denied", async () => {
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
      urlToken: token,
    });

    expect(getSubmissionByAccessTokenUseCase).not.toHaveBeenCalled();
    expect(result).toEqual({ kind: "unauthorized" });
  });

  it("returns host copy for form_unavailable and skips the submission", async () => {
    vi.mocked(getPublicFormAccessUseCase).mockResolvedValue(
      Result.error(
        "Thank you for your interest. Unfortunately, this survey can no longer be completed.",
        undefined,
        ERROR_CODE.FORM_UNAVAILABLE,
        {
          problemTitle: "This survey is no longer available.",
          problemMediaType: "application/problem+json",
        },
      ),
    );

    const result = await loadPublicSurveyPageUseCase({
      formId,
      tokenStore,
      urlToken: token,
    });

    expect(getSubmissionByAccessTokenUseCase).not.toHaveBeenCalled();
    expect(result).toEqual({
      kind: "formUnavailable",
      title: "This survey is no longer available.",
      message:
        "Thank you for your interest. Unfortunately, this survey can no longer be completed.",
    });
  });

  it("keeps a generic forbidden page when form_unavailable is not problem+json", async () => {
    vi.mocked(getPublicFormAccessUseCase).mockResolvedValue(
      Result.error(
        "Thank you for your interest.",
        undefined,
        ERROR_CODE.FORM_UNAVAILABLE,
        {
          problemTitle: "Closed",
          problemMediaType: "application/json",
        },
      ),
    );

    const result = await loadPublicSurveyPageUseCase({
      formId,
      tokenStore,
      urlToken: token,
    });

    expect(result).toEqual({ kind: "forbidden" });
  });

  it("keeps a generic forbidden page when a 403 has no form_unavailable code", async () => {
    vi.mocked(getPublicFormAccessUseCase).mockResolvedValue(
      Result.error(
        "internal assignment table missed a row",
        undefined,
        ERROR_CODE.ACCESS_FORBIDDEN,
        { problemTitle: "Forbidden access" },
      ),
    );

    const result = await loadPublicSurveyPageUseCase({
      formId,
      tokenStore,
      urlToken: token,
    });

    expect(result).toEqual({ kind: "forbidden" });
  });

  it("uses the token error when access succeeds and the submission is forbidden", async () => {
    vi.mocked(getSubmissionByAccessTokenUseCase).mockResolvedValue(
      Result.error("Token expired", undefined, ERROR_CODE.TOKEN_EXPIRED),
    );

    const result = await loadPublicSurveyPageUseCase({
      formId,
      tokenStore,
      urlToken: token,
    });

    expect(result).toEqual({
      kind: "tokenSubmissionError",
      errorCode: ERROR_CODE.TOKEN_EXPIRED,
    });
  });
});
