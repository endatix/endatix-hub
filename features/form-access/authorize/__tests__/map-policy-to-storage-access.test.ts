import { describe, expect, it } from "vitest";
import { PublicFormPermissions } from "../../domain/public-form-permissions";
import { mapPublicFormAccessToStorageAccess } from "../map-policy-to-storage-access";

const { Form, Submission } = PublicFormPermissions;

describe("mapPublicFormAccessToStorageAccess", () => {
  it("maps form file view/upload permissions to storage access flags", () => {
    const access = mapPublicFormAccessToStorageAccess(
      {
        formId: "100",
        submissionId: null,
        formPermissions: [Form.View, Form.FileView],
        submissionPermissions: [Submission.Create, Submission.FileUpload],
        cachedAt: "",
        expiresAt: "",
        eTag: "",
      },
      "100",
    );

    expect(access.canViewFiles).toBe(true);
    expect(access.canUploadFiles).toBe(true);
    expect(access.canDeleteFiles).toBe(true);
    expect(access.isPublicForm).toBe(false);
  });

  it("allows view from submission.file.view without form.file.view", () => {
    const access = mapPublicFormAccessToStorageAccess(
      {
        formId: "100",
        submissionId: "200",
        formPermissions: [],
        submissionPermissions: [Submission.FileView],
        cachedAt: "",
        expiresAt: "",
        eTag: "",
      },
      "100",
    );

    expect(access.canViewFiles).toBe(true);
    expect(access.canUploadFiles).toBe(false);
    expect(access.canDeleteFiles).toBe(false);
  });

  it("does not grant upload from form.file.upload alone", () => {
    const access = mapPublicFormAccessToStorageAccess(
      {
        formId: "100",
        submissionId: null,
        formPermissions: [Form.FileUpload],
        submissionPermissions: [],
        cachedAt: "",
        expiresAt: "",
        eTag: "",
      },
      "100",
    );

    expect(access.canUploadFiles).toBe(false);
    expect(access.canDeleteFiles).toBe(false);
  });

  it("allows delete when submission file upload is permitted", () => {
    const access = mapPublicFormAccessToStorageAccess(
      {
        formId: "100",
        submissionId: "200",
        formPermissions: [],
        submissionPermissions: [Submission.FileUpload],
        cachedAt: "",
        expiresAt: "",
        eTag: "",
      },
      "100",
      "200",
    );

    expect(access.canUploadFiles).toBe(true);
    expect(access.canDeleteFiles).toBe(true);
  });

  it("uses policy submissionId over gate body", () => {
    const access = mapPublicFormAccessToStorageAccess(
      {
        formId: "100",
        submissionId: "200",
        formPermissions: [Form.FileView],
        submissionPermissions: [Submission.FileView],
        cachedAt: "",
        expiresAt: "",
        eTag: "",
      },
      "100",
      "999",
    );

    expect(access.submissionId).toBe("200");
  });
});
