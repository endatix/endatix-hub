import type { BlobUploadOptions } from "../../../types";
import { encodeHeaderValueForFetch } from "../../fetch-header-utils";

const SIGNED_METADATA_PREFIX = "x-amz-meta-";
const UTF8_SIGNED_PREFIX = "utf8:";

/** A literal `utf8:` prefix is encoded too: {@link decodeHeaderValueFromFetch} would otherwise percent-decode it. Any code point above 127 is encoded so the signed bytes match the SDK's UTF-8 hash. {@link encodeHeaderValueForFetch} stops at 255 because Azure content-disposition is never decoded. */
function encodeSignedS3MetadataValue(value: string): string {
  if (value.startsWith(UTF8_SIGNED_PREFIX) || hasCodePointAboveAscii(value)) {
    return `${UTF8_SIGNED_PREFIX}${encodeURIComponent(value)}`;
  }
  return value;
}

function hasCodePointAboveAscii(value: string): boolean {
  for (const char of value) {
    if (char.codePointAt(0)! > 127) {
      return true;
    }
  }
  return false;
}

/** Bytes the browser sends, plus the metadata the SDK must sign. */
export interface S3PresignedPut {
  headers: Record<string, string>;
  metadata?: Record<string, string>;
  unhoistableHeaders: Set<string>;
}

function signedMetadata(source: Record<string, string>): S3PresignedPut {
  const headers: Record<string, string> = {};
  const metadata: Record<string, string> = {};
  const unhoistableHeaders = new Set<string>();
  for (const [rawKey, value] of Object.entries(source)) {
    if (value === "") continue;
    const key = rawKey.toLowerCase();
    const headerName = `${SIGNED_METADATA_PREFIX}${key}`;
    const encoded = encodeSignedS3MetadataValue(value);
    headers[headerName] = encoded;
    metadata[key] = encoded;
    unhoistableHeaders.add(headerName);
  }
  return {
    headers,
    metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
    unhoistableHeaders,
  };
}

/**
 * Header map is the source of the bytes a browser PUT sends.
 * metadata is those x-amz-meta-* values with the prefix stripped, so PutObject
 * signs the same bytes. RustFS stores the encoded value (utf8:caf%C3%A9.png).
 */
export function toS3PresignedPut(options: BlobUploadOptions): S3PresignedPut {
  const signed = signedMetadata(options.metadata);
  const contentType = options.blobHTTPHeaders.blobContentType;
  if (!contentType) {
    return signed;
  }
  return {
    ...signed,
    headers: {
      "Content-Type": encodeHeaderValueForFetch(contentType),
      ...signed.headers,
    },
  };
}
