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

const sampleUrl =
  "https://test.blob.core.windows.net/user-files/s/form-123/submission-123/test.pdf";

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
    mockAuth.mockResolvedValue(null);

    const response = await POST(createRequest({ urls: [sampleUrl] }));

    expect(response.status).toBe(401);

    const data = await response.json();
    expect(data.detail).toBe(
      "You must be authenticated to access this resource",
    );
  });

  it("returns resolved urls unchanged when storage is not private", async () => {
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

    const response = await POST(createRequest({ urls: [sampleUrl] }));

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.resolved[sampleUrl]).toEqual({ url: sampleUrl });
    expect(mockResolveContainerFromUrl).not.toHaveBeenCalled();
    expect(mockBulkGenerateReadTokens).not.toHaveBeenCalled();
  });

  it("returns resolved urls when not private even if azure is null (non-Azure provider)", async () => {
    mockGetStorageRuntimeSettings.mockReturnValue({
      providerId: "s3",
      isEnabled: true,
      isPrivate: false,
      storage: {
        explicitProvider: "s3",
        azureCredentialsPresent: false,
        imageRemoteHostnames: [],
      },
      azure: null,
    });

    const rustUrl =
      "https://rustfs.example/bucket/s/form-1/submission-1/file.pdf";
    const response = await POST(createRequest({ urls: [rustUrl] }));

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.resolved[rustUrl]).toEqual({ url: rustUrl });
    expect(mockResolveContainerFromUrl).not.toHaveBeenCalled();
    expect(mockBulkGenerateReadTokens).not.toHaveBeenCalled();
  });

  it("returns 400 when private storage has no Azure layout (azure null)", async () => {
    mockGetStorageRuntimeSettings.mockReturnValue({
      providerId: "s3",
      isEnabled: true,
      isPrivate: true,
      storage: {
        explicitProvider: "s3",
        azureCredentialsPresent: false,
        imageRemoteHostnames: [],
      },
      azure: null,
    });

    const rustUrl =
      "https://rustfs.example/bucket/s/form-1/submission-1/file.pdf";
    const response = await POST(createRequest({ urls: [rustUrl] }));

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.detail).toBe(
      "Read-token route requires Azure storage configuration",
    );
    expect(mockResolveContainerFromUrl).not.toHaveBeenCalled();
    expect(mockBulkGenerateReadTokens).not.toHaveBeenCalled();
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

  it("should return 400 if urls is missing", async () => {
    const response = await POST(createRequest({}));

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.detail).toBe("urls is required");
  });

  it("should return 400 if urls is not an array of strings", async () => {
    const response = await POST(
      createRequest({ urls: ["a", 1] } as { urls: string[] }),
    );

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.detail).toBe("urls must be an array of strings");
  });

  it("should return 400 if urls is not an array", async () => {
    const response = await POST(createRequest({ urls: "not-an-array" }));

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.detail).toBe("urls must be an array of strings");
  });

  it("returns resolved error when URL does not match a known container", async () => {
    mockResolveContainerFromUrl.mockReturnValue(null);

    const badUrl = "https://unknown.blob.core.windows.net/container/file.txt";
    const response = await POST(createRequest({ urls: [badUrl] }));

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.resolved[badUrl]).toEqual({
      error: "URL does not match a known storage container",
    });
  });

  it("returns resolved error when URL does not contain a blob path", async () => {
    mockResolveContainerFromUrl.mockReturnValue({
      containerType: "USER_FILES",
      containerName: "user-files",
      hostName: "test.blob.core.windows.net",
      isPrivate: true,
      blobName: "",
    });

    const bareListUrl = "https://test.blob.core.windows.net/user-files";
    const response = await POST(createRequest({ urls: [bareListUrl] }));

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.resolved[bareListUrl]).toEqual({
      error: "URL does not contain a blob path",
    });
  });

  it("returns resolved url with SAS on success", async () => {
    mockResolveContainerFromUrl.mockReturnValue({
      containerType: "USER_FILES",
      containerName: "user-files",
      hostName: "test.blob.core.windows.net",
      isPrivate: true,
      blobName: "s/form-123/submission-123/test.pdf",
    });

    mockBulkGenerateReadTokens.mockResolvedValue({
      kind: 0,
      value: {
        readTokens: {
          "s/form-123/submission-123/test.pdf":
            "sv=2021-06-08&se=2023-01-01T00:00:00Z&sig=abc",
        },
        expiresOn: new Date("2023-01-01T00:00:00Z"),
        generatedAt: new Date("2022-12-31T00:00:00Z"),
      },
    });

    const response = await POST(createRequest({ urls: [sampleUrl] }));

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.resolved[sampleUrl]).toEqual({
      url: `${sampleUrl}?sv=2021-06-08&se=2023-01-01T00:00:00Z&sig=abc`,
    });
  });

  it("returns resolved error when token generation fails", async () => {
    mockResolveContainerFromUrl.mockReturnValue({
      containerType: "USER_FILES",
      containerName: "user-files",
      hostName: "test.blob.core.windows.net",
      isPrivate: true,
      blobName: "s/form-123/submission-123/test.pdf",
    });

    mockBulkGenerateReadTokens.mockResolvedValue({
      kind: 1,
      errorType: 1,
      message: "Token generation failed",
    });

    const response = await POST(createRequest({ urls: [sampleUrl] }));

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.resolved[sampleUrl]).toEqual({
      error: "Failed to generate read token: Token generation failed",
    });
  });

  it("returns empty resolved for empty urls array", async () => {
    const response = await POST(createRequest({ urls: [] }));

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.resolved).toEqual({});
  });
});
