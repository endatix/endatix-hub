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

class UploadError extends Error {
  readonly statusCode: number | undefined;
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

class UploadUnauthorizedError extends UploadError {
  constructor(message: string, options: UploadErrorOptions) {
    super(message, { ...options, code: UploadCode.Unauthorized });
    this.name = "UploadUnauthorizedError";
  }
}

class UploadBlockedError extends UploadError {
  constructor(message: string, options: UploadErrorOptions) {
    super(message, { ...options, code: UploadCode.BlockedByWAF });
    this.name = "UploadBlockedError";
  }
}

function throwFromHttpStatus(
  statusCode: number,
  message: string,
  fileUrl: string,
  cause: unknown,
): never {
  if (statusCode === 403) {
    throw new UploadUnauthorizedError(message, {
      fileUrl,
      cause,
      statusCode,
      description:
        "You must be authenticated to upload files. Please sign in and try again.",
    });
  }
  if (statusCode === 401) {
    throw new UploadUnauthorizedError(message, {
      fileUrl,
      cause,
      statusCode,
      description:
        "Upload was rejected. The presigned URL may have expired or is invalid.",
    });
  }
  throw new UploadError(message, {
    fileUrl,
    cause,
    statusCode,
    code: UploadCode.Unknown,
    description: message,
  });
}

function extractStatusFromFetchErrorMessage(message: string): number | null {
  const match = message.match(/HTTP (\d{3})/);
  if (!match) {
    return null;
  }
  return Number.parseInt(match[1]!, 10);
}

/**
 * Throws an appropriate error for presigned PUT failures (Azure SDK or fetch).
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

  if (err instanceof Error && err.message.startsWith("Blob upload failed:")) {
    const status = extractStatusFromFetchErrorMessage(err.message);
    if (status !== null) {
      throwFromHttpStatus(status, err.message, fileUrl, err);
    }
  }

  throw new UploadError(err instanceof Error ? err.message : "Unknown error", {
    fileUrl,
    cause: err,
    code: UploadCode.Unknown,
    description: UNKNOWN_ERROR_MESSAGE,
  });
}

function getUploadErrorMessageBody(err: unknown): string {
  if (err instanceof UploadError) {
    const desc = err.description ?? UNKNOWN_ERROR_MESSAGE;
    if (desc === UNKNOWN_ERROR_MESSAGE) {
      return err.message || UNKNOWN_ERROR_MESSAGE;
    }
    return desc;
  }
  return err instanceof Error ? err.message : UNKNOWN_ERROR_MESSAGE;
}

const FILE_ERROR_PREFIX = "Could not upload file:";

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
