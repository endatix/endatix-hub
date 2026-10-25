import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Result } from "@/lib/result";

vi.mock("next/navigation", () => ({
  redirect: vi.fn(() => {
    throw new Error("NEXT_REDIRECT");
  }),
}));

vi.mock("@/features/audience/shared/require-audience-api.server", () => ({
  PARTICIPANT_PAGE_PERMISSION: "forms.edit",
  requireAudienceAccess: vi.fn(),
}));

vi.mock("@/features/audience/preview-as", () => ({
  loadPreviewAs: vi.fn(),
  PreviewAsView: ({
    formId,
    canTest,
  }: {
    formId: string;
    canTest: boolean;
  }) => <p>{`preview ${formId} canTest=${canTest}`}</p>,
}));

vi.mock("@/features/forms/form-workspace", () => ({
  FormWorkspaceHeader: () => null,
}));

vi.mock("@/features/forms/form-workspace/load-workspace-form.server", () => ({
  loadWorkspaceForm: vi.fn(),
}));

vi.mock("@/features/forms/form-workspace/ui/form-load-error", () => ({
  FormLoadError: () => <p>load error</p>,
}));

vi.mock("@/features/forms/form-workspace/ui/form-page-header-slot", () => ({
  FormPageHeaderSlot: ({
    formId,
    active,
  }: {
    formId: string;
    active: string;
  }) => <p>{`${formId}:${active}`}</p>,
}));

const params = Promise.resolve({ formId: "f1" });
const searchParams = Promise.resolve({ member: "7", q: "acme" });
const PAGE = "@/app/(main)/forms/[formId]/audience/preview-as/page";

async function mocks() {
  const access =
    await import("@/features/audience/shared/require-audience-api.server");
  const workspace =
    await import("@/features/forms/form-workspace/load-workspace-form.server");
  const preview = await import("@/features/audience/preview-as");
  return {
    requireAudienceAccess: vi.mocked(access.requireAudienceAccess),
    loadWorkspaceForm: vi.mocked(workspace.loadWorkspaceForm),
    loadPreviewAs: vi.mocked(preview.loadPreviewAs),
  };
}

async function openAsEditor(canTest = true) {
  const { requireAudienceAccess, loadWorkspaceForm } = await mocks();
  requireAudienceAccess.mockResolvedValue(
    Result.success({
      api: { id: "api" },
      checkPermission: vi.fn().mockResolvedValue({ success: canTest }),
    } as never),
  );
  loadWorkspaceForm.mockResolvedValue(
    Result.success({ activeDefinitionId: "55" } as never),
  );
  return (await import(PAGE)).default;
}

describe("Form Preview as page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("sends a reader who cannot edit the form back to it", async () => {
    const { requireAudienceAccess } = await mocks();
    const { redirect } = await import("next/navigation");
    requireAudienceAccess.mockResolvedValue(Result.error("no"));
    const Page = (await import(PAGE)).default;

    await expect(Page({ params, searchParams })).rejects.toThrow(
      "NEXT_REDIRECT",
    );
    expect(redirect).toHaveBeenCalledWith("/forms/f1");
  });

  it("reads the preview for the participant and search the link names", async () => {
    const { loadPreviewAs } = await mocks();
    loadPreviewAs.mockResolvedValue(
      Result.success({ canTest: false } as never),
    );
    const Page = await openAsEditor(false);

    render(await Page({ params, searchParams }));

    expect(screen.getByText("preview f1 canTest=false")).toBeTruthy();
    expect(loadPreviewAs).toHaveBeenCalledWith(
      expect.objectContaining({
        formId: "f1",
        activeDefinitionId: "55",
        memberId: "7",
        search: "acme",
        canTest: false,
      }),
    );
  });

  it("shows the load error when the form read fails", async () => {
    const Page = await openAsEditor();
    const { loadWorkspaceForm, loadPreviewAs } = await mocks();
    loadWorkspaceForm.mockResolvedValue(Result.error("form"));

    render(await Page({ params, searchParams }));

    expect(screen.getByText("load error")).toBeTruthy();
    expect(loadPreviewAs).not.toHaveBeenCalled();
  });

  it("shows the load error when the preview read fails", async () => {
    const { loadPreviewAs } = await mocks();
    loadPreviewAs.mockResolvedValue(Result.error("preview"));
    const Page = await openAsEditor();

    render(await Page({ params, searchParams }));

    expect(screen.getByText("load error")).toBeTruthy();
  });
});

describe("Form Preview as header", () => {
  it("keeps the Audience switcher current", async () => {
    const Header = (
      await import("@/app/(main)/@header/forms/[formId]/audience/preview-as/page")
    ).default;

    render(await Header({ params }));

    expect(screen.getByText("f1:audience")).toBeTruthy();
  });
});
