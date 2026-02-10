import { describe, it, expect } from "vitest";
import { RestError } from "@azure/storage-blob";
import {
  throwUploadError,
  processUploadError,
  UploadError,
  UploadUnauthorizedError,
  UploadBlockedError,
  UploadCode,
} from "@/features/asset-storage/use-cases/upload/upload-errors";

const fileUrl = "https://account.blob.core.windows.net/container/file.pdf?sv=1";

describe("throwUploadError", () => {
  it("throws UploadUnauthorizedError when RestError has statusCode 403 and code AuthenticationFailed", () => {
    // Arrange
    const restError = new RestError("Authentication failed", {
      statusCode: 403,
      code: "AuthenticationFailed",
    });

    // Act & Assert
    expect(() => throwUploadError(restError, fileUrl)).toThrow(
      UploadUnauthorizedError,
    );
    try {
      throwUploadError(restError, fileUrl);
    } catch (err) {
      expect(err).toBeInstanceOf(UploadUnauthorizedError);
      expect((err as UploadUnauthorizedError).fileUrl).toBe(fileUrl);
      expect((err as UploadUnauthorizedError).code).toBe(
        UploadCode.Unauthorized,
      );
      expect((err as UploadUnauthorizedError).description).toBe(
        "You must be authenticated to upload files. Please sign in and try again.",
      );
      expect((err as UploadUnauthorizedError).cause).toBe(restError);
    }
  });

  it("throws UploadBlockedError when RestError has statusCode 403 without AuthenticationFailed code", () => {
    // Arrange
    const restError = new RestError("Forbidden", { statusCode: 403 });

    // Act & Assert
    expect(() => throwUploadError(restError, fileUrl)).toThrow(
      UploadBlockedError,
    );
    try {
      throwUploadError(restError, fileUrl);
    } catch (err) {
      expect(err).toBeInstanceOf(UploadBlockedError);
      expect((err as UploadBlockedError).fileUrl).toBe(fileUrl);
      expect((err as UploadBlockedError).code).toBe(UploadCode.BlockedByWAF);
      expect((err as UploadBlockedError).description).toBe(
        "File was rejected by security scan. Please check the file and try again.",
      );
      expect((err as UploadBlockedError).cause).toBe(restError);
    }
  });

  it("throws UploadBlockedError when RestError has statusCode 403 with code other than AuthenticationFailed", () => {
    // Arrange
    const restError = new RestError("WAF blocked", {
      statusCode: 403,
      code: "AuthorizationPermissionMismatch",
    });

    // Act & Assert
    expect(() => throwUploadError(restError, fileUrl)).toThrow(
      UploadBlockedError,
    );
  });

  it("throws UploadError with message and fileUrl when error is generic Error", () => {
    // Arrange
    const err = new Error("Network error");

    // Act & Assert
    expect(() => throwUploadError(err, fileUrl)).toThrow(UploadError);
    try {
      throwUploadError(err, fileUrl);
    } catch (e) {
      expect(e).toBeInstanceOf(UploadError);
      expect((e as UploadError).message).toBe("Network error");
      expect((e as UploadError).fileUrl).toBe(fileUrl);
      expect((e as UploadError).code).toBe(UploadCode.Unknown);
      expect((e as UploadError).description).toBe(
        "Unknown error occurred while uploading the file",
      );
      expect((e as UploadError).cause).toBe(err);
    }
  });

  it("throws UploadError with 'Unknown error' when error is not an Error instance", () => {
    // Arrange
    const notAnError = "something went wrong";

    // Act & Assert
    expect(() => throwUploadError(notAnError, fileUrl)).toThrow(UploadError);
    try {
      throwUploadError(notAnError, fileUrl);
    } catch (e) {
      expect(e).toBeInstanceOf(UploadError);
      expect((e as UploadError).message).toBe("Unknown error");
      expect((e as UploadError).fileUrl).toBe(fileUrl);
      expect((e as UploadError).cause).toBe(notAnError);
    }
  });
});

describe("processUploadError", () => {
  it("returns description when err is UploadError with description", () => {
    // Arrange
    const uploadError = new UploadError("Backend error", {
      fileUrl,
      description: "Custom user message",
    });

    // Act
    const message = processUploadError(uploadError);

    // Assert
    expect(message).toBe("Custom user message");
  });

  it("returns err.message when err is UploadError without description (generic)", () => {
    // Arrange
    const uploadError = new UploadError("Backend error", { fileUrl });

    // Act
    const message = processUploadError(uploadError);

    // Assert
    expect(message).toBe("Backend error");
  });

  it("returns description when err is UploadUnauthorizedError", () => {
    // Arrange
    const err = new UploadUnauthorizedError("Auth failed", {
      fileUrl,
      description: "Please sign in.",
    });

    // Act
    const message = processUploadError(err);

    // Assert
    expect(message).toBe("Please sign in.");
  });

  it("returns description when err is UploadBlockedError", () => {
    // Arrange
    const err = new UploadBlockedError("Blocked", {
      fileUrl,
      description: "File rejected by security scan.",
    });

    // Act
    const message = processUploadError(err);

    // Assert
    expect(message).toBe("File rejected by security scan.");
  });

  it("returns err.message when err is generic Error", () => {
    // Arrange
    const err = new Error("Network failure");

    // Act
    const message = processUploadError(err);

    // Assert
    expect(message).toBe("Network failure");
  });

  it("returns UNKNOWN_ERROR_MESSAGE when err is not Error instance", () => {
    // Act
    const message = processUploadError("oops");

    // Assert
    expect(message).toBe("Unknown error occurred while uploading the file");
  });

  it("returns full UI message including file name when fileName is provided", () => {
    // Arrange
    const err = new UploadBlockedError("Blocked", {
      fileUrl,
      description:
        "File was rejected by security scan. Please check the file and try again.",
    });

    // Act
    const message = processUploadError(err, "report.pdf");

    // Assert
    expect(message).toBe(
      "Could not upload file: report.pdf. File was rejected by security scan. Please check the file and try again.",
    );
  });

  it("returns full UI message for generic Error when fileName is provided", () => {
    // Act
    const message = processUploadError(new Error("Upload failed"), "doc.pdf");

    // Assert
    expect(message).toBe("Could not upload file: doc.pdf. Upload failed");
  });

  it("returns body only when fileName is empty string", () => {
    const err = new UploadBlockedError("Blocked", {
      fileUrl,
      description: "Blocked by scan",
    });

    const message = processUploadError(err, "");

    expect(message).toBe("Blocked by scan");
  });
});
