import { describe, it, expect, vi, beforeEach } from "vitest";
import * as storageService from "@/features/storage/infrastructure/storage-service";
import { ErrorType, Result } from "@/lib/result";
import { uploadContentFileUseCase } from "@/features/storage/use-cases/upload-content-file.use-case";
import { optimizeImageSize } from "@/features/storage/infrastructure/image-service";

// Mock entire modules
vi.mock("@/features/storage/infrastructure/storage-service", () => ({
  uploadToStorage: vi.fn().mockResolvedValue("mock-url"),
  STORAGE_SERVICE_CONFIG: {
    isEnabled: true,
    accountName: "mock-account-name",
    accountKey: "mock-account-key",
    hostName: "mock-host-name",
  },
  CONTAINER_NAMES: {
    USER_FILES: "user-files",
    CONTENT: "content",
  },
}));

vi.mock("@/features/storage/infrastructure/image-service", () => ({
  optimizeImageSize: vi.fn().mockResolvedValue(Buffer.from("optimized")),
}));

vi.mock("uuid", () => ({
  v4: vi.fn().mockReturnValue("mock-uuid"),
}));

describe("uploadContentFileUseCase", () => {
  const mockFileContent = "test";
  const createMockFile = (name: string) => {
    const file = new Blob([mockFileContent], { type: "image/jpeg" }) as File;
    Object.defineProperty(file, "name", { value: name });
    Object.defineProperty(file, "arrayBuffer", {
      value: async () => new TextEncoder().encode(mockFileContent).buffer,
    });
    return file;
  };
  const mockFile = createMockFile("test.jpg");
  const mockCommand = {
    formId: "form-123",
    file: mockFile,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return validation error when formId is empty", async () => {
    // Act
    const result = await uploadContentFileUseCase({
      formId: "",
      file: mockFile,
    });

    // Assert
    expect(Result.isError(result)).toBe(true);
    if (Result.isError(result)) {
      expect(result.errorType).toBe(ErrorType.ValidationError);
      expect(result.message).toBe("Form ID is required");
    }
  });

  it("should return validation error when file is missing", async () => {
    // Act
    const result = await uploadContentFileUseCase({
      formId: "form-123",
      file: undefined as unknown as File,
    });

    // Assert
    expect(Result.isError(result)).toBe(true);
    if (Result.isError(result)) {
      expect(result.errorType).toBe(ErrorType.ValidationError);
      expect(result.message).toBe("File is required");
    }
  });

  it("should successfully upload file to Azure when storage is enabled", async () => {
    // Arrange
    const mockUrl = "https://storage.test/test.jpg";
    vi.mocked(storageService.uploadToStorage).mockResolvedValue(mockUrl);
    vi.mocked(optimizeImageSize).mockResolvedValue(Buffer.from("optimized"));
    
    // Set STORAGE_SERVICE_CONFIG.isEnabled to true
    vi.spyOn(storageService, 'STORAGE_SERVICE_CONFIG', 'get').mockReturnValue({
      isEnabled: true,
      accountName: "mock-account-name",
      accountKey: "mock-account-key",
      hostName: "mock-host-name",
    });

    // Act
    const result = await uploadContentFileUseCase(mockCommand);

    // Assert
    expect(Result.isSuccess(result)).toBe(true);
    if (Result.isSuccess(result)) {
      expect(result.value).toEqual({ name: mockFile.name, url: mockUrl });
    }
    expect(storageService.uploadToStorage).toHaveBeenCalledWith(
      expect.any(Buffer),
      "mock-uuid.jpg",
      expect.any(String),
      `f/${mockCommand.formId}`
    );
  });

  it("should generate base64 URL when storage is disabled", async () => {
    // Arrange
    vi.mocked(optimizeImageSize).mockResolvedValue(Buffer.from("optimized"));
    
    // Set STORAGE_SERVICE_CONFIG.isEnabled to false
    vi.spyOn(storageService, 'STORAGE_SERVICE_CONFIG', 'get').mockReturnValue({
      isEnabled: false,
      accountName: "",
      accountKey: "",
      hostName: "",
    });

    // Act
    const result = await uploadContentFileUseCase(mockCommand);

    // Assert
    expect(Result.isSuccess(result)).toBe(true);
    if (Result.isSuccess(result)) {
      expect(result.value.name).toBe(mockFile.name);
      expect(result.value.url).toContain("data:image/jpeg;base64,");
    }
    expect(storageService.uploadToStorage).not.toHaveBeenCalled();
  });

  it("should optimize image before upload for image files", async () => {
    // Arrange
    const optimizeSpy = vi
      .mocked(optimizeImageSize)
      .mockResolvedValue(Buffer.from("optimized"));
    vi.mocked(storageService.uploadToStorage).mockResolvedValue("mock-url");

    // Act
    await uploadContentFileUseCase(mockCommand);

    // Assert
    expect(optimizeSpy).toHaveBeenCalled();
  });

  it("should return error when fileExtension is not supported", async () => {
    // Arrange
    const mockFileWithoutExtension = createMockFile("noextension_name");
    const uploadUserFilesCommand = {
      formId: "form-123",
      file: mockFileWithoutExtension,
    };

    // Act
    const result = await uploadContentFileUseCase(uploadUserFilesCommand);

    // Assert
    expect(Result.isError(result)).toBe(true);
    if (Result.isError(result)) {
      expect(result.errorType).toBe(ErrorType.ValidationError);
      expect(result.message).toBe(
        "File extension is required. Please provide a valid file."
      );
    }
  });

  it("should handle upload errors gracefully", async () => {
    // Arrange
    vi.mocked(storageService.uploadToStorage).mockRejectedValue(new Error("Upload failed"));
    vi.spyOn(storageService, 'STORAGE_SERVICE_CONFIG', 'get').mockReturnValue({
      isEnabled: true,
      accountName: "mock-account-name",
      accountKey: "mock-account-key",
      hostName: "mock-host-name",
    });

    // Act
    const result = await uploadContentFileUseCase(mockCommand);

    // Assert
    expect(Result.isError(result)).toBe(true);
    if (Result.isError(result)) {
      expect(result.message).toBe("Failed to upload file");
      expect(result.details).toBe("Upload failed");
    }
  });
});
