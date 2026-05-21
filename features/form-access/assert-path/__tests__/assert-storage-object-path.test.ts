import { describe, expect, it } from "vitest";
import { clientStorageConfig } from "@/features/asset-storage/__tests__/test-storage-config";
import { assertStorageObjectPathAccess } from "../assert-storage-object-path";

const storageConfig = clientStorageConfig({ isPrivate: true });

describe("assertStorageObjectPathAccess", () => {
  it("allows form and template content paths", () => {
    const formError = assertStorageObjectPathAccess(
      {
        containerName: "content",
        blobName: "f/form-1/logo.png",
        hostName: "storage.example.com",
        containerType: "CONTENT",
        isPrivate: true,
      },
      storageConfig,
      { formId: "form-1", contentNamespaceName: "form" },
    );
    const templateError = assertStorageObjectPathAccess(
      {
        containerName: "content",
        blobName: "t/template-1/logo.svg",
        hostName: "storage.example.com",
        containerType: "CONTENT",
        isPrivate: true,
      },
      storageConfig,
      { formId: "form-1", contentNamespaceName: "form" },
    );

    expect(formError).toBeNull();
    expect(templateError).toBeNull();
  });

  it("rejects content outside the supported namespaces with policy-specific wording", () => {
    const error = assertStorageObjectPathAccess(
      {
        containerName: "content",
        blobName: "x/form-1/logo.png",
        hostName: "storage.example.com",
        containerType: "CONTENT",
        isPrivate: true,
      },
      storageConfig,
      { formId: "form-1", contentNamespaceName: "hub" },
    );

    expect(error).toBe("Content object is not in hub content namespace");
  });

  it("rejects unknown containers", () => {
    const error = assertStorageObjectPathAccess(
      {
        containerName: "unknown",
        blobName: "f/form-1/logo.png",
        hostName: "storage.example.com",
        containerType: "CONTENT",
        isPrivate: true,
      },
      storageConfig,
      { formId: "form-1", contentNamespaceName: "form" },
    );

    expect(error).toBe("Unknown storage container");
  });

  it("requires form context for user files", () => {
    const error = assertStorageObjectPathAccess(
      {
        containerName: "user-files",
        blobName: "s/form-1/submission-1/file.pdf",
        hostName: "storage.example.com",
        containerType: "CONTENT",
        isPrivate: true,
      },
      storageConfig,
      { contentNamespaceName: "designer" },
    );

    expect(error).toBe("Form context is required for user file access");
  });

  it("requires submission context for user files", () => {
    const error = assertStorageObjectPathAccess(
      {
        containerName: "user-files",
        blobName: "s/form-1/submission-1/file.pdf",
        hostName: "storage.example.com",
        containerType: "CONTENT",
        isPrivate: true,
      },
      storageConfig,
      { formId: "form-1", contentNamespaceName: "form" },
    );

    expect(error).toBe("Submission context is required for user file access");
  });

  it("rejects user files outside the requested form or submission", () => {
    const formError = assertStorageObjectPathAccess(
      {
        containerName: "user-files",
        blobName: "s/form-2/submission-1/file.pdf",
        hostName: "storage.example.com",
        containerType: "CONTENT",
        isPrivate: true,
      },
      storageConfig,
      {
        formId: "form-1",
        submissionId: "submission-1",
        contentNamespaceName: "form",
      },
    );
    const submissionError = assertStorageObjectPathAccess(
      {
        containerName: "user-files",
        blobName: "s/form-1/submission-2/file.pdf",
        hostName: "storage.example.com",
        containerType: "USER_FILES",
        isPrivate: true,
      },
      storageConfig,
      {
        formId: "form-1",
        submissionId: "submission-1",
        contentNamespaceName: "form",
      },
    );

    expect(formError).toBe("File is not scoped to this form");
    expect(submissionError).toBe("File is not scoped to this submission");
  });
});
