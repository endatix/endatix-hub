import {
  BlobServiceClient,
  StorageSharedKeyCredential,
} from "@azure/storage-blob";

type AzureStorageConfig = {
  isEnabled: boolean;
  accountName: string;
  accountKey: string;
  hostName: string;
};

export class StorageService {
  private readonly blobServiceClient: BlobServiceClient;

  constructor() {
    const config = StorageService.getAzureStorageConfig();
    if (!config.isEnabled) {
      throw new Error("Azure storage is not enabled");
    }

    this.blobServiceClient = new BlobServiceClient(
      `https://${config.hostName}`,
      new StorageSharedKeyCredential(config.accountName, config.accountKey),
    );
  }

  async uploadToStorage(
    fileBuffer: Buffer,
    fileName: string,
    containerName: string,
    folderPath?: string,
  ): Promise<string> {
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

    const containerClient =
      this.blobServiceClient.getContainerClient(containerName);
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
  }

  static getAzureStorageConfig(): AzureStorageConfig {
    const { AZURE_STORAGE_ACCOUNT_NAME, AZURE_STORAGE_ACCOUNT_KEY } =
      process.env;
    const isEnabled =
      !!AZURE_STORAGE_ACCOUNT_NAME && !!AZURE_STORAGE_ACCOUNT_KEY;
    if (!isEnabled) {
      return {
        isEnabled: false,
        accountName: "",
        accountKey: "",
        hostName: "",
      };
    }

    return {
      isEnabled: true,
      accountName: AZURE_STORAGE_ACCOUNT_NAME,
      accountKey: AZURE_STORAGE_ACCOUNT_KEY,
      hostName: `${AZURE_STORAGE_ACCOUNT_NAME}.blob.core.windows.net`,
    };
  }

  static isEnabled(): boolean {
    const config = StorageService.getAzureStorageConfig();
    return config.isEnabled;
  }
}
