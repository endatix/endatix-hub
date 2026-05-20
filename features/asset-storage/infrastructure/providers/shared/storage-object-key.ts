import { trimTrailingSlashes } from "@/lib/utils/url-utils";

/**
 * Builds object/blob key used by Azure and S3 providers (`folderPath/fileName` or `fileName`).
 */
export function buildStorageObjectKey(
  fileName: string,
  folderPath?: string,
): string {
  const trimmedFolder = folderPath?.trim();
  if (trimmedFolder !== undefined && trimmedFolder.length > 0) {
    const folder = trimTrailingSlashes(trimmedFolder);

    return `${folder}/${fileName}`;
  }
  return fileName;
}
