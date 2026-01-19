import { Result } from "@/lib/result";
import { v4 as uuidv4 } from "uuid";
import { StorageConfig } from './client';
import { IContainerInfo } from './types';

/**
 * Generates a unique file name by appending a UUID to the file name.
 * @param fileName - The name of the file to generate a unique name for.
 * @returns A Result containing the unique file name or a validation error.
 */
function generateUniqueFileName(fileName: string): Result<string> {
  if (!fileName) {
    return Result.validationError("File name is required");
  }

  const uuid = uuidv4();
  const fileNameParts = fileName.split(".");
  const fileExtension =
    fileNameParts.length > 1 ? fileNameParts.pop() : undefined;

  if (!fileExtension) {
    return Result.validationError(
      "File extension is required. Please provide a valid file.",
    );
  }

  return Result.success(`${uuid}.${fileExtension}`);
}

/**
 * Resolves the container information for a given URL.
 * @param url - The URL to resolve
 * @param storageConfig - The storage configuration
 * @returns The container information if the URL matches a known container, null otherwise
 */
function resolveContainerFromUrl(
  url: string,
  storageConfig: StorageConfig | null,
): IContainerInfo | null {
  if (!url) return null;

  if (url.startsWith('data:')) return null;

  if (!storageConfig) return null;

  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.toLowerCase();

    if (storageConfig.hostName.toLowerCase() !== hostname) {
      return null;
    }

    const firstPathPart = urlObj.pathname
      .split('/')
      .find((part) => part.length > 0);
    const containerName = firstPathPart?.toLowerCase() ?? null;
    if (!containerName) return null;

    if (containerName === storageConfig.containerNames.USER_FILES) {
      return {
        containerType: 'USER_FILES',
        containerName: containerName,
        hostName: hostname,
        isPrivate: true,
      };
    }
    if (containerName === storageConfig.containerNames.CONTENT) {
      return {
        containerType: 'CONTENT',
        containerName: containerName,
        hostName: hostname,
        isPrivate: true,
      };
    }

    // No matching container found, so return null
    return null;
  } catch {
    return null;
  }
}

/* Small helper function to check if a URL is from a specific container */
function isUrlFromContainer(
  url: string,
  containerName: string,
  storageConfig: StorageConfig | null,
): boolean {
  if (!containerName) return false;

  const resolvedContainer = resolveContainerFromUrl(url, storageConfig);

  if (!resolvedContainer) return false;

  return resolvedContainer.containerName === containerName;
}

/**
 * Extracts the blob name from a storage URL.
 * @param url - The storage URL
 * @param storageConfig - The storage configuration
 * @returns The blob name (including folder path) or null if not a valid storage URL
 */
function getBlobNameFromUrl(
  url: string,
  storageConfig: StorageConfig | null,
): string | null {
  if (!url || !storageConfig) return null;

  try {
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split('/').filter((p) => p.length > 0);

    // The first part is the container name
    if (pathParts.length < 2) return null;

    // Remove the container name and join the rest as the blob name
    return pathParts.slice(1).join("/");
  } catch {
    return null;
  }
}

/**
 * Enhances a URL with a SAS token, safely merging query parameters.
 * @param url - The base URL
 * @param token - The SAS token (optionally starting with ?)
 * @returns The enhanced URL
 */
function enhanceUrlWithToken(url: string, token: string | null | undefined): string {
  if (!token) return url;

  // Remove leading ? from token if present
  const cleanToken = token.startsWith("?") ? token.slice(1) : token;

  // Use & if URL already has query params, otherwise use ?
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}${cleanToken}`;
}

/**
 * Safely extracts all storage URLs from a string using regex.
 * This is much faster than JSON.parse + recursive walk for large strings.
 * @param content - The string to scan (JSON or otherwise)
 * @param hostName - The storage host name to match
 * @returns An array of unique storage URLs
 */
function extractStorageUrls(content: string | null | undefined, hostName: string): string[] {
  if (!content || !hostName) return [];

  // Matches https://{hostName}/{container}/{blob...}
  // Avoids capturing quotes or query parameters that might already be there
  const regex = new RegExp(`https://${hostName.replace(/\./g, '\\.')}/[^"\\s?]+`, 'g');
  const matches = content.match(regex);

  if (!matches) return [];
  return [...new Set(matches)];
}

export {
  generateUniqueFileName,
  resolveContainerFromUrl,
  isUrlFromContainer,
  getBlobNameFromUrl,
  enhanceUrlWithToken,
  extractStorageUrls,
};

