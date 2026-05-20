import { beforeEach, describe, expect, it } from "vitest";
import { MisconfigurationError } from "@/lib/hosting/storage-configuration-errors";
import { getS3StorageConfig } from "../../infrastructure/providers/s3/s3-config";

describe("getS3StorageConfig", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.S3_ENDPOINT;
    delete process.env.S3_ACCESS_KEY_ID;
    delete process.env.S3_SECRET_ACCESS_KEY;
  });

  it("returns empty clientHostName when storage is disabled", () => {
    const config = getS3StorageConfig();

    expect(config.isEnabled).toBe(false);
    expect(config.clientHostName).toBe("");
    expect(config.protocol).toBe("https");
  });

  it("resolves clientHostName from S3_ENDPOINT when enabled", () => {
    process.env.S3_ENDPOINT = "http://rustfs.local:9000";
    process.env.S3_ACCESS_KEY_ID = "key";
    process.env.S3_SECRET_ACCESS_KEY = "secret";

    const config = getS3StorageConfig();

    expect(config.isEnabled).toBe(true);
    expect(config.clientHostName).toBe("rustfs.local:9000");
    expect(config.protocol).toBe("http");
  });

  it("throws when enabled but endpoint URL is invalid", () => {
    process.env.S3_ENDPOINT = "https://invalid url";
    process.env.S3_ACCESS_KEY_ID = "key";
    process.env.S3_SECRET_ACCESS_KEY = "secret";

    expect(() => getS3StorageConfig()).toThrow(MisconfigurationError);
  });

  it("throws when endpoint includes a path", () => {
    process.env.S3_ENDPOINT = "https://rustfs.local:9000/bucket";
    process.env.S3_ACCESS_KEY_ID = "key";
    process.env.S3_SECRET_ACCESS_KEY = "secret";

    expect(() => getS3StorageConfig()).toThrow(MisconfigurationError);
  });
});
