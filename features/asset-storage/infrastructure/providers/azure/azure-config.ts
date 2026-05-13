import { IMAGE_SERVICE_CONFIG, type ImageConfig } from "@/features/asset-storage/infrastructure/image-service";
import type { ContainerType } from "@/features/asset-storage/types";
import { resolveAzureBlobStorageHostname } from "@/lib/hosting/azure-blob-remote-hostname";

export interface IStorageConfig {
  isEnabled: boolean;
  isPrivate: boolean;
  imageConfig: ImageConfig;
}

export type AzureStorageConfig = IStorageConfig & {
  accountName: string;
  accountKey: string;
  hostName: string;
  protocol: "https" | "http";
  sasReadExpiryMinutes: number;
  containerNames: Record<ContainerType, string>;
};

/**
 * Client-safe storage configuration (subset for browser).
 * Mirrors legacy storage-config-client omit list.
 */
export type StorageConfig = Omit<
  AzureStorageConfig,
  "accountKey" | "accountName" | "expiryMinutes" | "sasReadExpiryMinutes"
>;

export interface StorageConfigClient {
  config: StorageConfig;
}

const DEFAULT_SAS_READ_EXPIRY_MINUTES = 15;
const DEFAULT_USER_FILES_CONTAINER_NAME = "user-files";
const DEFAULT_FORM_CONTENT_FILES_CONTAINER_NAME = "content";

function getContainerNames(): Record<ContainerType, string> {
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

/**
 * Gets the Azure Storage configuration from environment variables.
 * Returns a frozen object to prevent modification after initialization.
 */
export function getAzureStorageConfig(): AzureStorageConfig {
  const { AZURE_STORAGE_ACCOUNT_NAME, AZURE_STORAGE_ACCOUNT_KEY } = process.env;

  const isEnabled = !!AZURE_STORAGE_ACCOUNT_NAME && !!AZURE_STORAGE_ACCOUNT_KEY;
  const accountName = AZURE_STORAGE_ACCOUNT_NAME || "";

  const hostName = resolveAzureBlobStorageHostname(
    accountName,
    process.env.AZURE_STORAGE_CUSTOM_DOMAIN,
  );

  const sasReadExpiryMinutes = (() => {
    const { AZURE_STORAGE_SAS_READ_EXPIRY_MINUTES } = process.env;
    if (!AZURE_STORAGE_SAS_READ_EXPIRY_MINUTES) {
      return DEFAULT_SAS_READ_EXPIRY_MINUTES;
    }
    const parsedMinutes = Number.parseInt(
      AZURE_STORAGE_SAS_READ_EXPIRY_MINUTES,
      10,
    );
    if (Number.isNaN(parsedMinutes) || parsedMinutes <= 0) {
      return DEFAULT_SAS_READ_EXPIRY_MINUTES;
    }
    return parsedMinutes;
  })();

  return Object.freeze({
    isEnabled,
    isPrivate: !!process.env.AZURE_STORAGE_IS_PRIVATE,
    accountName,
    accountKey: AZURE_STORAGE_ACCOUNT_KEY || "",
    hostName,
    protocol: "https",
    sasReadExpiryMinutes,
    containerNames: getContainerNames(),
    imageConfig: IMAGE_SERVICE_CONFIG,
  });
}

export function toClientStorageConfig(azure: AzureStorageConfig): StorageConfig {
  return Object.freeze({
    isEnabled: azure.isEnabled,
    isPrivate: azure.isPrivate,
    hostName: azure.hostName,
    protocol: azure.protocol,
    containerNames: azure.containerNames,
    imageConfig: azure.imageConfig,
  });
}

export function createStorageConfigClient(): StorageConfigClient {
  return Object.freeze({
    config: toClientStorageConfig(getAzureStorageConfig()),
  });
}

export function getContainerUrl(
  containerName: string,
  config: AzureStorageConfig | StorageConfig,
): string {
  return `${config.protocol}://${config.hostName}/${containerName}`;
}

export { getContainerNames };
