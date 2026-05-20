import { getAzureStoragePublicHostFromEnv } from "./azure-blob-remote-hostname";
import { resolveStoragePublicHost } from "./resolve-storage-public-host";
import {
  isAzureStorageCredentialsPresentInEnv,
  isS3StorageCredentialsPresentInEnv,
} from "./storage-env-predicates";

/**
 * Normalized `STORAGE_PROVIDER` env value.
 * Kept in lib so `next.config` and `resolve-endatix-settings` share one type without importing features.
 */
export type StorageProvider = "none" | "s3" | "azure";

export {
  isAzureStorageCredentialsPresentInEnv,
  isS3StorageCredentialsPresentInEnv,
} from "./storage-env-predicates";

const S3_ENDPOINT_ENV_KEYS = ["S3_ENDPOINT"] as const;

function collectS3ImageHostname(): string | null {
  if (!isS3StorageCredentialsPresentInEnv()) {
    return null;
  }

  const resolved = resolveStoragePublicHost({
    provider: "s3",
    url: process.env.S3_ENDPOINT,
    requireWhenEnabled: true,
    missingEnvKeys: S3_ENDPOINT_ENV_KEYS,
    misconfiguredEnvKeys: S3_ENDPOINT_ENV_KEYS,
    requireOriginOnly: true,
  });
  return resolved.host.length > 0 ? resolved.host : null;
}

/**
 * Hostnames allowed for `next/images` remote optimization and mirrored in `ENDATIX_RESOLVED_*`.
 * Single source of truth: same matrix as bootstrap (`STORAGE_PROVIDER` + provider env).
 */
export function collectStorageImageRemoteHostnamesFromEnv(
  provider: StorageProvider,
): readonly string[] {
  const hostnames: string[] = [];

  if (provider === "azure") {
    const azure = getAzureStoragePublicHostFromEnv();
    if (azure !== null && azure.host.length > 0) {
      hostnames.push(azure.host);
    }
  }

  if (provider === "s3") {
    const s3Host = collectS3ImageHostname();
    if (s3Host !== null) {
      hostnames.push(s3Host);
    }
  }

  const unique = [...new Set(hostnames.filter((h) => h.length > 0))];
  return Object.freeze(unique);
}
