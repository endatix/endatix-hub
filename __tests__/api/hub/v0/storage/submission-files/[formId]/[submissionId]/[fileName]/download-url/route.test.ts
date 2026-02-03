import { GET } from "@/app/api/hub/v0/storage/submission-files/[formId]/[submissionId]/[fileName]/download-url/route";
import * as authModule from "@/auth";
import * as authFeature from "@/features/auth";
import { getUserFile } from "@/features/asset-storage/server";
import { Result } from "@/lib/result";
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/auth", () => ({ auth: vi.fn() }));
vi.mock("@/features/auth", () => ({ authorization: vi.fn() }));
vi.mock("@/features/asset-storage/server", () => ({ getUserFile: vi.fn() }));

describe("GET /api/hub/v0/storage/submission-files/[formId]/[submissionId]/[fileName]/download-url", () => {
  const formId = "f1";
  const submissionId = "s1";
  const fileName = "doc.pdf";
  const mockParams = Promise.resolve({ formId, submissionId, fileName });
  const mockFile = {
    displayName: "doc.pdf",
    contentType: "application/pdf",
    sizeInBytes: 1024,
    originalFileName: "Original.pdf",
    questionName: "q1",
    url: "https://account.blob.core.windows.net/user-files/s/f1/s1/doc.pdf?sig=abc",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(authModule.auth).mockResolvedValue({
      user: { id: "u1", name: "Test", email: "test@example.com" },
    } as unknown as Awaited<ReturnType<typeof authModule.auth>>);
    vi.mocked(authFeature.authorization).mockResolvedValue({
      requireHubAccess: vi.fn().mockResolvedValue(undefined),
    } as unknown as Awaited<ReturnType<typeof authFeature.authorization>>);
    vi.mocked(getUserFile).mockResolvedValue(Result.success(mockFile));
  });

  it("calls auth and authorization", async () => {
    const req = new NextRequest("http://localhost/api/download-url");
    await GET(req, { params: mockParams });

    expect(authModule.auth).toHaveBeenCalled();
    expect(authFeature.authorization).toHaveBeenCalled();
  });

  it("calls getUserFile with formId, submissionId, and decoded fileName", async () => {
    const req = new NextRequest("http://localhost/api/download-url");
    await GET(req, { params: mockParams });

    expect(getUserFile).toHaveBeenCalledWith(formId, submissionId, fileName);
  });

  it("calls getUserFile with decoded fileName when param is encoded", async () => {
    const req = new NextRequest("http://localhost/api/download-url");
    await GET(req, {
      params: Promise.resolve({
        formId,
        submissionId,
        fileName: "file%20name.pdf",
      }),
    });

    expect(getUserFile).toHaveBeenCalledWith(
      formId,
      submissionId,
      "file name.pdf",
    );
  });

  it("returns 200 and download URL body when getUserFile succeeds", async () => {
    const req = new NextRequest("http://localhost/api/download-url");
    const res = await GET(req, { params: mockParams });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.url).toBe(mockFile.url);
    expect(body.fileName).toBe(mockFile.originalFileName);
    expect(body.contentType).toBe(mockFile.contentType);
  });

  it("uses displayName as fileName when originalFileName is missing", async () => {
    vi.mocked(getUserFile).mockResolvedValue(
      Result.success({ ...mockFile, originalFileName: undefined }),
    );
    const req = new NextRequest("http://localhost/api/download-url");
    const res = await GET(req, { params: mockParams });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.fileName).toBe(mockFile.displayName);
  });

  it("returns 404 when getUserFile returns error", async () => {
    vi.mocked(getUserFile).mockResolvedValue(Result.error("File not found"));
    const req = new NextRequest("http://localhost/api/download-url");
    const res = await GET(req, { params: mockParams });

    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.detail).toBe("File not found");
  });

  it("returns 404 when getUserFile error has empty message (handler uses default detail)", async () => {
    vi.mocked(getUserFile).mockResolvedValue(Result.error(""));
    const req = new NextRequest("http://localhost/api/download-url");
    const res = await GET(req, { params: mockParams });

    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.detail).toBe("Not Found");
  });
});
