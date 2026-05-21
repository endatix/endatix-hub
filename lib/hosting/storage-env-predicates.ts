function readTrimmedEnv(name: string): string {
  return process.env[name]?.trim() ?? "";
}

function readEnvWithFallback(
  canonicalName: string,
  legacyName: string,
): string {
  const canonicalValue = readTrimmedEnv(canonicalName);
  if (canonicalValue.length > 0) {
    return canonicalValue;
  }

  return readTrimmedEnv(legacyName);
}

export const STORAGE_AZURE_ENV = {
  accountName: "STORAGE_AZURE_ACCOUNT_NAME",
  accountKey: "STORAGE_AZURE_ACCOUNT_KEY",
  endpoint: "STORAGE_AZURE_ENDPOINT",
  sasReadExpiryMinutes: "STORAGE_AZURE_SAS_READ_EXPIRY_MINUTES",
  sasWriteExpirySeconds: "STORAGE_AZURE_SAS_WRITE_EXPIRY_SECONDS",
} as const;

export const LEGACY_AZURE_STORAGE_ENV = {
  accountName: "AZURE_STORAGE_ACCOUNT_NAME",
  accountKey: "AZURE_STORAGE_ACCOUNT_KEY",
  customDomain: "AZURE_STORAGE_CUSTOM_DOMAIN",
  isPrivate: "AZURE_STORAGE_IS_PRIVATE",
  sasTokenExpiryMinutes: "AZURE_STORAGE_SAS_TOKEN_EXPIRY_MINUTES",
} as const;

const AZURE_LEGACY_FALLBACK: Partial<
  Record<keyof typeof STORAGE_AZURE_ENV, string>
> = {
  accountName: LEGACY_AZURE_STORAGE_ENV.accountName,
  accountKey: LEGACY_AZURE_STORAGE_ENV.accountKey,
  endpoint: LEGACY_AZURE_STORAGE_ENV.customDomain,
  sasReadExpiryMinutes: LEGACY_AZURE_STORAGE_ENV.sasTokenExpiryMinutes,
};

const STORAGE_IS_PRIVATE_ENV = "STORAGE_IS_PRIVATE";
const STORAGE_PROVIDER_ENV = "STORAGE_PROVIDER";

export const STORAGE_S3_ENV = {
  endpoint: "STORAGE_S3_ENDPOINT",
  accessKeyId: "STORAGE_S3_ACCESS_KEY_ID",
  secretAccessKey: "STORAGE_S3_SECRET_ACCESS_KEY",
  region: "STORAGE_S3_REGION",
  forcePathStyle: "STORAGE_S3_FORCE_PATH_STYLE",
  readExpiryMinutes: "STORAGE_S3_READ_EXPIRY_MINUTES",
  writeExpirySeconds: "STORAGE_S3_WRITE_EXPIRY_SECONDS",
} as const;

export function readAzureStorageEnv(
  key: keyof typeof STORAGE_AZURE_ENV,
): string {
  const canonical = STORAGE_AZURE_ENV[key];
  const legacy = AZURE_LEGACY_FALLBACK[key];
  const value =
    legacy === undefined
      ? readTrimmedEnv(canonical)
      : readEnvWithFallback(canonical, legacy);

  if (key === "sasReadExpiryMinutes") {
    if (
      value.length > 0 &&
      readTrimmedEnv(STORAGE_AZURE_ENV.sasReadExpiryMinutes).length === 0
    ) {
      process.env[STORAGE_AZURE_ENV.sasReadExpiryMinutes] = value;
    }

    return value;
  }

  return value;
}

export function readS3StorageEnv(key: keyof typeof STORAGE_S3_ENV): string {
  return readTrimmedEnv(STORAGE_S3_ENV[key]);
}

export function isStoragePrivateFromEnv(): boolean {
  const storageProvider = readTrimmedEnv(STORAGE_PROVIDER_ENV).toLowerCase();
  const legacyFallback =
    storageProvider === "azure" ? LEGACY_AZURE_STORAGE_ENV.isPrivate : "";

  return (
    readEnvWithFallback(
      STORAGE_IS_PRIVATE_ENV,
      legacyFallback,
    ).toLowerCase() !== "false"
  );
}

/** Same predicate as Hub Azure provider `isEnabled` (account name + key). */
export function isAzureStorageCredentialsPresentInEnv(): boolean {
  const name = readAzureStorageEnv("accountName");
  const key = readAzureStorageEnv("accountKey");
  return name.length > 0 && key.length > 0;
}

/** Same predicate as Hub S3 provider `isEnabled` (endpoint + access key + secret). */
export function isS3StorageCredentialsPresentInEnv(): boolean {
  const endpoint = readS3StorageEnv("endpoint");
  const accessKeyId = readS3StorageEnv("accessKeyId");
  const secretAccessKey = readS3StorageEnv("secretAccessKey");
  return (
    endpoint.length > 0 && accessKeyId.length > 0 && secretAccessKey.length > 0
  );
}
