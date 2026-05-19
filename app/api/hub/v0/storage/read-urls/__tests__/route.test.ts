import { describe, it, expect, vi, beforeEach } from "vitest";
import { AuthorizationResult } from "@/features/auth/authorization/domain/authorization-result";
import { Permissions } from "@/features/auth/authorization/domain/permissions";
import { Result } from "@/lib/result";

const {
  mockAuth,
  mockCheckAllPermissions,
  mockGetClientStorageConfig,
  mockParseHubReadUrlsBody,
  mockResolveHubReadUrls,
} = vi.hoisted(() => ({
  mockAuth: vi.fn(),
  mockCheckAllPermissions: vi.fn(),
  mockGetClientStorageConfig: vi.fn(),
  mockParseHubReadUrlsBody: vi.fn(),
  mockResolveHubReadUrls: vi.fn(),
}));

vi.mock("@/auth", () => ({
  auth: mockAuth,
}));

vi.mock("@/features/auth/authorization", () => ({
  authorization: vi.fn().mockResolvedValue({
    checkAllPermissions: mockCheckAllPermissions,
  }),
}));

vi.mock("@/features/asset-storage/storage-runtime", () => ({
  getClientStorageConfig: mockGetClientStorageConfig,
}));

vi.mock("@/features/form-access", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/features/form-access")>();
  return {
    ...actual,
    parseHubReadUrlsBody: mockParseHubReadUrlsBody,
  };
});

vi.mock(
  "@/features/asset-storage/use-cases/resolve-read-urls/resolve-read-urls",
  () => ({
    resolveHubReadUrls: mockResolveHubReadUrls,
  }),
);

vi.mock("@/lib/utils/route-handlers", () => ({
  apiResponses: {
    badRequest: (body: { detail: string }) =>
      new Response(JSON.stringify(body), { status: 400 }),
    forbidden: (body: { detail: string }) =>
      new Response(JSON.stringify(body), { status: 403 }),
  },
}));

import { POST } from "../route";

describe("POST /api/hub/v0/storage/read-urls", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });
    mockCheckAllPermissions.mockResolvedValue(AuthorizationResult.success());
    mockGetClientStorageConfig.mockReturnValue({
      isEnabled: true,
      isPrivate: true,
      hostName: "test.blob.core.windows.net",
      containerNames: { USER_FILES: "user-files", CONTENT: "content" },
    });
  });

  function request(body: unknown): Request {
    return new Request("http://localhost/api/hub/v0/storage/read-urls", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  it("returns 403 when hub or forms view permission is denied", async () => {
    mockCheckAllPermissions.mockResolvedValue(AuthorizationResult.forbidden());

    const response = await POST(
      request({
        urls: ["https://test.blob.core.windows.net/content/f/1/a.png"],
      }),
    );

    expect(response.status).toBe(403);
    expect(mockCheckAllPermissions).toHaveBeenCalledWith([
      Permissions.Access.Hub,
      Permissions.Forms.View,
    ]);
    expect(mockResolveHubReadUrls).not.toHaveBeenCalled();
  });

  it("returns resolved payload with designer scope", async () => {
    mockParseHubReadUrlsBody.mockReturnValue(
      Result.success({
        scope: { formId: "42" },
        urls: ["https://test.blob.core.windows.net/content/f/42/a.png"],
      }),
    );
    mockResolveHubReadUrls.mockResolvedValue(
      Result.success({
        resolved: {
          "https://test.blob.core.windows.net/content/f/42/a.png": {
            url: "https://test.blob.core.windows.net/content/f/42/a.png?sig=x",
          },
        },
      }),
    );

    const response = await POST(
      request({
        formId: "42",
        urls: ["https://test.blob.core.windows.net/content/f/42/a.png"],
      }),
    );

    expect(response.status).toBe(200);
    expect(mockCheckAllPermissions).toHaveBeenCalledWith([
      Permissions.Access.Hub,
      Permissions.Forms.View,
    ]);
    expect(mockResolveHubReadUrls).toHaveBeenCalledWith(
      expect.objectContaining({
        scope: { formId: "42" },
      }),
    );
  });
});
