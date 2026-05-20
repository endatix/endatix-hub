import type { BlobUploadOptions } from "../../../types";
import { encodeHeaderValueForFetch } from "../../fetch-header-utils";

/**
 * HTTP headers for a client-side `fetch` PUT to a presigned S3 PUT URL.
 * Must match {@link PutObjectCommand} Metadata signed into the URL.
 */
export function toS3PresignedPutHeaders(
  options: BlobUploadOptions,
): Record<string, string> {
  const headers: Record<string, string> = {};
  const { blobHTTPHeaders, metadata } = options;

  if (blobHTTPHeaders.blobContentType) {
    headers["Content-Type"] = encodeHeaderValueForFetch(
      blobHTTPHeaders.blobContentType,
    );
  }

  for (const [rawKey, value] of Object.entries(metadata)) {
    if (value === undefined || value === "") {
      continue;
    }
    headers[`x-amz-meta-${rawKey.toLowerCase()}`] =
      encodeHeaderValueForFetch(value);
  }

  return headers;
}

export function toS3ObjectMetadata(
  metadata: Record<string, string>,
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [rawKey, value] of Object.entries(metadata)) {
    if (value === undefined || value === "") {
      continue;
    }
    out[rawKey.toLowerCase()] = value;
  }
  return out;
}
