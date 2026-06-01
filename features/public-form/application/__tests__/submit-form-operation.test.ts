import { ANONYMOUS_SESSION, getSession } from "@/features/auth";
import { submitFormOperation } from "@/features/public-form/application/submit-form-operation";
import { ApiResult, ERROR_CODE } from "@/lib/endatix-api";
import { Result } from "@/lib/result";
import { fail } from "assert";
import { beforeEach, describe, expect, it, vi } from "vitest";

interface GlobalTestMocks {
  endatixApiConstructorArgs: unknown[][];
  mockEndatixApi: {
    submissions: {
      public: {
        create: ReturnType<typeof vi.fn>;
        updateByToken: ReturnType<typeof vi.fn>;
        updateByAccessToken: ReturnType<typeof vi.fn>;
        getByToken: ReturnType<typeof vi.fn>;
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
        updateByAccessToken: vi.fn(),
        getByToken: vi.fn(),
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

vi.mock("@/features/auth", async () => ({
  getSession: vi.fn().mockResolvedValue(() => ANONYMOUS_SESSION),
}));

const mockTokenStore = {
  getToken: vi.fn(),
  setToken: vi.fn(),
  deleteToken: vi.fn(),
};

describe("submitFormOperation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (
      globalThis as unknown as GlobalTestMocks
    ).endatixApiConstructorArgs.length = 0;
  });

  it("should create new submission when no token exists", async () => {
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

    const result = await submitFormOperation(
      "form-1",
      mockSubmissionData,
      mockTokenStore as never,
    );

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
    expect(ApiResult.isSuccess(result)).toBe(true);
    if (ApiResult.isSuccess(result)) {
      expect(result.data).toMatchObject({
        submissionId: "submission-123",
        isComplete: false,
      });
    }
  });

  it("should delete cookie when creating a completed submission", async () => {
    mockTokenStore.getToken.mockReturnValue(Result.error("No token found"));

    const mockSubmissionData = {
      jsonData: '{"test": true}',
      isComplete: true,
      currentPage: 3,
    };

    const mockCreateResponse = {
      token: "completed-token",
      isComplete: true,
      id: "submission-123",
      status: "completed",
      completedAt: "2026-05-26T10:00:00Z",
    };

    (
      globalThis as unknown as GlobalTestMocks
    ).mockEndatixApi.submissions.public.create.mockResolvedValue(
      ApiResult.success(mockCreateResponse),
    );

    const result = await submitFormOperation(
      "form-1",
      mockSubmissionData,
      mockTokenStore as never,
    );

    expect(mockTokenStore.deleteToken).toHaveBeenCalledWith("form-1");
    expect(mockTokenStore.setToken).not.toHaveBeenCalled();
    expect(ApiResult.isSuccess(result)).toBe(true);
    if (ApiResult.isSuccess(result)) {
      expect(result.data).toEqual({
        submissionId: "submission-123",
        isComplete: true,
        status: "completed",
        completedAt: "2026-05-26T10:00:00.000Z",
      });
    }
  });

  it("should omit invalid completion dates from the submission operation", async () => {
    mockTokenStore.getToken.mockReturnValue(Result.error("No token found"));

    const mockCreateResponse = {
      token: "completed-token",
      isComplete: true,
      id: "submission-123",
      status: "completed",
      completedAt: "not-a-date",
    };

    (
      globalThis as unknown as GlobalTestMocks
    ).mockEndatixApi.submissions.public.create.mockResolvedValue(
      ApiResult.success(mockCreateResponse),
    );

    const result = await submitFormOperation(
      "form-1",
      {
        jsonData: '{"test": true}',
        isComplete: true,
      },
      mockTokenStore as never,
    );

    expect(mockTokenStore.deleteToken).toHaveBeenCalledWith("form-1");
    expect(ApiResult.isSuccess(result)).toBe(true);
    if (ApiResult.isSuccess(result)) {
      expect(result.data).toMatchObject({
        submissionId: "submission-123",
        isComplete: true,
        status: "completed",
      });
      expect(result.data.completedAt).toBeUndefined();
    }
  });

  it("should update existing submission when token exists", async () => {
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

    const result = await submitFormOperation(
      "form-1",
      mockSubmissionData,
      mockTokenStore as never,
    );

    expect(mockTokenStore.getToken).toHaveBeenCalledWith("form-1");
    expect(
      (globalThis as unknown as GlobalTestMocks).mockEndatixApi.submissions
        .public.updateByToken,
    ).toHaveBeenCalledWith("form-1", "existing-token", mockSubmissionData);
    expect(mockTokenStore.setToken).not.toHaveBeenCalled();
    expect(mockTokenStore.deleteToken).not.toHaveBeenCalled();
    expect(ApiResult.isSuccess(result)).toBe(true);
  });

  it("should delete cookie when submission transitions from incomplete to complete", async () => {
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

    const result = await submitFormOperation(
      "form-1",
      mockSubmissionData,
      mockTokenStore as never,
    );

    expect(
      (globalThis as unknown as GlobalTestMocks).mockEndatixApi.submissions
        .public.updateByToken,
    ).toHaveBeenCalledWith("form-1", "existing-token", mockSubmissionData);
    expect(mockTokenStore.deleteToken).toHaveBeenCalledWith("form-1");
    expect(mockTokenStore.setToken).not.toHaveBeenCalled();
    expect(ApiResult.isSuccess(result)).toBe(true);
  });

  it("should delete cookie when updating an already complete submission", async () => {
    mockTokenStore.getToken.mockReturnValue(Result.success("existing-token"));

    const mockSubmissionData = {
      jsonData: '{"updated": true}',
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

    const result = await submitFormOperation(
      "form-1",
      mockSubmissionData,
      mockTokenStore as never,
    );

    expect(mockTokenStore.deleteToken).toHaveBeenCalledWith("form-1");
    expect(mockTokenStore.setToken).not.toHaveBeenCalled();
    expect(ApiResult.isSuccess(result)).toBe(true);
  });

  it("should not mutate cookies when submitting via url token", async () => {
    const mockSubmissionData = {
      jsonData: '{"test": true}',
      isComplete: true,
      currentPage: 2,
    };

    (
      globalThis as unknown as GlobalTestMocks
    ).mockEndatixApi.submissions.public.updateByAccessToken.mockResolvedValue(
      ApiResult.success({
        isComplete: true,
        id: "submission-123",
      }),
    );

    const result = await submitFormOperation(
      "form-1",
      mockSubmissionData,
      mockTokenStore as never,
      "123.1705824000.rw.abc123def456",
    );

    expect(
      (globalThis as unknown as GlobalTestMocks).mockEndatixApi.submissions
        .public.updateByAccessToken,
    ).toHaveBeenCalled();
    expect(mockTokenStore.deleteToken).not.toHaveBeenCalled();
    expect(mockTokenStore.setToken).not.toHaveBeenCalled();
    expect(ApiResult.isSuccess(result)).toBe(true);
  });

  it("should automatically recover when update fails due to expired submission token", async () => {
    mockTokenStore.getToken.mockReturnValue(Result.success("existing-token"));

    (
      globalThis as unknown as GlobalTestMocks
    ).mockEndatixApi.submissions.public.updateByToken.mockResolvedValue(
      ApiResult.validationError(
        "Invalid or expired token",
        ERROR_CODE.SUBMISSION_TOKEN_INVALID,
      ),
    );

    const mockCreateResponse = {
      id: "submission-new",
      token: "new-token-456",
      isComplete: false,
    };

    (
      globalThis as unknown as GlobalTestMocks
    ).mockEndatixApi.submissions.public.create.mockResolvedValue(
      ApiResult.success(mockCreateResponse),
    );

    const result = await submitFormOperation(
      "form-1",
      {
        jsonData: '{"test": true}',
        isComplete: false,
      },
      mockTokenStore as never,
    );

    expect(mockTokenStore.deleteToken).toHaveBeenCalledWith("form-1");
    expect(mockTokenStore.setToken).toHaveBeenCalledWith({
      formId: "form-1",
      token: "new-token-456",
    });
    expect(ApiResult.isSuccess(result)).toBe(true);
    if (ApiResult.isError(result)) {
      fail("Expected success but got error");
    }
    expect(result.data.submissionId).toBe("submission-new");
  });

  it("should NOT delete token when update fails for ReCaptcha error", async () => {
    mockTokenStore.getToken.mockReturnValue(Result.success("existing-token"));

    (
      globalThis as unknown as GlobalTestMocks
    ).mockEndatixApi.submissions.public.updateByToken.mockResolvedValue(
      ApiResult.validationError(
        "Invalid reCAPTCHA token",
        ERROR_CODE.RECAPTCHA_VERIFICATION_FAILED,
      ),
    );

    const result = await submitFormOperation(
      "form-1",
      {
        jsonData: '{"test": true}',
        isComplete: false,
      },
      mockTokenStore as never,
    );

    expect(mockTokenStore.deleteToken).not.toHaveBeenCalled();
    expect(ApiResult.isError(result)).toBe(true);
  });

  it("should return a Result.error when the submission API call fails", async () => {
    mockTokenStore.getToken.mockReturnValue(Result.error("No token found"));
    (
      globalThis as unknown as GlobalTestMocks
    ).mockEndatixApi.submissions.public.create.mockResolvedValue(
      ApiResult.authError("Unauthorized"),
    );

    const result = await submitFormOperation(
      "form-1",
      {
        jsonData: '{"test": true}',
        isComplete: false,
      },
      mockTokenStore as never,
    );

    expect(ApiResult.isError(result)).toBe(true);
  });

  it("should call endatix api with the correct session", async () => {
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
      ApiResult.success({ id: "submission-123", isComplete: false }),
    );
    const submissionData = {
      jsonData: '{"test": true}',
      isComplete: false,
    };

    const submitResult = await submitFormOperation(
      "form-1",
      submissionData,
      mockTokenStore as never,
    );

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
