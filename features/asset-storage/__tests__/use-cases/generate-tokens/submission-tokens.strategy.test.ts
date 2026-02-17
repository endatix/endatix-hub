/**
 * Unit tests for submission tokens strategy functions
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { Result } from "@/lib/result";
import { ApiResult } from "@/lib/endatix-api";
import {
  submissionTokensValidate,
  submissionTokensAuthorize,
  submissionTokensResolveStorage,
} from "@/features/asset-storage/use-cases/generate-tokens/submission-tokens.strategy";

vi.mock("next-auth", () => ({
  default: vi.fn().mockImplementation(() => ({})),
  CredentialsSignin: class extends Error {
    constructor() {
      super("Invalid credentials");
      this.name = "CredentialsSignin";
    }
  },
  AuthError: class extends Error {
    constructor(message: string) {
      super(message);
      this.name = "AuthError";
    }
  },
}));
vi.mock("@/auth", () => ({ auth: vi.fn() }));

vi.mock("@/features/auth", async () => {
  const actual = await vi.importActual("@/features/auth");
  return {
    ...actual,
  };
});

vi.mock("@/features/auth/access-control/form-access.factory", () => ({
  createFormAccessService: vi.fn(),
}));

vi.mock(
  "@/features/public-form/use-cases/create-initial-submission.use-case",
  () => ({
    createInitialSubmissionUseCase: vi.fn(),
  }),
);

vi.mock("@/features/asset-storage/infrastructure/storage-utils", () => ({
  buildUserFileFolderPath: vi.fn(),
}));

vi.mock("@/features/asset-storage/server", () => ({
  getContainerNames: vi.fn(),
}));

import { createFormAccessService } from "@/features/auth/access-control/form-access.factory";
import { createInitialSubmissionUseCase } from "@/features/public-form/use-cases/create-initial-submission.use-case";
import { buildUserFileFolderPath } from "@/features/asset-storage/infrastructure/storage-utils";
import {
  getContainerNames,
  SubmissionTokenRequest,
} from "@/features/asset-storage/server";
import { Session } from "next-auth";
import { AuthorizationResult } from "@/features/auth";

describe("submissionTokensValidate", () => {
  it("should return validation error when formId is missing", () => {
    // Arrange
    const data = { fileNames: ["test.pdf"] };

    // Act
    const result = submissionTokensValidate(data as SubmissionTokenRequest);

    // Assert
    expect(Result.isError(result)).toBe(true);
    if (Result.isError(result)) expect(result.message).toContain("Form ID");
  });

  it("should return validation error when fileNames is missing", () => {
    // Arrange
    const data = { formId: "form-1" };

    // Act
    const result = submissionTokensValidate(data as SubmissionTokenRequest);

    // Assert
    expect(Result.isError(result)).toBe(true);
    if (Result.isError(result)) expect(result.message).toContain("File names");
  });

  it("should return validation error when fileNames is empty array", () => {
    // Arrange
    const data = { formId: "form-1", fileNames: [] };

    // Act
    const result = submissionTokensValidate(data);

    // Assert
    expect(Result.isError(result)).toBe(true);
    if (Result.isError(result)) expect(result.message).toContain("File names");
  });

  it("should return success when formId and fileNames are valid", () => {
    // Arrange
    const data = { formId: "form-1", fileNames: ["test.pdf"] };

    // Act
    const result = submissionTokensValidate(data);

    // Assert
    expect(Result.isSuccess(result)).toBe(true);
  });
});

describe("submissionTokensAuthorize", () => {
  const mockSession = { user: { id: "user-1" }, accessToken: "token" };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getContainerNames).mockReturnValue({
      CONTENT: "content",
      USER_FILES: "user-files",
    });
  });

  it("should return forbidden when user cannot upload files", async () => {
    // Arrange
    vi.mocked(createFormAccessService).mockResolvedValue({
      canUploadFile: () => false,
    } as any);
    const data = { formId: "form-1" };

    // Act
    const result = await submissionTokensAuthorize({
      session: mockSession as Session,
      data: data as SubmissionTokenRequest,
      request: null as any,
    });

    // Assert
    expect(AuthorizationResult.isError(result)).toBe(true);
    if (AuthorizationResult.isError(result))
      expect(AuthorizationResult.getErrorMessage(result)).toContain("permission");
  });

  it("should allow when user can upload files", async () => {
    // Arrange
    vi.mocked(createFormAccessService).mockResolvedValue({
      canUploadFile: () => true,
    } as any);
    const data = { formId: "form-1", submissionId: "sub-1" };

    // Act
    const result = await submissionTokensAuthorize({
      session: mockSession as Session,
      data: data as SubmissionTokenRequest,
      request: null as any,
    });

    // Assert
    expect(result.success).toBe(true);
  });
});

describe("submissionTokensResolveStorage", () => {
  const mockSession = { user: { id: "user-1" }, accessToken: "token" };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getContainerNames).mockReturnValue({
      CONTENT: "content",
      USER_FILES: "user-files",
    });
  });

  it("should create new submission when submissionId is not provided", async () => {
    // Arrange
    vi.mocked(createInitialSubmissionUseCase).mockResolvedValue(
      ApiResult.success({ submissionId: "auto-id", formId: "form-1" }),
    );
    vi.mocked(buildUserFileFolderPath).mockReturnValue(
      Result.success("path/auto-id"),
    );
    const data = { formId: "form-1" };

    // Act
    const result = await submissionTokensResolveStorage({
      session: mockSession as Session,
      data: data as SubmissionTokenRequest,
      request: null as any,
    });

    // Assert
    expect(createInitialSubmissionUseCase).toHaveBeenCalledWith(
      "form-1",
      null,
      "Generate submissionId for sas token generation",
    );
    expect(ApiResult.isSuccess(result)).toBe(true);
  });

  it("should return error when submission creation fails", async () => {
    // Arrange
    vi.mocked(createInitialSubmissionUseCase).mockResolvedValue(
      ApiResult.validationError("Form not found"),
    );
    const data = { formId: "form-1" };

    // Act
    const result = await submissionTokensResolveStorage({
      session: mockSession as Session,
      data: data as SubmissionTokenRequest,
      request: null as any,
    });

    // Assert
    expect(ApiResult.isError(result)).toBe(true);
  });

  it("should return error when buildUserFileFolderPath fails", async () => {
    // Arrange
    vi.mocked(buildUserFileFolderPath).mockReturnValue(
      Result.validationError("Invalid path"),
    );
    const data = { formId: "form-1", submissionId: "sub-1" };

    // Act
    const result = await submissionTokensResolveStorage({
      session: mockSession as Session,
      data: data as SubmissionTokenRequest,
      request: null as any,
    });

    // Assert
    expect(ApiResult.isError(result)).toBe(true);
  });

  it("should use existing submissionId when provided", async () => {
    // Arrange
    vi.mocked(buildUserFileFolderPath).mockReturnValue(
      Result.success("path/sub-1"),
    );
    const data = { formId: "form-1", submissionId: "existing-sub" };

    // Act
    const result = await submissionTokensResolveStorage({
      session: mockSession as Session,
      data: data as SubmissionTokenRequest,
      request: null as any,
    });

    // Assert
    expect(createInitialSubmissionUseCase).not.toHaveBeenCalled();
    expect(ApiResult.isSuccess(result)).toBe(true);
  });

  it("should use userId from session", async () => {
    // Arrange
    vi.mocked(buildUserFileFolderPath).mockReturnValue(
      Result.success("path/sub-1"),
    );
    const data = { formId: "form-1", submissionId: "sub-1" };

    // Act
    const result = await submissionTokensResolveStorage({
      session: mockSession as Session,
      data: data as SubmissionTokenRequest,
      request: null as any,
    });

    // Assert
    expect(ApiResult.isSuccess(result)).toBe(true);
    expect((result as any).data.extra?.userId).toBe("user-1");
  });

  it("should use anonymous when session is undefined", async () => {
    // Arrange
    vi.mocked(buildUserFileFolderPath).mockReturnValue(
      Result.success("path/sub-1"),
    );
    const data = { formId: "form-1", submissionId: "sub-1" };

    // Act
    const result = await submissionTokensResolveStorage({
      session: null,
      data: data as SubmissionTokenRequest,
      request: null as any,
    });

    // Assert
    expect(ApiResult.isSuccess(result)).toBe(true);
    expect((result as any).data.extra?.userId).toBe("anonymous");
  });
});
