import { Result } from "@/lib/result";
import type { BlobItem } from "@azure/storage-blob";
import {
  BlobSASPermissions,
  BlobServiceClient,
  SASProtocol,
  StorageSharedKeyCredential,
  generateBlobSASQueryParameters,
} from "@azure/storage-blob";
import type { ReadTokensResult as BulkReadTokensResult } from "../../../types";
import type { IStorageProvider } from "../../core/storage-provider.interface";
import { buildUserFileFolderPath } from "../../storage-utils";
import { getAzureStorageConfig, type AzureStorageConfig } from "./azure-config";
import {
  toAzureBlockBlobPutHeaders,
  toBlobUploadOptions,
} from "./azure-blob-metadata-parser";
import type {
  BlobPropertiesResult,
  BulkReadUrlsOptions,
  FileOptions,
  FolderOptions,
  UploadUrlDescriptor,
} from "./types";

const READ_ONLY_PERMISSIONS = BlobSASPermissions.parse("r");

export class AzureBlobStorageProvider implements IStorageProvider {
  readonly id = "azure";
  readonly name = "Azure Blob Storage";

  private _blobServiceClient: BlobServiceClient | null = null;

  private getConfig(): AzureStorageConfig {
    return getAzureStorageConfig();
  }

  isEnabled(): boolean {
    return this.getConfig().isEnabled;
  }

  isPrivate(): boolean {
    return this.getConfig().isPrivate;
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

  resetBlobServiceClient(): void {
    this._blobServiceClient = null;
  }

  async uploadToStorage(
    fileBuffer: Buffer,
    fileName: string,
    containerName: string,
    folderPath?: string,
    metadata?: Record<string, string>,
  ): Promise<string> {
    const config = this.getConfig();
    if (!config.isEnabled) {
      throw new Error("Azure storage is not enabled");
    }

    if (!fileBuffer) {
      throw new Error("a file is not provided");
    }

    if (!fileName) {
      throw new Error("fileName is not provided");
    }

    if (!containerName) {
      throw new Error("container name is not provided");
    }

    const STEP_UPLOAD_START = performance.now();

    const blobServiceClient = this.getBlobServiceClient();
    const containerClient = blobServiceClient.getContainerClient(containerName);

    try {
      const blobName = folderPath ? `${folderPath}/${fileName}` : fileName;
      const blobClient = containerClient.getBlockBlobClient(blobName);
      await blobClient.uploadData(fileBuffer, {
        blobHTTPHeaders: {
          blobContentType: metadata?.contentType ?? "",
          blobContentLanguage: metadata?.language ?? "",
          blobContentDisposition: "inline",
        },
        metadata: metadata,
      });

      const STEP_UPLOAD_END = performance.now();
      console.log(
        `⏱️ Upload to blob took ${STEP_UPLOAD_END - STEP_UPLOAD_START}ms`,
      );

      return blobClient.url;
    } catch (error) {
      console.error("Error uploading to blob storage:", error);
      throw error;
    }
  }

  async bulkGenerateReadTokens(
    options: BulkReadUrlsOptions,
  ): Promise<BulkReadTokensResult> {
    const { containerName, resourceType, resourceNames, expiresInMinutes } =
      options;

    const config = this.getConfig();
    if (!config.isEnabled) {
      return Result.error("Azure storage is not enabled");
    }

    if (!config.isPrivate) {
      return Result.error("Azure storage is not private");
    }

    if (!containerName) {
      return Result.validationError("A container name is not provided");
    }

    if (!resourceType) {
      return Result.validationError("A resource type is not provided");
    }

    if (
      resourceType !== "container" &&
      (!resourceNames || resourceNames.length === 0)
    ) {
      return Result.validationError(
        "Resource names are required for file or directory resource types",
      );
    }

    const credential = new StorageSharedKeyCredential(
      config.accountName,
      config.accountKey,
    );

    const now = new Date(Date.now());
    const expirationSpanInMs =
      (expiresInMinutes ?? config.sasReadExpiryMinutes) * 60 * 1000;
    const expiresOn = new Date(now.valueOf() + expirationSpanInMs);

    try {
      const readTokens: Record<string, string> = {};

      if (resourceType === "container") {
        readTokens.container = generateContainerReadToken(
          containerName,
          credential,
          now,
          expiresOn,
        );
      } else {
        for (const resourceName of resourceNames!) {
          readTokens[resourceName] = generateBlobReadToken(
            containerName,
            resourceName,
            credential,
            now,
            expiresOn,
          );
        }
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

  async generateUploadUrl(
    fileOptions: FileOptions,
    permissions: "wr" = "wr",
  ): Promise<UploadUrlDescriptor> {
    const config = this.getConfig();
    if (!config.isEnabled) {
      throw new Error("Azure storage is not enabled");
    }

    if (!fileOptions.fileName) {
      throw new Error("a file is not provided");
    }

    if (!fileOptions.folderPath) {
      throw new Error("a folder path is not provided");
    }

    if (!fileOptions.containerName) {
      throw new Error("container name is not provided");
    }

    const blobServiceClient = this.getBlobServiceClient();
    const containerClient = blobServiceClient.getContainerClient(
      fileOptions.containerName,
    );

    try {
      const blobName = fileOptions.folderPath
        ? `${fileOptions.folderPath}/${fileOptions.fileName}`
        : fileOptions.fileName;
      const blobClient = containerClient.getBlockBlobClient(blobName);

      const NOW = new Date(Date.now());
      const EXPIRY_IN_MS = 1000 * 60 * 3; // 3 minutes
      const sasToken = await blobClient.generateSasUrl({
        startsOn: NOW,
        permissions: BlobSASPermissions.parse(permissions),
        expiresOn: new Date(NOW.valueOf() + EXPIRY_IN_MS),
        protocol: SASProtocol.Https,
      });

      const headers =
        fileOptions.blobUploadFileMetadata !== undefined
          ? toAzureBlockBlobPutHeaders(
              toBlobUploadOptions(fileOptions.blobUploadFileMetadata),
            )
          : { "x-ms-blob-type": "BlockBlob" };

      return {
        url: sasToken,
        key: blobName,
        headers,
      };
    } catch (error) {
      console.error("Error generating SAS token:", error);
      throw error;
    }
  }

  async deleteBlob(fileOptions: FileOptions): Promise<void> {
    const config = this.getConfig();
    if (!config.isEnabled) {
      throw new Error("Azure storage is not enabled");
    }

    if (!fileOptions.fileName) {
      throw new Error("a file is not provided");
    }

    if (!fileOptions.containerName) {
      throw new Error("container name is not provided");
    }

    const blobServiceClient = this.getBlobServiceClient();
    const containerClient = blobServiceClient.getContainerClient(
      fileOptions.containerName,
    );

    const blobName = fileOptions.folderPath
      ? `${fileOptions.folderPath}/${fileOptions.fileName}`
      : fileOptions.fileName;
    const blobClient = containerClient.getBlockBlobClient(blobName);

    try {
      await blobClient.delete();
    } catch (error) {
      console.error("Error deleting blob:", error);
      throw error;
    }
  }

  async listBlobs(folderOptions: FolderOptions): Promise<BlobItem[]> {
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

    const blobsIterator = containerClient.listBlobsFlat({
      prefix: folderPathResult.value,
      includeDeleted: false,
      includeMetadata: true,
    });

    const filesResult: BlobItem[] = [];
    for await (const blob of blobsIterator) {
      const contentLength = Number(blob.properties?.contentLength ?? 0);
      const contentType = blob.properties?.contentType ?? "";
      const isFile = contentLength > 0 && contentType.length > 0;
      if (isFile) {
        filesResult.push(blob);
      }
    }
    return filesResult;
  }

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

      const sizeInBytes = response.contentLength ?? 0;

      return {
        contentType,
        sizeInBytes,
        metadata: response.metadata as Record<string, string> | undefined,
      };
    } catch {
      return null;
    }
  }
}

function generateContainerReadToken(
  containerName: string,
  credential: StorageSharedKeyCredential,
  startsOn: Date,
  expiresOn: Date,
): string {
  return generateBlobSASQueryParameters(
    {
      containerName,
      permissions: READ_ONLY_PERMISSIONS,
      startsOn,
      expiresOn,
      protocol: SASProtocol.Https,
    },
    credential,
  ).toString();
}

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
