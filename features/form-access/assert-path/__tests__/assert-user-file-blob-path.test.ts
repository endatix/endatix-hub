import { describe, expect, it } from "vitest";
import { assertUserFileBlobPath } from "../assert-user-file-blob-path";

describe("assertUserFileBlobPath", () => {
  it("allows blob under form and submission when required", () => {
    const error = assertUserFileBlobPath(
      "s/100/200/file.pdf",
      { formId: "100", submissionId: "200" },
      { requireSubmission: true },
    );
    expect(error).toBeNull();
  });

  it("rejects wrong form prefix", () => {
    const error = assertUserFileBlobPath(
      "s/999/200/file.pdf",
      { formId: "100", submissionId: "200" },
      { requireSubmission: true },
    );
    expect(error).toContain("not scoped to this form");
  });

  it("rejects wrong submission prefix", () => {
    const error = assertUserFileBlobPath(
      "s/100/999/file.pdf",
      { formId: "100", submissionId: "200" },
      { requireSubmission: true },
    );
    expect(error).toContain("not scoped to this submission");
  });

  it("requires submission when configured", () => {
    const error = assertUserFileBlobPath(
      "s/100/200/file.pdf",
      { formId: "100" },
      { requireSubmission: true },
    );
    expect(error).toContain("Submission context");
  });
});
