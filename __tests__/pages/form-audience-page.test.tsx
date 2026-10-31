import { beforeEach, describe, expect, it, vi } from "vitest";
import { Result } from "@/lib/result";

vi.mock("next/server", () => ({}));

vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/features/auth/authorization", async () => {
  const actual = await vi.importActual<
    typeof import("@/features/auth/authorization")
  >("@/features/auth/authorization");
  return { ...actual, authorization: vi.fn() };
});

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
  loadAudienceUsage: vi.fn(),
  parseAudienceView: vi.fn(() => "people"),
  parsePeoplePaging: vi.fn(() => ({ page: 1, pageSize: 50 })),
  parsePeopleTestFilter: vi.fn(() => undefined),
}));

vi.mock("@/lib/endatix-api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/endatix-api")>()),
  EndatixApi: class {},
}));

vi.mock("@/features/audience/shared/test-link-access.server", () => ({
  testLinkAccess: vi.fn(),
}));

vi.mock("@/features/audience/server", () => ({
  loadAudienceVariables: vi.fn(),
}));

vi.mock("@/features/audience/get-audience-page/ui/audience-page-shell", () => ({
  AudiencePageShell: () => null,
}));

vi.mock("@/features/forms/form-workspace/load-workspace-form.server", () => ({
  loadWorkspaceForm: vi.fn(),
}));

const VARIABLES = { variablePresets: { definition: {} } };
const USAGE = { variableNames: ["tier"], read: ["tier"] };

describe("Form Audience Page", () => {
  const requireAllPermissions = vi.fn().mockResolvedValue(undefined);
  const checkPermission = vi.fn().mockResolvedValue({ success: false });

  beforeEach(async () => {
    vi.clearAllMocks();
    const { auth } = await import("@/auth");
    const { authorization } = await import("@/features/auth/authorization");
    vi.mocked(auth).mockResolvedValue({ accessToken: "token" } as never);
    vi.mocked(authorization).mockResolvedValue({
      requireAllPermissions,
      checkPermission,
    } as never);
  });

  it("redirects to the form when personalization is off", async () => {
    const { personalizationFlag } = await import("@/lib/feature-flags");
    const { redirect } = await import("next/navigation");
    const { loadAudiencePage } =
      await import("@/features/audience/get-audience-page");
    const { loadWorkspaceForm } =
      await import("@/features/forms/form-workspace/load-workspace-form.server");
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
    expect(requireAllPermissions).toHaveBeenCalledWith([
      "access.apps.hub",
      "forms.view",
    ]);
    expect(loadWorkspaceForm).not.toHaveBeenCalled();
    expect(loadAudiencePage).not.toHaveBeenCalled();
  });

  async function renderAudiencePage(grants: string[]) {
    const { personalizationFlag } = await import("@/lib/feature-flags");
    const { loadAudiencePage, loadAudienceUsage } =
      await import("@/features/audience/get-audience-page");
    const { loadAudienceVariables } =
      await import("@/features/audience/server");
    const { loadWorkspaceForm } =
      await import("@/features/forms/form-workspace/load-workspace-form.server");
    vi.mocked(personalizationFlag).mockResolvedValue(true);
    checkPermission.mockImplementation(async (permission: string) => ({
      success: grants.includes(permission),
    }));
    vi.mocked(loadWorkspaceForm).mockResolvedValue(
      Result.success({ id: "f1", activeDefinitionId: "d1" }) as never,
    );
    vi.mocked(loadAudiencePage).mockResolvedValue(Result.success({}) as never);
    vi.mocked(loadAudienceVariables).mockResolvedValue(VARIABLES as never);
    vi.mocked(loadAudienceUsage).mockResolvedValue(USAGE as never);
    const { testLinkAccess } =
      await import("@/features/audience/shared/test-link-access.server");
    vi.mocked(testLinkAccess).mockResolvedValue({
      canCopyTestLink: true,
      canMintTestLinks: false,
    });

    const FormAudiencePage = (
      await import("@/app/(main)/forms/[formId]/audience/page")
    ).default;
    const page = (await FormAudiencePage({
      params: Promise.resolve({ formId: "f1" }),
      searchParams: Promise.resolve({}),
    })) as { props: { usage: unknown } };
    return { page, loadAudienceUsage, loadAudienceVariables };
  }

  it("passes which test link actions the API and the reader allow to the list", async () => {
    await renderAudiencePage(["forms.edit", "forms.test"]);
    const { loadAudiencePage } =
      await import("@/features/audience/get-audience-page");
    const { testLinkAccess } =
      await import("@/features/audience/shared/test-link-access.server");

    expect(testLinkAccess).toHaveBeenCalledWith(
      expect.anything(),
      "f1",
      expect.objectContaining({ checkPermission }),
    );
    expect(loadAudiencePage).toHaveBeenCalledWith(
      expect.objectContaining({
        canCopyTestLink: true,
        canMintTestLinks: false,
      }),
    );
  });

  it("shows Audience coverage to a form editor", async () => {
    const { page, loadAudienceUsage } = await renderAudiencePage([
      "forms.edit",
    ]);

    expect(loadAudienceUsage).toHaveBeenCalledWith(
      expect.objectContaining({ formId: "f1", activeDefinitionId: "d1" }),
    );
    expect(page.props.usage).toBe(USAGE);
  });

  it("leaves Audience coverage out for a reader who may only view the form", async () => {
    const { page, loadAudienceUsage, loadAudienceVariables } =
      await renderAudiencePage([]);

    expect(loadAudienceVariables).not.toHaveBeenCalled();
    expect(loadAudienceUsage).not.toHaveBeenCalled();
    expect(page.props.usage).toBeNull();
  });
});
