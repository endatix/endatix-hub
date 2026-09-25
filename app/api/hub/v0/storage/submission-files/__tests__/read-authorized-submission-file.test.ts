import * as authModule from "@/auth";
import { readAuthorizedSubmissionFile } from "@/app/api/hub/v0/storage/submission-files/read-authorized-submission-file";
import { getUserFile } from "@/features/asset-storage/server";
import type { UserFileViewData } from "@/features/asset-storage/use-cases/get-user-file/get-use-file.use-case";
import * as authFeature from "@/features/auth";
import { Permissions } from "@/features/auth/authorization/domain/permissions";
import { Result } from "@/lib/result";
import { NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/auth", () => ({ auth: vi.fn() }));
vi.mock("@/features/auth", () => ({ authorization: vi.fn() }));
vi.mock("@/features/asset-storage/server", () => ({ getUserFile: vi.fn() }));

const file: UserFileViewData = {
  kind: "user",
  displayName: "photo.jpg",
  contentType: "image/jpeg",
  uploadedBy: "u1",
  url: "https://account.blob.core.windows.net/user-files/s/f1/s1/photo.jpg?sig=abc",
};

describe("readAuthorizedSubmissionFile", () => {
  const params = Promise.resolve({
    formId: "f1",
    submissionId: "s1",
    fileName: "photo.jpg",
  });
  const checkAllPermissions = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(authModule.auth).mockResolvedValue({
      user: { id: "u1" },
    } as unknown as Awaited<ReturnType<typeof authModule.auth>>);
    vi.mocked(authFeature.authorization).mockResolvedValue({
      checkAllPermissions,
    } as unknown as Awaited<ReturnType<typeof authFeature.authorization>>);
  });

  it("returns 403 and does not load the file when Hub or Forms.View is missing", async () => {
    // Arrange
    checkAllPermissions.mockResolvedValue({ success: false });

    // Act
    const response = await readAuthorizedSubmissionFile(params);

    // Assert
    expect(response).toBeInstanceOf(NextResponse);
    expect((response as NextResponse).status).toBe(403);
    expect(checkAllPermissions).toHaveBeenCalledWith([
      Permissions.Access.Hub,
      Permissions.Forms.View,
    ]);
    expect(getUserFile).not.toHaveBeenCalled();
  });

  it("returns the file when the caller can view forms", async () => {
    // Arrange
    checkAllPermissions.mockResolvedValue({ success: true });
    vi.mocked(getUserFile).mockResolvedValue(Result.success(file));

    // Act
    const loaded = await readAuthorizedSubmissionFile(params);

    // Assert
    expect(loaded).toEqual(file);
    expect(getUserFile).toHaveBeenCalledWith("f1", "s1", "photo.jpg");
  });

  it("passes the route fileName through without decoding it again", async () => {
    // Arrange
    checkAllPermissions.mockResolvedValue({ success: true });
    vi.mocked(getUserFile).mockResolvedValue(Result.success(file));

    // Act
    await readAuthorizedSubmissionFile(
      Promise.resolve({
        formId: "f1",
        submissionId: "s1",
        fileName: "file%20name.jpg",
      }),
    );

    // Assert
    expect(getUserFile).toHaveBeenCalledWith("f1", "s1", "file%20name.jpg");
  });

  it("returns 404 with the use-case message when the file is missing", async () => {
    // Arrange
    checkAllPermissions.mockResolvedValue({ success: true });
    vi.mocked(getUserFile).mockResolvedValue(Result.error("File not found"));

    // Act
    const response = await readAuthorizedSubmissionFile(params);

    // Assert
    expect((response as NextResponse).status).toBe(404);
    await expect((response as NextResponse).json()).resolves.toMatchObject({
      detail: "File not found",
    });
  });
});
