import { describe, expect, it } from "vitest";
import {
  blobMetadataParser,
  toBlobUploadOptions,
} from "../providers/azure/azure-blob-metadata-parser";
import type { BlobItem } from "@azure/storage-blob";

describe("blobMetadataParser.parseFromProperties", () => {
  it("returns displayName as last segment of blobName", () => {
    // Arrange
    const properties = {
      contentType: "application/pdf",
      sizeInBytes: 1024,
      metadata: {},
    };

    // Act
    const result = blobMetadataParser.parseFromProperties(
      properties,
      "s/form-1/sub-1/document.pdf",
    );

    // Assert
    expect(result.kind).toBe("user");
    expect(result.displayName).toBe("document.pdf");
    expect(result.uploadedBy).toBe("anonymous");
  });

  it("returns contentType, sizeInBytes, and metadata fields when provided", () => {
    // Arrange
    const properties = {
      contentType: "image/jpeg",
      sizeInBytes: 2048,
      metadata: {
        filename: "photo.jpg",
        questionName: "q1",
      },
    };

    // Act
    const result = blobMetadataParser.parseFromProperties(
      properties,
      "s/f1/s1/photo.jpg",
    );

    // Assert
    expect(result.contentType).toBe("image/jpeg");
    expect(result.sizeInBytes).toBe(2048);
    expect(result.originalFileName).toBe("photo.jpg");
    expect(result.questionName).toBe("q1");
    expect(result.uploadedBy).toBe("anonymous");
  });

  it("uses default contentType when properties.contentType is empty", () => {
    // Arrange
    const properties = {
      sizeInBytes: 0,
      metadata: {},
    };

    // Act
    const result = blobMetadataParser.parseFromProperties(
      properties,
      "s/f1/s1/file.bin",
    );

    // Assert
    expect(result.contentType).toBe("application/octet-stream");
  });

  it("supports Azure lowercased metadata keys (filename, questionname)", () => {
    // Arrange
    const properties = {
      contentType: "application/pdf",
      sizeInBytes: 100,
      metadata: {
        filename: "doc.pdf",
        questionname: "question-1",
      },
    };

    // Act
    const result = blobMetadataParser.parseFromProperties(
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
    const result = blobMetadataParser.parseFromProperties(
      properties,
      "s/f1/s1/unnamed.txt",
    );

    // Assert
    expect(result.originalFileName).toBeUndefined();
    expect(result.questionName).toBeUndefined();
    expect(result.uploadedBy).toBe("anonymous");
  });

  it("returns uploadedBy from metadata when present, otherwise anonymous", () => {
    const withUploadedBy = blobMetadataParser.parseFromProperties(
      {
        contentType: "application/pdf",
        sizeInBytes: 0,
        metadata: { uploadedBy: "usr-123" },
      },
      "s/f1/s1/doc.pdf",
    );
    expect(withUploadedBy.uploadedBy).toBe("usr-123");

    const lowercased = blobMetadataParser.parseFromProperties(
      {
        contentType: "application/pdf",
        sizeInBytes: 0,
        metadata: { uploadedby: "usr-456" },
      },
      "s/f1/s1/doc.pdf",
    );
    expect(lowercased.uploadedBy).toBe("usr-456");
  });

  it("infers contentType from file extension when stored as application/octet-stream", () => {
    const result = blobMetadataParser.parseFromProperties(
      {
        contentType: "application/octet-stream",
        sizeInBytes: 1024,
        metadata: {},
      },
      "s/f1/s1/photo.png",
    );
    expect(result.contentType).toBe("image/png");
  });

  it("keeps application/octet-stream when extension is unknown", () => {
    const result = blobMetadataParser.parseFromProperties(
      {
        contentType: "application/octet-stream",
        sizeInBytes: 100,
        metadata: {},
      },
      "s/f1/s1/file.bin",
    );
    expect(result.contentType).toBe("application/octet-stream");
  });

  it("does not override explicit contentType with extension guess", () => {
    const result = blobMetadataParser.parseFromProperties(
      {
        contentType: "image/jpeg",
        sizeInBytes: 500,
        metadata: {},
      },
      "s/f1/s1/photo.png",
    );
    expect(result.contentType).toBe("image/jpeg");
  });
});

describe("blobMetadataParser.parseFromBlob", () => {
  it("returns displayName as last segment of blob.name", () => {
    // Arrange
    const blob = {
      name: "s/form-1/sub-1/report.pdf",
      metadata: {},
      properties: { contentType: "application/pdf", contentLength: 500 },
    } as unknown as BlobItem;

    // Act
    const result = blobMetadataParser.parseFromBlob(blob);

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
    const result = blobMetadataParser.parseFromBlob(blob);

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
    const result = blobMetadataParser.parseFromBlob(blob);

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
    const result = blobMetadataParser.parseFromBlob(blob);

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
    const result = blobMetadataParser.parseFromBlob(blob);

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
    const result = blobMetadataParser.parseFromBlob(blob);

    // Assert
    expect(result.sizeInBytes).toBe(0);
  });

  it("returns originalFileName and questionName from metadata (filename/fileName, questionname/questionName)", () => {
    // Arrange
    const blob = {
      name: "s/f1/s1/upload.pdf",
      metadata: {
        fileName: "original.pdf",
        questionName: "q2",
      },
      properties: { contentType: "application/pdf", contentLength: 100 },
    } as unknown as BlobItem;

    // Act
    const result = blobMetadataParser.parseFromBlob(blob);

    // Assert
    expect(result.originalFileName).toBe("original.pdf");
    expect(result.questionName).toBe("q2");
    expect(result.uploadedBy).toBe("anonymous");
  });

  it("prefers lowercase metadata keys when both present (Azure behavior)", () => {
    // Arrange
    const blob = {
      name: "s/f1/s1/x",
      metadata: {
        filename: "from-lowercase",
        fileName: "from-camel",
        questionname: "q-lower",
        questionName: "q-camel",
      },
      properties: { contentType: "application/octet-stream", contentLength: 0 },
    } as unknown as BlobItem;

    // Act
    const result = blobMetadataParser.parseFromBlob(blob);

    // Assert - filename/fileName: first wins (filename); questionname/questionName: first wins (questionname)
    expect(result.kind).toBe("user");
    expect(result.originalFileName).toBe("from-lowercase");
    expect(result.questionName).toBe("q-lower");
  });

  it("infers contentType from displayName when blob has application/octet-stream", () => {
    const blob = {
      name: "s/f1/s1/screenshot.png",
      metadata: {},
      properties: {
        contentType: "application/octet-stream",
        contentLength: 2048,
      },
    } as unknown as BlobItem;

    const result = blobMetadataParser.parseFromBlob(blob);

    expect(result.contentType).toBe("image/png");
  });

  it("infers contentType from displayName when placeholder (missing contentType)", () => {
    const blob = {
      name: "s/f1/s1/document.pdf",
      metadata: {},
      properties: { contentLength: 100 },
    } as unknown as BlobItem;

    const result = blobMetadataParser.parseFromBlob(blob);

    expect(result.contentType).toBe("application/pdf");
  });
});

describe("toBlobUploadOptions", () => {
  it("builds user blob options with base + form fields and blobContentLanguage", () => {
    const meta = {
      kind: "user" as const,
      displayName: "doc.pdf",
      contentType: "application/pdf",
      uploadedBy: "usr-1",
      formId: "f1",
      submissionId: "s1",
      formLang: "en",
    };
    const result = toBlobUploadOptions(meta);
    expect(result.metadata).toMatchObject({
      uploadedBy: "usr-1",
      fileName: "doc.pdf",
      fileType: "application/pdf",
      formId: "f1",
      submissionId: "s1",
      formLang: "en",
    });
    expect(result.blobHTTPHeaders).toMatchObject({
      blobContentType: "application/pdf",
      blobContentLanguage: "en",
      blobContentDisposition: "inline",
    });
  });

  it("builds content blob options with base + item fields, no blobContentLanguage", () => {
    const meta = {
      kind: "content" as const,
      displayName: "image.png",
      contentType: "image/png",
      uploadedBy: "usr-1",
      itemId: "item-1",
      contentItemType: "form" as const,
    };
    const result = toBlobUploadOptions(meta);
    expect(result.metadata).toMatchObject({
      uploadedBy: "usr-1",
      fileName: "image.png",
      fileType: "image/png",
      itemId: "item-1",
      contentItemType: "form",
    });
    expect(result.blobHTTPHeaders.blobContentLanguage).toBeUndefined();
    expect(result.blobHTTPHeaders.blobContentType).toBe("image/png");
  });

  it("includes fileState and questionName when present", () => {
    const userMeta = {
      kind: "user" as const,
      displayName: "x",
      contentType: "application/octet-stream",
      uploadedBy: "usr-1",
      formId: "f1",
      submissionId: "s1",
      formLang: "",
      fileState: "optimized" as const,
      questionName: "q1",
    };
    const result = toBlobUploadOptions(userMeta);
    expect(result.metadata.fileState).toBe("optimized");
    expect(result.metadata.questionName).toBe("q1");
  });
});
