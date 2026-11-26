import { render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { ApiResult } from "@/lib/endatix-api/shared/api-result";
import { BUILT_IN_BRAND } from "@/lib/branding/effective-brand.server";
import { MemberGuide } from "../personal-guide-slot";

const get = vi.hoisted(() => vi.fn());
const session = { accessToken: "member", expires: "", user: { id: "2" } };
vi.mock("@/lib/branding/server", () => ({ getBrand: async () => BUILT_IN_BRAND }));
vi.mock("@/lib/feature-flags/flags", () => ({
  onboardingFlag: async () => true, saasManagementFlag: async () => true,
}));
vi.mock("@/features/auth/authorization", async original => ({
  ...(await original<object>()),
  authorization: async () => ({
    checkPermission: () => ({ success: true }),
    getAuthorizationData: async () => ({ success: true, data: { tenantId: "1", userId: "2" } }),
  }),
}));
vi.mock("@/lib/endatix-api", async original => ({
  ...(await original<object>()), EndatixApi: class { get = get; },
}));

it("shows Help with the brand's links when a member returns after dismissing", async () => {
  // Arrange
  get.mockResolvedValueOnce(ApiResult.success({ isDismissed: true }));
  // Act
  render(await MemberGuide({ session }));
  // Assert
  expect(screen.getByText("Help")).toBeTruthy();
  expect(screen.getByText("Support").closest("a")?.href).toBeTruthy();
  expect(screen.queryByRole("heading")).toBeNull();
  expect(get).toHaveBeenCalledWith("/onboarding/my-guide");
});

it.each([
  ApiResult.success({}), ApiResult.httpStatusError(503, "Try again"),
])("omits optional help on an unusable read", async response => {
  // Arrange
  get.mockResolvedValueOnce(response);
  // Act & Assert
  expect(await MemberGuide({ session })).toBeNull();
});
