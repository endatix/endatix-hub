import type { StorageProfileSlice } from "@/features/config/resolve-endatix-settings";
import {
  formatStorageConfigurationError,
  MisconfigurationError,
  MissingConfigurationError,
  type StorageProviderId,
} from "@/lib/hosting/storage-configuration-errors";
import { getAzureStorageConfig } from "../providers/azure/azure-config";
import { getS3StorageConfig } from "../providers/s3/s3-config";

export type StorageConfigurationError =
  | MissingConfigurationError
  | MisconfigurationError;

const S3_CREDENTIAL_ENV_KEYS = [
  "S3_ENDPOINT",
  "S3_ACCESS_KEY_ID",
  "S3_SECRET_ACCESS_KEY",
] as const;

const AZURE_CREDENTIAL_ENV_KEYS = [
  "AZURE_STORAGE_ACCOUNT_NAME",
  "AZURE_STORAGE_ACCOUNT_KEY",
] as const;

function missingS3CredentialsError(): MissingConfigurationError {
  return new MissingConfigurationError(
    `STORAGE_PROVIDER=s3 requires ${S3_CREDENTIAL_ENV_KEYS.join(", ")}.`,
    S3_CREDENTIAL_ENV_KEYS,
    "s3",
  );
}

function missingAzureCredentialsError(): MissingConfigurationError {
  return new MissingConfigurationError(
    `STORAGE_PROVIDER=azure requires ${AZURE_CREDENTIAL_ENV_KEYS.join(", ")}.`,
    AZURE_CREDENTIAL_ENV_KEYS,
    "azure",
  );
}

function invalidStorageProviderError(
  rawProvider: string,
): MisconfigurationError {
  return new MisconfigurationError(
    `STORAGE_PROVIDER="${rawProvider}" is invalid. Use azure, s3, or none.`,
    ["STORAGE_PROVIDER"],
    null,
    rawProvider,
  );
}

function collectProviderCredentialErrors(
  profile: StorageProfileSlice,
): StorageConfigurationError[] {
  if (profile.provider === "s3") {
    if (!profile.s3CredentialsPresent) {
      return [missingS3CredentialsError()];
    }
    try {
      getS3StorageConfig();
      return [];
    } catch (error: unknown) {
      return [wrapConfigLoaderError(error, "s3")];
    }
  }

  if (profile.provider === "azure") {
    if (!profile.azureCredentialsPresent) {
      return [missingAzureCredentialsError()];
    }
    try {
      getAzureStorageConfig();
      return [];
    } catch (error: unknown) {
      return [wrapConfigLoaderError(error, "azure")];
    }
  }

  return [];
}

function wrapConfigLoaderError(
  error: unknown,
  provider: StorageProviderId,
): StorageConfigurationError {
  if (error instanceof MissingConfigurationError) {
    return error;
  }
  if (error instanceof MisconfigurationError) {
    return error;
  }
  return new MisconfigurationError(
    formatStorageConfigurationError(error),
    [],
    provider,
  );
}

/**
 * Collects typed validation errors for the env profile (empty when valid or storage off).
 */
export function collectStorageProfileValidationErrors(
  profile: StorageProfileSlice,
): StorageConfigurationError[] {
  if (profile.invalidProviderRaw !== null) {
    return [invalidStorageProviderError(profile.invalidProviderRaw)];
  }

  if (profile.provider === "none") {
    return [];
  }

  return collectProviderCredentialErrors(profile);
}

/**
 * Fails fast when `STORAGE_PROVIDER` requests azure or s3 but env is invalid.
 */
export function assertStorageProfileValid(profile: StorageProfileSlice): void {
  const errors = collectStorageProfileValidationErrors(profile);
  if (errors.length > 0) {
    throw errors[0];
  }
}

/** Human-readable messages for startup checks and admin UI. */
export function validateStorageProfile(profile: StorageProfileSlice): string[] {
  return collectStorageProfileValidationErrors(profile).map(
    (error) => error.message,
  );
}
