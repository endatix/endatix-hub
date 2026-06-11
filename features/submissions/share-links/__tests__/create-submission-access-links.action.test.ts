import { beforeEach, describe, expect, it, vi } from "vitest";
import { auth } from "@/auth";
import { authorization } from "@/features/auth/authorization";
import { EndatixApi } from "@/lib/endatix-api";
import { ApiErrorType } from "@/lib/endatix-api/shared/api-result";
import { Kind } from "@/lib/result";
import { createSubmissionAccessLinkAction } from "../create-submission-access-links.action";

vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/features/auth/authorization", () => ({
  authorization: vi.fn(),
}));

vi.mock("@/lib/endatix-api", () => ({
  EndatixApi: vi.fn(),
}));

describe("createSubmissionAccessLinkAction", () => {
  const createAccessToken = vi.fn();
  const requireHubAccess = vi.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(auth).mockResolvedValue({
      accessToken: "token",
    } as never);
    vi.mocked(authorization).mockResolvedValue({
      requireHubAccess,
    } as never);
    vi.mocked(EndatixApi).mockImplementation(function () {
      return {
        submissions: {
          createAccessToken,
        },
      } as never;
    });
  });

  it("returns error for invalid share link type", async () => {
    const result = await createSubmissionAccessLinkAction(
      "form-1",
      "sub-1",
      "invalid-type" as never,
    );

    expect(result.kind).toBe(Kind.Error);
    if (result.kind !== Kind.Error) return;
    expect(result.message).toBe("Invalid share link type");
  });

  it("returns error when API call fails", async () => {
    createAccessToken.mockResolvedValue({
      success: false,
      error: {
        type: ApiErrorType.ValidationError,
        message: "Token permissions are invalid.",
        errorCode: "submission-token-permissions-invalid",
      },
    });

    const result = await createSubmissionAccessLinkAction(
      "form-1",
      "sub-1",
      "view",
    );

    expect(result.kind).toBe(Kind.Error);
    if (result.kind !== Kind.Error) return;
    expect(result.message).toBe("Token permissions are invalid.");
    expect(result.errorCode).toBe("submission-token-permissions-invalid");
  });

  it("returns success with token data on valid request", async () => {
    createAccessToken.mockResolvedValue({
      success: true,
      data: {
        token: "abc123",
        expiresAt: "2026-06-17T00:00:00Z",
        permissions: ["view"],
      },
    });

    const result = await createSubmissionAccessLinkAction(
      "form-1",
      "sub-1",
      "view",
    );

    expect(result.kind).toBe(Kind.Success);
    if (result.kind !== Kind.Success) return;
    expect(result.value).toEqual({
      type: "view",
      token: "abc123",
      expiresAt: "2026-06-17T00:00:00Z",
    });
  });

  it("passes correct params to API", async () => {
    createAccessToken.mockResolvedValue({
      success: true,
      data: {
        token: "t",
        expiresAt: "2026-06-17T00:00:00Z",
        permissions: ["view", "edit"],
      },
    });

    await createSubmissionAccessLinkAction("form-1", "sub-1", "edit", 60);

    expect(createAccessToken).toHaveBeenCalledWith({
      formId: "form-1",
      submissionId: "sub-1",
      expiryMinutes: 60,
      permissions: ["view", "edit"],
    });
  });

  it("uses default expiry of 7 days when expiryMinutes is omitted", async () => {
    createAccessToken.mockResolvedValue({
      success: true,
      data: {
        token: "t",
        expiresAt: "2026-06-17T00:00:00Z",
        permissions: ["view"],
      },
    });

    await createSubmissionAccessLinkAction("form-1", "sub-1", "view");

    expect(createAccessToken).toHaveBeenCalledWith(
      expect.objectContaining({ expiryMinutes: 10080 }),
    );
  });

  it.each([
    ["view", ["view"]],
    ["edit", ["view", "edit"]],
    ["share", ["view", "edit"]],
    ["export-pdf", ["export"]],
  ] as const)(
    "maps %s type to permissions %s",
    async (type, expectedPermissions) => {
      createAccessToken.mockResolvedValue({
        success: true,
        data: {
          token: "t",
          expiresAt: "2026-06-17T00:00:00Z",
          permissions: expectedPermissions,
        },
      });

      await createSubmissionAccessLinkAction("form-1", "sub-1", type);

      expect(createAccessToken).toHaveBeenCalledWith(
        expect.objectContaining({ permissions: expectedPermissions }),
      );
    },
  );
});
