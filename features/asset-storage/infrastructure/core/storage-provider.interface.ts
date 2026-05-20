import type { ReadTokensResult as BulkReadTokensResult } from "../../types";
import type { ClientStorageConfig } from "../providers/shared/client-storage-config";
import type {
  BlobPropertiesResult,
  BulkReadUrlsOptions,
  FileOptions,
  FolderOptions,
  StorageListBlobItem,
  UploadUrlDescriptor,
} from "./storage-operation-types";

/**
 * Storage provider contract (Azure and S3).
 * Use cases and routes call these methods on the active provider.
 */
export interface IStorageProvider {
  readonly id: string;
  readonly name: string;

  isEnabled(): boolean;
  isPrivate(): boolean;

  /** Browser-safe config for URL parsing, presign, and client providers. */
  getClientConfig(): ClientStorageConfig;

  resetClient(): void;

  bulkGenerateReadTokens(
    options: BulkReadUrlsOptions,
  ): Promise<BulkReadTokensResult>;

  /** Presigned GET query string (no leading `?`) for one object key. */
  generateReadTokenQuery(
    containerName: string,
    objectKey: string,
    expiresInMinutes?: number,
  ): Promise<string>;

  generateUploadUrl(
    fileOptions: FileOptions,
    permissions?: "wr",
  ): Promise<UploadUrlDescriptor>;

  deleteBlob(fileOptions: FileOptions): Promise<void>;

  listBlobs(folderOptions: FolderOptions): Promise<StorageListBlobItem[]>;

  getBlobProperties(
    containerName: string,
    blobName: string,
  ): Promise<BlobPropertiesResult | null>;
}
