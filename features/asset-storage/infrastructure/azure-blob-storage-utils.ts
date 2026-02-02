/**
 * Azure Blob Storage–specific utilities.
 */

import type { BlobItem } from "@azure/storage-blob";
import type { UserFileMetadata } from "../types";
import { getLastSegmentFromUrlPath } from "../utils";
import { BlobPropertiesResult } from "./storage-service";

const DEFAULT_CONTENT_TYPE = "application/octet-stream";
/** Placeholder when content type is missing in list views (e.g. table "—"). */
const LIST_CONTENT_TYPE_PLACEHOLDER = "—";

/** Azure lowercases custom metadata keys; we support both. */
function parseMetadataFields(
  metadata: Record<string, string>,
): Pick<UserFileMetadata, "originalFileName" | "questionName"> {
  return {
    originalFileName: metadata["filename"] ?? metadata["fileName"] ?? undefined,
    questionName: metadata["questionid"] ?? metadata["questionId"] ?? undefined,
  };
}

/**
 * Parses user file metadata from blob properties (e.g. getBlobProperties result).
 * Shared logic: uses parseMetadataFields for originalFileName/questionName.
 * Used by get-user-file (single-file view) when only properties + blobName are available.
 */
export function parseUserFileMetadataFromProperties(
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
}

/**
 * Parses user file metadata from a user file blob (BlobItem).
 * Shared logic: uses parseMetadataFields for originalFileName/questionName.
 * Used by list-user-files use case.
 */
export function parseUserFileMetadata(blob: BlobItem): UserFileMetadata {
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
}
