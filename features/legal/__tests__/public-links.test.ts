import { beforeEach, expect, it, vi } from "vitest";
import { ApiResult } from "@/lib/endatix-api";
import { publicLegalLinks } from "../public-links.server";

const { get, brand, enabled } = vi.hoisted(() => ({
  get: vi.fn(),
  brand: vi.fn(),
  enabled: vi.fn(),
}));
vi.mock("@/lib/endatix-api", async (original) => ({
  ...(await original<object>()),
  EndatixApi: class {
    get = get;
  },
}));
vi.mock("@/lib/branding/server", () => ({ getBrand: brand }));
vi.mock("@/lib/feature-flags/flags", () => ({
  termsAcceptanceEnabled: enabled,
}));

const published = {
  number: 2,
  versionId: "42",
  markdown: "Current Terms",
  acceptanceRequired: true,
};
beforeEach(() => {
  enabled.mockResolvedValue(true);
  brand.mockResolvedValue({ links: { terms: "https://brand.example/terms" } });
  vi.stubEnv("ENDATIX_TERMS_URL", "https://deployment.example/terms");
  vi.stubEnv("ENDATIX_PRIVACY_URL", "https://deployment.example/privacy");
});

it("uses each published document and the displayed Terms version", async () => {
  // Arrange
  get.mockResolvedValue(ApiResult.success(published));
  // Act & Assert
  expect(await publicLegalLinks()).toEqual({
    terms: "/legal/terms",
    privacy: "/accept-terms/privacy",
    required: published,
    unavailable: false,
  });
});

it("uses the brand then deployment links with the flag off and makes no publication read", async () => {
  // Arrange
  enabled.mockResolvedValue(false);
  // Act & Assert
  expect(await publicLegalLinks()).toEqual({
    terms: "https://brand.example/terms",
    privacy: "https://deployment.example/privacy",
    required: undefined,
    unavailable: false,
  });
  expect(get).not.toHaveBeenCalled();
});

it("offers no checkbox for an unpublished document and omits invalid fallback links", async () => {
  // Arrange
  get.mockResolvedValue(ApiResult.notFoundError());
  vi.stubEnv("ENDATIX_PRIVACY_URL", "javascript:alert(1)");
  // Act & Assert
  expect(await publicLegalLinks()).toEqual({
    terms: "https://brand.example/terms",
    privacy: undefined,
    required: undefined,
    unavailable: false,
  });
});

it.each([
  ApiResult.success({ ...published, acceptanceRequired: undefined }),
  ApiResult.serverError(),
])(
  "withholds signup when the Terms requirement cannot be established",
  async (response) => {
    // Arrange
    get.mockResolvedValue(response);
    // Act & Assert
    expect(await publicLegalLinks()).toMatchObject({
      unavailable: true,
      required: undefined,
    });
  },
);
