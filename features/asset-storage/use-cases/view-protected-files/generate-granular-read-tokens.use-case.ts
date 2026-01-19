import { Result } from "@/lib/result";
import { AzureStorageConfig, getStorageConfig } from "../../infrastructure/storage-config";
import { bulkGenerateReadTokens } from '../../infrastructure/storage-service';
import { ContainerType, ReadTokensResult, StorageTokenMap } from "../../types";
import { resolveContainerFromUrl } from "../../utils";

interface UrlMapping {
  blobName: string;
  containerType: ContainerType;
}

/**
 * Data grouped by container type
 * @interface GroupedAssetsData
 * @property {Map<string, UrlMapping>} urlMappings - A map of all URLs to their corresponding blob name and container type
 * @property {Set<string>} contentBlobNames - A set of content blob names
 * @property {Set<string>} userFilesBlobNames - A set of user files blob names
 */
interface GroupedUrlsMap {
  allUrlsMap: Map<string, UrlMapping>;
  groupedBlobNames: {
    byContentContainer: Set<string>;
    byUserFilesContainer: Set<string>;
  }
}

const emptyResult: Result<StorageTokenMap> = Result.success({});
const emptyTokensResultPromise: Promise<ReadTokensResult> = Promise.resolve(Result.success({ readTokens: {}, expiresOn: new Date(), generatedAt: new Date() }));

/**
 * Groups URLs by container type and creates a Map for efficient URL lookups
 */
function groupUrlsByContainerType(
  urls: string[],
  storageConfig: AzureStorageConfig,
): GroupedUrlsMap {
  const data: GroupedUrlsMap = {
    allUrlsMap: new Map<string, UrlMapping>(),
    groupedBlobNames: {
      byContentContainer: new Set<string>(),
      byUserFilesContainer: new Set<string>(),
    }
  };

  for (const url of urls) {
    const containerInfo = resolveContainerFromUrl(url, storageConfig);
    if (!containerInfo || !containerInfo.blobName) continue;

    data.allUrlsMap.set(url, {
      blobName: containerInfo.blobName,
      containerType: containerInfo.containerType,
    });

    if (containerInfo.containerType === "CONTENT") {
      data.groupedBlobNames.byContentContainer.add(containerInfo.blobName);
    } else if (containerInfo.containerType === "USER_FILES") {
      data.groupedBlobNames.byUserFilesContainer.add(containerInfo.blobName);
    }
  }

  return data;
}

/**
 * Maps tokens back to original URLs using the URL mappings Map
 */
function mapTokensToUrls(
  tokensResult: ReadTokensResult,
  urlMappings: Map<string, UrlMapping>,
  containerType: ContainerType,
  storageTokenMap: StorageTokenMap,
): void {
  if (Result.isError(tokensResult)) {
    console.error(
      "Error generating read tokens for",
      containerType,
      "container:",
      tokensResult.message,
    );
    return;
  }

  const readTokens = tokensResult.value.readTokens;
  for (const [url, mapping] of urlMappings) {
    if (mapping.containerType === containerType && readTokens[mapping.blobName]) {
      storageTokenMap[url] = readTokens[mapping.blobName];
    }
  }
}

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
    return emptyResult;
  }

  if (!urls || urls.length === 0) {
    return emptyResult;
  }

  const { allUrlsMap, groupedBlobNames: { byContentContainer, byUserFilesContainer } } = groupUrlsByContainerType(urls, storageConfig);
  if (byContentContainer.size === 0 && byUserFilesContainer.size === 0) {
    return emptyResult;
  }

  const contentTokensPromise = byContentContainer.size > 0
    ? bulkGenerateReadTokens({
      containerName: storageConfig.containerNames.CONTENT,
      resourceType: "file",
      resourceNames: Array.from(byContentContainer),
    })
    : emptyTokensResultPromise;
  const userFilesTokensPromise = byUserFilesContainer.size > 0
    ? bulkGenerateReadTokens({
      containerName: storageConfig.containerNames.USER_FILES,
      resourceType: "file",
      resourceNames: Array.from(byUserFilesContainer),
    })
    : emptyTokensResultPromise;

  const [contentTokensResult, userFilesTokensResult] = await Promise.all([
    contentTokensPromise,
    userFilesTokensPromise,
  ]);

  const allTokens: StorageTokenMap = {};
  mapTokensToUrls(contentTokensResult, allUrlsMap, "CONTENT", allTokens);
  mapTokensToUrls(userFilesTokensResult, allUrlsMap, "USER_FILES", allTokens);

  return Result.success(allTokens);
}
