import { describe, it, expect, vi, Mock, beforeEach } from "vitest";
import { ErrorType, Result } from "@/lib/result";
import { createSubmissionPublic, updateSubmissionPublic } from "@/services/api";
import { submitFormAction } from "@/features/public-form/application/actions/submit-form.action";

// Mock the FormTokenCookieStore
vi.mock("@/features/public-form/infrastructure/cookie-store", () => ({
  FormTokenCookieStore: vi.fn().mockImplementation(() => mockTokenStore),
}));

// Mock the Next.js cookies function
vi.mock("next/headers", () => ({
  cookies: vi.fn(),
}));

// Mock API services
vi.mock("@/services/api", () => ({
  createSubmissionPublic: vi.fn(),
  updateSubmissionPublic: vi.fn(),
}));

// Create a mock token store to use in tests
const mockTokenStore = {
  getToken: vi.fn(),
  setToken: vi.fn(),
  deleteToken: vi.fn(),
};

describe("submitFormAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
      id: "submission-123"
    };
    
    (createSubmissionPublic as Mock).mockResolvedValue(mockCreateResponse);

    // Act
    const result = await submitFormAction("form-1", mockSubmissionData);

    // Assert
    expect(mockTokenStore.getToken).toHaveBeenCalledWith("form-1");
    expect(createSubmissionPublic).toHaveBeenCalledWith(
      "form-1",
      mockSubmissionData,
    );
    expect(mockTokenStore.setToken).toHaveBeenCalledWith({
      formId: "form-1",
      token: "new-token"
    });
    expect(mockTokenStore.deleteToken).not.toHaveBeenCalled();
    expect(Result.isSuccess(result)).toBe(true);
    if (Result.isSuccess(result)) {
      expect(result.value).toEqual({ submissionId: "submission-123" });
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
      id: "submission-123"
    };
    
    (updateSubmissionPublic as Mock).mockResolvedValue(mockUpdateResponse);

    // Act
    const result = await submitFormAction("form-1", mockSubmissionData);

    // Assert
    expect(mockTokenStore.getToken).toHaveBeenCalledWith("form-1");
    expect(updateSubmissionPublic).toHaveBeenCalledWith(
      "form-1",
      "existing-token",
      mockSubmissionData,
    );
    expect(mockTokenStore.setToken).not.toHaveBeenCalled();
    expect(mockTokenStore.deleteToken).not.toHaveBeenCalled();
    expect(Result.isSuccess(result)).toBe(true);
    if (Result.isSuccess(result)) {
      expect(result.value).toEqual({ submissionId: "submission-123" });
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
      id: "submission-123"
    };
    
    (updateSubmissionPublic as Mock).mockResolvedValue(mockUpdateResponse);

    // Act
    const result = await submitFormAction("form-1", mockSubmissionData);

    // Assert
    expect(updateSubmissionPublic).toHaveBeenCalledWith(
      "form-1",
      "existing-token",
      mockSubmissionData,
    );
    expect(mockTokenStore.deleteToken).toHaveBeenCalledWith("form-1");
    expect(Result.isSuccess(result)).toBe(true);
  });

  it("should delete token when update fails", async () => {
    // Arrange
    mockTokenStore.getToken.mockReturnValue(Result.success("existing-token"));
    (updateSubmissionPublic as Mock).mockRejectedValue(new Error("API Error"));

    // Act
    const result = await submitFormAction("form-1", {
      jsonData: '{"test": true}',
      isComplete: false,
    });

    // Assert
    expect(mockTokenStore.deleteToken).toHaveBeenCalledWith("form-1");
    expect(Result.isError(result)).toBe(true);
    expect(result.kind).toBe(ErrorType.Error);
  });

  it("should return a Result.error when the submission API call fails", async () => {
    // Arrange
    mockTokenStore.getToken.mockReturnValue(Result.error("No token found"));
    (createSubmissionPublic as Mock).mockRejectedValue(new Error("API Error"));

    // Act
    const result = await submitFormAction("form-1", {
      jsonData: '{"test": true}',
      isComplete: false,
    });

    // Assert
    expect(Result.isError(result)).toBe(true);
    expect(result.kind).toBe(ErrorType.Error);
  });
});
