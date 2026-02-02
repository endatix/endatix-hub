import { Result } from "@/lib/result";
import { blobMetadataParser } from "../../infrastructure/blob-metadata-parser";
import {
  getStorageConfig,
  getContainerUrl,
} from "../../infrastructure/storage-config";
import {
  bulkGenerateReadTokens,
  getBlobProperties,
} from "../../infrastructure/storage-service";
import { buildUserFilePath } from "../../infrastructure/storage-utils";
import type { UserFileMetadata } from "../../types";

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
  const config = getStorageConfig();
  if (!config.isEnabled) {
    return Result.error("Storage is not enabled");
  }

  const pathNameResult = buildUserFilePath(formId, submissionId, fileName);
  if (Result.isError(pathNameResult)) {
    return pathNameResult;
  }

  const blobName = pathNameResult.value;
  const containerName = config.containerNames.USER_FILES;

  const properties = await getBlobProperties(containerName, blobName);
  if (!properties) {
    return Result.error("File not found");
  }

  const baseUrl = getContainerUrl(containerName, config);
  const filePath = buildUserFilePath(formId, submissionId, fileName);
  if (Result.isError(filePath)) {
    return Result.error(filePath.message);
  }
  let url = `${baseUrl}/${filePath.value}`;

  if (config.isPrivate) {
    const tokensResult = await bulkGenerateReadTokens({
      containerName,
      resourceType: "file",
      resourceNames: [blobName],
    });
    if (Result.isError(tokensResult)) {
      return Result.error(tokensResult.message);
    }
    const token = tokensResult.value.readTokens[blobName];
    if (token) {
      url = `${url}?${token.startsWith("?") ? token.slice(1) : token}`;
    }
  }

  const fileMetadata = blobMetadataParser.parseFromProperties(
    properties,
    blobName,
  );
  return Result.success({ ...fileMetadata, url });
}

export { getUserFile };
