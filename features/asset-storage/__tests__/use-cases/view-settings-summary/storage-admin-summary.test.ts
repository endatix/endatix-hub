import { describe, it, expect, vi, beforeEach } from "vitest";
import { getStorageAdminSummary } from "../../../use-cases/view-settings-summary/storage-admin-summary";
import * as storageRuntime from "../../../storage-runtime";
import * as resolveSettings from "@/features/config/resolve-endatix-settings";

vi.mock("../storage-runtime", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("../../../storage-runtime")>();
  return {
    ...actual,
    getStorageRuntimeSettings: vi.fn(),
    getClientStorageConfig: vi.fn(),
  };
});

vi.mock("@/features/config/resolve-endatix-settings", () => ({
  getRuntimeStorageProfile: vi.fn(),
}));

vi.mock("@endatix/storage-azure", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@endatix/storage-azure")>();
  return {
    ...actual,
    getAzureStorageConfig: vi.fn(),
  };
});

vi.mock("../infrastructure/providers/s3/s3-config", () => ({
  getS3StorageConfig: vi.fn(),
}));

describe("getStorageAdminSummary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(resolveSettings.getRuntimeStorageProfile).mockReturnValue({
      explicitProvider: "azure",
      azureCredentialsPresent: true,
      s3CredentialsPresent: false,
      imageRemoteHostnames: [],
    });
    vi.mocked(storageRuntime.getClientStorageConfig).mockReturnValue({
      isEnabled: true,
      isPrivate: false,
      hostName: "acct.blob.core.windows.net",
      protocol: "https",
      containerNames: { USER_FILES: "user-files", CONTENT: "content" },
      imageConfig: { isResizeEnabled: false, defaultResizeWidth: 800 },
    });
  });

  it("returns Azure details when azure is active", async () => {
    const { getAzureStorageConfig } = await import("@endatix/storage-azure");

    vi.mocked(storageRuntime.getStorageRuntimeSettings).mockReturnValue({
      providerId: "azure",
      isEnabled: true,
      isPrivate: false,
    });

    vi.mocked(getAzureStorageConfig).mockReturnValue({
      isEnabled: true,
      isPrivate: false,
      accountName: "acct",
      accountKey: "secret",
      hostName: "acct.blob.core.windows.net",
      protocol: "https",
      sasReadExpiryMinutes: 15,
      sasWriteExpirySeconds: 600,
      containerNames: { USER_FILES: "user-files", CONTENT: "content" },
      imageConfig: { isResizeEnabled: false, defaultResizeWidth: 800 },
    });

    const summary = getStorageAdminSummary();

    expect(summary.activeProviderId).toBe("azure");
    expect(summary.activeProviderLabel).toContain("Azure");
    expect(summary.azure?.accountName).toBe("acct");
    expect(summary.s3).toBeNull();
  });

  it("returns S3 details when s3 is active", async () => {
    const { getS3StorageConfig } =
      await import("../../../infrastructure/providers/s3/s3-config");

    vi.mocked(storageRuntime.getStorageRuntimeSettings).mockReturnValue({
      providerId: "s3",
      isEnabled: true,
      isPrivate: true,
    });

    vi.mocked(getS3StorageConfig).mockReturnValue({
      isEnabled: true,
      isPrivate: true,
      endpoint: "http://localhost:9000",
      region: "us-east-1",
      accessKeyId: "key",
      secretAccessKey: "secret",
      forcePathStyle: true,
      publicBaseUrl: undefined,
      sasReadExpiryMinutes: 20,
      sasWriteExpirySeconds: 300,
      containerNames: { USER_FILES: "user-files", CONTENT: "content" },
      imageConfig: { isResizeEnabled: false, defaultResizeWidth: 800 },
      clientHostName: "localhost:9000",
      protocol: "http",
    });

    const summary = getStorageAdminSummary();

    expect(summary.activeProviderId).toBe("s3");
    expect(summary.s3?.endpoint).toBe("http://localhost:9000");
    expect(summary.azure).toBeNull();
    expect(summary.isPrivate).toBe(true);
  });
});
