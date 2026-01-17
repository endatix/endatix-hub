import { describe, it, expect, vi, beforeEach } from "vitest";
import { uploadUserFilesUseCase } from "@/features/storage/use-cases/upload-user-files/upload-user-files.use-case";
import * as storageService from "@/features/storage/infrastructure/storage-service";
import * as storageConfig from "@/features/storage/infrastructure/storage-config";
import { ErrorType, Result } from "@/lib/result";
import { optimizeImageSize } from "@/features/storage/infrastructure/image-service";
import { generateUniqueFileName } from "@/features/storage/utils";

// Mock the entire modules
vi.mock("@/features/storage/infrastructure/storage-service", () => ({
  uploadToStorage: vi.fn().mockResolvedValue("mock-url"),
}));
vi.mock("@/features/storage/infrastructure/storage-config", () => ({
  getStorageConfig: vi.fn().mockReturnValue({
    isEnabled: true,
    accountName: "mock-account-name",
    accountKey: "mock-account-key",
    hostName: "mock-host-name",
    isPrivate: false,
    sasReadExpiryMinutes: 15,
    containerNames: {
      USER_FILES: "user-files",
      CONTENT: "content",
    },
  }),
  getContainerNames: vi.fn().mockReturnValue({
    USER_FILES: "user-files",
    CONTENT: "content",
  }),
}));

vi.mock("@/features/storage/infrastructure/image-service", () => ({
  optimizeImageSize: vi.fn().mockResolvedValue(Buffer.from("optimized")),
}));

vi.mock("uuid", () => ({
  v4: vi.fn().mockReturnValue("mock-uuid"),
}));

vi.mock("@/features/storage/utils", () => ({
  generateUniqueFileName: vi.fn(),
}));

describe("uploadUserFilesUseCase", () => {
  const mockFileContent = "test";
  const mockFile = new Blob([mockFileContent], { type: "image/jpeg" }) as File;
  Object.defineProperty(mockFile, "name", { value: "test.jpg" });
  Object.defineProperty(mockFile, "arrayBuffer", {
    value: async () => new TextEncoder().encode(mockFileContent).buffer,
  });

  const mockCommand = {
    formId: "form-123",
    submissionId: "sub-123",
    files: [{ name: "test", file: mockFile }],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(generateUniqueFileName).mockReturnValue(
      Result.success("mock-unique-file-name"),
    );
  });

  it("should successfully upload files to Azure when storage is enabled", async () => {
    // Arrange
    const mockUrl = "https://storage.test/test.jpg";
    vi.mocked(storageService.uploadToStorage).mockResolvedValue(mockUrl);
    vi.mocked(optimizeImageSize).mockResolvedValue(Buffer.from("optimized"));
    vi.mocked(storageConfig.getStorageConfig).mockReturnValue({
      isEnabled: true,
      accountName: "mock-account-name",
      accountKey: "mock-account-key",
      hostName: "mock-host-name",
      isPrivate: false,
      sasReadExpiryMinutes: 15,
      containerNames: {
        USER_FILES: "user-files",
        CONTENT: "content",
      },
    });

    // Act
    const result = await uploadUserFilesUseCase(mockCommand);

    // Assert
    expect(Result.isSuccess(result)).toBe(true);
    if (Result.isSuccess(result)) {
      expect(result.value).toEqual([{ name: "test", url: mockUrl }]);
    }
    expect(storageService.uploadToStorage).toHaveBeenCalledWith(
      expect.any(Buffer),
      "mock-unique-file-name",
      expect.any(String),
      `s/${mockCommand.formId}/${mockCommand.submissionId}`,
    );
  });

  it("should generate base64 URLs when storage is disabled", async () => {
    // Arrange
    vi.mocked(optimizeImageSize).mockResolvedValue(Buffer.from("optimized"));

    // Set storage config to disabled
    vi.mocked(storageConfig.getStorageConfig).mockReturnValue({
      isEnabled: false,
      accountName: "",
      accountKey: "",
      hostName: "",
      isPrivate: false,
      sasReadExpiryMinutes: 15,
      containerNames: {
        USER_FILES: "user-files",
        CONTENT: "content",
      },
    });

    // Act
    const result = await uploadUserFilesUseCase(mockCommand);

    // Assert
    expect(Result.isSuccess(result)).toBe(true);
    if (Result.isSuccess(result)) {
      expect(result.value[0].name).toBe("test");
      expect(result.value[0].url).toContain("data:image/jpeg;base64,");
    }
    expect(storageService.uploadToStorage).not.toHaveBeenCalled();
  });

  it("should return validation error when formId is missing", async () => {
    const result = await uploadUserFilesUseCase({
      ...mockCommand,
      formId: "",
    });

    expect(Result.isError(result)).toBe(true);
    if (Result.isError(result)) {
      expect(result.message).toBe("Form ID is required");
    }
  });

  it("should return validation error when submissionId is missing", async () => {
    const result = await uploadUserFilesUseCase({
      ...mockCommand,
      submissionId: undefined,
    });

    expect(Result.isError(result)).toBe(true);
    if (Result.isError(result)) {
      expect(result.message).toBe("Submission ID is required");
    }
  });

  it("should return validation error when files are empty", async () => {
    const result = await uploadUserFilesUseCase({
      ...mockCommand,
      files: [],
    });

    expect(Result.isError(result)).toBe(true);
    if (Result.isError(result)) {
      expect(result.message).toBe("Files are required");
    }
  });

  it("should return error when generateUniqueFileName returns an error", async () => {
    // Arrange
    const fileWithoutExtension = new Blob([mockFileContent], {
      type: "image/jpeg",
    }) as File;
    Object.defineProperty(fileWithoutExtension, "name", { value: "testfile" });
    Object.defineProperty(fileWithoutExtension, "arrayBuffer", {
      value: async () => new TextEncoder().encode(mockFileContent).buffer,
    });
    const EXPECTED_ERROR_MESSAGE =
      "File name 'testfile' is not allowed. Please provide a valid file name.";
    const uploadUserFilesCommand = {
      ...mockCommand,
      files: [{ name: "test", file: fileWithoutExtension }],
    };

    vi.mocked(generateUniqueFileName).mockReturnValue(
      Result.validationError(EXPECTED_ERROR_MESSAGE),
    );

    // Act
    const result = await uploadUserFilesUseCase(uploadUserFilesCommand);

    // Assert
    expect(Result.isError(result)).toBe(true);
    if (Result.isError(result)) {
      expect(result.errorType).toBe(ErrorType.Error);
      expect(result.message).toBe(EXPECTED_ERROR_MESSAGE);
    }
  });

  it("should handle upload errors gracefully", async () => {
    // Arrange
    vi.mocked(storageService.uploadToStorage).mockRejectedValue(
      new Error("Upload failed"),
    );
    vi.mocked(storageConfig.getStorageConfig).mockReturnValue({
      isEnabled: true,
      accountName: "mock-account-name",
      accountKey: "mock-account-key",
      hostName: "mock-host-name",
      isPrivate: false,
      sasReadExpiryMinutes: 15,
      containerNames: {
        USER_FILES: "user-files",
        CONTENT: "content",
      },
    });

    // Act
    const result = await uploadUserFilesUseCase(mockCommand);

    // Assert
    expect(Result.isError(result)).toBe(true);
    if (Result.isError(result)) {
      expect(result.message).toBe(
        "Failed to upload file. Please refresh your page and try again.",
      );
      expect(result.details).toBe("Upload failed");
    }
  });
});
