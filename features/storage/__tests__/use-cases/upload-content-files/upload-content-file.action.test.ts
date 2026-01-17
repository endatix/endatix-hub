import { describe, it, expect, vi, beforeEach } from "vitest";
import { uploadContentFileAction } from "@/features/storage/use-cases/upload-content-files/upload-content-file.action";
import { uploadContentFileUseCase } from "@/features/storage/use-cases/upload-content-files/upload-content-file.use-case";
import { Result } from "@/lib/result";
import { ContentItemType } from "@/features/storage/types";

// Mock the use case
vi.mock(
  "@/features/storage/use-cases/upload-content-files/upload-content-file.use-case",
  () => ({
    uploadContentFileUseCase: vi.fn(),
  }),
);

describe("uploadContentFileAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should extract data from formData and call uploadContentFileUseCase", async () => {
    // Arrange
    const mockFile = new File(["test"], "test.jpg", { type: "image/jpeg" });
    const mockItemId = "item-123";
    const mockItemType: ContentItemType = "form";
    const mockResult = Result.success({
      name: "test.jpg",
      url: "http://example.com/test.jpg",
    });

    vi.mocked(uploadContentFileUseCase).mockResolvedValue(mockResult);

    const formData = new FormData();
    formData.append("file", mockFile);
    formData.append("itemId", mockItemId);
    formData.append("itemType", mockItemType);

    // Act
    const result = await uploadContentFileAction(formData);

    // Assert
    expect(uploadContentFileUseCase).toHaveBeenCalledWith({
      itemId: mockItemId,
      itemType: mockItemType,
      file: mockFile,
    });
    expect(result).toEqual(mockResult);
  });

  it("should return error result if use case fails", async () => {
    // Arrange
    const mockFile = new File(["test"], "test.jpg", { type: "image/jpeg" });
    const mockItemId = "item-123";
    const mockItemType: ContentItemType = "template";
    const mockError = Result.error("Upload failed");

    vi.mocked(uploadContentFileUseCase).mockResolvedValue(mockError);

    const formData = new FormData();
    formData.append("file", mockFile);
    formData.append("itemId", mockItemId);
    formData.append("itemType", mockItemType);

    // Act
    const result = await uploadContentFileAction(formData);

    // Assert
    expect(result).toEqual(mockError);
  });
});
