import {
  DeleteObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  S3Client,
} from "@aws-sdk/client-s3";
import { Result } from "@/lib/result";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { appendStorageReadQuery } from "../../../append-storage-read-query";
import { S3StorageProvider } from "../s3-storage-provider";

describe("S3StorageProvider", () => {
  const originalEnv = { ...process.env };
  type SendMock = ReturnType<typeof vi.fn>;
  type S3Command =
    | DeleteObjectCommand
    | HeadObjectCommand
    | ListObjectsV2Command;

  function useClientSendMock(
    provider: S3StorageProvider,
    send: SendMock,
  ): void {
    const client = Object.assign(new S3Client({}), { send });
    provider.__setClientForTests(client);
  }

  beforeEach(() => {
    process.env = { ...originalEnv };
    process.env.STORAGE_S3_ENDPOINT = "https://rust.example.com";
    process.env.STORAGE_S3_ACCESS_KEY_ID = "test-key";
    process.env.STORAGE_S3_SECRET_ACCESS_KEY = "test-secret";
    process.env.STORAGE_S3_REGION = "us-east-1";
    process.env.STORAGE_S3_FORCE_PATH_STYLE = "true";
    process.env.STORAGE_IS_PRIVATE = "true";
    process.env.STORAGE_USER_FILES_CONTAINER_NAME = "user-files";
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("generates upload URLs on the same host exposed to clients", async () => {
    const provider = new S3StorageProvider();
    const clientConfig = provider.getClientConfig();

    const upload = await provider.generateUploadUrl({
      containerName: "user-files",
      folderPath: "forms/form-1/submissions/sub-1/files",
      fileName: "avatar.png",
    });

    const uploadUrl = new URL(upload.url);
    expect(uploadUrl.host).toBe(clientConfig.hostName);
    expect(uploadUrl.protocol).toBe(`${clientConfig.protocol}:`);
    expect(uploadUrl.pathname).toBe(
      "/user-files/forms/form-1/submissions/sub-1/files/avatar.png",
    );
    expect(uploadUrl.searchParams.get("X-Amz-Signature")).toBeTruthy();
    expect(upload.key).toBe("forms/form-1/submissions/sub-1/files/avatar.png");
  });

  it("generates read queries that append to the canonical client URL", async () => {
    const provider = new S3StorageProvider();
    const clientConfig = provider.getClientConfig();
    const objectKey = "forms/form-1/submissions/sub-1/files/avatar.png";
    const canonicalUrl = `${clientConfig.protocol}://${clientConfig.hostName}/user-files/${objectKey}`;

    const query = await provider.generateReadTokenQuery(
      "user-files",
      objectKey,
    );
    const resolvedUrl = new URL(appendStorageReadQuery(canonicalUrl, query));

    expect(query.startsWith("?")).toBe(false);
    expect(resolvedUrl.host).toBe(clientConfig.hostName);
    expect(resolvedUrl.pathname).toBe(`/user-files/${objectKey}`);
    expect(resolvedUrl.searchParams.get("X-Amz-Signature")).toBeTruthy();
    expect(resolvedUrl.searchParams.get("X-Amz-SignedHeaders")).toBe("host");
  });

  it("returns an empty list when no objects match the submission prefix", async () => {
    const provider = new S3StorageProvider();
    const send = vi.fn(async (command: S3Command) => {
      expect(command).toBeInstanceOf(ListObjectsV2Command);
      return { Contents: [] };
    });
    useClientSendMock(provider, send);

    const blobs = await provider.listBlobs({
      containerName: "user-files",
      formId: "form-1",
      submissionId: "sub-1",
    });

    expect(blobs).toEqual([]);
    expect(send).toHaveBeenCalledTimes(1);
  });

  it("lists objects with head metadata and filters non-file objects", async () => {
    const provider = new S3StorageProvider();
    const send = vi.fn(async (command: S3Command) => {
      if (command instanceof ListObjectsV2Command) {
        expect(command.input).toMatchObject({
          Bucket: "user-files",
          Prefix: "s/form-1/sub-1",
        });
        return {
          Contents: [
            { Key: "s/form-1/sub-1/avatar.png" },
            { Key: "s/form-1/sub-1/empty.txt" },
            { Key: undefined },
          ],
        };
      }

      if (command instanceof HeadObjectCommand) {
        if (command.input.Key?.endsWith("empty.txt")) {
          return { ContentLength: 0, Metadata: undefined };
        }
        return {
          ContentLength: 123,
          ContentType: "image/png",
          Metadata: { filename: "avatar.png", questionname: "avatar" },
        };
      }

      throw new Error("Unexpected command");
    });
    useClientSendMock(provider, send);

    const blobs = await provider.listBlobs({
      containerName: "user-files",
      formId: "form-1",
      submissionId: "sub-1",
    });

    expect(blobs).toEqual([
      {
        name: "s/form-1/sub-1/avatar.png",
        properties: { contentLength: 123, contentType: "image/png" },
        metadata: { filename: "avatar.png", questionname: "avatar" },
      },
    ]);
    expect(send).toHaveBeenCalledTimes(3);
  });

  it("bounds list head requests to sixteen concurrent calls", async () => {
    const provider = new S3StorageProvider();
    let activeHeads = 0;
    let maxActiveHeads = 0;
    const keys = Array.from(
      { length: 24 },
      (_, i) => `s/form-1/sub-1/file-${i}.txt`,
    );
    const send = vi.fn(async (command: S3Command) => {
      if (command instanceof ListObjectsV2Command) {
        return { Contents: keys.map((Key) => ({ Key })) };
      }

      if (command instanceof HeadObjectCommand) {
        activeHeads += 1;
        maxActiveHeads = Math.max(maxActiveHeads, activeHeads);
        await new Promise((resolve) => setTimeout(resolve, 1));
        activeHeads -= 1;
        return { ContentLength: 1, ContentType: "text/plain" };
      }

      throw new Error("Unexpected command");
    });
    useClientSendMock(provider, send);

    const blobs = await provider.listBlobs({
      containerName: "user-files",
      formId: "form-1",
      submissionId: "sub-1",
    });

    expect(blobs).toHaveLength(24);
    expect(maxActiveHeads).toBeLessThanOrEqual(16);
  });

  it("gets blob properties and returns null when head fails", async () => {
    const provider = new S3StorageProvider();
    const send = vi.fn(async (command: S3Command) => {
      expect(command).toBeInstanceOf(HeadObjectCommand);
      const input = (command as HeadObjectCommand).input;
      if (input.Key === "missing.txt") {
        throw new Error("not found");
      }
      return {
        ContentLength: 42,
        ContentType: "text/plain",
        Metadata: { filename: "readme.txt" },
      };
    });
    useClientSendMock(provider, send);

    await expect(
      provider.getBlobProperties("user-files", "readme.txt"),
    ).resolves.toEqual({
      sizeInBytes: 42,
      contentType: "text/plain",
      metadata: { filename: "readme.txt" },
    });
    await expect(
      provider.getBlobProperties("user-files", "missing.txt"),
    ).resolves.toBeNull();
  });

  it("deletes by container and generated object key", async () => {
    const provider = new S3StorageProvider();
    const send = vi.fn(async (command: S3Command) => {
      expect(command).toBeInstanceOf(DeleteObjectCommand);
      expect(command.input).toMatchObject({
        Bucket: "user-files",
        Key: "forms/form-1/submissions/sub-1/files/avatar.png",
      });
      return {};
    });
    useClientSendMock(provider, send);

    await provider.deleteBlob({
      containerName: "user-files",
      folderPath: "forms/form-1/submissions/sub-1/files",
      fileName: "avatar.png",
    });

    expect(send).toHaveBeenCalledTimes(1);
  });

  it("reports public mode in client config and rejects bulk read tokens", async () => {
    process.env.STORAGE_IS_PRIVATE = "false";
    const provider = new S3StorageProvider();

    expect(provider.isPrivate()).toBe(false);
    expect(provider.getClientConfig().isPrivate).toBe(false);

    const result = await provider.bulkGenerateReadTokens({
      containerName: "user-files",
      resourceType: "file",
      resourceNames: ["avatar.png"],
    });

    expect(Result.isError(result)).toBe(true);
    if (Result.isError(result)) {
      expect(result.message).toContain("not private");
    } else {
      expect.fail("Expected bulkGenerateReadTokens to fail for public storage");
    }
  });
});
