import { Result } from "@/lib/result";
import { getStorageConfig } from "../../infrastructure/storage-config";
import { generateReadTokens } from "../../infrastructure/storage-service";
import { getBlobNameFromUrl, resolveContainerFromUrl } from "../../utils";
import { StorageTokenMap } from "../../types";

/**
 * Generates granular (blob-level) read tokens for a list of storage URLs.
 * @param urls - The list of storage URLs to generate tokens for
 * @returns A result containing a record of URL to SAS token
 */
export async function generateGranularReadTokensUseCase(
  urls: string[],
): Promise<Result<StorageTokenMap>> {
  const storageConfig = getStorageConfig();

  if (!storageConfig.isEnabled) {
    return Result.error("Azure storage is not enabled");
  }

  if (!storageConfig.isPrivate) {
    return Result.success({});
  }

  if (!urls || urls.length === 0) {
    return Result.success({});
  }

  // Group URLs by container to batch requests
  const containerGroups: Record<string, string[]> = {};
  const urlToBlobName: Record<string, string> = {};

  for (const url of urls) {
    const containerInfo = resolveContainerFromUrl(url, storageConfig);
    if (containerInfo) {
      const blobName = getBlobNameFromUrl(url, storageConfig);
      if (blobName) {
        containerGroups[containerInfo.containerName] = [
          ...(containerGroups[containerInfo.containerName] ?? []),
          blobName,
        ];
        urlToBlobName[url] = blobName;
      }
    }
  }

  const allTokens: Record<string, string> = {};

  for (const [containerName, blobNames] of Object.entries(containerGroups)) {
    const uniqueBlobNames = [...new Set(blobNames)];
    const readTokensResult = await generateReadTokens({
      containerName,
      resourceType: "file",
      resourceNames: uniqueBlobNames,
    });

    if (Result.isSuccess(readTokensResult)) {
      const tokens = readTokensResult.value.readTokens;
      for (const url of urls) {
        const blobName = urlToBlobName[url];
        if (blobName && tokens[blobName]) {
          allTokens[url] = tokens[blobName];
        }
      }
    }
  }

  return Result.success(allTokens);
}
