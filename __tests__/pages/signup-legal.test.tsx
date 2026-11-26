import { screen } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import SignupPage from "@/app/(auth)/signup/page";
import { AuthFooter } from "@/features/legal/auth-footer";
import { ApiResult } from "@/lib/endatix-api";
import { renderWithBrand } from "@/test/render-with-brand";

const { enabled, fetchDocument } = vi.hoisted(() => ({
  enabled: vi.fn(),
  fetchDocument: vi.fn(),
}));
vi.mock("@/lib/feature-flags/flags", () => ({
  saasManagementFlag: enabled,
  termsAcceptanceEnabled: vi.fn(() => true),
}));
vi.mock("@/lib/endatix-api", async (original) => ({
  ...(await original<object>()),
  EndatixApi: class {
    get = fetchDocument;
  },
}));
vi.mock("@/lib/branding/server", () => ({
  getBrand: async () => ({ name: "Example", links: {} }),
  isBuiltInBrand: () => false,
}));
vi.mock("next/navigation", () => ({
  notFound: () => {
    throw Error("not found");
  },
  useRouter: () => ({ refresh: vi.fn() }),
}));
beforeEach(() => {
  enabled.mockResolvedValue(true);
  fetchDocument.mockResolvedValue(
    ApiResult.success({
      number: 2,
      versionId: "42",
      markdown: "Terms text",
      acceptanceRequired: false,
    }),
  );
});

it("shows the signup form without a checkbox when published Terms are optional", async () => {
  // Act
  renderWithBrand(await SignupPage());
  // Assert
  expect(
    screen.getByRole("button", { name: "Request workspace" }),
  ).toBeTruthy();
  expect(screen.queryByRole("checkbox")).toBeNull();
});

it("offers retry without a signup form when the Terms service is unavailable", async () => {
  // Arrange
  fetchDocument.mockResolvedValue(ApiResult.serverError());
  // Act
  renderWithBrand(await SignupPage());
  // Assert
  expect(screen.getByRole("button", { name: "Try again" })).toBeTruthy();
  expect(
    screen.queryByRole("button", { name: "Request workspace" }),
  ).toBeNull();
});

it("keeps signup disabled without requesting a publication", async () => {
  // Arrange
  enabled.mockResolvedValue(false);
  // Act & Assert
  await expect(SignupPage()).rejects.toThrow("not found");
  expect(fetchDocument).not.toHaveBeenCalled();
});

it("offers anonymous in-app footer links and keeps the brand website", async () => {
  // Act
  renderWithBrand(await AuthFooter({ website: "https://example.test" }));
  // Assert
  expect(screen.getByRole("link", { name: "Terms" }).getAttribute("href")).toBe(
    "/legal/terms",
  );
  expect(
    screen.getByRole("link", { name: "Privacy notice" }).getAttribute("href"),
  ).toBe("/accept-terms/privacy");
  expect(
    screen.getByRole("link", { name: "example.test" }).getAttribute("href"),
  ).toBe("https://example.test");
});
