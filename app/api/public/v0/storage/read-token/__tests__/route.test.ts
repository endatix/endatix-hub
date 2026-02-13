import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock dependencies before importing the route
vi.mock("@/auth", () => ({
  auth: vi.fn().mockResolvedValue({ user: { id: "user-123" }, error: null }),
}));

const mockStorageConfig = {
  isEnabled: true,
  isPrivate: true,
  hostName: "test.blob.core.windows.net",
  containerNames: {
    USER_FILES: "user-files",
    CONTENT: "content",
  },
};

vi.mock("@/features/asset-storage/infrastructure/storage-config", () => ({
  getStorageConfig: vi.fn(() => mockStorageConfig),
}));

vi.mock("@/features/asset-storage/infrastructure/storage-service", () => ({
  bulkGenerateReadTokens: vi.fn(),
}));

vi.mock("@/features/asset-storage", () => ({
  resolveContainerFromUrl: vi.fn(),
}));

vi.mock("@/lib/utils/route-handlers", () => ({
  apiResponses: {
    badRequest: (body: any) =>
      new Response(JSON.stringify(body), { status: 400 }),
    internalServerError: (body: any) =>
      new Response(JSON.stringify(body), { status: 500 }),
  },
}));

// Import after mocking
import { POST } from "../route";
import { bulkGenerateReadTokens } from "@/features/asset-storage/infrastructure/storage-service";
import { resolveContainerFromUrl } from "@/features/asset-storage/utils";
import { getStorageConfig } from "@/features/asset-storage/server";

describe("POST /api/public/v0/storage/read-token", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset mock implementations for each test
    vi.mocked(resolveContainerFromUrl).mockReset();
    vi.mocked(bulkGenerateReadTokens).mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const createRequest = (body: object) => {
    return new Request("http://localhost/api/public/v0/storage/read-token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  };

  it("should return 401 if user is not authenticated and storage is private", async () => {
    // Arrange
    const { auth } = await import("@/auth");
    vi.mocked(auth).mockResolvedValue(null as any);
    const request = createRequest({
      url: "https://test.blob.core.windows.net/user-files/s/form-123/submission-123/test.pdf",
    });

    // Act
    const response = await POST(request);

    // Assert
    expect(response.status).toBe(401);

    const data = await response.json();
    expect(data.detail).toBe(
      "You must be authenticated to access this resource",
    );
  });

  it("should return early with empty token and expiresOn if storage is not private", async () => {
    // Arrange
    vi.mocked(getStorageConfig).mockReturnValue({
      isEnabled: true,
      isPrivate: false,
      hostName: "test.blob.core.windows.net",
      containerNames: {
        USER_FILES: "user-files",
        CONTENT: "content",
      },
      imageConfig: {
        isResizeEnabled: false,
        defaultResizeWidth: 1000,
      },
      accountName: "test",
      accountKey: "test",
      protocol: "https",
      sasReadExpiryMinutes: 15,
    });

    // Act
    const request = createRequest({
      url: "https://test.blob.core.windows.net/user-files/s/form-123/submission-123/test.pdf",
    });
    const response = await POST(request);

    // Assert
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.token).toBe("");
    expect(data.expiresOn).toBe("");
  });

  it("should return 400 if body is not valid JSON", async () => {
    const request = new Request(
      "http://localhost/api/public/v0/storage/read-token",
      {
        method: "POST",
        body: "invalid json",
      },
    );

    const response = await POST(request);
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.detail).toContain("Invalid JSON");
  });

  it("should return 400 if url is not provided", async () => {
    const request = createRequest({});

    const response = await POST(request);
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.detail).toBe("URL is required");
  });

  it("should return 400 if URL does not match a known container", async () => {
    vi.mocked(resolveContainerFromUrl).mockReturnValue(null);

    const request = createRequest({
      url: "https://unknown.blob.core.windows.net/container/file.txt",
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.detail).toBe("URL does not match a known storage container");
  });

  it("should return 400 if URL does not contain a blob path", async () => {
    vi.mocked(resolveContainerFromUrl).mockReturnValue({
      containerType: "USER_FILES",
      containerName: "user-files",
      hostName: "test.blob.core.windows.net",
      isPrivate: true,
      blobName: "",
    });

    const request = createRequest({
      url: "https://test.blob.core.windows.net/user-files",
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.detail).toBe("URL does not contain a blob path");
  });

  it("should return token on success", async () => {
    vi.mocked(resolveContainerFromUrl).mockReturnValue({
      containerType: "USER_FILES",
      containerName: "user-files",
      hostName: "test.blob.core.windows.net",
      isPrivate: true,
      blobName: "s/form-123/submission-123/test.pdf",
    });

    vi.mocked(bulkGenerateReadTokens).mockResolvedValue({
      kind: 0, // Kind.Success
      value: {
        readTokens: {
          "s/form-123/submission-123/test.pdf":
            "sv=2021-06-08&se=2023-01-01T00:00:00Z&sig=abc",
        },
        expiresOn: new Date("2023-01-01T00:00:00Z"),
        generatedAt: new Date("2022-12-31T00:00:00Z"),
      },
    });

    const request = createRequest({
      url: "https://test.blob.core.windows.net/user-files/s/form-123/submission-123/test.pdf",
    });

    const response = await POST(request);
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.token).toBe("sv=2021-06-08&se=2023-01-01T00:00:00Z&sig=abc");
    expect(data.expiresOn).toBe("2023-01-01T00:00:00.000Z");
  });

  it("should return 500 if token generation fails", async () => {
    vi.mocked(resolveContainerFromUrl).mockReturnValue({
      containerType: "USER_FILES",
      containerName: "user-files",
      hostName: "test.blob.core.windows.net",
      isPrivate: true,
      blobName: "s/form-123/submission-123/test.pdf",
    });

    vi.mocked(bulkGenerateReadTokens).mockResolvedValue({
      kind: 1, // Kind.Error
      errorType: 1, // ErrorType.Error
      message: "Token generation failed",
    });

    const request = createRequest({
      url: "https://test.blob.core.windows.net/user-files/s/form-123/submission-123/test.pdf",
    });

    const response = await POST(request);
    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data.detail).toContain("Failed to generate read token");
  });
});
