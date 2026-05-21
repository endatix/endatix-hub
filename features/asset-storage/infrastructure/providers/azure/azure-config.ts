import {
  IMAGE_SERVICE_CONFIG,
  type ImageConfig,
} from "@/features/asset-storage/infrastructure/image-service";
import type { ContainerType } from "@/features/asset-storage/types";
import { getAzureStoragePublicHostFromEnv } from "@/lib/hosting/azure-blob-remote-hostname";
import {
  isStoragePrivateFromEnv,
  isAzureStorageCredentialsPresentInEnv,
  readAzureStorageEnv,
} from "@/lib/hosting/storage-env-predicates";
import {
  buildClientStorageConfig,
  type ClientStorageConfig,
} from "../shared/client-storage-config";
import {
  DEFAULT_STORAGE_WRITE_EXPIRY_SECONDS,
  getStorageContainerNames,
  parsePositiveInt,
} from "../shared/container-names";

export interface IStorageConfig {
  isEnabled: boolean;
  isPrivate: boolean;
  imageConfig: ImageConfig;
}

export type AzureStorageConfig = IStorageConfig & {
  accountName: string;
  accountKey: string;
  hostName: string;
  protocol: "https" | "http";
  sasReadExpiryMinutes: number;
  sasWriteExpirySeconds: number;
  containerNames: Record<ContainerType, string>;
};

export interface StorageConfigClient {
  config: ClientStorageConfig;
}

const DEFAULT_SAS_READ_EXPIRY_MINUTES = 15;

export function getAzureStorageConfig(): AzureStorageConfig {
  const isEnabled = isAzureStorageCredentialsPresentInEnv();
  const accountName = readAzureStorageEnv("accountName");
  const accountKey = readAzureStorageEnv("accountKey");

  const publicHost = isEnabled ? getAzureStoragePublicHostFromEnv() : null;
  const hostName = publicHost?.host ?? "";
  const protocol = publicHost?.protocol ?? "https";

  const sasReadExpiryMinutes = parsePositiveInt(
    readAzureStorageEnv("sasReadExpiryMinutes"),
    DEFAULT_SAS_READ_EXPIRY_MINUTES,
  );

  const sasWriteExpirySeconds = parsePositiveInt(
    readAzureStorageEnv("sasWriteExpirySeconds"),
    DEFAULT_STORAGE_WRITE_EXPIRY_SECONDS,
  );

  return Object.freeze({
    isEnabled,
    isPrivate: isStoragePrivateFromEnv(),
    accountName,
    accountKey,
    hostName,
    protocol,
    sasReadExpiryMinutes,
    sasWriteExpirySeconds,
    containerNames: getStorageContainerNames(),
    imageConfig: IMAGE_SERVICE_CONFIG,
  });
}

export function toClientStorageConfig(
  azure: AzureStorageConfig,
): ClientStorageConfig {
  return buildClientStorageConfig({
    isEnabled: azure.isEnabled,
    isPrivate: azure.isPrivate,
    hostName: azure.hostName,
    protocol: azure.protocol,
    containerNames: azure.containerNames,
    imageConfig: azure.imageConfig,
  });
}

export function createStorageConfigClient(): StorageConfigClient {
  return Object.freeze({
    config: toClientStorageConfig(getAzureStorageConfig()),
  });
}

export function getContainerUrl(
  containerName: string,
  config: AzureStorageConfig | ClientStorageConfig,
): string {
  return `${config.protocol}://${config.hostName}/${containerName}`;
}

export { getStorageContainerNames as getContainerNames };
