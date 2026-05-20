import {
  IMAGE_SERVICE_CONFIG,
  type ImageConfig,
} from "@/features/asset-storage/infrastructure/image-service";
import type { ContainerType } from "@/features/asset-storage/types";
import { getAzureStoragePublicHostFromEnv } from "@/lib/hosting/azure-blob-remote-hostname";
import { isAzureStorageCredentialsPresentInEnv } from "@/lib/hosting/storage-env-predicates";
import {
  buildClientStorageConfig,
  type ClientStorageConfig,
} from "../shared/client-storage-config";
import {
  getStorageContainerNames,
  parsePositiveInt,
  parseWriteExpirySecondsFromEnv,
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
  const { AZURE_STORAGE_ACCOUNT_NAME, AZURE_STORAGE_ACCOUNT_KEY } = process.env;

  const isEnabled = isAzureStorageCredentialsPresentInEnv();
  const accountName = AZURE_STORAGE_ACCOUNT_NAME || "";

  const publicHost = isEnabled ? getAzureStoragePublicHostFromEnv() : null;
  const hostName = publicHost?.host ?? "";
  const protocol = publicHost?.protocol ?? "https";

  const sasReadExpiryMinutes = parsePositiveInt(
    process.env.AZURE_STORAGE_SAS_READ_EXPIRY_MINUTES,
    DEFAULT_SAS_READ_EXPIRY_MINUTES,
  );

  const sasWriteExpirySeconds = parseWriteExpirySecondsFromEnv(
    process.env.AZURE_STORAGE_SAS_TOKEN_EXPIRY_MINUTES,
    process.env.S3_SAS_WRITE_EXPIRY_SECONDS,
  );

  return Object.freeze({
    isEnabled,
    isPrivate: !!process.env.AZURE_STORAGE_IS_PRIVATE,
    accountName,
    accountKey: AZURE_STORAGE_ACCOUNT_KEY || "",
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
