import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthorizationResult } from "@/features/auth/authorization/domain/authorization-result";
import { Permissions } from "@/features/auth/authorization/domain/permissions";

const {
  mockAuth,
  mockCheckAllPermissions,
  mockGetClientStorageConfig,
  mockDeleteUserFiles,
} = vi.hoisted(() => ({
  mockAuth: vi.fn(),
  mockCheckAllPermissions: vi.fn(),
  mockGetClientStorageConfig: vi.fn(),
  mockDeleteUserFiles: vi.fn(),
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

vi.mock(
  "@/features/asset-storage/use-cases/delete-user-files/delete-user-files",
  () => ({
    deleteUserFiles: mockDeleteUserFiles,
  }),
);

vi.mock("@/lib/utils/route-handlers", () => ({
  apiResponses: {
    badRequest: (body: { detail: string }) =>
      new Response(JSON.stringify(body), { status: 400 }),
    forbidden: (body: { detail: string }) =>
      new Response(JSON.stringify(body), { status: 403 }),
    serverError: (body: { detail: string }) =>
      new Response(JSON.stringify(body), { status: 500 }),
  },
}));

import { DELETE } from "../route";

const fileUrl =
  "https://test.blob.core.windows.net/user-files/s/100/200/file.pdf";

describe("DELETE /api/hub/v0/storage/delete", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });
    mockCheckAllPermissions.mockResolvedValue(AuthorizationResult.success());
    mockGetClientStorageConfig.mockReturnValue({
      isEnabled: true,
      isPrivate: true,
      hostName: "test.blob.core.windows.net",
      protocol: "https",
      containerNames: { USER_FILES: "user-files", CONTENT: "content" },
      imageConfig: { isResizeEnabled: false, defaultResizeWidth: 800 },
    });
    mockDeleteUserFiles.mockResolvedValue([
      { fileUrl, result: "success" as const },
    ]);
  });

  function request(body: unknown): Request {
    return new Request("http://localhost/api/hub/v0/storage/delete", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  it("returns 403 when hub or submission edit permission is denied", async () => {
    mockCheckAllPermissions.mockResolvedValue(AuthorizationResult.forbidden());

    const response = await DELETE(
      request({ formId: "100", submissionId: "200", fileUrls: [fileUrl] }),
    );

    expect(response.status).toBe(403);
    expect(mockCheckAllPermissions).toHaveBeenCalledWith([
      Permissions.Access.Hub,
      Permissions.Submissions.Edit,
    ]);
    expect(mockDeleteUserFiles).not.toHaveBeenCalled();
  });

  it("deletes files with designer scope", async () => {
    const response = await DELETE(
      request({ formId: "100", submissionId: "200", fileUrls: [fileUrl] }),
    );

    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.results).toEqual([{ fileUrl, result: "success" }]);
    expect(mockCheckAllPermissions).toHaveBeenCalledWith([
      Permissions.Access.Hub,
      Permissions.Submissions.Edit,
    ]);
    expect(mockDeleteUserFiles).toHaveBeenCalledWith(
      expect.objectContaining({
        fileUrls: [fileUrl],
        assertObject: expect.any(Function),
      }),
    );
  });

  it("returns 400 when submissionId is missing", async () => {
    const response = await DELETE(
      request({ formId: "100", fileUrls: [fileUrl] }),
    );

    expect(response.status).toBe(400);
    expect(mockDeleteUserFiles).not.toHaveBeenCalled();
  });
});
