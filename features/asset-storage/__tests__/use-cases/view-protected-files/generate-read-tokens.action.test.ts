import { describe, it, expect, vi, beforeEach } from "vitest";
import { generateReadTokensAction } from "@/features/asset-storage/use-cases/view-protected-files/generate-read-tokens.action";
import * as storageService from "@/features/asset-storage/infrastructure/storage-service";
import * as storageConfig from "@/features/asset-storage/infrastructure/storage-config";
import { auth } from "@/auth";
import { Result } from "@/lib/result";

// Mock dependencies
vi.mock("@/features/asset-storage/infrastructure/storage-service", () => ({
  generateReadTokens: vi.fn(),
}));

vi.mock("@/features/asset-storage/infrastructure/storage-config", () => ({
  getStorageConfig: vi.fn(),
}));

vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

describe("generateReadTokensAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return error if Azure storage is not enabled", async () => {
    vi.mocked(storageConfig.getStorageConfig).mockReturnValue({
      isEnabled: false,
    } as any);

    const result = await generateReadTokensAction("test-container");

    expect(Result.isError(result)).toBe(true);
    expect(result.message).toBe("Azure storage is not enabled");
  });

  it("should return empty token if storage is not private", async () => {
    vi.mocked(storageConfig.getStorageConfig).mockReturnValue({
      isEnabled: true,
      isPrivate: false,
    } as any);

    const result = await generateReadTokensAction("test-container");

    expect(Result.isSuccess(result)).toBe(true);
    if (Result.isSuccess(result)) {
      expect(result.value.token).toBeNull();
      expect(result.value.containerName).toBe("test-container");
    }
  });

  it("should return empty token if user is not authenticated", async () => {
    vi.mocked(storageConfig.getStorageConfig).mockReturnValue({
      isEnabled: true,
      isPrivate: true,
    } as any);
    vi.mocked(auth).mockResolvedValue(null);

    const result = await generateReadTokensAction("test-container");

    expect(Result.isSuccess(result)).toBe(true);
    if (Result.isSuccess(result)) {
      expect(result.value.token).toBeNull();
    }
  });

  it("should return empty token if session has error", async () => {
    vi.mocked(storageConfig.getStorageConfig).mockReturnValue({
      isEnabled: true,
      isPrivate: true,
    } as any);
    vi.mocked(auth).mockResolvedValue({ error: "some error" } as any);

    const result = await generateReadTokensAction("test-container");

    expect(Result.isSuccess(result)).toBe(true);
    if (Result.isSuccess(result)) {
      expect(result.value.token).toBeNull();
    }
  });

  it("should return validation error if container name is missing", async () => {
    vi.mocked(storageConfig.getStorageConfig).mockReturnValue({
      isEnabled: true,
      isPrivate: true,
    } as any);
    vi.mocked(auth).mockResolvedValue({ user: { id: "1" } } as any);

    const result = await generateReadTokensAction("");

    expect(Result.isError(result)).toBe(true);
    expect(result.message).toBe("Container name is required");
  });

  it("should call generateReadTokens and return the token on success", async () => {
    vi.mocked(storageConfig.getStorageConfig).mockReturnValue({
      isEnabled: true,
      isPrivate: true,
    } as any);
    vi.mocked(auth).mockResolvedValue({ user: { id: "1" } } as any);

    const mockExpiry = new Date();
    const mockGenerated = new Date();
    vi.mocked(storageService.generateReadTokens).mockResolvedValue(
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

    expect(storageService.generateReadTokens).toHaveBeenCalledWith({
      containerName: "test-container",
      resourceType: "container",
      resourceNames: ["test-container"],
    });
  });

  it("should return error if generateReadTokens fails", async () => {
    vi.mocked(storageConfig.getStorageConfig).mockReturnValue({
      isEnabled: true,
      isPrivate: true,
    } as any);
    vi.mocked(auth).mockResolvedValue({ user: { id: "1" } } as any);

    vi.mocked(storageService.generateReadTokens).mockResolvedValue(
      Result.error("Generation failed") as any,
    );

    const result = await generateReadTokensAction("test-container");

    expect(Result.isError(result)).toBe(true);
    expect(result.message).toBe("Generation failed");
  });
});
