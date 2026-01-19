import { StorageConfigClient } from "./storage-config-client";

interface IStorageConfig {
  isEnabled: boolean;
  isPrivate: boolean;
}

interface ContainerNames {
  USER_FILES: string;
  CONTENT: string;
}

type AzureStorageConfig = IStorageConfig & {
  accountName: string;
  accountKey: string;
  hostName: string;
  sasReadExpiryMinutes: number;
  containerNames: ContainerNames;
};

const DEFAULT_SAS_READ_EXPIRY_MINUTES = 15;
const DEFAULT_USER_FILES_CONTAINER_NAME = "user-files";
const DEFAULT_FORM_CONTENT_FILES_CONTAINER_NAME = "content";

/**
 * Gets the Azure Storage configuration from environment variables
 * Returns a frozen object to prevent modification after initialization
 * @returns The frozen storage configuration object
 */
function getStorageConfig(): AzureStorageConfig {
  const { AZURE_STORAGE_ACCOUNT_NAME, AZURE_STORAGE_ACCOUNT_KEY } = process.env;

  const isEnabled = !!AZURE_STORAGE_ACCOUNT_NAME && !!AZURE_STORAGE_ACCOUNT_KEY;
  const accountName = AZURE_STORAGE_ACCOUNT_NAME || "";
  const hostName = accountName ? `${accountName}.blob.core.windows.net` : "";

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
    sasReadExpiryMinutes,
    containerNames: getContainerNames(),
  });
}

/**
 * Gets the container names configuration from environment variables
 * Returns a frozen object to prevent modification after initialization
 * @returns The frozen container names object
 */
function getContainerNames(): ContainerNames {
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
 * Creates the combined client-safe storage configuration.
 * This is intended to be called in Server Components only.
 */
function createStorageConfigClient(): StorageConfigClient {
  const serverConfig = getStorageConfig();
  const containerNames = getContainerNames();

  return Object.freeze({
    config: {
      isEnabled: serverConfig.isEnabled,
      isPrivate: serverConfig.isPrivate,
      hostName: serverConfig.hostName,
      containerNames: {
        USER_FILES: containerNames.USER_FILES,
        CONTENT: containerNames.CONTENT,
      },
    },
  });
}

export {
  getStorageConfig,
  getContainerNames,
  createStorageConfigClient,
  type ContainerNames,
  type AzureStorageConfig,
  type IStorageConfig,
};
