import { describe, it, expect, vi, beforeEach } from "vitest";
import { createInitialSubmissionUseCase } from "@/features/public-form/use-cases/create-initial-submission.use-case";
import { submitFormAction } from "@/features/public-form/application/actions/submit-form.action";
import { ApiResult } from "@/lib/endatix-api";
import { SubmissionOperation } from "@/features/public-form/application/actions/submit-form.action";

// Mock the submitFormAction
vi.mock(
  "@/features/public-form/application/actions/submit-form.action",
  () => ({
    submitFormAction: vi.fn(),
  }),
);

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

    vi.mocked(submitFormAction).mockResolvedValue(
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

    expect(submitFormAction).toHaveBeenCalledWith(mockFormId, {
      isComplete: false,
      jsonData: JSON.stringify({}),
      metadata: JSON.stringify({
        reasonCreated: mockReasonCreated,
        language: mockFormLang,
      }),
    });
  });

  it("should successfully create initial submission without language", async () => {
    // Arrange
    const mockSubmissionOperation: SubmissionOperation = {
      submissionId: "sub-123",
    };

    vi.mocked(submitFormAction).mockResolvedValue(
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

    expect(submitFormAction).toHaveBeenCalledWith(mockFormId, {
      isComplete: false,
      jsonData: JSON.stringify({}),
      metadata: JSON.stringify({
        reasonCreated: mockReasonCreated,
      }),
    });
  });

  it("should successfully create initial submission with empty string language", async () => {
    // Arrange
    const mockSubmissionOperation: SubmissionOperation = {
      submissionId: "sub-123",
    };

    vi.mocked(submitFormAction).mockResolvedValue(
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

    expect(submitFormAction).toHaveBeenCalledWith(mockFormId, {
      isComplete: false,
      jsonData: JSON.stringify({}),
      metadata: JSON.stringify({
        reasonCreated: mockReasonCreated,
      }),
    });
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

    expect(submitFormAction).not.toHaveBeenCalled();
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

    expect(submitFormAction).not.toHaveBeenCalled();
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

    expect(submitFormAction).not.toHaveBeenCalled();
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

    expect(submitFormAction).not.toHaveBeenCalled();
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

    expect(submitFormAction).not.toHaveBeenCalled();
  });

  it("should propagate error from submitFormAction", async () => {
    // Arrange
    const mockError = "Submission failed";
    vi.mocked(submitFormAction).mockResolvedValue(
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

    expect(submitFormAction).toHaveBeenCalledWith(mockFormId, {
      isComplete: false,
      jsonData: JSON.stringify({}),
      metadata: JSON.stringify({
        reasonCreated: mockReasonCreated,
        language: mockFormLang,
      }),
    });
  });

  it("should handle submitFormAction throwing an exception", async () => {
    // Arrange
    const mockError = new Error("Network error");
    vi.mocked(submitFormAction).mockRejectedValue(mockError);

    // Act & Assert
    await expect(
      createInitialSubmissionUseCase(
        mockFormId,
        mockFormLang,
        mockReasonCreated,
      ),
    ).rejects.toThrow("Network error");

    expect(submitFormAction).toHaveBeenCalledWith(mockFormId, {
      isComplete: false,
      jsonData: JSON.stringify({}),
      metadata: JSON.stringify({
        reasonCreated: mockReasonCreated,
        language: mockFormLang,
      }),
    });
  });

  it("should handle special characters in reasonCreated", async () => {
    // Arrange
    const specialReason =
      "Generate submissionId for sas token generation with special chars: @#$%^&*()";
    const mockSubmissionOperation: SubmissionOperation = {
      submissionId: "sub-123",
    };

    vi.mocked(submitFormAction).mockResolvedValue(
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

    expect(submitFormAction).toHaveBeenCalledWith(mockFormId, {
      isComplete: false,
      jsonData: JSON.stringify({}),
      metadata: JSON.stringify({
        reasonCreated: specialReason,
        language: mockFormLang,
      }),
    });
  });

  it("should handle unicode characters in formId and reasonCreated", async () => {
    // Arrange
    const unicodeFormId = "форма-123";
    const unicodeReason = "Создать submissionId для генерации sas токена";
    const mockSubmissionOperation: SubmissionOperation = {
      submissionId: "sub-123",
    };

    vi.mocked(submitFormAction).mockResolvedValue(
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

    expect(submitFormAction).toHaveBeenCalledWith(unicodeFormId, {
      isComplete: false,
      jsonData: JSON.stringify({}),
      metadata: JSON.stringify({
        reasonCreated: unicodeReason,
        language: mockFormLang,
      }),
    });
  });
});
