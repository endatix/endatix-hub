import { describe, expect, it } from "vitest";
import type { UserFileMetadata } from "../../../../types";
import { decodeHeaderValueFromFetch } from "../../../fetch-header-utils";
import { toBlobUploadOptions } from "../../shared/upload-metadata";
import { toS3PresignedPut } from "../s3-put-headers";

function userMetadata(displayName: string): UserFileMetadata {
  return {
    kind: "user",
    displayName,
    contentType: "image/png",
    formId: "form-1",
    submissionId: "sub-1",
    formLang: "en",
    questionName: "question1",
    uploadedBy: "user-1",
    fileState: "original",
  };
}

describe("toS3PresignedPut", () => {
  it("includes x-amz-meta headers for user file metadata", () => {
    // Arrange
    const blobOptions = toBlobUploadOptions(userMetadata("photo.png"));

    // Act
    const put = toS3PresignedPut(blobOptions);

    // Assert
    expect(put.headers["Content-Type"]).toBe("image/png");
    expect(put.headers["x-amz-meta-filename"]).toBe("photo.png");
    expect(put.headers["x-amz-meta-questionname"]).toBe("question1");
    expect(put.headers["x-amz-meta-formid"]).toBe("form-1");
    expect(put.headers["x-amz-meta-submissionid"]).toBe("sub-1");
    expect(put.metadata?.filename).toBe(put.headers["x-amz-meta-filename"]);
    expect(put.unhoistableHeaders.has("x-amz-meta-filename")).toBe(true);
  });

  it("encodes non-ASCII metadata as an ASCII utf8 value", () => {
    // Arrange
    const cafe = toBlobUploadOptions(userMetadata("café.png"));
    const cyrillic = toBlobUploadOptions(userMetadata("Билет.png"));

    // Act
    const cafePut = toS3PresignedPut(cafe);
    const cyrillicPut = toS3PresignedPut(cyrillic);

    // Assert
    expect(cafePut.headers["x-amz-meta-filename"]).toBe("utf8:caf%C3%A9.png");
    expect(cafePut.metadata?.filename).toBe("utf8:caf%C3%A9.png");
    expect(cyrillicPut.headers["x-amz-meta-filename"]).toBe(
      `utf8:${encodeURIComponent("Билет.png")}`,
    );
    expect(cyrillicPut.metadata?.filename).toBe(
      cyrillicPut.headers["x-amz-meta-filename"],
    );
  });

  it("encodes an ASCII name that already starts with utf8:", () => {
    // Arrange
    const displayName = "utf8:a%20b.png";
    const blobOptions = toBlobUploadOptions(userMetadata(displayName));

    // Act
    const put = toS3PresignedPut(blobOptions);

    // Assert
    const stored = `utf8:${encodeURIComponent(displayName)}`;
    expect(put.headers["x-amz-meta-filename"]).toBe(stored);
    expect(put.metadata?.filename).toBe(stored);
    expect(decodeHeaderValueFromFetch(stored)).toBe(displayName);
  });
});
