/**
 * Azure Blob Storage–specific metadata parsing and upload options.
 */

import type { BlobItem } from "@azure/storage-blob";
import type {
  BlobUploadOptions,
  ContentFileMetadata,
  FileMetadata,
  ProcessedState,
  UserFileMetadata,
} from "../../../types";
import { getLastSegmentFromUrlPath } from "../../../utils";
import type { BlobPropertiesResult } from "./types";

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
  if (value === "original" || value === "optimized") return value;
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
    originalFileName: metadata["filename"] ?? metadata["fileName"] ?? undefined,
    questionName:
      metadata["questionname"] ?? metadata["questionName"] ?? undefined,
    fileState: parseFileState(fileStateValue),
    uploadedBy: metadata["uploadedby"] ?? metadata["uploadedBy"] ?? "anonymous",
  };
}

export const blobMetadataParser = {
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

  let specificMetadata: Record<string, string> = {};

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
    default: {
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
  return {
    formId: fileMetadata.formId ?? "",
    submissionId: fileMetadata.submissionId ?? "",
    formLang: fileMetadata.formLang ?? "",
  };
}

function buildContentFileMetadata(
  fileMetadata: ContentFileMetadata,
): Record<string, string> {
  return {
    itemId: fileMetadata.itemId,
    contentItemType: fileMetadata.contentItemType,
  };
}
