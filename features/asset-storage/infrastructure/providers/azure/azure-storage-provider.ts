import { Result } from "@/lib/result";
import {
  BlobSASPermissions,
  BlobServiceClient,
  SASProtocol,
  StorageSharedKeyCredential,
  generateBlobSASQueryParameters,
} from "@azure/storage-blob";
import type { ReadTokensResult as BulkReadTokensResult } from "../../../types";
import type { IStorageProvider } from "../../core/storage-provider.interface";
import { buildStorageObjectKey } from "../shared/storage-object-key";
import { buildUserFileFolderPath } from "../../storage-utils";
import {
  computeReadTokenExpiry,
  validateBulkReadUrlsOptions,
} from "../shared/bulk-read-validation";
import { isListableStorageObject } from "../shared/list-blob-filter";
import {
  assertDeleteBlobInputs,
  assertGenerateUploadUrlInputs,
  assertStorageEnabled,
} from "../shared/storage-guards";
import {
  getAzureStorageConfig,
  toClientStorageConfig,
  type AzureStorageConfig,
} from "./azure-config";
import type { ClientStorageConfig } from "../shared/client-storage-config";
import {
  toAzureBlockBlobPutHeaders,
  toBlobUploadOptions,
} from "./azure-blob-metadata-parser";
import {
  BlobPropertiesResult,
  BulkReadUrlsOptions,
  FileOptions,
  FolderOptions,
  StorageListBlobItem,
  UploadUrlDescriptor,
} from "../../core/storage-operation-types";

const READ_ONLY_PERMISSIONS = BlobSASPermissions.parse("r");
const PROVIDER_LABEL = "Azure";

/**
 * AzureBlobStorageProvider is a class that implements the IStorageProvider interface for Azure Blob Storage.
 */
export class AzureBlobStorageProvider implements IStorageProvider {
  readonly id = "azure";
  readonly name = "Azure Blob Storage";

  private _blobServiceClient: BlobServiceClient | null = null;

  private getConfig(): AzureStorageConfig {
    return getAzureStorageConfig();
  }

  /**
   * Check if the Azure storage is enabled.
   * @returns True if the Azure storage is enabled, false otherwise.
   */
  isEnabled(): boolean {
    return this.getConfig().isEnabled;
  }

  /**
   * Check if the Azure storage is private.
   * @returns True if the Azure storage is private, false otherwise.
   */
  isPrivate(): boolean {
    return this.getConfig().isPrivate;
  }

  getClientConfig(): ClientStorageConfig {
    return toClientStorageConfig(this.getConfig());
  }

  /**
   * Reset the Azure storage client.
   */
  resetClient(): void {
    this._blobServiceClient = null;
  }

  private getBlobServiceClient(): BlobServiceClient {
    if (!this._blobServiceClient) {
      const config = this.getConfig();
      this._blobServiceClient = new BlobServiceClient(
        `https://${config.hostName}`,
        new StorageSharedKeyCredential(config.accountName, config.accountKey),
      );
    }
    return this._blobServiceClient;
  }

  /**
   * Bulk generate read tokens for the Azure storage.
   * @param options - The options for the bulk generate read tokens.
   * @returns The result of the bulk generate read tokens.
   */
  async bulkGenerateReadTokens(
    options: BulkReadUrlsOptions,
  ): Promise<BulkReadTokensResult> {
    const config = this.getConfig();
    const validation = validateBulkReadUrlsOptions(
      config,
      options,
      PROVIDER_LABEL,
    );

    if (Result.isError(validation)) {
      return validation;
    }

    const { containerName, resourceNames, expiresInMinutes } = options;
    const { now, expiresOn } = computeReadTokenExpiry(
      expiresInMinutes,
      config.sasReadExpiryMinutes,
    );

    try {
      const readTokens: Record<string, string> = {};
      for (const resourceName of resourceNames!) {
        readTokens[resourceName] = await this.generateReadTokenQuery(
          containerName,
          resourceName,
          expiresInMinutes,
        );
      }

      return Result.success({
        readTokens,
        expiresOn,
        generatedAt: now,
      });
    } catch (error) {
      console.error("Error generating SAS token:", error);
      return Result.error("Unexpected error generating Read SAS Tokens");
    }
  }

  /**
   * Generate a read token query for the Azure storage.
   * @param containerName - The name of the container.
   * @param objectKey - The key of the object.
   * @param expiresInMinutes - The number of minutes the token is valid for.
   * @returns The read token query.
   */
  async generateReadTokenQuery(
    containerName: string,
    objectKey: string,
    expiresInMinutes?: number,
  ): Promise<string> {
    const config = this.getConfig();
    const credential = new StorageSharedKeyCredential(
      config.accountName,
      config.accountKey,
    );
    const { now, expiresOn } = computeReadTokenExpiry(
      expiresInMinutes,
      config.sasReadExpiryMinutes,
    );
    return generateBlobReadToken(
      containerName,
      objectKey,
      credential,
      now,
      expiresOn,
    );
  }

  /**
   * Generate an upload URL for the Azure storage.
   * @param fileOptions - The options for the upload URL.
   * @param permissions - The permissions for the upload URL.
   * @returns The upload URL.
   */
  async generateUploadUrl(
    fileOptions: FileOptions,
    permissions: "wr" = "wr",
  ): Promise<UploadUrlDescriptor> {
    const config = this.getConfig();
    assertStorageEnabled(PROVIDER_LABEL, config.isEnabled);
    assertGenerateUploadUrlInputs(fileOptions);

    const blobServiceClient = this.getBlobServiceClient();
    const containerClient = blobServiceClient.getContainerClient(
      fileOptions.containerName,
    );

    const blobName = buildStorageObjectKey(
      fileOptions.fileName,
      fileOptions.folderPath,
    );
    const blobClient = containerClient.getBlockBlobClient(blobName);

    const now = new Date(Date.now());
    const expiresOn = new Date(
      now.valueOf() + config.sasWriteExpirySeconds * 1000,
    );

    const sasToken = await blobClient.generateSasUrl({
      startsOn: now,
      permissions: BlobSASPermissions.parse(permissions),
      expiresOn,
      protocol: SASProtocol.Https,
    });

    const headers =
      fileOptions.blobUploadFileMetadata === undefined
        ? { "x-ms-blob-type": "BlockBlob" }
        : toAzureBlockBlobPutHeaders(
            toBlobUploadOptions(fileOptions.blobUploadFileMetadata),
          );

    return { url: sasToken, key: blobName, headers };
  }

  /**
   * Delete a blob from the Azure storage.
   * @param fileOptions - The options for the delete blob.
   * @returns The result of the delete blob.
   */
  async deleteBlob(fileOptions: FileOptions): Promise<void> {
    const config = this.getConfig();
    assertStorageEnabled(PROVIDER_LABEL, config.isEnabled);
    assertDeleteBlobInputs(fileOptions);

    const blobServiceClient = this.getBlobServiceClient();
    const containerClient = blobServiceClient.getContainerClient(
      fileOptions.containerName,
    );
    const blobName = buildStorageObjectKey(
      fileOptions.fileName,
      fileOptions.folderPath,
    );
    const blobClient = containerClient.getBlockBlobClient(blobName);
    await blobClient.delete();
  }

  /**
   * List blobs from the Azure storage.
   * @param folderOptions - The options for the list blobs.
   * @returns The list of blobs.
   */
  async listBlobs(
    folderOptions: FolderOptions,
  ): Promise<StorageListBlobItem[]> {
    const folderPathResult = buildUserFileFolderPath(
      folderOptions.formId,
      folderOptions.submissionId,
    );
    if (Result.isError(folderPathResult)) {
      throw new TypeError(folderPathResult.message);
    }

    const blobServiceClient = this.getBlobServiceClient();
    const containerClient = blobServiceClient.getContainerClient(
      this.getConfig().containerNames.USER_FILES,
    );

    const filesResult: StorageListBlobItem[] = [];
    for await (const blob of containerClient.listBlobsFlat({
      prefix: folderPathResult.value,
      includeDeleted: false,
      includeMetadata: true,
    })) {
      if (
        isListableStorageObject({
          contentLength: blob.properties?.contentLength,
          contentType: blob.properties?.contentType,
        })
      ) {
        filesResult.push(blob);
      }
    }
    return filesResult;
  }

  /**
   * Get the properties of a blob from the Azure storage.
   * @param containerName - The name of the container.
   * @param blobName - The key of the object.
   * @returns The properties of the blob.
   */
  async getBlobProperties(
    containerName: string,
    blobName: string,
  ): Promise<BlobPropertiesResult | null> {
    const config = this.getConfig();
    if (!config.isEnabled || !containerName || !blobName) {
      return null;
    }

    try {
      const blobServiceClient = this.getBlobServiceClient();
      const containerClient =
        blobServiceClient.getContainerClient(containerName);
      const blobClient = containerClient.getBlockBlobClient(blobName);
      const response = await blobClient.getProperties();

      const contentType =
        response.metadata?.["content-type"] ?? response.contentType;

      return {
        contentType,
        sizeInBytes: response.contentLength ?? 0,
        metadata: response.metadata as Record<string, string> | undefined,
      };
    } catch {
      return null;
    }
  }
}

/**
 * Generate a read token for the Azure storage.
 * @param containerName - The name of the container.
 * @param blobName - The key of the object.
 * @param credential - The credential for the Azure storage.
 * @param startsOn - The start time of the token.
 * @param expiresOn - The expiration time of the token.
 * @returns The read token.
 */
function generateBlobReadToken(
  containerName: string,
  blobName: string,
  credential: StorageSharedKeyCredential,
  startsOn: Date,
  expiresOn: Date,
): string {
  return generateBlobSASQueryParameters(
    {
      containerName,
      blobName,
      permissions: READ_ONLY_PERMISSIONS,
      startsOn,
      expiresOn,
      protocol: SASProtocol.Https,
    },
    credential,
  ).toString();
}
