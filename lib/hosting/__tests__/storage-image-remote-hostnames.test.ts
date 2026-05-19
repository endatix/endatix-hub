import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { collectStorageImageRemoteHostnamesFromEnv } from "../storage-image-remote-hostnames";

describe("collectStorageImageRemoteHostnamesFromEnv", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.AZURE_STORAGE_ACCOUNT_NAME;
    delete process.env.AZURE_STORAGE_ACCOUNT_KEY;
    delete process.env.AZURE_STORAGE_CUSTOM_DOMAIN;
    delete process.env.S3_PUBLIC_BASE_URL;
    delete process.env.S3_ENDPOINT;
    delete process.env.S3_ACCESS_KEY_ID;
    delete process.env.S3_SECRET_ACCESS_KEY;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("returns [] for explicit none", () => {
    expect([...collectStorageImageRemoteHostnamesFromEnv("none")]).toEqual([]);
  });

  it("returns [] for explicit null choice", () => {
    expect([...collectStorageImageRemoteHostnamesFromEnv(null)]).toEqual([]);
  });

  it("includes Azure public host when explicit azure and credentials are set", () => {
    process.env.AZURE_STORAGE_ACCOUNT_NAME = "myacct";
    process.env.AZURE_STORAGE_ACCOUNT_KEY = "fake-key-for-test";
    process.env.AZURE_STORAGE_CUSTOM_DOMAIN = "myacct.blob.core.windows.net";
    const hosts = collectStorageImageRemoteHostnamesFromEnv("azure");
    expect(hosts).toContain("myacct.blob.core.windows.net");
  });

  it("includes S3 public base host when explicit s3 and credentials are set", () => {
    process.env.S3_ENDPOINT = "http://internal:9000";
    process.env.S3_ACCESS_KEY_ID = "key";
    process.env.S3_SECRET_ACCESS_KEY = "secret";
    process.env.S3_PUBLIC_BASE_URL = "https://cdn.example.com/bucket";
    const hosts = collectStorageImageRemoteHostnamesFromEnv("s3");
    expect(hosts).toEqual(["cdn.example.com"]);
  });

  it("includes S3 endpoint host when credentials are set and public base is unset", () => {
    process.env.S3_ENDPOINT = "https://minio.local:9000";
    process.env.S3_ACCESS_KEY_ID = "key";
    process.env.S3_SECRET_ACCESS_KEY = "secret";
    const hosts = collectStorageImageRemoteHostnamesFromEnv("s3");
    expect(hosts).toEqual(["minio.local:9000"]);
  });
});
