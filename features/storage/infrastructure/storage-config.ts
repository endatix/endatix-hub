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

const DEFAULT_SAS_READ_EXPIRY_MINUTES = 15;

export const STORAGE_SERVICE_CONFIG: AzureStorageConfig = Object.freeze({
  isEnabled: (() => {
    const { AZURE_STORAGE_ACCOUNT_NAME, AZURE_STORAGE_ACCOUNT_KEY } =
      process.env;
    return !!AZURE_STORAGE_ACCOUNT_NAME && !!AZURE_STORAGE_ACCOUNT_KEY;
  })(),
  isPrivate: !!process.env.AZURE_STORAGE_IS_PRIVATE,
  accountName: process.env.AZURE_STORAGE_ACCOUNT_NAME || "",
  accountKey: process.env.AZURE_STORAGE_ACCOUNT_KEY || "",
  hostName: (() => {
    return process.env.AZURE_STORAGE_ACCOUNT_NAME
      ? `${process.env.AZURE_STORAGE_ACCOUNT_NAME}.blob.core.windows.net`
      : "";
  })(),
  sasReadExpiryMinutes: (() => {
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
  })(),
});

const DEFAULT_USER_FILES_CONTAINER_NAME = "user-files";
const DEFAULT_FORM_CONTENT_FILES_CONTAINER_NAME = "content";

export const CONTAINER_NAMES = {
  USER_FILES:
    process.env.USER_FILES_STORAGE_CONTAINER_NAME ??
    DEFAULT_USER_FILES_CONTAINER_NAME,
  CONTENT:
    process.env.CONTENT_STORAGE_CONTAINER_NAME ??
    DEFAULT_FORM_CONTENT_FILES_CONTAINER_NAME,
};
