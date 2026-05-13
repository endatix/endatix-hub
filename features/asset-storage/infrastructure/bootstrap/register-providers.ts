import { getRuntimeStorageProfile } from "@/features/config/resolve-endatix-settings";
import { storageRegistry } from "../core";
import { AzureBlobStorageProvider } from "../providers/azure/azure-storage-provider";

/**
 * Registers the active storage provider based on `STORAGE_PROVIDER` and env.
 * Uses {@link getRuntimeStorageProfile} (prefers `ENDATIX_RESOLVED_*` from `withEndatix`).
 *
 * - `STORAGE_PROVIDER=none` — no provider.
 * - `STORAGE_PROVIDER=s3` — reserved for RustFS (PR 3); no provider registered here.
 * - `STORAGE_PROVIDER=azure` — Azure when credentials are present (warns if missing).
 * - Unset / unknown — auto: register Azure when `AZURE_STORAGE_ACCOUNT_NAME` + key are set.
 */
export function registerStorageProviders(): void {
  if (storageRegistry.getActiveProvider() !== null) {
    return;
  }

  const storage = getRuntimeStorageProfile();

  if (
    storage.explicitProvider === "none" ||
    storage.explicitProvider === "s3"
  ) {
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

  if (!storage.azureCredentialsPresent) {
    return;
  }

  storageRegistry.register(new AzureBlobStorageProvider());
}
