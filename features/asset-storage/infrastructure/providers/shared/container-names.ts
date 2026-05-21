import type { ContainerType } from "../../../types";

const DEFAULT_USER_FILES_CONTAINER_NAME = "user-files";
const DEFAULT_FORM_CONTENT_FILES_CONTAINER_NAME = "content";

/** Bucket/container names from env (shared by Azure and S3 config). */
export function getStorageContainerNames(): Record<ContainerType, string> {
  const userFilesContainerName =
    process.env.STORAGE_USER_FILES_CONTAINER_NAME?.trim() ||
    process.env.USER_FILES_STORAGE_CONTAINER_NAME?.trim() ||
    DEFAULT_USER_FILES_CONTAINER_NAME;
  const contentContainerName =
    process.env.STORAGE_CONTENT_FILES_CONTAINER_NAME?.trim() ||
    process.env.CONTENT_STORAGE_CONTAINER_NAME?.trim() ||
    DEFAULT_FORM_CONTENT_FILES_CONTAINER_NAME;

  return Object.freeze({
    USER_FILES: userFilesContainerName.toLowerCase(),
    CONTENT: contentContainerName.toLowerCase(),
  });
}

/** Parses a positive integer from a string. */
export function parsePositiveInt(
  value: string | undefined,
  fallback: number,
): number {
  if (value === undefined || value.length === 0) {
    return fallback;
  }
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed) || parsed <= 0) {
    return fallback;
  }
  return parsed;
}

/** Default write presign TTL in seconds (Azure SAS and S3 PUT). */
export const DEFAULT_STORAGE_WRITE_EXPIRY_SECONDS = 180;
