import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/server", () => ({}));

vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/features/auth/authorization", () => ({
  authorization: vi.fn(),
}));

vi.mock("@/lib/feature-flags", () => ({
  personalizationFlag: vi.fn(),
  formAnalyticsFlag: vi.fn().mockResolvedValue(false),
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn(() => {
    throw new Error("NEXT_REDIRECT");
  }),
}));

vi.mock("@/features/audience/get-audience-page", () => ({
  loadAudiencePage: vi.fn(),
  loadFormForAudience: vi.fn(),
  parsePeoplePaging: vi.fn(() => ({ page: 1, pageSize: 50 })),
}));

vi.mock(
  "@/features/audience/get-audience-page/ui/audience-page-shell",
  () => ({
    AudiencePageShell: () => null,
  }),
);

vi.mock(
  "@/features/audience/get-audience-page/ui/form-audience-not-found",
  () => ({
    FormAudienceNotFound: () => null,
  }),
);

describe("Form Audience Page", () => {
  const requireHubAccess = vi.fn().mockResolvedValue(undefined);

  beforeEach(async () => {
    vi.clearAllMocks();
    const { auth } = await import("@/auth");
    const { authorization } = await import("@/features/auth/authorization");
    vi.mocked(auth).mockResolvedValue({ accessToken: "token" } as never);
    vi.mocked(authorization).mockResolvedValue({ requireHubAccess } as never);
  });

  it("redirects to the form when personalization is off", async () => {
    const { personalizationFlag } = await import("@/lib/feature-flags");
    const { redirect } = await import("next/navigation");
    const { loadAudiencePage, loadFormForAudience } = await import(
      "@/features/audience/get-audience-page"
    );
    vi.mocked(personalizationFlag).mockResolvedValue(false);

    const FormAudiencePage = (
      await import("@/app/(main)/forms/[formId]/audience/page")
    ).default;
    await expect(
      FormAudiencePage({
        params: Promise.resolve({ formId: "f1" }),
        searchParams: Promise.resolve({
          page: undefined,
          pageSize: undefined,
        }),
      }),
    ).rejects.toThrow("NEXT_REDIRECT");

    expect(redirect).toHaveBeenCalledWith("/forms/f1");
    expect(loadFormForAudience).not.toHaveBeenCalled();
    expect(loadAudiencePage).not.toHaveBeenCalled();
  });
});
