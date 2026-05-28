import { Result } from "@/lib/result";
import { appendStorageReadQuery } from "../../infrastructure/append-storage-read-query";
import { blobMetadataParser } from "../../infrastructure/providers/shared/blob-metadata-parser";
import {
  getActiveStorageProvider,
  getClientStorageConfig,
} from "../../storage-runtime";
import { buildUserFilePath } from "../../infrastructure/storage-utils";
import type { UserFileMetadata } from "../../types";
import { getStorageContainerUrl } from "../../utils";

export interface UserFileViewData extends UserFileMetadata {
  url: string;
}

/**
 * Returns view data (URL with token if private, contentType, displayName) for a submission file.
 * Returns Result.error when storage is disabled, blob not found, or token generation fails.
 */
async function getUserFile(
  formId: string,
  submissionId: string,
  fileName: string,
): Promise<Result<UserFileViewData>> {
  const clientConfig = getClientStorageConfig();
  if (!clientConfig.isEnabled) {
    return Result.error("Storage is not enabled");
  }

  const pathNameResult = buildUserFilePath(formId, submissionId, fileName);
  if (Result.isError(pathNameResult)) {
    return pathNameResult;
  }

  const blobName = pathNameResult.value;
  const containerName = clientConfig.containerNames.USER_FILES;
  const provider = getActiveStorageProvider();
  if (provider === null || !provider.isEnabled()) {
    return Result.error("Storage is not enabled");
  }

  const properties = await provider.getBlobProperties(containerName, blobName);
  if (!properties) {
    return Result.error("File not found");
  }

  const baseUrl = getStorageContainerUrl(containerName, clientConfig);
  const filePath = buildUserFilePath(formId, submissionId, fileName);
  if (Result.isError(filePath)) {
    return Result.error(filePath.message);
  }
  let url = `${baseUrl}/${filePath.value}`;

  if (clientConfig.isPrivate) {
    const tokensResult = await provider.bulkGenerateReadTokens({
      containerName,
      resourceType: "file",
      resourceNames: [blobName],
    });
    if (Result.isError(tokensResult)) {
      return Result.error(tokensResult.message);
    }
    const token = tokensResult.value.readTokens[blobName];
    if (token) {
      url = appendStorageReadQuery(
        url,
        token.startsWith("?") ? token.slice(1) : token,
      );
    }
  }

  const fileMetadata = blobMetadataParser.parseFromProperties(
    properties,
    blobName,
  );
  return Result.success({ ...fileMetadata, url });
}

export { getUserFile };
