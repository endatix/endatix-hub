import { describe, it, expect, vi, beforeEach } from "vitest";

// Use vi.hoisted to define mocks before they're used
const {
  mockGetStorageRuntimeSettings,
  mockBulkGenerateReadTokens,
  mockResolveContainerFromUrl,
  mockAuth,
} = vi.hoisted(() => ({
  mockGetStorageRuntimeSettings: vi.fn(),
  mockBulkGenerateReadTokens: vi.fn(),
  mockResolveContainerFromUrl: vi.fn(),
  mockAuth: vi.fn(),
}));

// Mock dependencies before importing the route
vi.mock("@/auth", () => ({
  auth: mockAuth,
}));

vi.mock("@/features/asset-storage/storage-runtime", () => ({
  getStorageRuntimeSettings: mockGetStorageRuntimeSettings,
}));

vi.mock("@/features/asset-storage/infrastructure/storage-gateway", () => ({
  bulkGenerateReadTokens: mockBulkGenerateReadTokens,
}));

vi.mock("@/features/asset-storage/utils", () => ({
  resolveContainerFromUrl: mockResolveContainerFromUrl,
}));

vi.mock("@/lib/utils/route-handlers", () => ({
  apiResponses: {
    badRequest: (body: any) =>
      new Response(JSON.stringify(body), { status: 400 }),
    unauthorized: (body: any) =>
      new Response(JSON.stringify(body), { status: 401 }),
    serverError: (body: any) =>
      new Response(JSON.stringify(body), { status: 500 }),
  },
}));

// Import after mocking
import { POST } from "../route";

describe("POST /api/public/v0/storage/read-token", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock implementations
    mockGetStorageRuntimeSettings.mockReturnValue({
      providerId: "azure",
      isEnabled: true,
      isPrivate: true,
      storage: {
        explicitProvider: null,
        azureCredentialsPresent: true,
        imageRemoteHostnames: [],
      },
      azure: {
        isEnabled: true,
        isPrivate: true,
        hostName: "test.blob.core.windows.net",
        containerNames: {
          USER_FILES: "user-files",
          CONTENT: "content",
        },
      },
    });
    mockAuth.mockResolvedValue({ user: { id: "user-123" }, error: null });
    mockResolveContainerFromUrl.mockReturnValue(null);
    mockBulkGenerateReadTokens.mockResolvedValue({
      kind: 0,
      value: {
        readTokens: {},
        expiresOn: new Date(),
        generatedAt: new Date(),
      },
    });
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
    mockAuth.mockResolvedValue(null);

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
    mockGetStorageRuntimeSettings.mockReturnValue({
      providerId: "azure",
      isEnabled: true,
      isPrivate: false,
      storage: {
        explicitProvider: null,
        azureCredentialsPresent: true,
        imageRemoteHostnames: [],
      },
      azure: {
        isEnabled: true,
        isPrivate: false,
        hostName: "test.blob.core.windows.net",
        containerNames: {
          USER_FILES: "user-files",
          CONTENT: "content",
        },
      },
    });

    const request = createRequest({
      url: "https://test.blob.core.windows.net/user-files/s/form-123/submission-123/test.pdf",
    });

    // Act
    const response = await POST(request);

    // Assert
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.token).toBe("");
    expect(data.expiresOn).toBe("");
  });

  it("should return 400 if body is not valid JSON", async () => {
    // Arrange
    const request = new Request(
      "http://localhost/api/public/v0/storage/read-token",
      {
        method: "POST",
        body: "invalid json",
      },
    );

    // Act
    const response = await POST(request);

    // Assert
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.detail).toContain("Invalid JSON");
  });

  it("should return 400 if url is not provided", async () => {
    // Arrange
    const request = createRequest({});

    // Act
    const response = await POST(request);

    // Assert
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.detail).toBe("URL is required");
  });

  it("should return 400 if URL does not match a known container", async () => {
    // Arrange
    mockResolveContainerFromUrl.mockReturnValue(null);

    const request = createRequest({
      url: "https://unknown.blob.core.windows.net/container/file.txt",
    });

    // Act
    const response = await POST(request);

    // Assert
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.detail).toBe("URL does not match a known storage container");
  });

  it("should return 400 if URL does not contain a blob path", async () => {
    // Arrange
    mockResolveContainerFromUrl.mockReturnValue({
      containerType: "USER_FILES",
      containerName: "user-files",
      hostName: "test.blob.core.windows.net",
      isPrivate: true,
      blobName: "",
    });

    const request = createRequest({
      url: "https://test.blob.core.windows.net/user-files",
    });

    // Act
    const response = await POST(request);

    // Assert
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.detail).toBe("URL does not contain a blob path");
  });

  it("should return token on success", async () => {
    // Arrange
    mockResolveContainerFromUrl.mockReturnValue({
      containerType: "USER_FILES",
      containerName: "user-files",
      hostName: "test.blob.core.windows.net",
      isPrivate: true,
      blobName: "s/form-123/submission-123/test.pdf",
    });

    mockBulkGenerateReadTokens.mockResolvedValue({
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

    // Act
    const response = await POST(request);

    // Assert
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.token).toBe("sv=2021-06-08&se=2023-01-01T00:00:00Z&sig=abc");
    expect(data.expiresOn).toBe("2023-01-01T00:00:00.000Z");
  });

  it("should return 500 if token generation fails", async () => {
    // Arrange
    mockResolveContainerFromUrl.mockReturnValue({
      containerType: "USER_FILES",
      containerName: "user-files",
      hostName: "test.blob.core.windows.net",
      isPrivate: true,
      blobName: "s/form-123/submission-123/test.pdf",
    });

    mockBulkGenerateReadTokens.mockResolvedValue({
      kind: 1, // Kind.Error
      errorType: 1, // ErrorType.Error
      message: "Token generation failed",
    });

    const request = createRequest({
      url: "https://test.blob.core.windows.net/user-files/s/form-123/submission-123/test.pdf",
    });

    // Act
    const response = await POST(request);

    // Assert
    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data.detail).toContain("Failed to generate read token");
  });
});
