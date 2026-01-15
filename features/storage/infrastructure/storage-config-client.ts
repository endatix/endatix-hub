import { AzureStorageConfig } from "./storage-config";

/**
 * Client-safe storage configuration.
 * Contains only the subset of config needed on the client side.
 */
export type StorageConfig = Omit<
  AzureStorageConfig,
  "accountKey" | "accountName" | "expiryMinutes" | "sasReadExpiryMinutes"
>;

export interface StorageConfigClient {
  config: StorageConfig;
}
