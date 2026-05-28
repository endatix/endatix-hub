import {
  resolveStoragePublicHost,
  type StoragePublicHost,
} from "./resolve-storage-public-host";
import {
  LEGACY_AZURE_STORAGE_ENV,
  readAzureStorageEnv,
  STORAGE_AZURE_ENV,
  isAzureStorageCredentialsPresentInEnv,
} from "./storage-env-predicates";

const AZURE_PUBLIC_HOST_ENV_KEYS = [
  STORAGE_AZURE_ENV.endpoint,
  LEGACY_AZURE_STORAGE_ENV.customDomain,
] as const;

/**
 * Resolves the Azure Blob endpoint from canonical env, with legacy Azure fallback.
 * Returns `null` when Azure credentials are not configured.
 */
export function getAzureStoragePublicHostFromEnv(): StoragePublicHost | null {
  if (!isAzureStorageCredentialsPresentInEnv()) {
    return null;
  }

  return resolveStoragePublicHost({
    provider: "azure",
    url: readAzureStorageEnv("endpoint"),
    requireWhenEnabled: true,
    missingEnvKeys: AZURE_PUBLIC_HOST_ENV_KEYS,
    misconfiguredEnvKeys: AZURE_PUBLIC_HOST_ENV_KEYS,
  });
}

/**
 * Host segment for `next/image` remote patterns, or `null` when Azure storage is not enabled.
 */
export function getAzureStorageHostname(): string | null {
  const resolved = getAzureStoragePublicHostFromEnv();
  if (resolved === null) {
    return null;
  }
  return resolved.host.length > 0 ? resolved.host : null;
}
