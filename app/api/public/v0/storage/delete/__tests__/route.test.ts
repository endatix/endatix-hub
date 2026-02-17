/**
 * Tests for public storage delete endpoint
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockDeleteBlob, mockGetContainerNames, mockCreateFormAccessService } = vi.hoisted(() => ({
  mockDeleteBlob: vi.fn(),
  mockGetContainerNames: vi.fn(),
  mockCreateFormAccessService: vi.fn(),
}));

vi.mock("@/auth", () => ({ auth: vi.fn() }));

vi.mock("@/features/auth/access-control/form-access.factory", () => ({
  createFormAccessService: (...args: unknown[]) => mockCreateFormAccessService(...args),
}));

vi.mock("@/features/asset-storage/server", () => ({
  getContainerNames: (...args: unknown[]) => mockGetContainerNames(...args),
  deleteBlob: (...args: unknown[]) => mockDeleteBlob(...args),
}));

vi.mock("@/lib/utils/route-handlers", () => ({
  apiResponses: {
    badRequest: (body: any) =>
      new Response(JSON.stringify(body), { status: 400 }),
    forbidden: (body: any) =>
      new Response(JSON.stringify(body), { status: 403 }),
    serverError: (body: any) =>
      new Response(JSON.stringify(body), { status: 500 }),
  },
}));

import { DELETE } from "../route";
import * as authModule from "@/auth";

const createRequest = (body: object) => {
  return new Request("http://localhost/api/public/v0/storage/delete", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
};

describe("DELETE /api/public/v0/storage/delete", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(authModule.auth).mockResolvedValue({
      user: { id: "user-123" },
    } as any);
    mockGetContainerNames.mockReturnValue({
      USER_FILES: "user-files",
      CONTENT: "content",
    });
  });

  describe("validation", () => {
    it("should return 400 when formId is missing", async () => {
      const request = createRequest({
        fileUrls: ["https://example.com/file.pdf"],
        submissionId: "sub-123",
      });

      const response = await DELETE(request);
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.detail).toContain("Form ID");
    });

    it("should return 400 when fileUrls is missing", async () => {
      const request = createRequest({
        formId: "form-123",
        submissionId: "sub-123",
      });

      const response = await DELETE(request);
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.detail).toContain("File URLs");
    });

    it("should return 400 when fileUrls is empty", async () => {
      const request = createRequest({
        formId: "form-123",
        fileUrls: [],
        submissionId: "sub-123",
      });

      const response = await DELETE(request);
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.detail).toContain("File URLs");
    });

    it("should return 400 when submissionId is missing", async () => {
      const request = createRequest({
        formId: "form-123",
        fileUrls: ["https://example.com/file.pdf"],
      });

      const response = await DELETE(request);
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.detail).toContain("Submission ID");
    });
  });

  describe("authorization", () => {
    it("should return 403 when user cannot delete files", async () => {
      mockCreateFormAccessService.mockResolvedValue({
        canDeleteFile: () => false,
      });

      const request = createRequest({
        formId: "form-123",
        fileUrls: ["https://example.com/file.pdf"],
        submissionId: "sub-123",
      });

      const response = await DELETE(request);
      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.detail).toContain("permission");
    });

    it("should proceed to delete when authorized", async () => {
      mockCreateFormAccessService.mockResolvedValue({
        canDeleteFile: () => true,
      });
      mockDeleteBlob.mockResolvedValue(undefined);

      const fileUrl = "https://account.blob.core.windows.net/user-files/s/form-123/sub-123/test.pdf";
      const request = createRequest({
        formId: "form-123",
        fileUrls: [fileUrl],
        submissionId: "sub-123",
      });

      const response = await DELETE(request);
      expect(response.status).toBe(200);
    });
  });

  describe("delete operation", () => {
    it("should delete files successfully", async () => {
      mockCreateFormAccessService.mockResolvedValue({
        canDeleteFile: () => true,
      });
      mockDeleteBlob.mockResolvedValue(undefined);

      const fileUrl = "https://account.blob.core.windows.net/user-files/s/form-123/sub-123/test.pdf";
      const request = createRequest({
        formId: "form-123",
        fileUrls: [fileUrl],
        submissionId: "sub-123",
      });

      const response = await DELETE(request);
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data.results).toHaveLength(1);
      expect(data.results[0].result).toBe("success");
    });

    it("should return error when file URL does not match expected path", async () => {
      mockCreateFormAccessService.mockResolvedValue({
        canDeleteFile: () => true,
      });

      const fileUrl = "https://account.blob.core.windows.net/user-files/s/wrong-form/wrong-sub/test.pdf";
      const request = createRequest({
        formId: "form-123",
        fileUrls: [fileUrl],
        submissionId: "sub-123",
      });

      const response = await DELETE(request);
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data.results[0].result).toBe("error");
      expect(data.results[0].error).toContain("folder path");
    });

    it("should handle multiple files", async () => {
      mockCreateFormAccessService.mockResolvedValue({
        canDeleteFile: () => true,
      });
      mockDeleteBlob.mockResolvedValue(undefined);

      const request = createRequest({
        formId: "form-123",
        fileUrls: [
          "https://account.blob.core.windows.net/user-files/s/form-123/sub-123/file1.pdf",
          "https://account.blob.core.windows.net/user-files/s/form-123/sub-123/file2.pdf",
        ],
        submissionId: "sub-123",
      });

      const response = await DELETE(request);
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data.results).toHaveLength(2);
      expect(mockDeleteBlob).toHaveBeenCalledTimes(2);
    });

    it("should handle delete errors gracefully", async () => {
      mockCreateFormAccessService.mockResolvedValue({
        canDeleteFile: () => true,
      });
      mockDeleteBlob.mockRejectedValue(new Error("Storage error"));

      const fileUrl = "https://account.blob.core.windows.net/user-files/s/form-123/sub-123/test.pdf";
      const request = createRequest({
        formId: "form-123",
        fileUrls: [fileUrl],
        submissionId: "sub-123",
      });

      const response = await DELETE(request);
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data.results[0].result).toBe("error");
      expect(data.results[0].error).toContain("Storage error");
    });
  });
});
