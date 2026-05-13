import type { AzureStorageConfig, StorageConfig } from "@endatix/storage-azure";
import {
  getAzureStorageConfig,
  getContainerNames,
  toClientStorageConfig,
} from "@endatix/storage-azure";
import {
  getRuntimeStorageProfile,
  type StorageProfileSlice,
} from "@/features/config/resolve-endatix-settings";
import { IMAGE_SERVICE_CONFIG } from "./infrastructure/image-service";
import { storageRegistry } from "./infrastructure/core";
import type { IStorageProvider } from "./infrastructure/core/storage-provider.interface";
import { ensureStorageRegistered } from "./infrastructure/storage-gateway";

/**
 * Storage runtime settings.
 */
export type StorageRuntimeSettings = {
  readonly providerId: string | null;
  readonly isEnabled: boolean;
  readonly isPrivate: boolean;
  /** Bootstrap-safe storage profile (mirror or env); same semantics as {@link getRuntimeStorageProfile}. */
  readonly storage: StorageProfileSlice;
  /**
   * Azure-shaped env resolution for admin, URL parsing, and legacy paths.
   * Omitted when `STORAGE_PROVIDER` is `none` or `s3` (explicit opt-out / RustFS track);
   * not tied to active registry provider.
   */
  readonly azure: AzureStorageConfig | null;
};

export { ensureStorageRegistered };

/**
 * Returns the active storage provider.
 * @returns The active storage provider.
 */
export function getActiveStorageProvider(): IStorageProvider | null {
  ensureStorageRegistered();
  return storageRegistry.getActiveProvider();
}

/**
 * Returns the storage runtime settings.
 * @returns The storage runtime settings.
 */
export function getStorageRuntimeSettings(): StorageRuntimeSettings {
  ensureStorageRegistered();
  const provider = storageRegistry.getActiveProvider();
  const storage = getRuntimeStorageProfile();
  const providerId = provider?.id ?? null;
  const isEnabled = provider?.isEnabled() ?? false;
  const isPrivate = provider?.isPrivate() ?? false;
  const azure =
    storage.explicitProvider === "none" || storage.explicitProvider === "s3"
      ? null
      : getAzureStorageConfig();

  return {
    providerId,
    isEnabled,
    isPrivate,
    storage,
    azure,
  };
}

/** Client-safe subset for `AssetStorageClientProvider` (see `toClientStorageConfig` when `azure` is set). */
export function getClientStorageConfig(
  storageSettings: StorageRuntimeSettings,
): StorageConfig {
  if (storageSettings.azure !== null) {
    return toClientStorageConfig(storageSettings.azure);
  }
  return {
    isEnabled: storageSettings.isEnabled,
    isPrivate: storageSettings.isPrivate,
    hostName: "",
    protocol: "https",
    containerNames: getContainerNames(),
    imageConfig: IMAGE_SERVICE_CONFIG,
  };
}
