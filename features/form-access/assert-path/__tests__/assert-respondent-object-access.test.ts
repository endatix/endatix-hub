import { describe, expect, it } from "vitest";
import { assertStorageObjectAccess } from "../assert-respondent-object-access";
import type { FormStorageAccess } from "../../types";
import type { ClientStorageConfig } from "@/features/asset-storage/infrastructure/providers/shared/client-storage-config";

const storageConfig: ClientStorageConfig = {
  isEnabled: true,
  isPrivate: true,
  hostName: "storage.example.com",
  protocol: "https",
  containerNames: { USER_FILES: "user-files", CONTENT: "content" },
  imageConfig: { isResizeEnabled: false, defaultResizeWidth: 800 },
};

const access: FormStorageAccess = {
  formId: "100",
  submissionId: "200",
  isPublicForm: false,
  canViewFiles: true,
  canUploadFiles: true,
  canDeleteFiles: true,
};

describe("assertStorageObjectAccess", () => {
  it("allows user-files under the submission prefix", () => {
    const error = assertStorageObjectAccess(
      {
        containerName: "user-files",
        blobName: "s/100/200/file.pdf",
        hostName: "storage.example.com",
      },
      access,
      storageConfig,
    );
    expect(error).toBeNull();
  });

  it("rejects user-files for another submission", () => {
    const error = assertStorageObjectAccess(
      {
        containerName: "user-files",
        blobName: "s/100/999/file.pdf",
        hostName: "storage.example.com",
      },
      access,
      storageConfig,
    );
    expect(error).toContain("submission");
  });

  it("allows content scoped to the form", () => {
    const error = assertStorageObjectAccess(
      {
        containerName: "content",
        blobName: "f/100/logo.png",
        hostName: "storage.example.com",
      },
      access,
      storageConfig,
    );
    expect(error).toBeNull();
  });

  it("allows content from another form folder (cross-form reuse)", () => {
    const error = assertStorageObjectAccess(
      {
        containerName: "content",
        blobName: "f/999/logo.png",
        hostName: "storage.example.com",
      },
      access,
      storageConfig,
    );
    expect(error).toBeNull();
  });

  it("allows template content namespace", () => {
    const error = assertStorageObjectAccess(
      {
        containerName: "content",
        blobName: "t/50/asset.png",
        hostName: "storage.example.com",
      },
      access,
      storageConfig,
    );
    expect(error).toBeNull();
  });

  it("rejects content outside f/ or t/ namespace", () => {
    const error = assertStorageObjectAccess(
      {
        containerName: "content",
        blobName: "logo.png",
        hostName: "storage.example.com",
      },
      access,
      storageConfig,
    );
    expect(error).toContain("content namespace");
  });

  it("rejects content under an unknown namespace", () => {
    const error = assertStorageObjectAccess(
      {
        containerName: "content",
        blobName: "x/100/logo.png",
        hostName: "storage.example.com",
        containerType: "CONTENT",
        isPrivate: true,
      },
      access,
      storageConfig,
    );
    expect(error).toContain("content namespace");
  });

  it("rejects user-files for another form", () => {
    const error = assertStorageObjectAccess(
      {
        containerName: "user-files",
        blobName: "s/999/200/file.pdf",
        hostName: "storage.example.com",
      },
      access,
      storageConfig,
    );
    expect(error).toContain("not scoped to this form");
  });

  it("requires submission context for user-files", () => {
    const error = assertStorageObjectAccess(
      {
        containerName: "user-files",
        blobName: "s/100/200/file.pdf",
        hostName: "storage.example.com",
      },
      { ...access, submissionId: undefined },
      storageConfig,
    );
    expect(error).toContain("Submission context");
  });
});
