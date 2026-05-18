import { Result } from "@/lib/result";
import { registerStorageProviders } from "./bootstrap/register-providers";
import { storageRegistry } from "./core";
import type { ReadTokensResult as BulkReadTokensResult } from "../types";
import { AzureBlobStorageProvider } from "./providers/azure/azure-storage-provider";
import { S3StorageProvider } from "./providers/s3/s3-storage-provider";
import type {
  BlobPropertiesResult,
  BulkReadUrlsOptions,
  FileOptions,
  FolderOptions,
  StorageListBlobItem,
  UploadUrlDescriptor,
} from "./providers/shared/blob-route-types";

/** Active concrete provider used for presigned URLs and blob CRUD (registry-backed). */
type HubStorageProvider = AzureBlobStorageProvider | S3StorageProvider;

let storageProvidersRegistrationEnsured = false;

function ensureStorageProvidersRegistered(): void {
  if (storageProvidersRegistrationEnsured) {
    return;
  }
  storageProvidersRegistrationEnsured = true;
  registerStorageProviders();
}

/**
 * Ensures the storage providers are registered.
 * @returns void
 */
export function ensureStorageRegistered(): void {
  ensureStorageProvidersRegistered();
}

function tryGetStorageProvider(): HubStorageProvider | null {
  ensureStorageProvidersRegistered();
  const registered = storageRegistry.getActiveProvider();
  if (registered?.id === "azure") {
    return registered as AzureBlobStorageProvider;
  }
  if (registered?.id === "s3") {
    return registered as S3StorageProvider;
  }
  return null;
}

function requireStorageProvider(): HubStorageProvider {
  const provider = tryGetStorageProvider();
  if (provider === null) {
    throw new Error("Storage is not available for this storage profile");
  }
  return provider;
}

/** Resolves the active provider and ensures {@link IStorageProvider.isEnabled} is true. */
function requireEnabledStorageProvider(): HubStorageProvider {
  const provider = requireStorageProvider();
  if (!provider.isEnabled()) {
    throw new Error("Storage is not enabled");
  }
  return provider;
}

export async function uploadToStorage(
  fileBuffer: Buffer,
  fileName: string,
  containerName: string,
  folderPath?: string,
  metadata?: Record<string, string>,
): Promise<string> {
  return requireEnabledStorageProvider().uploadToStorage(
    fileBuffer,
    fileName,
    containerName,
    folderPath,
    metadata,
  );
}

export async function bulkGenerateReadTokens(
  options: BulkReadUrlsOptions,
): Promise<BulkReadTokensResult> {
  const provider = tryGetStorageProvider();
  if (provider === null) {
    return Result.error("Storage is not available for this storage profile");
  }
  if (!provider.isEnabled()) {
    return Result.error("Storage is not enabled");
  }
  return provider.bulkGenerateReadTokens(options);
}

export async function generateUploadUrl(
  fileOptions: FileOptions,
  permissions: "wr" = "wr",
): Promise<UploadUrlDescriptor> {
  return requireEnabledStorageProvider().generateUploadUrl(
    fileOptions,
    permissions,
  );
}

export async function deleteBlob(fileOptions: FileOptions): Promise<void> {
  return requireEnabledStorageProvider().deleteBlob(fileOptions);
}

export async function listBlobs(
  folderOptions: FolderOptions,
): Promise<StorageListBlobItem[]> {
  return requireEnabledStorageProvider().listBlobs(folderOptions);
}

export async function getBlobProperties(
  containerName: string,
  blobName: string,
): Promise<BlobPropertiesResult | null> {
  const provider = tryGetStorageProvider();
  if (provider === null || !provider.isEnabled()) {
    return null;
  }
  return provider.getBlobProperties(containerName, blobName);
}

export function resetBlobServiceClient(): void {
  const registered = storageRegistry.getActiveProvider();
  if (registered?.id === "azure") {
    (registered as AzureBlobStorageProvider).resetBlobServiceClient();
  }
  if (registered?.id === "s3") {
    (registered as S3StorageProvider).resetS3Client();
  }
}

export type {
  BlobPropertiesResult,
  BulkReadUrlsOptions,
  FileOptions,
  FolderOptions,
  StorageListBlobItem,
  UploadUrlDescriptor,
};
