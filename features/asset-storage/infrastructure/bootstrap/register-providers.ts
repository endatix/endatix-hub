import { getRuntimeStorageProfile } from "@/features/config/resolve-endatix-settings";
import { storageRegistry } from "../core";
import { AzureBlobStorageProvider } from "../providers/azure/azure-storage-provider";
import { S3StorageProvider } from "../providers/s3";
import { assertStorageProfileValid } from "./validate-storage-profile";

/**
 * Registers the active storage provider from `STORAGE_PROVIDER` and credentials.
 * Uses {@link getRuntimeStorageProfile} (prefers `ENDATIX_RESOLVED_*` from `withEndatix`).
 *
 * Throws {@link MissingConfigurationError} or {@link MisconfigurationError} when
 * `STORAGE_PROVIDER` is `azure` or `s3` but env fails validation.
 */
export function registerStorageProviders(): void {
  if (storageRegistry.getActiveProvider() !== null) {
    return;
  }

  const storage = getRuntimeStorageProfile();

  if (storage.provider === "none") {
    return;
  }

  if (storage.provider === "s3" || storage.provider === "azure") {
    assertStorageProfileValid(storage);

    if (storage.provider === "s3") {
      storageRegistry.register(new S3StorageProvider());
    } else {
      storageRegistry.register(new AzureBlobStorageProvider());
    }
  }
}
