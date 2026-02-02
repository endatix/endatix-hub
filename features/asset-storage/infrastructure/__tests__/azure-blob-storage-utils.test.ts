import { describe, expect, it } from "vitest";
import {
  parseUserFileMetadata,
  parseUserFileMetadataFromProperties,
} from "../azure-blob-storage-utils";
import type { BlobItem } from "@azure/storage-blob";

describe("parseUserFileMetadataFromProperties", () => {
  it("returns displayName as last segment of blobName", () => {
    // Arrange
    const properties = {
      contentType: "application/pdf",
      sizeInBytes: 1024,
      metadata: {},
    };

    // Act
    const result = parseUserFileMetadataFromProperties(
      properties,
      "s/form-1/sub-1/document.pdf",
    );

    // Assert
    expect(result.displayName).toBe("document.pdf");
  });

  it("returns contentType, sizeInBytes, and metadata fields when provided", () => {
    // Arrange
    const properties = {
      contentType: "image/jpeg",
      sizeInBytes: 2048,
      metadata: {
        filename: "photo.jpg",
        questionId: "q1",
      },
    };

    // Act
    const result = parseUserFileMetadataFromProperties(
      properties,
      "s/f1/s1/photo.jpg",
    );

    // Assert
    expect(result.contentType).toBe("image/jpeg");
    expect(result.sizeInBytes).toBe(2048);
    expect(result.originalFileName).toBe("photo.jpg");
    expect(result.questionName).toBe("q1");
  });

  it("uses default contentType when properties.contentType is empty", () => {
    // Arrange
    const properties = {
      sizeInBytes: 0,
      metadata: {},
    };

    // Act
    const result = parseUserFileMetadataFromProperties(
      properties,
      "s/f1/s1/file.bin",
    );

    // Assert
    expect(result.contentType).toBe("application/octet-stream");
  });

  it("supports Azure lowercased metadata keys (filename, questionid)", () => {
    // Arrange
    const properties = {
      contentType: "application/pdf",
      sizeInBytes: 100,
      metadata: {
        filename: "doc.pdf",
        questionid: "question-1",
      },
    };

    // Act
    const result = parseUserFileMetadataFromProperties(
      properties,
      "s/f1/s1/doc.pdf",
    );

    // Assert
    expect(result.originalFileName).toBe("doc.pdf");
    expect(result.questionName).toBe("question-1");
  });

  it("returns undefined for originalFileName and questionName when not in metadata", () => {
    // Arrange
    const properties = {
      contentType: "text/plain",
      sizeInBytes: 0,
      metadata: {},
    };

    // Act
    const result = parseUserFileMetadataFromProperties(
      properties,
      "s/f1/s1/unnamed.txt",
    );

    // Assert
    expect(result.originalFileName).toBeUndefined();
    expect(result.questionName).toBeUndefined();
  });
});

describe("parseUserFileMetadata", () => {
  it("returns displayName as last segment of blob.name", () => {
    // Arrange
    const blob = {
      name: "s/form-1/sub-1/report.pdf",
      metadata: {},
      properties: { contentType: "application/pdf", contentLength: 500 },
    } as unknown as BlobItem;

    // Act
    const result = parseUserFileMetadata(blob);

    // Assert
    expect(result.displayName).toBe("report.pdf");
  });

  it("returns contentType from blob.properties.contentType when metadata has no content-type", () => {
    // Arrange
    const blob = {
      name: "s/f1/s1/file.pdf",
      metadata: {},
      properties: { contentType: "application/pdf", contentLength: 100 },
    } as unknown as BlobItem;

    // Act
    const result = parseUserFileMetadata(blob);

    // Assert
    expect(result.contentType).toBe("application/pdf");
  });

  it("returns contentType from metadata content-type when present", () => {
    // Arrange
    const blob = {
      name: "s/f1/s1/file.pdf",
      metadata: { "content-type": "application/custom" },
      properties: { contentType: "application/pdf", contentLength: 100 },
    } as unknown as BlobItem;

    // Act
    const result = parseUserFileMetadata(blob);

    // Assert
    expect(result.contentType).toBe("application/custom");
  });

  it("returns placeholder when contentType is missing", () => {
    // Arrange
    const blob = {
      name: "s/f1/s1/file.bin",
      metadata: {},
      properties: { contentLength: 50 },
    } as unknown as BlobItem;

    // Act
    const result = parseUserFileMetadata(blob);

    // Assert
    expect(result.contentType).toBe("—");
  });

  it("returns sizeInBytes from blob.properties.contentLength", () => {
    // Arrange
    const blob = {
      name: "s/f1/s1/file.pdf",
      metadata: {},
      properties: { contentType: "application/pdf", contentLength: 2048 },
    } as unknown as BlobItem;

    // Act
    const result = parseUserFileMetadata(blob);

    // Assert
    expect(result.sizeInBytes).toBe(2048);
  });

  it("returns sizeInBytes 0 when contentLength is missing", () => {
    // Arrange
    const blob = {
      name: "s/f1/s1/file.pdf",
      metadata: {},
      properties: { contentType: "application/pdf" },
    } as unknown as BlobItem;

    // Act
    const result = parseUserFileMetadata(blob);

    // Assert
    expect(result.sizeInBytes).toBe(0);
  });

  it("returns originalFileName and questionName from metadata (filename/fileName, questionid/questionId)", () => {
    // Arrange
    const blob = {
      name: "s/f1/s1/upload.pdf",
      metadata: {
        fileName: "original.pdf",
        questionId: "q2",
      },
      properties: { contentType: "application/pdf", contentLength: 100 },
    } as unknown as BlobItem;

    // Act
    const result = parseUserFileMetadata(blob);

    // Assert
    expect(result.originalFileName).toBe("original.pdf");
    expect(result.questionName).toBe("q2");
  });

  it("prefers lowercase metadata keys when both present (Azure behavior)", () => {
    // Arrange
    const blob = {
      name: "s/f1/s1/x",
      metadata: {
        filename: "from-lowercase",
        fileName: "from-camel",
        questionid: "q-lower",
        questionId: "q-camel",
      },
      properties: { contentType: "application/octet-stream", contentLength: 0 },
    } as unknown as BlobItem;

    // Act
    const result = parseUserFileMetadata(blob);

    // Assert - filename/fileName: first wins (filename)
    expect(result.originalFileName).toBe("from-lowercase");
    expect(result.questionName).toBe("q-lower");
  });
});
