import {
  BlobServiceClient,
  StorageSharedKeyCredential,
  BlobSASPermissions,
  SASProtocol,
} from "@azure/storage-blob";

type AzureStorageConfig = {
  isEnabled: boolean;
  accountName: string;
  accountKey: string;
  hostName: string;
};

interface fileOptions {
  fileName: string;
  containerName: string;
  folderPath: string;
}

const STORAGE_SERVICE_CONFIG: AzureStorageConfig = Object.freeze({
  isEnabled: (() => {
    const { AZURE_STORAGE_ACCOUNT_NAME, AZURE_STORAGE_ACCOUNT_KEY } =
      process.env;
    return !!AZURE_STORAGE_ACCOUNT_NAME && !!AZURE_STORAGE_ACCOUNT_KEY;
  })(),
  accountName: (() => {
    return process.env.AZURE_STORAGE_ACCOUNT_NAME || "";
  })(),
  accountKey: (() => {
    return process.env.AZURE_STORAGE_ACCOUNT_KEY || "";
  })(),
  hostName: (() => {
    return process.env.AZURE_STORAGE_ACCOUNT_NAME
      ? `${process.env.AZURE_STORAGE_ACCOUNT_NAME}.blob.core.windows.net`
      : "";
  })(),
});

// Singleton BlobServiceClient to prevent memory leaks
let _blobServiceClient: BlobServiceClient | null = null;

function getBlobServiceClient(): BlobServiceClient {
  if (!_blobServiceClient) {
    _blobServiceClient = new BlobServiceClient(
      `https://${STORAGE_SERVICE_CONFIG.hostName}`,
      new StorageSharedKeyCredential(
        STORAGE_SERVICE_CONFIG.accountName,
        STORAGE_SERVICE_CONFIG.accountKey,
      ),
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
  if (!STORAGE_SERVICE_CONFIG.isEnabled) {
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
    await containerClient.createIfNotExists({
      access: "container",
    });

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

async function generateSASUrl(
  fileOptions: fileOptions,
  permissions: "w" | "r" = "w",
): Promise<string> {
  if (!STORAGE_SERVICE_CONFIG.isEnabled) {
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
    await containerClient.createIfNotExists({
      access: "container",
    });

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
      protocol: SASProtocol.HttpsAndHttp,
    });

    return sasToken;
  } catch (error) {
    console.error("Error generating SAS token:", error);
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
  STORAGE_SERVICE_CONFIG,
  uploadToStorage,
  generateSASUrl,
  resetBlobServiceClient,
};
