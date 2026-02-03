/**
 * Azure Blob Storage–specific metadata parsing.
 * Encapsulated parser with parseFromBlob and parseFromProperties.
 */

import type { BlobItem } from "@azure/storage-blob";
import type { ProcessedState, UserFileMetadata } from "../types";
import { getLastSegmentFromUrlPath } from "../utils";
import type { BlobPropertiesResult } from "./storage-service";

const DEFAULT_CONTENT_TYPE = "application/octet-stream";
/** Placeholder when content type is missing in list views (e.g. table "—"). */
const LIST_CONTENT_TYPE_PLACEHOLDER = "—";

function parseFileState(value: string | undefined): ProcessedState | undefined {
  if (value === "original" || value === "optimized") return value;
  return undefined;
}

/** Azure lowercases custom metadata keys; we support both. */
function parseMetadataFields(
  metadata: Record<string, string>,
): Pick<UserFileMetadata, "originalFileName" | "questionName" | "fileState"> {
  const fileStateValue =
    metadata["filestate"] ?? metadata["fileState"] ?? undefined;
  return {
    originalFileName: metadata["filename"] ?? metadata["fileName"] ?? undefined,
    questionName: metadata["questionid"] ?? metadata["questionId"] ?? undefined,
    fileState: parseFileState(fileStateValue),
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
    const contentType =
      metadata["content-type"] ??
      (blob.properties?.contentType as string | undefined) ??
      LIST_CONTENT_TYPE_PLACEHOLDER;
    const displayName = getLastSegmentFromUrlPath(blob.name);
    const fields = parseMetadataFields(metadata);

    return {
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
    const contentType = properties.contentType?.trim() || DEFAULT_CONTENT_TYPE;
    const fields = parseMetadataFields(metadata);

    return {
      displayName,
      contentType,
      sizeInBytes: properties.sizeInBytes,
      ...fields,
    };
  },
};
