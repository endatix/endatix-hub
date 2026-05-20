import type { ProcessedState, UserFileMetadata } from "../../../types";
import { getLastSegmentFromUrlPath } from "../../../utils";
import { decodeHeaderValueFromFetch } from "../../fetch-header-utils";
import type {
  BlobPropertiesResult,
  StorageListBlobItem,
} from "../../core/storage-operation-types";

const DEFAULT_CONTENT_TYPE = "application/octet-stream";
const LIST_CONTENT_TYPE_PLACEHOLDER = "—";

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
  if (value === "original" || value === "optimized") {
    return value;
  }
  return undefined;
}

function parseMetadataFields(
  metadata: Record<string, string>,
): Pick<
  UserFileMetadata,
  "originalFileName" | "questionName" | "fileState" | "uploadedBy"
> {
  const fileStateValue =
    metadata["filestate"] ?? metadata["fileState"] ?? undefined;
  return {
    originalFileName: decodeHeaderValueFromFetch(
      metadata["filename"] ?? metadata["fileName"] ?? undefined,
    ),
    questionName: decodeHeaderValueFromFetch(
      metadata["questionname"] ?? metadata["questionName"] ?? undefined,
    ),
    fileState: parseFileState(fileStateValue),
    uploadedBy:
      decodeHeaderValueFromFetch(
        metadata["uploadedby"] ?? metadata["uploadedBy"] ?? undefined,
      ) ?? "anonymous",
  };
}

export const blobMetadataParser = {
  parseFromBlob(blob: StorageListBlobItem): UserFileMetadata {
    const metadata = blob.metadata ?? {};
    const metadataContentType = metadata["content-type"];
    const blobContentType = blob.properties?.contentType;

    const rawContentType =
      metadataContentType ?? blobContentType ?? LIST_CONTENT_TYPE_PLACEHOLDER;

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
