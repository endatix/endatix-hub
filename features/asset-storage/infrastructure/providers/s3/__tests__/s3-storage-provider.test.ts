import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { appendStorageReadQuery } from "../../../append-storage-read-query";
import { S3StorageProvider } from "../s3-storage-provider";

describe("S3StorageProvider", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
    process.env.S3_ENDPOINT = "https://rust.example.com";
    process.env.S3_ACCESS_KEY_ID = "test-key";
    process.env.S3_SECRET_ACCESS_KEY = "test-secret";
    process.env.S3_REGION = "us-east-1";
    process.env.S3_FORCE_PATH_STYLE = "true";
    process.env.S3_IS_PRIVATE = "true";
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

    const query = await provider.generateReadTokenQuery("user-files", objectKey);
    const resolvedUrl = new URL(appendStorageReadQuery(canonicalUrl, query));

    expect(query.startsWith("?")).toBe(false);
    expect(resolvedUrl.host).toBe(clientConfig.hostName);
    expect(resolvedUrl.pathname).toBe(`/user-files/${objectKey}`);
    expect(resolvedUrl.searchParams.get("X-Amz-Signature")).toBeTruthy();
    expect(resolvedUrl.searchParams.get("X-Amz-SignedHeaders")).toBe("host");
  });
});
