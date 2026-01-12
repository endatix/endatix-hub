interface IStorageConfig {
  isEnabled: boolean;
  isPrivate: boolean;
}

export type AzureStorageConfig = IStorageConfig & {
  accountName: string;
  accountKey: string;
  hostName: string;
  sasReadExpiryMinutes: number;
};

export interface ContainerNames {
  USER_FILES: string;
  CONTENT: string;
}

const DEFAULT_SAS_READ_EXPIRY_MINUTES = 15;
const DEFAULT_USER_FILES_CONTAINER_NAME = "user-files";
const DEFAULT_FORM_CONTENT_FILES_CONTAINER_NAME = "content";

/**
 * Gets the Azure Storage configuration from environment variables
 * Returns a frozen object to prevent modification after initialization
 * @returns The frozen storage configuration object
 */
export function getStorageConfig(): AzureStorageConfig {
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
  });
}

/**
 * Gets the container names configuration from environment variables
 * Returns a frozen object to prevent modification after initialization
 * @returns The frozen container names object
 */
export function getContainerNames(): ContainerNames {
  return Object.freeze({
    USER_FILES:
      process.env.USER_FILES_STORAGE_CONTAINER_NAME ??
      DEFAULT_USER_FILES_CONTAINER_NAME,
    CONTENT:
      process.env.CONTENT_STORAGE_CONTAINER_NAME ??
      DEFAULT_FORM_CONTENT_FILES_CONTAINER_NAME,
  });
}
