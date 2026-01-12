import { Result } from "@/lib/result";
import {
  BlobServiceClient,
  StorageSharedKeyCredential,
  BlobSASPermissions,
  SASProtocol,
  generateBlobSASQueryParameters,
} from "@azure/storage-blob";
import { getStorageConfig } from "./storage-config";

interface FileOptions {
  fileName: string;
  containerName: string;
  folderPath?: string;
}

const READ_ONLY_PERMISSIONS = BlobSASPermissions.parse("r");

// Singleton BlobServiceClient to prevent memory leaks
let _blobServiceClient: BlobServiceClient | null = null;

function getBlobServiceClient(): BlobServiceClient {
  if (!_blobServiceClient) {
    const config = getStorageConfig();
    _blobServiceClient = new BlobServiceClient(
      `https://${config.hostName}`,
      new StorageSharedKeyCredential(config.accountName, config.accountKey),
    );
  }
  return _blobServiceClient;
}

/**
 * Uploads a file to Azure Blob Storage
 * @param fileBuffer - The buffer containing the file data
 * @param fileName - The name to use for the file in storage
 * @param folderPath - Optional folder path within the container
 * @returns A Promise resolving to the URL of the uploaded file
 */
async function uploadToStorage(
  fileBuffer: Buffer,
  fileName: string,
  containerName: string,
  folderPath?: string,
): Promise<string> {
  const config = getStorageConfig();
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

  const blobServiceClient = getBlobServiceClient();
  const containerClient = blobServiceClient.getContainerClient(containerName);

  try {
    const blobName = folderPath ? `${folderPath}/${fileName}` : fileName;
    const blobClient = containerClient.getBlockBlobClient(blobName);
    await blobClient.uploadData(fileBuffer);

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

interface ReadUrlOptions extends Omit<FileOptions, "fileName"> {
  resourceType: "file" | "directory" | "container";
  resourceNames?: string[];
  expiresInMinutes?: number;
}

interface ReadTokensResponse {
  /**
   * A record of requested resource names and the corresponding tokens generated for read access
   */
  readTokens: Record<string, string>;
  /**
   * The date and time when the tokens will expire
   */
  expiresOn: Date;
  /**
   * The date and time when the tokens were generated
   */
  generatedAt: Date;
}

type ReadTokensResult = Result<ReadTokensResponse>;

/**
 * Generates Azure Blob Storage SAS token for container-level access
 */
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

/**
 * Generates Azure Blob Storage SAS token for blob-level access
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

/**
 * Generates read tokens for accessing storage resources
 * Supports generating tokens for containers, directories, or individual files
 * @param options - The options for generating the tokens
 * @returns A Promise resolving to the tokens and expiration information
 */
async function generateReadTokens(
  options: ReadUrlOptions,
): Promise<ReadTokensResult> {
  const { containerName, resourceType, resourceNames, expiresInMinutes } =
    options;

  const config = getStorageConfig();
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

async function generateUploadUrl(
  fileOptions: FileOptions,
  permissions: "wr" = "wr",
): Promise<string> {
  const config = getStorageConfig();
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

  const blobServiceClient = getBlobServiceClient();
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
    const sasToken = blobClient.generateSasUrl({
      startsOn: NOW,
      permissions: BlobSASPermissions.parse(permissions),
      expiresOn: new Date(NOW.valueOf() + EXPIRY_IN_MS),
      protocol: SASProtocol.Https,
    });

    return sasToken;
  } catch (error) {
    console.error("Error generating SAS token:", error);
    throw error;
  }
}

async function deleteBlob(fileOptions: FileOptions): Promise<void> {
  const config = getStorageConfig();
  if (!config.isEnabled) {
    throw new Error("Azure storage is not enabled");
  }

  if (!fileOptions.fileName) {
    throw new Error("a file is not provided");
  }

  if (!fileOptions.containerName) {
    throw new Error("container name is not provided");
  }

  const blobServiceClient = getBlobServiceClient();
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

// Reset function for testing or when you need to recreate the client
function resetBlobServiceClient(): void {
  if (_blobServiceClient) {
    // The Azure SDK doesn't have a close method, but we can nullify the reference
    // to allow garbage collection
    _blobServiceClient = null;
  }
}
export {
  type FileOptions,
  uploadToStorage,
  generateReadTokens,
  generateUploadUrl,
  deleteBlob,
  resetBlobServiceClient,
};
