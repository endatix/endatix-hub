import {
  IMAGE_SERVICE_CONFIG,
  type ImageConfig,
} from "@/features/asset-storage/infrastructure/image-service";
import type { ContainerType } from "@/features/asset-storage/types";
import { resolveStoragePublicHost } from "@/lib/hosting/resolve-storage-public-host";
import { isS3StorageCredentialsPresentInEnv } from "@/lib/hosting/storage-env-predicates";
import {
  buildClientStorageConfig,
  type ClientStorageConfig,
} from "../shared/client-storage-config";
import {
  getStorageContainerNames,
  parsePositiveInt,
  parseWriteExpirySecondsFromEnv,
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

const S3_ENDPOINT_ENV_KEYS = ["S3_ENDPOINT"] as const;

export function getS3StorageConfig(): S3StorageConfig {
  const endpoint = process.env.S3_ENDPOINT?.trim() ?? "";
  const accessKeyId = process.env.S3_ACCESS_KEY_ID?.trim() ?? "";
  const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY?.trim() ?? "";
  const isEnabled = isS3StorageCredentialsPresentInEnv();

  const region = process.env.S3_REGION?.trim() || DEFAULT_REGION;
  const forcePathStyle = process.env.S3_FORCE_PATH_STYLE !== "false";

  const { host: clientHostName, protocol } = resolveStoragePublicHost({
    provider: "s3",
    url: endpoint,
    requireWhenEnabled: isEnabled,
    missingEnvKeys: S3_ENDPOINT_ENV_KEYS,
    misconfiguredEnvKeys: S3_ENDPOINT_ENV_KEYS,
    requireOriginOnly: true,
  });

  const sasReadExpiryMinutes = parsePositiveInt(
    process.env.S3_SAS_READ_EXPIRY_MINUTES,
    DEFAULT_SAS_READ_EXPIRY_MINUTES,
  );
  const sasWriteExpirySeconds = parseWriteExpirySecondsFromEnv(
    process.env.AZURE_STORAGE_SAS_TOKEN_EXPIRY_MINUTES,
    process.env.S3_SAS_WRITE_EXPIRY_SECONDS,
  );

  return Object.freeze({
    isEnabled,
    isPrivate: process.env.S3_IS_PRIVATE === "true",
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
