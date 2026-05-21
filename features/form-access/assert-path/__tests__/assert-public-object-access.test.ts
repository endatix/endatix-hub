import { describe, expect, it } from "vitest";
import { clientStorageConfig } from "@/features/asset-storage/__tests__/test-storage-config";
import type { FormStorageAccess } from "../../types";
import { assertPublicObjectAccess } from "../assert-public-object-access";

const storageConfig = clientStorageConfig({ isPrivate: true });

const access: FormStorageAccess = {
  formId: "form-1",
  submissionId: "submission-1",
  isPublicForm: true,
  canViewFiles: true,
  canUploadFiles: true,
  canDeleteFiles: true,
};

describe("assertPublicObjectAccess", () => {
  it("allows form content namespace", () => {
    const error = assertPublicObjectAccess(
      {
        containerName: "content",
        blobName: "f/form-1/logo.png",
        hostName: "storage.example.com",
        containerType: "CONTENT",
        isPrivate: true,
      },
      access,
      storageConfig,
    );
    expect(error).toBeNull();
  });

  it("allows template content namespace for forms created from templates", () => {
    const error = assertPublicObjectAccess(
      {
        containerName: "content",
        blobName: "t/template-1/logo.svg",
        hostName: "storage.example.com",
        containerType: "CONTENT",
        isPrivate: true,
      },
      access,
      storageConfig,
    );
    expect(error).toBeNull();
  });

  it("denies content outside form and template namespaces", () => {
    const error = assertPublicObjectAccess(
      {
        containerName: "content",
        blobName: "x/form-1/logo.svg",
        hostName: "storage.example.com",
        containerType: "CONTENT",
        isPrivate: true,
      },
      access,
      storageConfig,
    );
    expect(error).toContain("content namespace");
  });
});
