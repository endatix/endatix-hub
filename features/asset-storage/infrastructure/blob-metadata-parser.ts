/**
 * Azure Blob Storage–specific metadata parsing and upload options.
 * Parsing: parseFromBlob, parseFromProperties.
 * Upload: toBlobUploadOptions (supports both user and content file uploads).
 */

import type { BlobItem } from "@azure/storage-blob";
import type {
  BlobUploadOptions,
  ContentFileMetadata,
  FileMetadata,
  ProcessedState,
  UserFileMetadata,
} from "../types";
import { getLastSegmentFromUrlPath } from "../utils";
import type { BlobPropertiesResult } from "./storage-service";

const DEFAULT_CONTENT_TYPE = "application/octet-stream";
/** Placeholder when content type is missing in list views (e.g. table "—"). */
const LIST_CONTENT_TYPE_PLACEHOLDER = "—";

/** Extension (lowercase) → MIME type for inferring type when blob has application/octet-stream. */
const EXTENSION_TO_MIME: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  svg: "image/svg+xml",
  bmp: "image/bmp",
  ico: "image/x-icon",
  pdf: "application/pdf",
  mp4: "video/mp4",
  webm: "video/webm",
  mp3: "audio/mpeg",
  wav: "audio/wav",
  ogg: "audio/ogg",
};

/**
 * When stored contentType is generic (octet-stream or placeholder), guess from file extension
 * so legacy uploads can be previewed (e.g. image in modal).
 */
function resolveContentType(contentType: string, fileName: string): string {
  const shouldResolveFromExtension =
    !contentType ||
    contentType === DEFAULT_CONTENT_TYPE ||
    contentType === LIST_CONTENT_TYPE_PLACEHOLDER;

  if (!shouldResolveFromExtension) {
    return contentType;
  }

  const extension = fileName.split(".").pop()?.toLowerCase();
  if (!extension) {
    return contentType;
  }

  return EXTENSION_TO_MIME[extension] ?? contentType;
}

function parseFileState(value: string | undefined): ProcessedState | undefined {
  if (value === "original" || value === "optimized") return value;
  return undefined;
}

/** Azure lowercases custom metadata keys; we support both. */
function parseMetadataFields(
  metadata: Record<string, string>,
): Pick<
  UserFileMetadata,
  "originalFileName" | "questionName" | "fileState" | "uploadedBy"
> {
  const fileStateValue =
    metadata["filestate"] ?? metadata["fileState"] ?? undefined;
  return {
    originalFileName: metadata["filename"] ?? metadata["fileName"] ?? undefined,
    questionName:
      metadata["questionname"] ?? metadata["questionName"] ?? undefined,
    fileState: parseFileState(fileStateValue),
    uploadedBy: metadata["uploadedby"] ?? metadata["uploadedBy"] ?? "anonymous",
  };
}

/**
 * Encapsulated blob metadata parser.
 * Use .parseFromBlob(blob) for list blobs (BlobItem) or .parseFromProperties(properties, blobName) for getBlobProperties result.
 */
export const blobMetadataParser = {
  /**
   * Parses user file metadata from a user file blob (BlobItem).
   * Used by list-user-files use case.
   */
  parseFromBlob(blob: BlobItem): UserFileMetadata {
    const metadata = blob.metadata ?? {};
    const rawContentType =
      metadata["content-type"] ??
      (blob.properties?.contentType as string | undefined) ??
      LIST_CONTENT_TYPE_PLACEHOLDER;
    const displayName = getLastSegmentFromUrlPath(blob.name);
    const contentType = resolveContentType(rawContentType, displayName);
    const fields = parseMetadataFields(metadata);

    return {
      kind: "user" as const,
      displayName,
      contentType,
      sizeInBytes: blob.properties?.contentLength ?? 0,
      ...fields,
    };
  },

  /**
   * Parses user file metadata from blob properties (e.g. getBlobProperties result).
   * Used by get-user-file (single-file view) when only properties + blobName are available.
   */
  parseFromProperties(
    properties: BlobPropertiesResult,
    blobName: string,
  ): UserFileMetadata {
    const metadata = properties.metadata ?? {};
    const displayName = getLastSegmentFromUrlPath(blobName);
    const rawContentType =
      properties.contentType?.trim() || DEFAULT_CONTENT_TYPE;
    const contentType = resolveContentType(rawContentType, displayName);
    const fields = parseMetadataFields(metadata);

    return {
      kind: "user" as const,
      displayName,
      contentType,
      sizeInBytes: properties.sizeInBytes,
      ...fields,
    };
  },
};

/**
 * Builds BlobUploadOptions for upload primitives.
 * Single method for both user and content file uploads; applies defaults for optional fields.
 *
 * @param meta - User or content file upload metadata
 * @returns BlobUploadOptions (metadata + blobHTTPHeaders) for BlockBlobClient.uploadData
 */
export function toBlobUploadOptions(meta: FileMetadata): BlobUploadOptions {
  const contentType = meta.contentType ?? DEFAULT_CONTENT_TYPE;

  const baseMetadata: Record<string, string> = {
    uploadedBy: meta.uploadedBy,
    fileName: meta.displayName,
    fileType: contentType,
  };

  if (meta.fileState !== undefined) {
    baseMetadata.fileState = meta.fileState;
  }

  if (meta.questionName) {
    baseMetadata.questionName = meta.questionName;
  }

  const blobHTTPHeaders: Record<string, string> = {
    blobContentType: contentType,
    blobContentDisposition: "inline",
  };

  let specificMetadata: Record<string, string>;

  switch (meta.kind) {
    case "user": {
      specificMetadata = buildUserFileMetadata(meta);
      blobHTTPHeaders.blobContentLanguage = meta.formLang ?? "";
      break;
    }
    case "content": {
      specificMetadata = buildContentFileMetadata(meta);
      break;
    }
  }

  return {
    metadata: { ...baseMetadata, ...specificMetadata },
    blobHTTPHeaders,
  };
}

function buildUserFileMetadata(
  fileMetadata: UserFileMetadata,
): Record<string, string> {
  const metadata: Record<string, string> = {
    formId: fileMetadata.formId ?? "",
    submissionId: fileMetadata.submissionId ?? "",
    formLang: fileMetadata.formLang ?? "",
  };

  return metadata;
}

function buildContentFileMetadata(
  fileMetadata: ContentFileMetadata,
): Record<string, string> {
  const metadata: Record<string, string> = {
    itemId: fileMetadata.itemId,
    contentItemType: fileMetadata.contentItemType,
  };

  return metadata;
}
