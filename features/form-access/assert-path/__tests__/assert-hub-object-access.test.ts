import { describe, expect, it } from "vitest";
import { clientStorageConfig } from "@/features/asset-storage/__tests__/test-storage-config";
import { assertHubObjectAccess } from "../assert-hub-object-access";

const storageConfig = clientStorageConfig({ isPrivate: true });

describe("assertHubObjectAccess", () => {
  it("allows scoped form content under formId", () => {
    const error = assertHubObjectAccess(
      {
        containerName: "content",
        blobName: "f/form-1/logo.png",
        hostName: "storage.example.com",
        containerType: "CONTENT",
        isPrivate: true,
      },
      { formId: "form-1" },
      storageConfig,
    );
    expect(error).toBeNull();
  });

  it("allows scoped template content under templateId", () => {
    const error = assertHubObjectAccess(
      {
        containerName: "content",
        blobName: "t/template-1/logo.svg",
        hostName: "storage.example.com",
        containerType: "CONTENT",
        isPrivate: true,
      },
      { templateId: "template-1" },
      storageConfig,
    );
    expect(error).toBeNull();
  });

  it("allows copied template content while editing a form", () => {
    const error = assertHubObjectAccess(
      {
        containerName: "content",
        blobName: "t/template-1/logo.svg",
        hostName: "storage.example.com",
        containerType: "CONTENT",
        isPrivate: true,
      },
      { formId: "form-1" },
      storageConfig,
    );
    expect(error).toBeNull();
  });

  it("allows elevated content under valid content namespaces", () => {
    const formContentError = assertHubObjectAccess(
      {
        containerName: "content",
        blobName: "f/shared/logo.png",
        hostName: "storage.example.com",
        containerType: "CONTENT",
        isPrivate: true,
      },
      {},
      storageConfig,
    );
    const templateContentError = assertHubObjectAccess(
      {
        containerName: "content",
        blobName: "t/shared/logo.png",
        hostName: "storage.example.com",
        containerType: "CONTENT",
        isPrivate: true,
      },
      {},
      storageConfig,
    );

    expect(formContentError).toBeNull();
    expect(templateContentError).toBeNull();
  });

  it("denies content outside form and template namespaces", () => {
    const error = assertHubObjectAccess(
      {
        containerName: "content",
        blobName: "logo.png",
        hostName: "storage.example.com",
        containerType: "CONTENT",
        isPrivate: true,
      },
      { formId: "form-1" },
      storageConfig,
    );
    expect(error).toContain("content namespace");
  });

  it("denies user-files without submissionId", () => {
    const error = assertHubObjectAccess(
      {
        containerName: "user-files",
        blobName: "s/form-1/submission-1/file.pdf",
        hostName: "storage.example.com",
        containerType: "USER_FILES",
        isPrivate: true,
      },
      { formId: "form-1" },
      storageConfig,
    );
    expect(error).toContain("Submission context");
  });

  it("allows user-files when form and submission match", () => {
    const error = assertHubObjectAccess(
      {
        containerName: "user-files",
        blobName: "s/form-1/submission-1/file.pdf",
        hostName: "storage.example.com",
        containerType: "USER_FILES",
        isPrivate: true,
      },
      { formId: "form-1", submissionId: "submission-1" },
      storageConfig,
    );
    expect(error).toBeNull();
  });
});
