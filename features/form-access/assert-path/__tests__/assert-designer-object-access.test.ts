import { describe, expect, it } from "vitest";
import { assertDesignerObjectAccess } from "../assert-designer-object-access";
import { clientStorageConfig } from "@/features/asset-storage/__tests__/test-storage-config";

const storageConfig = clientStorageConfig({ isPrivate: true });

describe("assertDesignerObjectAccess", () => {
  it("allows scoped content under formId", () => {
    const error = assertDesignerObjectAccess(
      {
        containerName: "content",
        blobName: "f/42/logo.png",
        hostName: "storage.example.com",
      },
      { formId: "42" },
      storageConfig,
    );
    expect(error).toBeNull();
  });

  it("allows elevated content under f/ without matching scope", () => {
    const error = assertDesignerObjectAccess(
      {
        containerName: "content",
        blobName: "f/shared/asset.png",
        hostName: "storage.example.com",
      },
      {},
      storageConfig,
    );
    expect(error).toBeNull();
  });

  it("denies user-files without submissionId", () => {
    const error = assertDesignerObjectAccess(
      {
        containerName: "user-files",
        blobName: "s/42/99/file.pdf",
        hostName: "storage.example.com",
      },
      { formId: "42" },
      storageConfig,
    );
    expect(error).toContain("Submission context");
  });

  it("denies user-files for another submission", () => {
    const error = assertDesignerObjectAccess(
      {
        containerName: "user-files",
        blobName: "s/42/100/file.pdf",
        hostName: "storage.example.com",
      },
      { formId: "42", submissionId: "99" },
      storageConfig,
    );
    expect(error).toContain("not scoped to this submission");
  });

  it("allows user-files when form and submission match", () => {
    const error = assertDesignerObjectAccess(
      {
        containerName: "user-files",
        blobName: "s/42/99/file.pdf",
        hostName: "storage.example.com",
      },
      { formId: "42", submissionId: "99" },
      storageConfig,
    );
    expect(error).toBeNull();
  });
});
