import { RestError } from "@azure/storage-blob";

const AUTHENTICATION_FAILED_CODE = "AuthenticationFailed";
const UNKNOWN_ERROR_MESSAGE = "Unknown error occurred while uploading the file";

enum UploadCode {
  MissingSASUrl = "MissingSASUrl",
  Unauthorized = "Unauthorized",
  ExpiredSASUrl = "ExpiredSASUrl",
  BlockedByWAF = "BlockedByWAF",
  Unknown = "Unknown",
}

interface UploadErrorOptions {
  fileUrl: string;
  code?: UploadCode;
  statusCode?: number;
  description?: string;
  cause?: unknown;
}

/** A general error thrown when uploading a file to Azure Blob Storage. */
class UploadError extends Error {
  readonly statusCode: number | undefined;

  /** The URL of the file that caused the error. */
  readonly fileUrl: string;

  readonly description?: string;

  readonly code?: UploadCode;

  constructor(message: string, options: UploadErrorOptions) {
    const { fileUrl, code, statusCode, description, cause } = options;

    super(message, { cause });

    this.name = "UploadError";
    this.fileUrl = fileUrl;
    this.code = code;
    this.statusCode = statusCode;
    this.description = description;
  }
}

/** Thrown when the upload is unauthorized (403). */
class UploadUnauthorizedError extends UploadError {
  constructor(message: string, options: UploadErrorOptions) {
    super(message, { ...options, code: UploadCode.Unauthorized });
    this.name = "UploadUnauthorizedError";
  }
}

/** Thrown when Azure Front Door WAF blocks the upload (also returns 403). */
class UploadBlockedError extends UploadError {
  constructor(message: string, options: UploadErrorOptions) {
    super(message, { ...options, code: UploadCode.BlockedByWAF });
    this.name = "UploadBlockedError";
  }
}

/**
 * Throws an appropriate error based on the error type.
 * @param err - The error to throw.
 * @param fileUrl - The URL of the file that caused the error.
 * @returns Never.
 */
function throwUploadError(err: unknown, fileUrl: string): never {
  if (err instanceof RestError) {
    const { statusCode, message, code } = err;
    if (statusCode === 403) {
      if (code === AUTHENTICATION_FAILED_CODE) {
        throw new UploadUnauthorizedError(message, {
          fileUrl,
          cause: err,
          code: UploadCode.Unauthorized,
          description:
            "You must be authenticated to upload files. Please sign in and try again.",
        });
      }

      throw new UploadBlockedError(message, {
        fileUrl,
        cause: err,
        code: UploadCode.BlockedByWAF,
        description:
          "File was rejected by security scan. Please check the file and try again.",
      });
    }
  }

  throw new UploadError(err instanceof Error ? err.message : "Unknown error", {
    fileUrl,
    cause: err,
    code: UploadCode.Unknown,
    description: "Unknown error occurred while uploading the file",
  });
}

/**
 * Returns the message body for an upload error (no file prefix).
 * Uses strongly-typed description from UploadError and its descendants.
 */
function getUploadErrorMessageBody(err: unknown): string {
  if (err instanceof UploadError) {
    if (err.description) {
      return err.description;
    }

    return err.message || UNKNOWN_ERROR_MESSAGE;
  }

  return err instanceof Error ? err.message : UNKNOWN_ERROR_MESSAGE;
}

const FILE_ERROR_PREFIX = "Could not upload file:";

/**
 * Returns the full user-facing error message for the UI.
 * When fileName is provided, prefixes with "Could not upload file: {fileName}. {message}".
 *
 * @param err - The error to process.
 * @param fileName - Optional file name to include in the message.
 * @returns The complete message to show in the UI.
 */
function processUploadError(err: unknown, fileName?: string): string {
  const body = getUploadErrorMessageBody(err);
  if (fileName !== undefined && fileName !== "") {
    return `${FILE_ERROR_PREFIX} ${fileName}. ${body}`;
  }
  return body;
}

export {
  UploadCode,
  type UploadErrorOptions,
  UploadError,
  UploadUnauthorizedError,
  UploadBlockedError,
  throwUploadError,
  processUploadError,
};
