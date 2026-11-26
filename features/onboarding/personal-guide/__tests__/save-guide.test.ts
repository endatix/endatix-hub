import { beforeEach, expect, it, vi } from "vitest";
import { ApiResult } from "@/lib/endatix-api/shared/api-result";
import { workspaceScope } from "@/lib/routes/workspace-scope.server";
import { saveGuide } from "../save-guide.action";

const { enabled, management, grant, put } = vi.hoisted(() => ({
  enabled: vi.fn(), management: vi.fn(), grant: vi.fn(), put: vi.fn(),
}));
vi.mock("@/auth", () => ({ auth: async () => ({ accessToken: "member" }) }));
vi.mock("@/features/auth/authorization", async original => ({
  ...(await original<object>()), authorization: async () => ({ checkPermission: grant }),
}));
vi.mock("@/lib/endatix-api", async original => ({
  ...(await original<object>()), EndatixApi: class { put = put; },
}));
vi.mock("@/lib/feature-flags/flags", () => ({ onboardingFlag: enabled, saasManagementFlag: management }));

const scope = workspaceScope("member")!;
beforeEach(() => {
  management.mockResolvedValue(true);
  enabled.mockResolvedValue(true);
  grant.mockResolvedValue({ success: true });
});

it("sends only the signed-in member's desired preference", async () => {
  // Arrange
  put.mockResolvedValue(ApiResult.success({ isDismissed: false }));
  // Act
  const result = await saveGuide(scope, false);
  // Assert
  expect(result).toMatchObject({ value: false });
  expect(grant).toHaveBeenCalledWith("access.apps.hub");
  expect(put).toHaveBeenCalledWith("/onboarding/my-guide", { isDismissed: false });
});

it.each(["management off", "guide off", "denied", "changed session"])(
  "leaves preferences alone when %s", async reason => {
    // Arrange
    management.mockResolvedValue(reason !== "management off");
    enabled.mockResolvedValue(reason !== "guide off");
    grant.mockResolvedValue({ success: reason !== "denied" });
    // Act
    const result = await saveGuide(reason === "changed session" ? "previous" : scope, true);
    // Assert
    expect(result).toMatchObject({ message: expect.stringContaining("unavailable") });
    expect(put).not.toHaveBeenCalled();
  },
);
