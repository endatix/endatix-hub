import { describe, it, expect, vi, beforeEach } from "vitest";
import { ApiResult, ERROR_CODE } from "@/lib/endatix-api";
import { submitFormAction } from "@/features/public-form/application/actions/submit-form.action";
import { Result } from "@/lib/result";
import { fail } from "assert";
import { ANONYMOUS_SESSION, getSession } from "@/features/auth";

interface GlobalTestMocks {
  endatixApiConstructorArgs: unknown[][];
  mockEndatixApi: {
    submissions: {
      public: {
        create: ReturnType<typeof vi.fn>;
        updateByToken: ReturnType<typeof vi.fn>;
      };
    };
  };
}

vi.mock("@/lib/endatix-api", async () => {
  const actual = await vi.importActual("@/lib/endatix-api");
  const endatixApiConstructorArgs: unknown[][] = [];
  const mockEndatixApi = {
    submissions: {
      public: {
        create: vi.fn(),
        updateByToken: vi.fn(),
      },
    },
  };
  const EndatixApiMock = vi.fn().mockImplementation(function (...args) {
    endatixApiConstructorArgs.push(args);
    return mockEndatixApi;
  });
  (globalThis as unknown as GlobalTestMocks).endatixApiConstructorArgs =
    endatixApiConstructorArgs;
  (globalThis as unknown as GlobalTestMocks).mockEndatixApi = mockEndatixApi;
  return {
    ...actual,
    EndatixApi: EndatixApiMock,
  };
});

vi.mock("@/features/public-form/infrastructure/cookie-store", () => ({
  FormTokenCookieStore: vi.fn().mockImplementation(() => mockTokenStore),
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn(),
}));

vi.mock("@/features/auth", async () => ({
  getSession: vi.fn().mockResolvedValue(() => ANONYMOUS_SESSION),
}));

const mockTokenStore = {
  getToken: vi.fn(),
  setToken: vi.fn(),
  deleteToken: vi.fn(),
};

describe("submitFormAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (
      globalThis as unknown as GlobalTestMocks
    ).endatixApiConstructorArgs.length = 0;
  });

  it("should create new submission when no token exists", async () => {
    // Arrange
    mockTokenStore.getToken.mockReturnValue(Result.error("No token found"));

    const mockSubmissionData = {
      jsonData: '{"test": true}',
      isComplete: false,
      currentPage: 1,
    };

    const mockCreateResponse = {
      token: "new-token",
      isComplete: false,
      id: "submission-123",
    };

    (
      globalThis as unknown as GlobalTestMocks
    ).mockEndatixApi.submissions.public.create.mockResolvedValue(
      ApiResult.success(mockCreateResponse),
    );

    // Act
    const actionResult = await submitFormAction("form-1", mockSubmissionData);

    // Assert
    expect(mockTokenStore.getToken).toHaveBeenCalledWith("form-1");
    expect(
      (globalThis as unknown as GlobalTestMocks).mockEndatixApi.submissions
        .public.create,
    ).toHaveBeenCalledWith("form-1", mockSubmissionData);
    expect(mockTokenStore.setToken).toHaveBeenCalledWith({
      formId: "form-1",
      token: "new-token",
    });
    expect(mockTokenStore.deleteToken).not.toHaveBeenCalled();
    expect(ApiResult.isSuccess(actionResult)).toBe(true);
    if (ApiResult.isSuccess(actionResult)) {
      expect(actionResult.data).toEqual({ submissionId: "submission-123" });
    }
  });

  it("should update existing submission when token exists", async () => {
    // Arrange
    mockTokenStore.getToken.mockReturnValue(Result.success("existing-token"));

    const mockSubmissionData = {
      jsonData: '{"test": true}',
      isComplete: false,
      currentPage: 2,
    };

    const mockUpdateResponse = {
      isComplete: false,
      id: "submission-123",
    };

    (
      globalThis as unknown as GlobalTestMocks
    ).mockEndatixApi.submissions.public.updateByToken.mockResolvedValue(
      ApiResult.success(mockUpdateResponse),
    );

    // Act
    const actionResult = await submitFormAction("form-1", mockSubmissionData);

    // Assert
    expect(mockTokenStore.getToken).toHaveBeenCalledWith("form-1");
    expect(
      (globalThis as unknown as GlobalTestMocks).mockEndatixApi.submissions
        .public.updateByToken,
    ).toHaveBeenCalledWith("form-1", "existing-token", mockSubmissionData);
    expect(mockTokenStore.setToken).not.toHaveBeenCalled();
    expect(mockTokenStore.deleteToken).not.toHaveBeenCalled();
    expect(ApiResult.isSuccess(actionResult)).toBe(true);
    if (ApiResult.isSuccess(actionResult)) {
      expect(actionResult.data).toEqual({ submissionId: "submission-123" });
    }
  });

  it("should delete token when submission is complete", async () => {
    // Arrange
    mockTokenStore.getToken.mockReturnValue(Result.success("existing-token"));

    const mockSubmissionData = {
      jsonData: '{"test": true}',
      isComplete: true,
      currentPage: 2,
    };

    const mockUpdateResponse = {
      isComplete: true,
      id: "submission-123",
    };

    (
      globalThis as unknown as GlobalTestMocks
    ).mockEndatixApi.submissions.public.updateByToken.mockResolvedValue(
      ApiResult.success(mockUpdateResponse),
    );

    // Act
    const actionResult = await submitFormAction("form-1", mockSubmissionData);

    // Assert
    expect(
      (globalThis as unknown as GlobalTestMocks).mockEndatixApi.submissions
        .public.updateByToken,
    ).toHaveBeenCalledWith("form-1", "existing-token", mockSubmissionData);
    expect(mockTokenStore.deleteToken).toHaveBeenCalledWith("form-1");
    expect(ApiResult.isSuccess(actionResult)).toBe(true);
  });

  it("should delete token when update fails due to expired submission token", async () => {
    // Arrange
    mockTokenStore.getToken.mockReturnValue(Result.success("existing-token"));
    (
      globalThis as unknown as GlobalTestMocks
    ).mockEndatixApi.submissions.public.updateByToken.mockResolvedValue(
      ApiResult.validationError(
        "Invalid or expired token",
        ERROR_CODE.SUBMISSION_TOKEN_INVALID,
      ),
    );

    // Act
    const actionResult = await submitFormAction("form-1", {
      jsonData: '{"test": true}',
      isComplete: false,
    });

    // Assert
    expect(mockTokenStore.deleteToken).toHaveBeenCalledWith("form-1");
    expect(ApiResult.isError(actionResult)).toBe(true);

    if (ApiResult.isSuccess(actionResult)) {
      fail("Expected error but got success");
    }
    expect(actionResult.error.errorCode).toBe(
      ERROR_CODE.SUBMISSION_TOKEN_INVALID,
    );
  });

  it("should NOT delete token when update fails for ReCaptcha error", async () => {
    // Arrange
    mockTokenStore.getToken.mockReturnValue(Result.success("existing-token"));
    (
      globalThis as unknown as GlobalTestMocks
    ).mockEndatixApi.submissions.public.updateByToken.mockResolvedValue(
      ApiResult.validationError(
        "Invalid reCAPTCHA token",
        ERROR_CODE.RECAPTCHA_VERIFICATION_FAILED,
      ),
    );

    // Act
    const actionResult = await submitFormAction("form-1", {
      jsonData: '{"test": true}',
      isComplete: false,
    });

    // Assert
    expect(mockTokenStore.deleteToken).not.toHaveBeenCalled();
    expect(ApiResult.isError(actionResult)).toBe(true);

    if (ApiResult.isSuccess(actionResult)) {
      fail("Expected error but got success");
    }
    expect(actionResult.error.errorCode).toBe(
      ERROR_CODE.RECAPTCHA_VERIFICATION_FAILED,
    );
  });

  it("should return a Result.error when the submission API call fails", async () => {
    // Arrange
    mockTokenStore.getToken.mockReturnValue(Result.error("No token found"));
    (
      globalThis as unknown as GlobalTestMocks
    ).mockEndatixApi.submissions.public.create.mockResolvedValue(
      ApiResult.authError("Unauthorized"),
    );

    // Act
    const result = await submitFormAction("form-1", {
      jsonData: '{"test": true}',
      isComplete: false,
    });

    // Assert
    expect(ApiResult.isError(result)).toBe(true);
    if (ApiResult.isSuccess(result)) {
      fail("Expected error but got success");
    }
    expect(result.error.errorCode).toBe(ERROR_CODE.AUTHENTICATION_REQUIRED);
  });

  it("should call endatix api with the correct session", async () => {
    // Arrange
    mockTokenStore.getToken.mockReturnValue(
      Result.success("partial-submission-token"),
    );
    const mockSession = {
      username: "test@user.com",
      accessToken: "access-token",
      refreshToken: "refresh-token",
      isLoggedIn: true,
    };
    vi.mocked(getSession).mockResolvedValue(mockSession);
    (
      globalThis as unknown as GlobalTestMocks
    ).mockEndatixApi.submissions.public.updateByToken.mockResolvedValue(
      ApiResult.success({}),
    );
    const submissionData = {
      jsonData: '{"test": true}',
      isComplete: false,
    };

    // Act
    const submitResult = await submitFormAction("form-1", submissionData);

    // Assert
    expect(ApiResult.isSuccess(submitResult)).toBe(true);
    expect(
      (globalThis as unknown as GlobalTestMocks).mockEndatixApi.submissions
        .public.updateByToken,
    ).toHaveBeenCalledWith(
      "form-1",
      "partial-submission-token",
      submissionData,
    );
    const argsArr = (globalThis as unknown as GlobalTestMocks)
      .endatixApiConstructorArgs;
    expect(argsArr[0][0]).toEqual(mockSession);
  });
});
