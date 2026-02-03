import { describe, expect, it } from "vitest";
import { FileType, getFileType, type IFile } from "../file-type";

describe("getFileType", () => {
  it("returns Unknown when file is null", () => {
    // Arrange
    const testFile = null as unknown as IFile;

    // Act
    const fileType = getFileType(testFile);

    // Assert
    expect(fileType).toBe(FileType.Unknown);
  });

  it("returns Unknown when file is undefined", () => {
    // Arrange
    const testFile = undefined as unknown as IFile;

    // Act
    const fileType = getFileType(testFile);

    // Assert
    expect(fileType).toBe(FileType.Unknown);
  });

  it("returns Unknown when file.content is missing", () => {
    // Arrange
    const testFile: IFile = {
      type: "image/jpeg",
      content: undefined as unknown as string,
    };

    // Act
    const fileType = getFileType(testFile);

    // Assert
    expect(fileType).toBe(FileType.Unknown);
  });

  it("returns Unknown when file.content is empty string", () => {
    // Arrange
    const testFile: IFile = {
      type: "image/jpeg",
      content: "",
    };

    // Act
    const fileType = getFileType(testFile);

    // Assert
    expect(fileType).toBe(FileType.Unknown);
  });

  it("returns Unknown when file.type is missing", () => {
    // Arrange
    const testFile: IFile = {
      content: "https://example.com/photo.jpg",
    };

    // Act
    const fileType = getFileType(testFile);

    // Assert
    expect(fileType).toBe(FileType.Unknown);
  });

  it("returns Unknown when file.type is empty string", () => {
    // Arrange
    const testFile: IFile = {
      content: "x",
      type: "",
    };

    // Act
    const fileType = getFileType(testFile);

    // Assert
    expect(fileType).toBe(FileType.Unknown);
  });

  it("returns Image for image/jpeg", () => {
    // Arrange
    const testFile: IFile = {
      content: "x",
      type: "image/jpeg",
    };

    // Act
    const fileType = getFileType(testFile);

    // Assert
    expect(fileType).toBe(FileType.Image);
  });

  it("returns Image for image/png", () => {
    // Arrange
    const testFile: IFile = {
      content: "x",
      type: "image/png",
    };

    // Act
    const fileType = getFileType(testFile);

    // Assert
    expect(fileType).toBe(FileType.Image);
  });

  it("returns Image for IMAGE/JPEG (case insensitive)", () => {
    // Arrange
    const testFile: IFile = {
      content: "x",
      type: "IMAGE/JPEG",
    };

    // Act
    const fileType = getFileType(testFile);

    // Assert
    expect(fileType).toBe(FileType.Image);
  });

  it("returns Image for Image/WebP (case insensitive)", () => {
    // Arrange
    const testFile: IFile = {
      content: "x",
      type: "Image/WebP",
    };

    // Act
    const fileType = getFileType(testFile);

    // Assert
    expect(fileType).toBe(FileType.Image);
  });

  it("returns Video for video/mp4", () => {
    // Arrange
    const testFile: IFile = {
      content: "x",
      type: "video/mp4",
    };

    // Act
    const fileType = getFileType(testFile);

    // Assert
    expect(fileType).toBe(FileType.Video);
  });

  it("returns Video for VIDEO/MP4 (case insensitive)", () => {
    // Arrange
    const testFile: IFile = {
      content: "x",
      type: "VIDEO/MP4",
    };

    // Act
    const fileType = getFileType(testFile);

    // Assert
    expect(fileType).toBe(FileType.Video);
  });

  it("returns Audio for audio/mpeg", () => {
    // Arrange
    const testFile: IFile = {
      content: "x",
      type: "audio/mpeg",
    };

    // Act
    const fileType = getFileType(testFile);

    // Assert
    expect(fileType).toBe(FileType.Audio);
  });

  it("returns Audio for audio/wav", () => {
    // Arrange
    const testFile: IFile = {
      content: "x",
      type: "audio/wav",
    };

    // Act
    const fileType = getFileType(testFile);

    // Assert
    expect(fileType).toBe(FileType.Audio);
  });

  it("returns Audio for AUDIO/WAV (case insensitive)", () => {
    // Arrange
    const testFile: IFile = {
      content: "x",
      type: "AUDIO/WAV",
    };

    // Act
    const fileType = getFileType(testFile);

    // Assert
    expect(fileType).toBe(FileType.Audio);
  });

  it("returns Document for application/pdf", () => {
    // Arrange
    const testFile: IFile = {
      content: "x",
      type: "application/pdf",
    };

    // Act
    const fileType = getFileType(testFile);

    // Assert
    expect(fileType).toBe(FileType.Document);
  });

  it("returns Document for APPLICATION/PDF (case insensitive)", () => {
    // Arrange
    const testFile: IFile = {
      content: "x",
      type: "APPLICATION/PDF",
    };

    // Act
    const fileType = getFileType(testFile);

    // Assert
    expect(fileType).toBe(FileType.Document);
  });

  it("returns Unknown for application/json", () => {
    // Arrange
    const testFile: IFile = {
      content: "x",
      type: "application/json",
    };

    // Act
    const fileType = getFileType(testFile);

    // Assert
    expect(fileType).toBe(FileType.Unknown);
  });

  it("returns Unknown for application/octet-stream", () => {
    // Arrange
    const testFile: IFile = {
      content: "x",
      type: "application/octet-stream",
    };

    // Act
    const fileType = getFileType(testFile);

    // Assert
    expect(fileType).toBe(FileType.Unknown);
  });

  it("returns Unknown for text/plain", () => {
    // Arrange
    const testFile: IFile = {
      content: "x",
      type: "text/plain",
    };

    // Act
    const fileType = getFileType(testFile);

    // Assert
    expect(fileType).toBe(FileType.Unknown);
  });

  it("returns Unknown for unknown main type", () => {
    // Arrange
    const testFile: IFile = {
      content: "x",
      type: "foo/bar",
    };

    // Act
    const fileType = getFileType(testFile);

    // Assert
    expect(fileType).toBe(FileType.Unknown);
  });
});
