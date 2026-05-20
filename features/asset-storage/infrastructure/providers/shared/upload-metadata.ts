import type {
  BlobUploadOptions,
  ContentFileMetadata,
  FileMetadata,
  UserFileMetadata,
} from "../../../types";

const DEFAULT_CONTENT_TYPE = "application/octet-stream";

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

/** Provider-neutral blob metadata for presigned PUT (Azure and S3). */
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
