import { buildClientStorageConfig } from "./infrastructure/providers/shared/client-storage-config";
import { getStorageContainerNames } from "./infrastructure/providers/shared/container-names";
import { IMAGE_SERVICE_CONFIG } from "./infrastructure/image-service";
import { storageRegistry } from "./infrastructure/core";
import { registerStorageProviders } from "./infrastructure/bootstrap/register-providers";
import type { IStorageProvider } from "./infrastructure/core/storage-provider.interface";
import type { ClientStorageConfig } from "./infrastructure/providers/shared/client-storage-config";

/** Active storage provider state from the registry (after bootstrap registration). */
export type StorageRuntimeSettings = {
  readonly providerId: string | null;
  readonly isEnabled: boolean;
  readonly isPrivate: boolean;
};

let storageProvidersRegistrationEnsured = false;

export function ensureStorageRegistered(): void {
  if (storageProvidersRegistrationEnsured) {
    return;
  }

  storageProvidersRegistrationEnsured = true;
  registerStorageProviders();
}

/** Active storage provider from the registry (after bootstrap registration).
 * Calls {@link ensureStorageRegistered} internally.
 */
export function getActiveStorageProvider(): IStorageProvider | null {
  ensureStorageRegistered();
  return storageRegistry.getActiveProvider();
}

export function requireActiveStorageProvider(): IStorageProvider {
  const provider = getActiveStorageProvider();
  if (provider === null || !provider.isEnabled()) {
    throw new Error("Storage is not enabled");
  }
  return provider;
}

export function resetActiveStorageProviderClient(): void {
  getActiveStorageProvider()?.resetClient();
}

/** Active storage provider state from the registry (after bootstrap registration). */
export function getStorageRuntimeSettings(): StorageRuntimeSettings {
  ensureStorageRegistered();
  const provider = storageRegistry.getActiveProvider();

  return {
    providerId: provider?.id ?? null,
    isEnabled: provider?.isEnabled() ?? false,
    isPrivate: provider?.isPrivate() ?? false,
  };
}

/**
 * Client-safe active storage config for URL parsing, presign, and gates.
 * Delegates to the registered provider's {@link IStorageProvider.getClientConfig}.
 */
export function getClientStorageConfig(): ClientStorageConfig {
  ensureStorageRegistered();
  const provider = storageRegistry.getActiveProvider();

  if (provider === null) {
    return DISABLED_CLIENT_STORAGE_CONFIG;
  }

  return provider.getClientConfig();
}

const DISABLED_CLIENT_STORAGE_CONFIG: ClientStorageConfig = Object.freeze({
  isEnabled: false,
  isPrivate: false,
  hostName: "",
  protocol: "https",
  containerNames: getStorageContainerNames(),
  imageConfig: IMAGE_SERVICE_CONFIG,
});
