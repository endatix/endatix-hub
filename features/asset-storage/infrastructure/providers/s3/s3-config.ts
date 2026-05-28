import {
  IMAGE_SERVICE_CONFIG,
  type ImageConfig,
} from "@/features/asset-storage/infrastructure/image-service";
import type { ContainerType } from "@/features/asset-storage/types";
import { resolveStoragePublicHost } from "@/lib/hosting/resolve-storage-public-host";
import {
  STORAGE_S3_ENV,
  isS3StorageCredentialsPresentInEnv,
  isStoragePrivateFromEnv,
  readS3StorageEnv,
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

export interface S3StorageConfig {
  isEnabled: boolean;
  isPrivate: boolean;
  endpoint: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  forcePathStyle: boolean;
  sasReadExpiryMinutes: number;
  sasWriteExpirySeconds: number;
  containerNames: Record<ContainerType, string>;
  imageConfig: ImageConfig;
  clientHostName: string;
  protocol: "https" | "http";
}

const DEFAULT_SAS_READ_EXPIRY_MINUTES = 15;
const DEFAULT_REGION = "us-east-1";

const S3_ENDPOINT_ENV_KEYS = [STORAGE_S3_ENV.endpoint] as const;

export function getS3StorageConfig(): S3StorageConfig {
  const endpoint = readS3StorageEnv("endpoint");
  const accessKeyId = readS3StorageEnv("accessKeyId");
  const secretAccessKey = readS3StorageEnv("secretAccessKey");
  const isEnabled = isS3StorageCredentialsPresentInEnv();

  const region = readS3StorageEnv("region") || DEFAULT_REGION;
  const forcePathStyle = readS3StorageEnv("forcePathStyle") !== "false";

  const { host: clientHostName, protocol } = resolveStoragePublicHost({
    provider: "s3",
    url: endpoint,
    requireWhenEnabled: isEnabled,
    missingEnvKeys: S3_ENDPOINT_ENV_KEYS,
    misconfiguredEnvKeys: S3_ENDPOINT_ENV_KEYS,
    requireOriginOnly: true,
  });

  const sasReadExpiryMinutes = parsePositiveInt(
    readS3StorageEnv("readExpiryMinutes"),
    DEFAULT_SAS_READ_EXPIRY_MINUTES,
  );
  const sasWriteExpirySeconds = parsePositiveInt(
    readS3StorageEnv("writeExpirySeconds"),
    DEFAULT_STORAGE_WRITE_EXPIRY_SECONDS,
  );

  return Object.freeze({
    isEnabled,
    isPrivate: isStoragePrivateFromEnv(),
    endpoint,
    region,
    accessKeyId,
    secretAccessKey,
    forcePathStyle,
    sasReadExpiryMinutes,
    sasWriteExpirySeconds,
    containerNames: getStorageContainerNames(),
    imageConfig: IMAGE_SERVICE_CONFIG,
    clientHostName,
    protocol,
  });
}

export function toClientStorageConfig(
  s3: S3StorageConfig,
): ClientStorageConfig {
  return buildClientStorageConfig({
    isEnabled: s3.isEnabled,
    isPrivate: s3.isPrivate,
    hostName: s3.clientHostName,
    protocol: s3.protocol,
    containerNames: s3.containerNames,
    imageConfig: s3.imageConfig,
  });
}
