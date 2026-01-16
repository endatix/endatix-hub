import { AzureStorageConfig } from "./storage-config";

/**
 * Client-safe storage configuration.
 * Contains only the subset of config needed on the client side.
 */
type StorageConfig = Omit<
  AzureStorageConfig,
  "accountKey" | "accountName" | "expiryMinutes" | "sasReadExpiryMinutes"
>;

interface StorageConfigClient {
  config: StorageConfig;
}

  export type { StorageConfig, StorageConfigClient };
