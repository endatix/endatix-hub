import { getRuntimeStorageProfile } from "@/features/config/resolve-endatix-settings";
import { storageRegistry } from "../core";
import { AzureBlobStorageProvider } from "../providers/azure/azure-storage-provider";
import { S3StorageProvider } from "../providers/s3";

/**
 * Registers the active storage provider from `STORAGE_PROVIDER` and credentials.
 * Uses {@link getRuntimeStorageProfile} (prefers `ENDATIX_RESOLVED_*` from `withEndatix`).
 *
 * Providers are **statically imported** so the first synchronous `ensureStorageRegistered` call
 * always sees a registered implementation (tests and routes that do not await async bootstrap).
 * Optional code-splitting via dynamic `import()` is deferred until bundle size warrants it.
 *
 * **`STORAGE_PROVIDER` is required** (no inference from credentials alone). Set one of:
 * - `none` — no provider.
 * - `s3` — RustFS / S3 when `S3_ENDPOINT`, `S3_ACCESS_KEY_ID`, and `S3_SECRET_ACCESS_KEY` are set.
 * - `azure` — Azure when `AZURE_STORAGE_ACCOUNT_NAME` and `AZURE_STORAGE_ACCOUNT_KEY` are set.
 *
 * Unset or unknown values log a warning and skip registration.
 */
export function registerStorageProviders(): void {
  if (storageRegistry.getActiveProvider() !== null) {
    return;
  }

  const storage = getRuntimeStorageProfile();

  if (storage.explicitProvider === "none") {
    return;
  }

  if (storage.explicitProvider === "s3") {
    if (storage.s3CredentialsPresent) {
      storageRegistry.register(new S3StorageProvider());
    } else {
      console.warn(
        "[storage] STORAGE_PROVIDER=s3 but S3_ENDPOINT / S3_ACCESS_KEY_ID / S3_SECRET_ACCESS_KEY are missing",
      );
    }
    return;
  }

  if (storage.explicitProvider === "azure") {
    if (storage.azureCredentialsPresent) {
      storageRegistry.register(new AzureBlobStorageProvider());
    } else {
      console.warn(
        "[storage] STORAGE_PROVIDER=azure but AZURE_STORAGE_ACCOUNT_NAME / AZURE_STORAGE_ACCOUNT_KEY are missing",
      );
    }
    return;
  }

  console.warn(
    "[storage] STORAGE_PROVIDER must be set to azure, s3, or none. Skipping storage registration.",
  );
}
