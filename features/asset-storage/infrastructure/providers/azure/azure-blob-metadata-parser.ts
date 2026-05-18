import type { BlobUploadOptions } from "../../../types";
import { encodeHeaderValueForFetch } from "../../fetch-header-utils";

export { blobMetadataParser } from "../shared/blob-metadata-parser";
export { toBlobUploadOptions } from "../shared/upload-metadata";

/**
 * HTTP headers for a client-side `fetch` PUT to an Azure block blob SAS URL.
 */
/**
 * HTTP headers for a client-side `fetch` PUT to an Azure block blob SAS URL.
 * @param options - The options for the HTTP headers.
 * @returns The HTTP headers.
 */
export function toAzureBlockBlobPutHeaders(
  options: BlobUploadOptions,
): Record<string, string> {
  const headers: Record<string, string> = {
    "x-ms-blob-type": "BlockBlob",
  };
  const { blobHTTPHeaders, metadata } = options;

  if (blobHTTPHeaders.blobContentType) {
    headers["x-ms-blob-content-type"] = encodeHeaderValueForFetch(
      blobHTTPHeaders.blobContentType,
    );
  }

  if (blobHTTPHeaders.blobContentDisposition) {
    headers["x-ms-blob-content-disposition"] = encodeHeaderValueForFetch(
      blobHTTPHeaders.blobContentDisposition,
    );
  }
  
  if (
    blobHTTPHeaders.blobContentLanguage !== undefined &&
    blobHTTPHeaders.blobContentLanguage !== ""
  ) {
    headers["x-ms-blob-content-language"] = encodeHeaderValueForFetch(
      blobHTTPHeaders.blobContentLanguage,
    );
  }

  for (const [rawKey, value] of Object.entries(metadata)) {
    if (value === undefined || value === "") {
      continue;
    }
    const metaKey = rawKey.toLowerCase();
    headers[`x-ms-meta-${metaKey}`] = encodeHeaderValueForFetch(value);
  }

  return headers;
}
