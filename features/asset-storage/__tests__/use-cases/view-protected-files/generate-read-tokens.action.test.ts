import * as storageRuntime from "@/features/asset-storage/storage-runtime";
import * as storageService from "@/features/asset-storage/infrastructure/storage-gateway";
import { generateReadTokensAction } from "@/features/asset-storage/use-cases/view-protected-files/generate-read-tokens.action";
import { Result } from "@/lib/result";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock dependencies
vi.mock("@/features/asset-storage/infrastructure/storage-gateway", () => ({
  bulkGenerateReadTokens: vi.fn(),
}));

vi.mock("@/features/asset-storage/storage-runtime", () => ({
  getStorageRuntimeSettings: vi.fn(),
}));

vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

import { auth } from "@/auth";

const mockRuntimeStorageProfile = {
  explicitProvider: null,
  azureCredentialsPresent: true,
  imageRemoteHostnames: [] as readonly string[],
};

describe("generateReadTokensAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return error if Azure storage is not enabled", async () => {
    vi.mocked(storageRuntime.getStorageRuntimeSettings).mockReturnValue({
      providerId: null,
      isEnabled: false,
      isPrivate: false,
      storage: mockRuntimeStorageProfile,
      azure: null,
    });

    const result = await generateReadTokensAction("test-container");

    expect(Result.isError(result)).toBe(true);
    if (Result.isError(result)) {
      expect(result.message).toBe("Azure storage is not enabled");
    }
  });

  it("should return empty token if storage is not private", async () => {
    vi.mocked(storageRuntime.getStorageRuntimeSettings).mockReturnValue({
      providerId: "azure",
      isEnabled: true,
      isPrivate: false,
      storage: mockRuntimeStorageProfile,
      azure: {} as any,
    });

    const result = await generateReadTokensAction("test-container");

    expect(Result.isSuccess(result)).toBe(true);
    if (Result.isSuccess(result)) {
      expect(result.value.token).toBeNull();
      expect(result.value.containerName).toBe("test-container");
    }
  });

  it("should return empty token if user is not authenticated", async () => {
    vi.mocked(storageRuntime.getStorageRuntimeSettings).mockReturnValue({
      providerId: "azure",
      isEnabled: true,
      isPrivate: true,
      storage: mockRuntimeStorageProfile,
      azure: {} as any,
    });
    vi.mocked(auth).mockResolvedValue(null as never);

    const result = await generateReadTokensAction("test-container");

    expect(Result.isSuccess(result)).toBe(true);
    if (Result.isSuccess(result)) {
      expect(result.value.token).toBeNull();
    }
  });

  it("should return empty token if session has error", async () => {
    vi.mocked(storageRuntime.getStorageRuntimeSettings).mockReturnValue({
      providerId: "azure",
      isEnabled: true,
      isPrivate: true,
      storage: mockRuntimeStorageProfile,
      azure: {} as any,
    });
    vi.mocked(auth).mockResolvedValue({ error: "some error" } as any);

    const result = await generateReadTokensAction("test-container");

    expect(Result.isSuccess(result)).toBe(true);
    if (Result.isSuccess(result)) {
      expect(result.value.token).toBeNull();
    }
  });

  it("should return validation error if container name is missing", async () => {
    vi.mocked(storageRuntime.getStorageRuntimeSettings).mockReturnValue({
      providerId: "azure",
      isEnabled: true,
      isPrivate: true,
      storage: mockRuntimeStorageProfile,
      azure: {} as any,
    });
    vi.mocked(auth).mockResolvedValue({ user: { id: "1" } } as any);

    const result = await generateReadTokensAction("");

    expect(Result.isError(result)).toBe(true);
    if (Result.isError(result)) {
      expect(result.message).toBe("Container name is required");
    }
  });

  it("should call generateReadTokens and return the token on success", async () => {
    vi.mocked(storageRuntime.getStorageRuntimeSettings).mockReturnValue({
      providerId: "azure",
      isEnabled: true,
      isPrivate: true,
      storage: mockRuntimeStorageProfile,
      azure: {} as any,
    });
    vi.mocked(auth).mockResolvedValue({ user: { id: "1" } } as any);

    const mockExpiry = new Date();
    const mockGenerated = new Date();
    vi.mocked(storageService.bulkGenerateReadTokens).mockResolvedValue(
      Result.success({
        readTokens: {
          container: "mock-token",
        },
        expiresOn: mockExpiry,
        generatedAt: mockGenerated,
      }) as any,
    );

    const result = await generateReadTokensAction("test-container");

    expect(Result.isSuccess(result)).toBe(true);
    if (Result.isSuccess(result)) {
      expect(result.value.token).toBe("mock-token");
      expect(result.value.containerName).toBe("test-container");
      expect(result.value.expiresOn).toBe(mockExpiry);
    }

    expect(storageService.bulkGenerateReadTokens).toHaveBeenCalledWith({
      containerName: "test-container",
      resourceType: "container",
      resourceNames: ["test-container"],
    });
  });

  it("should return error if generateReadTokens fails", async () => {
    vi.mocked(storageRuntime.getStorageRuntimeSettings).mockReturnValue({
      providerId: "azure",
      isEnabled: true,
      isPrivate: true,
      storage: mockRuntimeStorageProfile,
      azure: {} as any,
    });
    vi.mocked(auth).mockResolvedValue({ user: { id: "1" } } as any);

    vi.mocked(storageService.bulkGenerateReadTokens).mockResolvedValue(
      Result.error("Generation failed") as any,
    );

    const result = await generateReadTokensAction("test-container");

    expect(Result.isError(result)).toBe(true);
    if (Result.isError(result)) {
      expect(result.message).toBe("Generation failed");
    }
  });
});
