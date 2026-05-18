import type { HeadObjectCommandOutput } from "@aws-sdk/client-s3";
import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { Result } from "@/lib/result";
import type { ReadTokensResult as BulkReadTokensResult } from "../../../types";
import type { IStorageProvider } from "../../core/storage-provider.interface";
import { buildStorageObjectKey } from "../shared/storage-object-key";
import { buildUserFileFolderPath } from "../../storage-utils";
import { mapPool } from "../shared/async-pool";
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
import type {
  BlobPropertiesResult,
  BulkReadUrlsOptions,
  FileOptions,
  FolderOptions,
  StorageListBlobItem,
  UploadUrlDescriptor,
} from "../shared/blob-route-types";
import { toBlobUploadOptions } from "../shared/upload-metadata";
import { getS3StorageConfig, type S3StorageConfig } from "./s3-config";

const LIST_HEAD_CONCURRENCY = 16;
const PROVIDER_LABEL = "S3";

function toListItemFromHead(
  key: string,
  head: HeadObjectCommandOutput,
): StorageListBlobItem {
  return {
    name: key,
    properties: {
      contentLength: Number(head.ContentLength ?? 0),
      contentType: head.ContentType ?? "",
    },
    metadata: head.Metadata as Record<string, string> | undefined,
  };
}

function buildPutObjectInput(
  bucket: string,
  key: string,
  meta: import("../../../types").FileMetadata,
): PutObjectCommand["input"] {
  const blob = toBlobUploadOptions(meta);
  const metadata: Record<string, string> = {};
  for (const [rawKey, value] of Object.entries(blob.metadata)) {
    if (value === undefined || value === "") {
      continue;
    }
    metadata[rawKey.toLowerCase()] = value;
  }
  return {
    Bucket: bucket,
    Key: key,
    ContentType: blob.blobHTTPHeaders.blobContentType,
    Metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
  };
}

function buildClientHeadersFromPutInput(
  input: PutObjectCommand["input"],
): Record<string, string> {
  const headers: Record<string, string> = {};
  if (input.ContentType) {
    headers["Content-Type"] = input.ContentType;
  }
  return headers;
}

/**
 * S3StorageProvider is a class that implements the IStorageProvider interface for S3-compatible storage (RustFS).
 */
export class S3StorageProvider implements IStorageProvider {
  readonly id = "s3";
  readonly name = "S3-compatible storage (RustFS)";

  private _client: S3Client | null = null;

  private getConfig(): S3StorageConfig {
    return getS3StorageConfig();
  }

  private getClient(): S3Client {
    if (this._client === null) {
      const c = this.getConfig();
      this._client = new S3Client({
        region: c.region,
        endpoint: c.endpoint,
        credentials: {
          accessKeyId: c.accessKeyId,
          secretAccessKey: c.secretAccessKey,
        },
        forcePathStyle: c.forcePathStyle,
      });
    }
    return this._client;
  }

  /**
   * Reset the S3 client.
   */
  resetClient(): void {
    this._client = null;
  }

  /**
   * Check if the S3 storage is enabled.
   * @returns True if the S3 storage is enabled, false otherwise.
   */
  isEnabled(): boolean {
    return this.getConfig().isEnabled;
  }

  /**
   * Check if the S3 storage is private.
   * @returns True if the S3 storage is private, false otherwise.
   */
  isPrivate(): boolean {
    return this.getConfig().isPrivate;
  }

  /**
   * Bulk generate read tokens for the S3 storage.
   * @param options - The options for the bulk generate read tokens.
   * @returns The result of the bulk generate read tokens.
   */
  async bulkGenerateReadTokens(
    options: BulkReadUrlsOptions,
  ): Promise<BulkReadTokensResult> {
    const storageConfig = this.getConfig();
    const validation = validateBulkReadUrlsOptions(storageConfig, options, PROVIDER_LABEL);
    if (Result.isError(validation)) {
      return validation;
    }

    const { containerName, resourceNames, expiresInMinutes } = options;
    const { now, expiresOn } = computeReadTokenExpiry(
      expiresInMinutes,
      storageConfig.sasReadExpiryMinutes,
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
      console.error("Error generating S3 presigned read URLs:", error);
      return Result.error("Unexpected error generating read tokens");
    }
  }

  async generateReadTokenQuery(
    containerName: string,
    objectKey: string,
    expiresInMinutes?: number,
  ): Promise<string> {
    const storageConfig = this.getConfig();
    const { now, expiresOn } = computeReadTokenExpiry(
      expiresInMinutes,
      storageConfig.sasReadExpiryMinutes,
    );
    const expiresInSec = Math.max(
      1,
      Math.floor((expiresOn.valueOf() - now.valueOf()) / 1_000),
    );
    const url = await getSignedUrl(
      this.getClient(),
      new GetObjectCommand({
        Bucket: containerName,
        Key: objectKey,
      }),
      { expiresIn: expiresInSec },
    );
    const parsedUrl = new URL(url);
    return parsedUrl.search.startsWith("?") ? parsedUrl.search.slice(1) : parsedUrl.search;
  }

  /**
   * Generate an upload URL for the S3 storage.
   * @param fileOptions - The options for the upload URL.
   * @param permissions - The permissions for the upload URL.
   * @returns The upload URL.
   */
  async generateUploadUrl(
    fileOptions: FileOptions,
    _permissions: "wr" = "wr",
  ): Promise<UploadUrlDescriptor> {
    const c = this.getConfig();
    assertStorageEnabled(PROVIDER_LABEL, c.isEnabled);
    assertGenerateUploadUrlInputs(fileOptions);

    const key = buildStorageObjectKey(
      fileOptions.fileName,
      fileOptions.folderPath,
    );

    const client = this.getClient();
    let putInput: PutObjectCommand["input"] = {
      Bucket: fileOptions.containerName,
      Key: key,
    };

    if (fileOptions.blobUploadFileMetadata !== undefined) {
      putInput = buildPutObjectInput(
        fileOptions.containerName,
        key,
        fileOptions.blobUploadFileMetadata,
      );
    }

    const url = await getSignedUrl(client, new PutObjectCommand(putInput), {
      expiresIn: c.sasWriteExpirySeconds,
    });

    const headers =
      fileOptions.blobUploadFileMetadata !== undefined
        ? buildClientHeadersFromPutInput(putInput)
        : {};

    return { url, key, headers };
  }

  /**
   * Delete a blob from the S3 storage.
   * @param fileOptions - The options for the delete blob.
   * @returns The result of the delete blob.
   */
  async deleteBlob(fileOptions: FileOptions): Promise<void> {
    const c = this.getConfig();
    assertStorageEnabled(PROVIDER_LABEL, c.isEnabled);
    assertDeleteBlobInputs(fileOptions);

    const key = buildStorageObjectKey(
      fileOptions.fileName,
      fileOptions.folderPath,
    );

    await this.getClient().send(
      new DeleteObjectCommand({
        Bucket: fileOptions.containerName,
        Key: key,
      }),
    );
  }

  /**
   * List blobs from the S3 storage.
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

    const storageConfig = this.getConfig();
    const bucket = storageConfig.containerNames.USER_FILES;
    const prefix = folderPathResult.value;
    const client = this.getClient();

    const listed = await client.send(
      new ListObjectsV2Command({
        Bucket: bucket,
        Prefix: prefix,
      }),
    );

    const keys = (listed.Contents ?? [])
      .map((o) => o.Key)
      .filter((k): k is string => typeof k === "string" && k.length > 0);

    if (keys.length === 0) {
      return [];
    }

    const heads = await mapPool(
      keys,
      LIST_HEAD_CONCURRENCY,
      async (objectKey) => {
        const head = await client.send(
          new HeadObjectCommand({ Bucket: bucket, Key: objectKey }),
        );
        return toListItemFromHead(objectKey, head);
      },
    );

    return heads.filter((blob) =>
      isListableStorageObject({
        contentLength: blob.properties?.contentLength,
        contentType: blob.properties?.contentType,
      }),
    );
  }

  /**
   * Get the properties of a blob from the S3 storage.
   * @param containerName - The name of the container.
   * @param blobName - The key of the object.
   * @returns The properties of the blob.
   */
  async getBlobProperties(
    containerName: string,
    blobName: string,
  ): Promise<BlobPropertiesResult | null> {
    const c = this.getConfig();
    if (!c.isEnabled || !containerName || !blobName) {
      return null;
    }

    try {
      const head = await this.getClient().send(
        new HeadObjectCommand({ Bucket: containerName, Key: blobName }),
      );
      return {
        contentType: head.ContentType,
        sizeInBytes: Number(head.ContentLength ?? 0),
        metadata: head.Metadata as Record<string, string> | undefined,
      };
    } catch {
      return null;
    }
  }
}
