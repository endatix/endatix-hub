import type { ContainerType } from "../../../types";

const DEFAULT_USER_FILES_CONTAINER_NAME = "user-files";
const DEFAULT_FORM_CONTENT_FILES_CONTAINER_NAME = "content";

/** Bucket/container names from env (shared by Azure and S3 config). */
export function getStorageContainerNames(): Record<ContainerType, string> {
  const userFilesContainerName =
    process.env.USER_FILES_STORAGE_CONTAINER_NAME ??
    DEFAULT_USER_FILES_CONTAINER_NAME;
  const contentContainerName =
    process.env.CONTENT_STORAGE_CONTAINER_NAME ??
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

export function parseWriteExpirySecondsFromEnv(
  azureMinutesEnv: string | undefined,
  s3SecondsEnv: string | undefined,
): number {
  if (s3SecondsEnv !== undefined && s3SecondsEnv.length > 0) {
    return parsePositiveInt(s3SecondsEnv, DEFAULT_STORAGE_WRITE_EXPIRY_SECONDS);
  }
  if (azureMinutesEnv !== undefined && azureMinutesEnv.length > 0) {
    const minutes = parsePositiveInt(azureMinutesEnv, 3);
    return minutes * 60;
  }
  return DEFAULT_STORAGE_WRITE_EXPIRY_SECONDS;
}
