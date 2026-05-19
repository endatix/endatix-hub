import { getAzureStorageConfig } from "@endatix/storage-azure";
import { getRuntimeStorageProfile } from "@/features/config/resolve-endatix-settings";
import { getS3StorageConfig } from "../../infrastructure/providers/s3/s3-config";
import {
  getClientStorageConfig,
  getStorageRuntimeSettings,
} from "../../storage-runtime";

export type StorageAdminAzureDetails = {
  readonly accountName: string;
  readonly sasReadExpiryMinutes: number;
  readonly sasWriteExpirySeconds: number;
};

export type StorageAdminS3Details = {
  readonly endpoint: string;
  readonly region: string;
  readonly forcePathStyle: boolean;
  readonly publicBaseUrl: string | undefined;
  readonly sasReadExpiryMinutes: number;
  readonly sasWriteExpirySeconds: number;
};

/** Server-safe snapshot for admin UI (no secrets). */
export type StorageAdminSummary = {
  readonly activeProviderId: string | null;
  readonly activeProviderLabel: string;
  readonly explicitProviderLabel: string;
  readonly isEnabled: boolean;
  readonly isPrivate: boolean;
  readonly hostName: string;
  readonly protocol: "https" | "http";
  readonly userFilesContainer: string;
  readonly contentContainer: string;
  readonly azureCredentialsPresent: boolean;
  readonly s3CredentialsPresent: boolean;
  readonly azure: StorageAdminAzureDetails | null;
  readonly s3: StorageAdminS3Details | null;
};

function formatExplicitProvider(
  explicit: ReturnType<typeof getRuntimeStorageProfile>["explicitProvider"],
): string {
  if (explicit === null) {
    return "Auto";
  }
  if (explicit === "azure") {
    return "azure";
  }
  if (explicit === "s3") {
    return "s3";
  }
  return "none";
}

function activeProviderLabel(providerId: string | null): string {
  if (providerId === "azure") {
    return "Azure Blob Storage";
  }
  if (providerId === "s3") {
    return "S3-compatible storage";
  }
  return "None (disabled)";
}

/**
 * Server-safe snapshot for admin UI (no secrets).
 * @returns Server-safe snapshot for admin UI (no secrets).
 */
export function getStorageAdminSummary(): StorageAdminSummary {
  const settings = getStorageRuntimeSettings();
  const envProfile = getRuntimeStorageProfile();
  const client = getClientStorageConfig();

  const azure =
    settings.providerId === "azure"
      ? (() => {
          const config = getAzureStorageConfig();
          return {
            accountName: config.accountName,
            sasReadExpiryMinutes: config.sasReadExpiryMinutes,
            sasWriteExpirySeconds: config.sasWriteExpirySeconds,
          };
        })()
      : null;

  const s3 =
    settings.providerId === "s3"
      ? (() => {
          const config = getS3StorageConfig();
          return {
            endpoint: config.endpoint,
            region: config.region,
            forcePathStyle: config.forcePathStyle,
            publicBaseUrl: config.publicBaseUrl,
            sasReadExpiryMinutes: config.sasReadExpiryMinutes,
            sasWriteExpirySeconds: config.sasWriteExpirySeconds,
          };
        })()
      : null;

  return {
    activeProviderId: settings.providerId,
    activeProviderLabel: activeProviderLabel(settings.providerId),
    explicitProviderLabel: formatExplicitProvider(envProfile.explicitProvider),
    isEnabled: settings.isEnabled,
    isPrivate: settings.isPrivate,
    hostName: client.hostName,
    protocol: client.protocol,
    userFilesContainer: client.containerNames.USER_FILES,
    contentContainer: client.containerNames.CONTENT,
    azureCredentialsPresent: envProfile.azureCredentialsPresent,
    s3CredentialsPresent: envProfile.s3CredentialsPresent,
    azure,
    s3,
  };
}
