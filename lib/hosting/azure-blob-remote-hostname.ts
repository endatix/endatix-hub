import {
  resolveStoragePublicHost,
  type StoragePublicHost,
} from "./resolve-storage-public-host";
import { isAzureStorageCredentialsPresentInEnv } from "./storage-env-predicates";

const AZURE_PUBLIC_HOST_ENV_KEYS = ["AZURE_STORAGE_CUSTOM_DOMAIN"] as const;

/**
 * Resolves Azure public blob host from explicit `AZURE_STORAGE_CUSTOM_DOMAIN` only.
 * Returns `null` when Azure credentials are not configured.
 */
export function getAzureStoragePublicHostFromEnv(): StoragePublicHost | null {
  if (!isAzureStorageCredentialsPresentInEnv()) {
    return null;
  }

  return resolveStoragePublicHost({
    provider: "azure",
    url: process.env.AZURE_STORAGE_CUSTOM_DOMAIN,
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
