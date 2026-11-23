import { render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { ApiResult } from "@/lib/endatix-api/shared/api-result";
import { PdfSettingsSection } from "../pdf-settings-section";

const { getSettings } = vi.hoisted(() => ({ getSettings: vi.fn() }));
vi.mock("@/auth", () => ({ auth: async () => ({}) }));
vi.mock("@/features/auth/authorization", () => ({
  authorization: async () => ({
    checkAllPermissions: async () => ({ success: true }),
  }),
  Permissions: { Forms: { View: "forms.view", Edit: "forms.edit" } },
}));
vi.mock("@/lib/endatix-api", () => ({
  EndatixApi: class {
    forms = { getSettings };
  },
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("../save-pdf-settings.action", () => ({ savePdfSettings: vi.fn() }));

it("shows the API support reference when PDF settings cannot be read", async () => {
  // Arrange
  getSettings.mockResolvedValue(
    ApiResult.networkError("Unavailable", {
      statusCode: 503,
      traceId: "pdf-503",
    }),
  );

  // Act
  render(await PdfSettingsSection({ formId: "42" }));

  // Assert
  expect(screen.getByText("pdf-503")).toBeDefined();
  expect(screen.getByRole("button", { name: "Try Again" })).toBeDefined();
});

it("hides PDF settings when the API has no settings resource", async () => {
  // Arrange
  getSettings.mockResolvedValue(
    ApiResult.notFoundError("Not found", { statusCode: 404 }),
  );

  // Act & Assert
  expect(await PdfSettingsSection({ formId: "42" })).toBeNull();
});
