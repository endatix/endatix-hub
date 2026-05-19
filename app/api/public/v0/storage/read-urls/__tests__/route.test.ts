import { describe, it, expect, vi, beforeEach } from "vitest";
import { Result } from "@/lib/result";

const {
  mockAuth,
  mockGetClientStorageConfig,
  mockParseReadUrlsBody,
  mockResolveStorageGateInput,
  mockResolvePublicReadUrls,
} = vi.hoisted(() => ({
  mockAuth: vi.fn(),
  mockGetClientStorageConfig: vi.fn(),
  mockParseReadUrlsBody: vi.fn(),
  mockResolveStorageGateInput: vi.fn(),
  mockResolvePublicReadUrls: vi.fn(),
}));

vi.mock("@/auth", () => ({
  auth: mockAuth,
}));

vi.mock("@/features/asset-storage/storage-runtime", () => ({
  getClientStorageConfig: mockGetClientStorageConfig,
}));

vi.mock("@/features/form-access", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/features/form-access")>();
  return {
    ...actual,
    parseReadUrlsBody: mockParseReadUrlsBody,
    resolveStorageGateInput: mockResolveStorageGateInput,
  };
});

vi.mock(
  "@/features/asset-storage/use-cases/resolve-read-urls/resolve-read-urls",
  () => ({
    resolvePublicReadUrls: mockResolvePublicReadUrls,
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

describe("POST /api/public/v0/storage/read-urls", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({ accessToken: "hub-session-token" });
    mockGetClientStorageConfig.mockReturnValue({
      isEnabled: true,
      isPrivate: true,
      hostName: "test.blob.core.windows.net",
      containerNames: { USER_FILES: "user-files", CONTENT: "content" },
    });
    mockResolveStorageGateInput.mockImplementation(async (gate) => gate);
  });

  function request(body: unknown): Request {
    return new Request("http://localhost/api/public/v0/storage/read-urls", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  it("returns 400 when body parsing fails", async () => {
    mockParseReadUrlsBody.mockReturnValue(
      Result.validationError("formId is required"),
    );

    const response = await POST(request({ urls: [] }));
    expect(response.status).toBe(400);
  });

  it("returns 403 when OSS gate denies access", async () => {
    mockParseReadUrlsBody.mockReturnValue(
      Result.success({
        gate: { formId: "form-1" },
        urls: [
          "https://test.blob.core.windows.net/user-files/s/form-1/sub-1/a.pdf",
        ],
      }),
    );
    mockResolvePublicReadUrls.mockResolvedValue(
      Result.error("Form access denied"),
    );

    const response = await POST(
      request({ formId: "form-1", urls: ["https://example/x"] }),
    );
    expect(response.status).toBe(403);
    expect(mockResolveStorageGateInput).toHaveBeenCalled();
  });

  it("passes hub session token into resolvePublicReadUrls", async () => {
    mockParseReadUrlsBody.mockReturnValue(
      Result.success({
        gate: { formId: "100" },
        urls: ["https://test.blob.core.windows.net/content/f/100/a.svg"],
      }),
    );
    mockResolvePublicReadUrls.mockResolvedValue(
      Result.success({ resolved: {} }),
    );

    await POST(
      request({
        formId: "100",
        urls: ["https://test.blob.core.windows.net/content/f/100/a.svg"],
      }),
    );

    expect(mockResolvePublicReadUrls).toHaveBeenCalledWith(
      expect.objectContaining({ hubAccessToken: "hub-session-token" }),
    );
  });

  it("returns resolved urls when gate allows", async () => {
    mockParseReadUrlsBody.mockReturnValue(
      Result.success({
        gate: { formId: "form-1", submissionId: "sub-1" },
        urls: [
          "https://test.blob.core.windows.net/user-files/s/form-1/sub-1/a.pdf",
        ],
      }),
    );
    mockResolvePublicReadUrls.mockResolvedValue(
      Result.success({
        resolved: {
          "https://test.blob.core.windows.net/user-files/s/form-1/sub-1/a.pdf":
            {
              url: "https://test.blob.core.windows.net/user-files/s/form-1/sub-1/a.pdf?sig=1",
            },
        },
      }),
    );

    const response = await POST(
      request({
        formId: "form-1",
        submissionId: "sub-1",
        urls: ["https://example/x"],
      }),
    );
    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.resolved).toBeDefined();
  });
});
