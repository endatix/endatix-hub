import { describe, expect, it } from "vitest";
import { resolveStoragePublicHost } from "../resolve-storage-public-host";
import {
  MisconfigurationError,
  MissingConfigurationError,
} from "../storage-configuration-errors";

const S3_KEYS = ["S3_ENDPOINT"] as const;

describe("resolveStoragePublicHost", () => {
  it("returns empty host when not required and no source", () => {
    const result = resolveStoragePublicHost({
      provider: "s3",
      requireWhenEnabled: false,
      missingEnvKeys: S3_KEYS,
      misconfiguredEnvKeys: S3_KEYS,
    });
    expect(result).toEqual({ host: "", protocol: "https" });
  });

  it("throws MissingConfigurationError when required and no source", () => {
    expect(() =>
      resolveStoragePublicHost({
        provider: "s3",
        requireWhenEnabled: true,
        missingEnvKeys: S3_KEYS,
        misconfiguredEnvKeys: S3_KEYS,
      }),
    ).toThrow(MissingConfigurationError);
  });

  it("resolves configured endpoint", () => {
    const result = resolveStoragePublicHost({
      provider: "s3",
      url: "https://rust.example.com",
      requireWhenEnabled: true,
      missingEnvKeys: S3_KEYS,
      misconfiguredEnvKeys: S3_KEYS,
    });
    expect(result.host).toBe("rust.example.com");
    expect(result.protocol).toBe("https");
  });

  it("includes port in host for RustFS endpoints", () => {
    const result = resolveStoragePublicHost({
      provider: "s3",
      url: "http://rustfs.local:9000",
      requireWhenEnabled: true,
      missingEnvKeys: S3_KEYS,
      misconfiguredEnvKeys: S3_KEYS,
    });
    expect(result.host).toBe("rustfs.local:9000");
    expect(result.protocol).toBe("http");
  });

  it("throws MisconfigurationError for invalid URL", () => {
    expect(() =>
      resolveStoragePublicHost({
        provider: "s3",
        url: "https://invalid url",
        requireWhenEnabled: true,
        missingEnvKeys: S3_KEYS,
        misconfiguredEnvKeys: S3_KEYS,
      }),
    ).toThrow(MisconfigurationError);
  });

  it("normalizes bare hostname with https", () => {
    const result = resolveStoragePublicHost({
      provider: "azure",
      url: "myaccount.blob.core.windows.net",
      requireWhenEnabled: true,
      missingEnvKeys: ["AZURE_STORAGE_CUSTOM_DOMAIN"],
      misconfiguredEnvKeys: ["AZURE_STORAGE_CUSTOM_DOMAIN"],
    });
    expect(result.host).toBe("myaccount.blob.core.windows.net");
    expect(result.protocol).toBe("https");
  });

  it("rejects paths when origin-only mode is required", () => {
    expect(() =>
      resolveStoragePublicHost({
        provider: "s3",
        url: "https://rust.example.com/bucket",
        requireWhenEnabled: true,
        missingEnvKeys: S3_KEYS,
        misconfiguredEnvKeys: S3_KEYS,
        requireOriginOnly: true,
      }),
    ).toThrow(MisconfigurationError);
  });
});
