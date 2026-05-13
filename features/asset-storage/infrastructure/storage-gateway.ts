import type { BlobItem } from "@azure/storage-blob";
import { Result } from "@/lib/result";
import { getRuntimeStorageProfile } from "@/features/config/resolve-endatix-settings";
import { registerStorageProviders } from "./bootstrap/register-providers";
import { storageRegistry } from "./core";
import type { ReadTokensResult as BulkReadTokensResult } from "../types";
import { AzureBlobStorageProvider } from "./providers/azure/azure-storage-provider";
import type {
  BlobPropertiesResult,
  BulkReadUrlsOptions,
  FileOptions,
  FolderOptions,
} from "./providers/azure/types";

/** Used when `instrumentation` has not run (e.g. Vitest). */
let fallbackProvider: AzureBlobStorageProvider | null = null;

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

function tryGetAzureProviderForGateway(): AzureBlobStorageProvider | null {
  ensureStorageProvidersRegistered();
  const registered = storageRegistry.getActiveProvider();
  if (registered !== null && registered.id === "azure") {
    return registered as AzureBlobStorageProvider;
  }

  const explicit = getRuntimeStorageProfile().explicitProvider;
  if (explicit === "none" || explicit === "s3") {
    return null;
  }

  fallbackProvider = fallbackProvider ?? new AzureBlobStorageProvider();

  return fallbackProvider;
}

function getAzureProvider(): AzureBlobStorageProvider {
  const provider = tryGetAzureProviderForGateway();
  if (provider === null) {
    throw new Error("Azure storage is not available for this storage profile");
  }
  return provider;
}

function requireEnabledAzureProvider(): AzureBlobStorageProvider {
  const provider = getAzureProvider();
  if (!provider.isEnabled()) {
    throw new Error("Azure storage is not enabled");
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
  return requireEnabledAzureProvider().uploadToStorage(
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
  const provider = tryGetAzureProviderForGateway();
  if (provider === null || !provider.isEnabled()) {
    return Result.error("Azure storage is not enabled");
  }
  return provider.bulkGenerateReadTokens(options);
}

export async function generateUploadUrl(
  fileOptions: FileOptions,
  permissions: "wr" = "wr",
): Promise<string> {
  return requireEnabledAzureProvider().generateUploadUrl(
    fileOptions,
    permissions,
  );
}

export async function deleteBlob(fileOptions: FileOptions): Promise<void> {
  return requireEnabledAzureProvider().deleteBlob(fileOptions);
}

export async function listBlobs(
  folderOptions: FolderOptions,
): Promise<BlobItem[]> {
  return requireEnabledAzureProvider().listBlobs(folderOptions);
}

export async function getBlobProperties(
  containerName: string,
  blobName: string,
): Promise<BlobPropertiesResult | null> {
  const provider = tryGetAzureProviderForGateway();
  if (provider === null || !provider.isEnabled()) {
    return null;
  }
  return provider.getBlobProperties(containerName, blobName);
}

export function resetBlobServiceClient(): void {
  fallbackProvider = null;
  const registered = storageRegistry.getActiveProvider();
  if (registered !== null && registered.id === "azure") {
    (registered as AzureBlobStorageProvider).resetBlobServiceClient();
  }
}

export type { BulkReadUrlsOptions, FileOptions, BlobPropertiesResult };
