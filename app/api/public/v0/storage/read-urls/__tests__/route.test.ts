import { describe, it, expect, vi, beforeEach } from "vitest";
import { Result } from "@/lib/result";
import { formAccessForbidden } from "@/features/form-access/server";

const {
  mockAuth,
  mockGetClientStorageConfig,
  mockParsePublicReadUrlsBody,
  mockResolveRespondentGate,
  mockResolvePublicReadUrls,
} = vi.hoisted(() => ({
  mockAuth: vi.fn(),
  mockGetClientStorageConfig: vi.fn(),
  mockParsePublicReadUrlsBody: vi.fn(),
  mockResolveRespondentGate: vi.fn(),
  mockResolvePublicReadUrls: vi.fn(),
}));

vi.mock("@/auth", () => ({
  auth: mockAuth,
}));

vi.mock("@/features/asset-storage/storage-runtime", () => ({
  getClientStorageConfig: mockGetClientStorageConfig,
}));

vi.mock("@/features/form-access/server", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/features/form-access/server")>();
  return {
    ...actual,
    parsePublicReadUrlsBody: mockParsePublicReadUrlsBody,
    resolveRespondentGate: mockResolveRespondentGate,
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
    mockResolveRespondentGate.mockImplementation(async (gate) =>
      Result.success(gate),
    );
  });

  function request(body: unknown): Request {
    return new Request("http://localhost/api/public/v0/storage/read-urls", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  it("returns 400 when body parsing fails", async () => {
    mockParsePublicReadUrlsBody.mockReturnValue(
      Result.validationError("formId is required"),
    );

    const response = await POST(request({ urls: [] }));
    expect(response.status).toBe(400);
  });

  it("returns 403 when gate denies access", async () => {
    mockParsePublicReadUrlsBody.mockReturnValue(
      Result.success({
        gate: { formId: "100" },
        urls: ["https://test.blob.core.windows.net/user-files/s/100/200/a.pdf"],
      }),
    );
    mockResolveRespondentGate.mockResolvedValue(
      formAccessForbidden("Form access denied"),
    );

    const response = await POST(
      request({ formId: "100", urls: ["https://example/x"] }),
    );
    expect(response.status).toBe(403);
    expect(mockResolveRespondentGate).toHaveBeenCalled();
  });

  it("passes hub session token into resolvePublicReadUrls", async () => {
    mockParsePublicReadUrlsBody.mockReturnValue(
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
    mockParsePublicReadUrlsBody.mockReturnValue(
      Result.success({
        gate: { formId: "100", submissionId: "200" },
        urls: ["https://test.blob.core.windows.net/user-files/s/100/200/a.pdf"],
      }),
    );
    mockResolvePublicReadUrls.mockResolvedValue(
      Result.success({
        resolved: {
          "https://test.blob.core.windows.net/user-files/s/100/200/a.pdf": {
            url: "https://test.blob.core.windows.net/user-files/s/100/200/a.pdf?sig=1",
          },
        },
      }),
    );

    const response = await POST(
      request({
        formId: "100",
        submissionId: "200",
        urls: ["https://example/x"],
      }),
    );
    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.resolved).toBeDefined();
  });
});
