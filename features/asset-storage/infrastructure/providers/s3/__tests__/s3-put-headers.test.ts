import { describe, expect, it } from "vitest";
import type { UserFileMetadata } from "../../../types";
import { toBlobUploadOptions } from "../../shared/upload-metadata";
import { toS3PresignedPutHeaders } from "../s3-put-headers";

describe("toS3PresignedPutHeaders", () => {
  it("includes x-amz-meta headers for user file metadata", () => {
    const meta: UserFileMetadata = {
      kind: "user",
      displayName: "photo.png",
      contentType: "image/png",
      formId: "form-1",
      submissionId: "sub-1",
      formLang: "en",
      questionName: "question1",
      uploadedBy: "user-1",
      fileState: "original",
    };
    const blobOptions = toBlobUploadOptions(meta);
    const headers = toS3PresignedPutHeaders(blobOptions);

    expect(headers["Content-Type"]).toBe("image/png");
    expect(headers["x-amz-meta-filename"]).toBe("photo.png");
    expect(headers["x-amz-meta-questionname"]).toBe("question1");
    expect(headers["x-amz-meta-formid"]).toBe("form-1");
    expect(headers["x-amz-meta-submissionid"]).toBe("sub-1");
  });
});
