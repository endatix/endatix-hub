import { getRuntimeStorageProfile } from "@/features/config/resolve-endatix-settings";
import { getAzureStorageConfig } from "@endatix/storage-azure";
import { validateStorageProfile } from "../../infrastructure/bootstrap/validate-storage-profile";
import { getS3StorageConfig } from "../../infrastructure/providers/s3/s3-config";
import { buildClientStorageConfig } from "../../infrastructure/providers/shared/client-storage-config";
import { getStorageContainerNames } from "../../infrastructure/providers/shared/container-names";
import { IMAGE_SERVICE_CONFIG } from "../../infrastructure/image-service";
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

function mapAzureAdminDetails(): StorageAdminAzureDetails {
  const config = getAzureStorageConfig();
  return {
    accountName: config.accountName,
    sasReadExpiryMinutes: config.sasReadExpiryMinutes,
    sasWriteExpirySeconds: config.sasWriteExpirySeconds,
  };
}

function mapS3AdminDetails(): StorageAdminS3Details {
  const config = getS3StorageConfig();
  return {
    endpoint: config.endpoint,
    region: config.region,
    forcePathStyle: config.forcePathStyle,
    publicBaseUrl: config.publicBaseUrl,
    sasReadExpiryMinutes: config.sasReadExpiryMinutes,
    sasWriteExpirySeconds: config.sasWriteExpirySeconds,
  };
}

/** Server-safe snapshot for admin UI (no secrets). */
export type StorageAdminSummary = {
  readonly activeProviderId: string | null;
  readonly activeProviderLabel: string;
  readonly configuredProviderLabel: string;
  readonly isEnabled: boolean;
  readonly isPrivate: boolean;
  readonly hostName: string;
  readonly protocol: "https" | "http";
  readonly userFilesContainer: string;
  readonly contentContainer: string;
  readonly azureCredentialsPresent: boolean;
  readonly s3CredentialsPresent: boolean;
  readonly configurationErrors: readonly string[];
  readonly azure: StorageAdminAzureDetails | null;
  readonly s3: StorageAdminS3Details | null;
};

function formatConfiguredProvider(
  profile: ReturnType<typeof getRuntimeStorageProfile>,
): string {
  if (profile.invalidProviderRaw !== null) {
    return `invalid (${profile.invalidProviderRaw})`;
  }
  return profile.provider;
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

function disabledClientSnapshot() {
  return buildClientStorageConfig({
    isEnabled: false,
    isPrivate: false,
    hostName: "",
    protocol: "https",
    containerNames: getStorageContainerNames(),
    imageConfig: IMAGE_SERVICE_CONFIG,
  });
}

/**
 * Server-safe snapshot for admin UI. Uses the same env validation as bootstrap registration;
 * does not register a provider when validation fails.
 */
export function getStorageAdminSummary(): StorageAdminSummary {
  const envProfile = getRuntimeStorageProfile();
  const configurationErrors = validateStorageProfile(envProfile);

  if (configurationErrors.length > 0) {
    const client = disabledClientSnapshot();
    return {
      activeProviderId: null,
      activeProviderLabel: activeProviderLabel(null),
      configuredProviderLabel: formatConfiguredProvider(envProfile),
      isEnabled: false,
      isPrivate: false,
      hostName: client.hostName,
      protocol: client.protocol,
      userFilesContainer: client.containerNames.USER_FILES,
      contentContainer: client.containerNames.CONTENT,
      azureCredentialsPresent: envProfile.azureCredentialsPresent,
      s3CredentialsPresent: envProfile.s3CredentialsPresent,
      configurationErrors,
      azure: null,
      s3: null,
    };
  }

  const settings = getStorageRuntimeSettings();
  const client = getClientStorageConfig();

  return {
    activeProviderId: settings.providerId,
    activeProviderLabel: activeProviderLabel(settings.providerId),
    configuredProviderLabel: formatConfiguredProvider(envProfile),
    isEnabled: settings.isEnabled,
    isPrivate: settings.isPrivate,
    hostName: client.hostName,
    protocol: client.protocol,
    userFilesContainer: client.containerNames.USER_FILES,
    contentContainer: client.containerNames.CONTENT,
    azureCredentialsPresent: envProfile.azureCredentialsPresent,
    s3CredentialsPresent: envProfile.s3CredentialsPresent,
    configurationErrors: [],
    azure: envProfile.provider === "azure" ? mapAzureAdminDetails() : null,
    s3: envProfile.provider === "s3" ? mapS3AdminDetails() : null,
  };
}
