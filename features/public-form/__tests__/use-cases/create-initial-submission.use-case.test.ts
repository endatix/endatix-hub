import { describe, it, expect, vi, beforeEach } from "vitest";
import { createInitialSubmissionUseCase } from "@/features/public-form/use-cases/create-initial-submission.use-case";
import { submitFormOperation } from "@/features/public-form/application/submit-form-operation";
import { ApiResult } from "@/lib/endatix-api";
import { SubmissionOperation } from "@/features/public-form/application/submit-form-operation";

const { mockCookieStore, mockTokenStore } = vi.hoisted(() => ({
  mockCookieStore: {},
  mockTokenStore: {
    getToken: vi.fn(),
    setToken: vi.fn(),
    deleteToken: vi.fn(),
  },
}));

// Mock the submitFormOperation
vi.mock("@/features/public-form/application/submit-form-operation", () => ({
  submitFormOperation: vi.fn(),
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn().mockResolvedValue(mockCookieStore),
}));

vi.mock("@/features/public-form/infrastructure/cookie-store", () => ({
  FormTokenCookieStore: vi.fn().mockImplementation(function () {
    return mockTokenStore;
  }),
}));

describe("createInitialSubmissionUseCase", () => {
  const mockFormId = "form-123";
  const mockFormLang = "en";
  const mockReasonCreated = "Generate submissionId for sas token generation";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should successfully create initial submission with all parameters", async () => {
    // Arrange
    const mockSubmissionOperation: SubmissionOperation = {
      submissionId: "sub-123",
    };

    vi.mocked(submitFormOperation).mockResolvedValue(
      ApiResult.success(mockSubmissionOperation),
    );

    // Act
    const result = await createInitialSubmissionUseCase(
      mockFormId,
      mockFormLang,
      mockReasonCreated,
    );

    // Assert
    expect(ApiResult.isSuccess(result)).toBe(true);
    if (ApiResult.isSuccess(result)) {
      expect(result.data).toEqual(mockSubmissionOperation);
    }

    expect(submitFormOperation).toHaveBeenCalledWith(
      mockFormId,
      {
        isComplete: false,
        jsonData: JSON.stringify({}),
        metadata: JSON.stringify({
          reasonCreated: mockReasonCreated,
          language: mockFormLang,
        }),
      },
      mockTokenStore,
    );
  });

  it("should successfully create initial submission without language", async () => {
    // Arrange
    const mockSubmissionOperation: SubmissionOperation = {
      submissionId: "sub-123",
    };

    vi.mocked(submitFormOperation).mockResolvedValue(
      ApiResult.success(mockSubmissionOperation),
    );

    // Act
    const result = await createInitialSubmissionUseCase(
      mockFormId,
      null,
      mockReasonCreated,
    );

    // Assert
    expect(ApiResult.isSuccess(result)).toBe(true);
    if (ApiResult.isSuccess(result)) {
      expect(result.data).toEqual(mockSubmissionOperation);
    }

    expect(submitFormOperation).toHaveBeenCalledWith(
      mockFormId,
      {
        isComplete: false,
        jsonData: JSON.stringify({}),
        metadata: JSON.stringify({
          reasonCreated: mockReasonCreated,
        }),
      },
      mockTokenStore,
    );
  });

  it("should successfully create initial submission with empty string language", async () => {
    // Arrange
    const mockSubmissionOperation: SubmissionOperation = {
      submissionId: "sub-123",
    };

    vi.mocked(submitFormOperation).mockResolvedValue(
      ApiResult.success(mockSubmissionOperation),
    );

    // Act
    const result = await createInitialSubmissionUseCase(
      mockFormId,
      "",
      mockReasonCreated,
    );

    // Assert
    expect(ApiResult.isSuccess(result)).toBe(true);
    if (ApiResult.isSuccess(result)) {
      expect(result.data).toEqual(mockSubmissionOperation);
    }

    expect(submitFormOperation).toHaveBeenCalledWith(
      mockFormId,
      {
        isComplete: false,
        jsonData: JSON.stringify({}),
        metadata: JSON.stringify({
          reasonCreated: mockReasonCreated,
        }),
      },
      mockTokenStore,
    );
  });

  it("should return validation error when formId is empty", async () => {
    // Act
    const result = await createInitialSubmissionUseCase(
      "",
      mockFormLang,
      mockReasonCreated,
    );

    // Assert
    expect(ApiResult.isError(result)).toBe(true);
    if (ApiResult.isError(result)) {
      expect(result.error.message).toBe("Form ID is required");
    }

    expect(submitFormOperation).not.toHaveBeenCalled();
  });

  it("should return validation error when formId is undefined", async () => {
    // Act
    const result = await createInitialSubmissionUseCase(
      undefined as unknown as string,
      mockFormLang,
      mockReasonCreated,
    );

    // Assert
    expect(ApiResult.isError(result)).toBe(true);
    if (ApiResult.isError(result)) {
      expect(result.error.message).toBe("Form ID is required");
    }

    expect(submitFormOperation).not.toHaveBeenCalled();
  });

  it("should return validation error when reasonCreated is empty", async () => {
    // Act
    const result = await createInitialSubmissionUseCase(
      mockFormId,
      mockFormLang,
      "",
    );

    // Assert
    expect(ApiResult.isError(result)).toBe(true);
    if (ApiResult.isError(result)) {
      expect(result.error.message).toBe("Reason created is required");
    }

    expect(submitFormOperation).not.toHaveBeenCalled();
  });

  it("should return validation error when reasonCreated is undefined", async () => {
    // Act
    const result = await createInitialSubmissionUseCase(
      mockFormId,
      mockFormLang,
      undefined as unknown as string,
    );

    // Assert
    expect(ApiResult.isError(result)).toBe(true);
    if (ApiResult.isError(result)) {
      expect(result.error.message).toBe("Reason created is required");
    }

    expect(submitFormOperation).not.toHaveBeenCalled();
  });

  it("should return validation error when reasonCreated is null", async () => {
    // Act
    const result = await createInitialSubmissionUseCase(
      mockFormId,
      mockFormLang,
      null as unknown as string,
    );

    // Assert
    expect(ApiResult.isError(result)).toBe(true);
    if (ApiResult.isError(result)) {
      expect(result.error.message).toBe("Reason created is required");
    }

    expect(submitFormOperation).not.toHaveBeenCalled();
  });

  it("should propagate error from submitFormOperation", async () => {
    // Arrange
    const mockError = "Submission failed";
    vi.mocked(submitFormOperation).mockResolvedValue(
      ApiResult.serverError(mockError),
    );

    // Act
    const result = await createInitialSubmissionUseCase(
      mockFormId,
      mockFormLang,
      mockReasonCreated,
    );

    // Assert
    expect(ApiResult.isError(result)).toBe(true);
    if (ApiResult.isError(result)) {
      expect(result.error.message).toBe(mockError);
    }

    expect(submitFormOperation).toHaveBeenCalledWith(
      mockFormId,
      {
        isComplete: false,
        jsonData: JSON.stringify({}),
        metadata: JSON.stringify({
          reasonCreated: mockReasonCreated,
          language: mockFormLang,
        }),
      },
      mockTokenStore,
    );
  });

  it("should handle submitFormOperation throwing an exception", async () => {
    // Arrange
    const mockError = new Error("Network error");
    vi.mocked(submitFormOperation).mockRejectedValue(mockError);

    // Act & Assert
    await expect(
      createInitialSubmissionUseCase(
        mockFormId,
        mockFormLang,
        mockReasonCreated,
      ),
    ).rejects.toThrow("Network error");

    expect(submitFormOperation).toHaveBeenCalledWith(
      mockFormId,
      {
        isComplete: false,
        jsonData: JSON.stringify({}),
        metadata: JSON.stringify({
          reasonCreated: mockReasonCreated,
          language: mockFormLang,
        }),
      },
      mockTokenStore,
    );
  });

  it("should handle special characters in reasonCreated", async () => {
    // Arrange
    const specialReason =
      "Generate submissionId for sas token generation with special chars: @#$%^&*()";
    const mockSubmissionOperation: SubmissionOperation = {
      submissionId: "sub-123",
    };

    vi.mocked(submitFormOperation).mockResolvedValue(
      ApiResult.success(mockSubmissionOperation),
    );

    // Act
    const result = await createInitialSubmissionUseCase(
      mockFormId,
      mockFormLang,
      specialReason,
    );

    // Assert
    expect(ApiResult.isSuccess(result)).toBe(true);
    if (ApiResult.isSuccess(result)) {
      expect(result.data).toEqual(mockSubmissionOperation);
    }

    expect(submitFormOperation).toHaveBeenCalledWith(
      mockFormId,
      {
        isComplete: false,
        jsonData: JSON.stringify({}),
        metadata: JSON.stringify({
          reasonCreated: specialReason,
          language: mockFormLang,
        }),
      },
      mockTokenStore,
    );
  });

  it("should handle unicode characters in formId and reasonCreated", async () => {
    // Arrange
    const unicodeFormId = "форма-123";
    const unicodeReason = "Создать submissionId для генерации sas токена";
    const mockSubmissionOperation: SubmissionOperation = {
      submissionId: "sub-123",
    };

    vi.mocked(submitFormOperation).mockResolvedValue(
      ApiResult.success(mockSubmissionOperation),
    );

    // Act
    const result = await createInitialSubmissionUseCase(
      unicodeFormId,
      mockFormLang,
      unicodeReason,
    );

    // Assert
    expect(ApiResult.isSuccess(result)).toBe(true);
    if (ApiResult.isSuccess(result)) {
      expect(result.data).toEqual(mockSubmissionOperation);
    }

    expect(submitFormOperation).toHaveBeenCalledWith(
      unicodeFormId,
      {
        isComplete: false,
        jsonData: JSON.stringify({}),
        metadata: JSON.stringify({
          reasonCreated: unicodeReason,
          language: mockFormLang,
        }),
      },
      mockTokenStore,
    );
  });
});
